import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import {
  vMarkupMultiplierConfig,
  vProviderMarkup,
  vModelMarkup,
  vToolMarkup,
} from "../validators.js";

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
 * Get a specific markup multiplier by scope and identifiers
 */
export const getMarkupMultiplier = queryGeneric({
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
  returns: v.union(vMarkupMultiplierConfig, v.null()),
  handler: async (ctx, args) => {
    const allByProvider = await ctx.db
      .query("markupMultiplier")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .collect();

    const match = allByProvider.find((m) => {
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

    if (!match) return null;

    if (match.scope === "provider") {
      return {
        scope: "provider" as const,
        providerId: match.providerId,
        markupMultiplier: match.markupMultiplier,
      };
    }
    if (match.scope === "model") {
      return {
        scope: "model" as const,
        providerId: match.providerId,
        modelId: (match as { modelId: string }).modelId,
        markupMultiplier: match.markupMultiplier,
      };
    }
    return {
      scope: "tool" as const,
      providerId: match.providerId,
      toolId: (match as { toolId: string }).toolId,
      markupMultiplier: match.markupMultiplier,
    };
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
