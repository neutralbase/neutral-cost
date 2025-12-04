import { actionGeneric, mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import { api } from "./_generated/api.js";
import type { Doc } from "./_generated/dataModel.js";
import {
  vEnvKeys,
  vPricing,
  vToolPricing,
  vToolLimits,
} from "../validators.js";
import type {
  ModelsDevApiResponse,
  PricingUpdateResult,
} from "../client/types.js";
import {
  MODELS_DEV_API_URL,
  parseModelsDevResponse,
  hasPricingChanged,
} from "../shared.js";

// ============================================================================
// Actions
// ============================================================================

/**
 * Fetch and update pricing data from models.dev API
 *
 * @param envKeys - Optional environment variables (e.g., MODELS_DEV_API_KEY for authenticated access)
 * @returns Update statistics
 */
export const updatePricingData = actionGeneric({
  args: { envKeys: vEnvKeys },
  handler: async (ctx, { envKeys }): Promise<PricingUpdateResult> => {
    try {
      // Build fetch options with optional authentication
      const fetchOptions: RequestInit = {};
      if (envKeys?.MODELS_DEV_API_KEY) {
        fetchOptions.headers = {
          Authorization: `Bearer ${envKeys.MODELS_DEV_API_KEY}`,
        };
      }

      // Fetch pricing data from models.dev
      const response = await fetch(MODELS_DEV_API_URL, fetchOptions);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ModelsDevApiResponse = await response.json();

      // Parse the response into our pricing format
      const pricingUpdates = parseModelsDevResponse(data);

      // Update the database
      const result = await ctx.runMutation(api.pricing.updatePricingTable, {
        pricingData: pricingUpdates,
      });

      return {
        updatedModels: pricingUpdates.length,
        ...result,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to update pricing data: ${errorMessage}`);
    }
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Update the pricing table with new data.
 * Handles inserts, updates, and deletions to keep data in sync.
 *
 * @param pricingData - Array of pricing records to sync
 * @returns Insert, update, and delete counts
 */
export const updatePricingTable = mutationGeneric({
  args: {
    pricingData: v.array(vPricing),
  },
  handler: async (ctx, args) => {
    // Get all existing pricing data
    const existingPricing = await ctx.db.query("aiPricing").collect();

    // Create lookup map: "modelId:providerId" -> existing record
    const existingMap = new Map(
      existingPricing.map((p) => [`${p.modelId}:${p.providerId}`, p]),
    );

    // Track which entries exist in new data
    const seenKeys = new Set<string>();

    let insertCount = 0;
    let updateCount = 0;

    // Process each new pricing entry
    for (const newPricing of args.pricingData) {
      const key = `${newPricing.modelId}:${newPricing.providerId}`;
      seenKeys.add(key);

      const existing = existingMap.get(key);

      if (!existing) {
        // Insert new entry
        await ctx.db.insert("aiPricing", newPricing);
        insertCount++;
      } else if (hasPricingChanged(existing, newPricing)) {
        // Update changed entry
        await ctx.db.patch(existing._id, newPricing);
        updateCount++;
      }
    }

    // Delete entries no longer in the API
    let deleteCount = 0;
    for (const [key, existing] of existingMap.entries()) {
      if (!seenKeys.has(key)) {
        await ctx.db.delete(existing._id);
        deleteCount++;
      }
    }

    return { insertCount, updateCount, deleteCount };
  },
});

// ============================================================================
// Queries
// ============================================================================

/**
 * Get pricing for a specific model and provider.
 *
 * @param modelId - AI model identifier
 * @param providerId - Provider identifier
 * @returns Pricing record or null if not found
 */
export const getPricing = queryGeneric({
  args: {
    modelId: v.string(),
    providerId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiPricing")
      .withIndex("by_model_id_and_provider", (q: any) =>
        q.eq("modelId", args.modelId).eq("providerId", args.providerId),
      )
      .first();
  },
});

/**
 * Get all pricing data.
 *
 * @returns Array of all AI pricing records
 */
export const getAllPricing = queryGeneric({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("aiPricing").collect();
  },
});

/**
 * Get pricing data for a specific provider.
 *
 * @param providerId - Provider identifier
 * @returns Array of pricing records for the provider
 */
export const getPricingByProvider = queryGeneric({
  args: {
    providerId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiPricing")
      .withIndex("by_provider", (q: any) => q.eq("providerId", args.providerId))
      .collect();
  },
});

/**
 * Search pricing by model name (partial match).
 *
 * @param searchTerm - Search term to match against model name/ID
 * @returns Array of matching pricing records
 */
export const searchPricingByModelName = queryGeneric({
  args: {
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    const allPricing = await ctx.db.query("aiPricing").collect();
    const searchLower = args.searchTerm.toLowerCase();

    return allPricing.filter(
      (p) =>
        p.modelName.toLowerCase().includes(searchLower) ||
        p.modelId.toLowerCase().includes(searchLower),
    );
  },
});

// ============================================================================
// Tool Pricing Queries
// ============================================================================

/**
 * Get tool pricing by provider and optional model ID.
 * Lookup order:
 * 1. toolsPricing with exact providerId + modelId match
 * 2. toolsPricing with providerId only (if modelId not specified or not found)
 * 3. aiPricing with providerId as modelId (fallback for LLM tools)
 *
 * @param providerId - Provider identifier
 * @param toolId - Optional model/tool identifier
 * @returns Tool or AI pricing record, or null if not found
 */
export const getToolPricing = queryGeneric({
  args: {
    providerId: v.string(),
    toolId: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<Doc<"toolsPricing"> | Doc<"aiPricing"> | null> => {
    // 1. Try exact match: providerId + modelId
    if (args.toolId) {
      const exactMatch = await ctx.db
        .query("toolsPricing")
        .withIndex("by_provider_and_tool", (q: any) =>
          q.eq("providerId", args.providerId).eq("toolId", args.toolId),
        )
        .first();

      if (exactMatch) {
        return exactMatch;
      }
    }

    // 2. Try provider-only match (for default/base pricing)
    const providerMatch = await ctx.db
      .query("toolsPricing")
      .withIndex("by_provider_and_tool", (q: any) =>
        q.eq("providerId", args.providerId).eq("toolId", undefined),
      )
      .first();

    if (providerMatch) {
      return providerMatch;
    }

    // 3. Fallback: try aiPricing with providerId as modelId
    const aiPricingResult = await ctx.db
      .query("aiPricing")
      .withIndex("by_model_id", (q: any) => q.eq("modelId", args.providerId))
      .first();

    return aiPricingResult ?? null;
  },
});

/**
 * Get all tool pricing records.
 *
 * @returns Array of all tool pricing records
 */
export const getAllToolPricing = queryGeneric({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("toolsPricing").collect();
  },
});

/**
 * Get tool pricing by provider.
 *
 * @param providerId - Provider identifier
 * @returns Array of tool pricing records for the provider
 */
export const getToolPricingByProvider = queryGeneric({
  args: {
    providerId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("toolsPricing")
      .withIndex("by_provider", (q: any) => q.eq("providerId", args.providerId))
      .collect();
  },
});

// ============================================================================
// Tool Pricing Mutations
// ============================================================================

/**
 * Add or update tool pricing.
 *
 * @param providerId - Provider identifier
 * @param providerName - Display name for the provider
 * @param modelId - Optional model/tool identifier
 * @param modelName - Optional display name for the model/tool
 * @param pricing - Pricing configuration
 * @param limits - Optional rate limits
 * @returns Database record ID
 */
export const upsertToolPricing = mutationGeneric({
  args: {
    providerId: v.string(),
    providerName: v.string(),
    modelId: v.optional(v.string()),
    modelName: v.optional(v.string()),
    pricing: vToolPricing,
    limits: vToolLimits,
  },
  handler: async (ctx, args) => {
    // Check if pricing already exists for this provider + model combination
    const existing = args.modelId
      ? await ctx.db
          .query("toolsPricing")
          .withIndex("by_provider_and_tool", (q: any) =>
            q.eq("providerId", args.providerId).eq("modelId", args.modelId),
          )
          .first()
      : await ctx.db
          .query("toolsPricing")
          .withIndex("by_provider_and_tool", (q: any) =>
            q.eq("providerId", args.providerId).eq("modelId", undefined),
          )
          .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        providerName: args.providerName,
        modelId: args.modelId,
        modelName: args.modelName,
        pricing: args.pricing,
        limits: args.limits,
        lastUpdated: Date.now(),
      });
      return existing._id;
    }

    // Insert new
    return await ctx.db.insert("toolsPricing", {
      providerId: args.providerId,
      providerName: args.providerName,
      modelId: args.modelId,
      modelName: args.modelName,
      pricing: args.pricing,
      limits: args.limits,
      lastUpdated: Date.now(),
    });
  },
});

/**
 * Delete tool pricing.
 *
 * @param providerId - Provider identifier
 * @param modelId - Optional model/tool identifier
 * @returns True if deleted, false if not found
 */
export const deleteToolPricing = mutationGeneric({
  args: {
    providerId: v.string(),
    modelId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = args.modelId
      ? await ctx.db
          .query("toolsPricing")
          .withIndex("by_provider_and_tool", (q: any) =>
            q.eq("providerId", args.providerId).eq("modelId", args.modelId),
          )
          .first()
      : await ctx.db
          .query("toolsPricing")
          .withIndex("by_provider_and_tool", (q: any) =>
            q.eq("providerId", args.providerId).eq("modelId", undefined),
          )
          .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return true;
    }

    return false;
  },
});
