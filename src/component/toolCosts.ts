import { v } from "convex/values";
import {
  actionGeneric,
  internalMutationGeneric,
  mutationGeneric,
  queryGeneric,
} from "convex/server";
import { api, internal } from "./_generated/api.js";
import type { Doc, Id } from "./_generated/dataModel.js";
import {
  vToolUsage,
  vToolCost,
  vToolCostForUser,
  vAddToolCost,
  type ToolCost,
  type ToolCostForUser,
  type ToolPricing,
} from "../validators.js";
import {
  calculateToolCost,
  calculateToolCostFromTokenPricing,
  type CalculatedToolCost,
} from "../shared.js";
import schema from "./schema.js";

// ============================================================================
// Types
// ============================================================================

export type AddToolCostResult = {
  cost: ToolCost;
  costForUser: ToolCostForUser;
  costPerToolId: Id<"costPerTools">;
};

// ============================================================================
// Actions
// ============================================================================

/**
 * Main action to add tool cost.
 * Fetches pricing, calculates cost, and saves to database.
 *
 * @param messageId - Message ID associated with the tool usage
 * @param userId - Optional user ID
 * @param threadId - Thread ID for the conversation
 * @param providerId - Provider identifier (e.g., "firecrawl", "openai")
 * @param modelId - Model/tool identifier within provider (e.g., "scrape", "crawl")
 * @param usage - Tool usage data
 * @param markupMultiplier - Optional markup (default: 1)
 * @returns Calculated cost and database record ID
 */
export const addToolCost = actionGeneric({
  args: vAddToolCost,
  handler: async (ctx, args): Promise<AddToolCostResult> => {
    // Get pricing for the tool
    const pricing = await ctx.runQuery(api.pricing.getToolPricing, {
      providerId: args.providerId,
      toolId: args.toolId,
    });

    if (!pricing) {
      throw new Error("Pricing not found for tool");
    }

    // Calculate cost based on pricing source
    let calculatedResult: CalculatedToolCost;

    const markup = await ctx.runQuery(api.markup.getMarkupMultiplier, {
      providerId: args.providerId,
      toolId: args.toolId,
    });

    const markupMultiplier = args.markupMultiplier ?? markup;

    // Check if this is from aiPricing (has pricing.input/output structure)
    if ("pricing" in pricing && "input" in pricing.pricing) {
      // This is aiPricing - use token-based calculation
      calculatedResult = calculateToolCostFromTokenPricing(
        args.usage,
        pricing as Doc<"aiPricing">,
        markupMultiplier,
      );
    } else {
      // This is toolsPricing - use the pricing type
      calculatedResult = calculateToolCost(
        args.usage,
        (pricing as Doc<"toolsPricing">).pricing as ToolPricing,
        markupMultiplier,
      );
    }

    const { cost, costForUser } = calculatedResult;

    // Save to database
    const costPerToolId = await ctx.runMutation(
      internal.toolCosts.saveToolCost,
      {
        messageId: args.messageId,
        userId: args.userId,
        threadId: args.threadId,
        providerId: args.providerId,
        toolId: args.toolId,
        usage: args.usage,
        cost,
        costForUser,
      },
    );

    return {
      cost,
      costForUser,
      costPerToolId,
    };
  },
});

// ============================================================================
// Internal Mutations
// ============================================================================

/**
 * Save tool cost to database.
 *
 * @param messageId - Message ID associated with the tool usage
 * @param userId - Optional user identifier
 * @param threadId - Thread/conversation identifier
 * @param providerId - Provider identifier
 * @param toolId - Optional model/tool identifier
 * @param usage - Tool usage data
 * @param cost - Calculated raw cost data
 * @param costForUser - Calculated cost for user with markup
 * @returns Database record ID
 */
export const saveToolCost = internalMutationGeneric({
  args: {
    messageId: v.string(),
    userId: v.optional(v.string()),
    threadId: v.string(),
    providerId: v.string(),
    toolId: v.string(),
    usage: vToolUsage,
    cost: vToolCost,
    costForUser: vToolCostForUser,
  },
  handler: async (ctx, args) => {
    const costPerToolId = await ctx.db.insert("costPerTools", {
      messageId: args.messageId,
      userId: args.userId,
      threadId: args.threadId,
      providerId: args.providerId,
      toolId: args.toolId,
      usage: args.usage,
      cost: args.cost,
      costForUser: args.costForUser,
      timestamp: Date.now(),
    });

    return costPerToolId;
  },
});

/**
 * Idempotently recompute stored tool-cost rows for a provider (and optional
 * tool) from each row's stored `usage` and the CURRENT tool pricing. Used to
 * correct historical rows that were written under a since-fixed pricing rate
 * (e.g. a 10x-inflated per-credit rate). Re-running is a no-op once rows
 * already match current pricing, so it is safe to run repeatedly.
 *
 * Paginated: processes one page and returns a cursor so the caller can loop
 * over the full set. `dryRun` reports what would change without writing.
 *
 * @returns Per-page stats: rows scanned/changed, raw-cost amount before/after.
 */
