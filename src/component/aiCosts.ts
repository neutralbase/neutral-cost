import {
  actionGeneric,
  internalMutationGeneric,
  queryGeneric,
} from "convex/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api.js";
import {
  vAddAICost,
  vCost,
  vCostForUser,
  vUsage,
  type Cost,
  type CostForUser,
} from "../validators.js";
import { calculateCosts, calculateUserCosts } from "../shared.js";
import type { Id } from "./_generated/dataModel.js";

export type AddAICostResult = {
  costs: Cost;
  userCosts: CostForUser;
  costPerRequestId: Id<"costPerAIRequest">;
};

type UserCost = ReturnType<typeof calculateUserCosts>;

/**
 * Calculate and save AI model usage costs.
 * Fetches pricing, calculates raw and user costs, and persists to database.
 *
 * @param messageId - Unique identifier for the message
 * @param userId - Optional user identifier
 * @param threadId - Thread/conversation identifier
 * @param usage - Token usage data from AI response
 * @param modelId - AI model identifier
 * @param providerId - Provider identifier (e.g., "openai", "anthropic")
 * @param providerMarkupMultiplier - Multiplier for user-facing costs
 * @param modelMarkupMultiplier - Multiplier for user-facing costs
 * @returns Calculated costs, user costs, and database record ID
 */
export const addAICost = actionGeneric({
  args: vAddAICost,
  handler: async (ctx, args): Promise<AddAICostResult> => {
    // Get pricing for the model
    const pricing = await ctx.runQuery(api.pricing.getPricing, {
      modelId: args.modelId,
      providerId: args.providerId,
    });

    if (!pricing) {
      throw new Error("Pricing not found for model");
    }

    // Calculate actual costs using pricing data
    const costs = calculateCosts(args.usage, pricing);

    const markup = await ctx.runQuery(api.markup.getMarkupMultiplier, {
      providerId: args.providerId,
      modelId: args.modelId,
    });

    // Calculate user costs with 50% markup (all values in USD)
    let userCosts: UserCost;
    if (args.markupMultiplier || markup > 0) {
      userCosts = calculateUserCosts(
        costs,
        args.markupMultiplier && args.markupMultiplier > 0
          ? args.markupMultiplier
          : markup,
      );
    } else {
      userCosts = {
        cachedInputTokensCost: 0,
        completionTokensCost: 0,
        totalCost: 0,
        promptTokensCost: 0,
        reasoningTokensCost: 0,
      };
    }

    // // save costs to the database
    const costPerRequestId = await ctx.runMutation(
      internal.aiCosts.saveAICost,
      {
        messageId: args.messageId,
        userId: args.userId,
        threadId: args.threadId,
        costs,
        userCosts,
        usage: args.usage,
      },
    );

    return {
      costs,
      userCosts,
      costPerRequestId,
    };
  },
});

/**
 * Internal mutation to persist AI cost record to database.
 *
 * @param messageId - Unique identifier for the message
 * @param userId - Optional user identifier
 * @param threadId - Thread/conversation identifier
 * @param costs - Calculated raw costs
 * @param userCosts - Calculated user-facing costs with markup
 * @param usage - Token usage data
 * @returns Database record ID
 */
export const saveAICost = internalMutationGeneric({
  args: {
    messageId: v.string(),
    userId: v.optional(v.string()),
    threadId: v.string(),
    costs: vCost,
    userCosts: vCostForUser,
    usage: vUsage,
  },
  handler: async (ctx, args) => {
    const costPerRequestId = await ctx.db.insert("costPerAIRequest", {
      messageId: args.messageId,
      userId: args.userId,
      threadId: args.threadId,
      cost: args.costs,
      costForUser: args.userCosts,
      usage: args.usage,
    });

    return costPerRequestId;
  },
});

// ============================================================================
// Queries
// ============================================================================

/**
 * Get AI costs for a thread.
 *
 * @param threadId - Thread/conversation identifier
 * @returns Array of AI cost records for the thread
 */
export const getAICostsByThread = queryGeneric({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("costPerAIRequest")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_thread", (q: any) => q.eq("threadId", args.threadId))
      .collect();
  },
});

/**
 * Get AI costs for a user.
 *
 * @param userId - User identifier
 * @returns Array of AI cost records for the user
 */
export const getAICostsByUser = queryGeneric({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("costPerAIRequest")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .collect();
  },
});

// ============================================================================
// Aggregate Queries
// ============================================================================

/**
 * Get aggregated AI costs for a user.
 *
 * @param userId - User identifier
 * @returns Count and total costs (raw and user-facing)
 */
export const getTotalAICostsByUser = queryGeneric({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const costs = await ctx.db
      .query("costPerAIRequest")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .collect();

    const totalAmount = costs.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sum: number, c: any) => sum + c.cost.totalCost,
      0,
    );
    const totalUserAmount = costs.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sum: number, c: any) => sum + c.costForUser.totalCost,
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
 * Get aggregated AI costs for a thread.
 *
 * @param threadId - Thread/conversation identifier
 * @returns Count and total costs (raw and user-facing)
 */
export const getTotalAICostsByThread = queryGeneric({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const costs = await ctx.db
      .query("costPerAIRequest")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_thread", (q: any) => q.eq("threadId", args.threadId))
      .collect();

    const totalAmount = costs.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sum: number, c: any) => sum + c.cost.totalCost,
      0,
    );
    const totalUserAmount = costs.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sum: number, c: any) => sum + c.costForUser.totalCost,
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
 * Get AI cost for a specific message.
 *
 * @param messageId - Message identifier
 * @returns AI cost record for the message, or null if not found
 */
export const getAICostByMessageId = queryGeneric({
  args: {
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("costPerAIRequest")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_message", (q: any) => q.eq("messageId", args.messageId))
      .first();
  },
});
