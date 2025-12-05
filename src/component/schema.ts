import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  vCost,
  vCostForUser,
  vUsage,
  vToolUsage,
  vToolCost,
  vToolCostForUser,
  vToolPricing,
  vToolLimits,
} from "../validators.js";

export default defineSchema({
  /** Stores calculated costs for each AI model request */
  costPerAIRequest: defineTable({
    userId: v.optional(v.string()),
    threadId: v.string(),
    messageId: v.string(),
    cost: vCost,
    costForUser: vCostForUser,
    usage: vUsage,
  })
    .index("by_user", ["userId"])
    .index("by_thread", ["threadId"])
    .index("by_message", ["messageId"]),

  /** Stores calculated costs for each tool usage */
  costPerTools: defineTable({
    userId: v.optional(v.string()),
    threadId: v.string(),
    messageId: v.string(),
    providerId: v.string(),
    toolId: v.string(),
    usage: vToolUsage,
    cost: vToolCost,
    costForUser: vToolCostForUser,
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_thread", ["threadId"])
    .index("by_provider", ["providerId"])
    .index("by_provider_and_tool", ["providerId", "toolId"]),

  /** AI model pricing data from models.dev API */
  aiPricing: defineTable({
    providerId: v.string(),
    providerName: v.string(),
    modelId: v.string(),
    modelName: v.string(),
    pricing: v.object({
      input: v.number(),
      output: v.number(),
      reasoning: v.optional(v.number()),
      cache_read: v.optional(v.number()),
      cache_write: v.optional(v.number()),
    }),
    limits: v.object({
      context: v.number(),
      output: v.number(),
    }),
    lastUpdated: v.number(),
  })
    .index("by_model_id", ["modelId"])
    .index("by_provider", ["providerId"])
    .index("by_model_id_and_provider", ["modelId", "providerId"]),

  /** Tool-specific pricing configurations */
  toolsPricing: defineTable({
    providerId: v.string(),
    providerName: v.string(),
    toolId: v.string(),
    modelName: v.optional(v.string()),
    pricing: vToolPricing,
    limits: vToolLimits,
    lastUpdated: v.number(),
  })
    .index("by_provider", ["providerId"])
    .index("by_tool", ["toolId"])
    .index("by_provider_and_tool", ["providerId", "toolId"]),

  /** Markup multiplier configurations for providers, models, and tools */
  markupMultiplier: defineTable(
    v.union(
      v.object({
        scope: v.literal("provider"),
        providerId: v.string(),
        markupMultiplier: v.number(),
      }),
      v.object({
        scope: v.literal("model"),
        providerId: v.string(),
        modelId: v.string(),
        markupMultiplier: v.number(),
      }),
      v.object({
        scope: v.literal("tool"),
        providerId: v.string(),
        toolId: v.string(),
        markupMultiplier: v.number(),
      }),
    ),
  )
    .index("by_scope", ["scope"])
    .index("by_provider", ["providerId"])
    .index("by_scope_and_provider", ["scope", "providerId"])
    .index("by_provider_and_model", ["providerId", "modelId"])
    .index("by_provider_and_tool", ["providerId", "toolId"]),
});