export const recomputeToolCostsByProviderAndTool = mutationGeneric({
  args: {
    providerId: v.string(),
    toolId: v.optional(v.string()),
    cursor: v.optional(v.union(v.string(), v.null())),
    numItems: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const numItems = Math.max(1, Math.min(args.numItems ?? 200, 500));
    const dryRun = args.dryRun ?? false;

    const page = await (args.toolId
      ? ctx.db
          .query("costPerTools")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .withIndex("by_provider_and_tool", (q: any) =>
            q.eq("providerId", args.providerId).eq("toolId", args.toolId),
          )
      : ctx.db
          .query("costPerTools")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .withIndex("by_provider", (q: any) =>
            q.eq("providerId", args.providerId),
          )
    ).paginate({ cursor: args.cursor ?? null, numItems });

    let scanned = 0;
    let changed = 0;
    let skippedNoPricing = 0;
    let skippedError = 0;
    let amountBefore = 0;
    let amountAfter = 0;

    for (const row of page.page) {
      scanned += 1;
      amountBefore += row.cost.amount;

      const pricing = await ctx.db
        .query("toolsPricing")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .withIndex("by_provider_and_tool", (q: any) =>
          q.eq("providerId", row.providerId).eq("toolId", row.toolId),
        )
        .first();

      if (!pricing) {
        skippedNoPricing += 1;
        amountAfter += row.cost.amount;
        continue;
      }

      // Preserve the markup the row was originally written with: the raw
      // `cost` axis is what an inflated rate corrupts, and `costForUser`
      // scales with the same multiplier.
      const markup = row.costForUser.markupMultiplier ?? 1;

      let recomputed: CalculatedToolCost;
      try {
        recomputed = calculateToolCost(
          row.usage,
          pricing.pricing as ToolPricing,
          markup,
        );
      } catch {
        // Usage/pricing type mismatch for this row — leave it untouched.
        skippedError += 1;
        amountAfter += row.cost.amount;
        continue;
      }

      amountAfter += recomputed.cost.amount;

      if (recomputed.cost.amount !== row.cost.amount) {
        changed += 1;
        if (!dryRun) {
          await ctx.db.patch(row._id, {
            cost: recomputed.cost,
            costForUser: recomputed.costForUser,
          });
        }
      }
    }

    return {
      scanned,
      changed,
      skippedNoPricing,
      skippedError,
      amountBefore: Math.round(amountBefore * 1e8) / 1e8,
      amountAfter: Math.round(amountAfter * 1e8) / 1e8,
      dryRun,
      continueCursor: page.isDone ? null : page.continueCursor,
      isDone: page.isDone,
    };
  },
});

// ============================================================================
// Queries
// ============================================================================

/**
 * Get tool costs for a thread.
 *
 * @param threadId - Thread/conversation identifier
 * @returns Array of tool cost records for the thread
 */
export const getToolCostsByThread = queryGeneric({
  args: {
    threadId: v.string(),
  },
  returns: v.array(
    schema.tables.costPerTools.validator.extend({
      _id: v.id("costPerTools"),
      _creationTime: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("costPerTools")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_thread", (q: any) => q.eq("threadId", args.threadId))
      .collect();
  },
});

/**
 * Get tool costs for a user.
 *
 * @param userId - User identifier
 * @returns Array of tool cost records for the user
 */
export const getToolCostsByUser = queryGeneric({
  args: {
    userId: v.string(),
  },
  returns: v.array(
    schema.tables.costPerTools.validator.extend({
      _id: v.id("costPerTools"),
      _creationTime: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("costPerTools")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .collect();
  },
});

/**
 * Get tool costs by provider and optional tool ID.
 *
 * @param providerId - Provider identifier
 * @param toolId - Optional tool identifier
 * @returns Array of tool cost records matching the criteria
 */
export const getToolCostsByProviderAndTool = queryGeneric({
  args: {
    providerId: v.string(),
    toolId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.toolId) {
      return await ctx.db
        .query("costPerTools")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .withIndex("by_provider_and_tool", (q: any) =>
          q.eq("providerId", args.providerId).eq("toolId", args.toolId),
        )
        .collect();
    }
    return await ctx.db
      .query("costPerTools")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_provider", (q: any) => q.eq("providerId", args.providerId))
      .collect();
  },
});

// ============================================================================
// Aggregate Queries
// ============================================================================

/**
 * Get aggregated tool costs for a user.
 *
 * @param userId - User identifier
 * @returns Count and total costs (raw and user-facing)
 */
export const getTotalToolCostsByUser = queryGeneric({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const costs = await ctx.db
      .query("costPerTools")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .collect();

    const totalAmount = costs.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sum: number, c: any) => sum + c.cost.amount,
      0,
    );
    const totalUserAmount = costs.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sum: number, c: any) => sum + c.costForUser.amount,
      0,
    );

    return {
      count: costs.length,
      totalAmount: Math.round(totalAmount * 1e8) / 1e8,
      totalUserAmount: Math.round(totalUserAmount * 1e8) / 1e8,
    };
  },
});

/**
 * Get aggregated tool costs for a thread.
 *
 * @param threadId - Thread/conversation identifier
 * @returns Count and total costs (raw and user-facing)
 */
export const getTotalToolCostsByThread = queryGeneric({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const costs = await ctx.db
      .query("costPerTools")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_thread", (q: any) => q.eq("threadId", args.threadId))
      .collect();

    const totalAmount = costs.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sum: number, c: any) => sum + c.cost.amount,
      0,
    );
    const totalUserAmount = costs.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sum: number, c: any) => sum + c.costForUser.amount,
      0,
    );

    return {
      count: costs.length,
      totalAmount: Math.round(totalAmount * 1e8) / 1e8,
      totalUserAmount: Math.round(totalUserAmount * 1e8) / 1e8,
    };
  },
});
