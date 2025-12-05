import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import { vProviderMarkup, vModelMarkup, vToolMarkup } from "../validators.js";

export const getMarkupMultipliers = queryGeneric({
  args: {},
  returns: v.object({
    providerMultipliers: v.array(
      v.object({
        providerId: v.string(),
        markupMultiplier: v.number(),
      }),
    ),
    modelMarkupMultipliers: v.array(
      v.object({
        providerId: v.string(),
        modelId: v.string(),
        markupMultiplier: v.number(),
      }),
    ),
    toolMarkupMultipliers: v.array(
      v.object({
        providerId: v.string(),
        toolId: v.string(),
        markupMultiplier: v.number(),
      }),
    ),
  }),
  handler: async (ctx) => {
    const allMultipliers = await ctx.db.query("markupMultiplier").collect();

    const providerMultipliers = allMultipliers
      .filter((m) => m.scope === "provider")
      .map((p) => ({
        providerId: p.providerId,
        markupMultiplier: p.markupMultiplier,
      }));

    const modelMarkupMultipliers = allMultipliers
      .filter((m) => m.scope === "model")
      .map((m) => ({
        providerId: m.providerId,
        modelId: (m as { modelId: string }).modelId,
        markupMultiplier: m.markupMultiplier,
      }));

    const toolMarkupMultipliers = allMultipliers
      .filter((m) => m.scope === "tool")
      .map((t) => ({
        providerId: t.providerId,
        toolId: (t as { toolId: string }).toolId,
        markupMultiplier: t.markupMultiplier,
      }));

    return {
      providerMultipliers,
      modelMarkupMultipliers,
      toolMarkupMultipliers,
    };
  },
});

/**
 * Get the markup multiplier for a specific provider/model/tool combination.
 * Priority: model-specific > tool-specific > provider-specific > 0
 */
export const getMarkupMultiplier = queryGeneric({
  args: {
    providerId: v.string(),
    modelId: v.optional(v.string()),
    toolId: v.optional(v.string()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    // First, check for model-specific markup if modelId is provided
    if (args.modelId) {
      const modelMatch = await ctx.db
        .query("markupMultiplier")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .withIndex("by_provider_and_model", (q: any) =>
          q.eq("providerId", args.providerId).eq("modelId", args.modelId),
        )
        .first();
      if (modelMatch) {
        return modelMatch.markupMultiplier;
      }
    }

    // Check for tool-specific markup if toolId is provided
    if (args.toolId) {
      const toolMatch = await ctx.db
        .query("markupMultiplier")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .withIndex("by_provider_and_tool", (q: any) =>
          q.eq("providerId", args.providerId).eq("toolId", args.toolId),
        )
        .first();
      if (toolMatch) {
        return toolMatch.markupMultiplier;
      }
    }

    // Fall back to provider-level markup
    const providerMatch = await ctx.db
      .query("markupMultiplier")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_scope_and_provider", (q: any) =>
        q.eq("scope", "provider").eq("providerId", args.providerId),
      )
      .first();
    if (providerMatch) {
      return providerMatch.markupMultiplier;
    }

    return 0;
  },
});

export const getMarkupMultiplierById = queryGeneric({
  args: {
    markupMultiplierId: v.id("markupMultiplier"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.markupMultiplierId);
  },
});

/**
 * Upsert a provider markup multiplier
 */
export const upsertProviderMarkup = mutationGeneric({
  args: vProviderMarkup.fields,
  returns: v.id("markupMultiplier"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("markupMultiplier")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .collect();

    const match = existing.find((m) => m.scope === "provider");

    if (match) {
      await ctx.db.patch(match._id, {
        markupMultiplier: args.markupMultiplier,
      });
      return match._id;
    }

    return await ctx.db.insert("markupMultiplier", {
      scope: "provider",
      providerId: args.providerId,
      markupMultiplier: args.markupMultiplier,
    });
  },
});

/**
 * Upsert a model markup multiplier
 */
export const upsertModelMarkup = mutationGeneric({
  args: vModelMarkup.fields,
  returns: v.id("markupMultiplier"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("markupMultiplier")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .collect();

    const match = existing.find(
      (m) =>
        m.scope === "model" &&
        (m as { modelId: string }).modelId === args.modelId,
    );

    if (match) {
      await ctx.db.patch(match._id, {
        markupMultiplier: args.markupMultiplier,
      });
      return match._id;
    }

    return await ctx.db.insert("markupMultiplier", {
      scope: "model",
      providerId: args.providerId,
      modelId: args.modelId,
      markupMultiplier: args.markupMultiplier,
    });
  },
});

/**
 * Upsert a tool markup multiplier
 */
export const upsertToolMarkup = mutationGeneric({
  args: vToolMarkup.fields,
  returns: v.id("markupMultiplier"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("markupMultiplier")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .collect();

    const match = existing.find(
      (m) =>
        m.scope === "tool" && (m as { toolId: string }).toolId === args.toolId,
    );

    if (match) {
      await ctx.db.patch(match._id, {
        markupMultiplier: args.markupMultiplier,
      });
      return match._id;
    }

    return await ctx.db.insert("markupMultiplier", {
      scope: "tool",
      providerId: args.providerId,
      toolId: args.toolId,
      markupMultiplier: args.markupMultiplier,
    });
  },
});

/**
 * Delete a markup multiplier
 */
export const deleteMarkup = mutationGeneric({
  args: {
    scope: v.union(
      v.literal("provider"),
      v.literal("model"),
      v.literal("tool"),
    ),
    providerId: v.string(),
    modelId: v.optional(v.string()),
    toolId: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("markupMultiplier")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .collect();

    const match = existing.find((m) => {
      if (m.scope !== args.scope) return false;
      if (args.scope === "provider") return true;
      if (args.scope === "model") {
        return (m as { modelId: string }).modelId === args.modelId;
      }
      if (args.scope === "tool") {
        return (m as { toolId: string }).toolId === args.toolId;
      }
      return false;
    });

    if (match) {
      await ctx.db.delete(match._id);
      return true;
    }
    return false;
  },
});
