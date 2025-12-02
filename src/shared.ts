import type {
  CalculatedCosts,
  ModelsDevModel,
  ModelsDevApiResponse,
  ProviderMarkupMultiplier,
  ModelMarkupMultiplier,
  ToolMarkupMultiplier,
} from "./client/types.js";
import type {
  Pricing,
  Usage,
  ToolUsage,
  ToolPricing,
  ToolCost,
  ToolCostForUser,
} from "./validators.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Result from calculating tool costs.
 * Contains both raw cost and user-facing cost with markup.
 */
export interface CalculatedToolCost {
  cost: ToolCost;
  costForUser: ToolCostForUser;
}

// ============================================================================
// Constants
// ============================================================================

export const MILLION = 1_000_000;

export const MODELS_DEV_API_URL = "https://models.dev/api.json";

// ============================================================================
// Cost Calculation Functions
// ============================================================================

/**
 * Pricing format from models.dev API:
 * {
 *   "cost": {
 *     "input": 0.3,        // $ per million input tokens
 *     "output": 2.5,       // $ per million output tokens
 *     "reasoning": 4,      // $ per million reasoning tokens (optional)
 *     "cache_read": 0.075  // $ per million cached input tokens (optional)
 *   }
 * }
 */

/**
 * Calculate costs based on usage and pricing from models.dev format.
 * All costs are returned in USD.
 *
 * @param usage - Token usage from the AI response
 * @param pricing - Pricing data with costs per million tokens
 * @returns Calculated costs in USD
 */
export function calculateCosts(
  usage: Usage,
  pricing: Pricing,
): CalculatedCosts {
  const { pricing: prices } = pricing;

  // Calculate cost for prompt/input tokens
  // Formula: (tokens / 1,000,000) * price_per_million
  const promptTokensCost =
    ((usage.promptTokens || 0) / MILLION) * (prices.input || 0);

  // Calculate cost for completion/output tokens
  const completionTokensCost =
    ((usage.completionTokens || 0) / MILLION) * (prices.output || 0);

  // Calculate cost for reasoning tokens
  // Many models support reasoning but don't have a separate reasoning price in models.dev
  // In these cases, reasoning tokens are billed at the OUTPUT token rate
  // since reasoning is part of the model's generation/output process
  const reasoningPrice = prices.reasoning ?? prices.output ?? 0;
  const reasoningTokensCost =
    ((usage.reasoningTokens || 0) / MILLION) * reasoningPrice;

  // Calculate cost for cached input tokens
  // If no cache_read price specified, use 25% of input price as default
  const cacheReadPrice = prices.cache_read ?? (prices.input || 0) * 0.25;
  const cachedInputTokensCost =
    ((usage.cachedInputTokens || 0) / MILLION) * cacheReadPrice;

  // Calculate total cost
  const totalCost =
    promptTokensCost +
    completionTokensCost +
    reasoningTokensCost +
    cachedInputTokensCost;

  // Round all values to 8 decimal places for precision
  return {
    promptTokensCost: Math.round(promptTokensCost * 1e8) / 1e8,
    completionTokensCost: Math.round(completionTokensCost * 1e8) / 1e8,
    reasoningTokensCost: Math.round(reasoningTokensCost * 1e8) / 1e8,
    cachedInputTokensCost: Math.round(cachedInputTokensCost * 1e8) / 1e8,
    totalCost: Math.round(totalCost * 1e8) / 1e8,
  };
}

/**
 * Calculate user costs by applying a markup multiplier to the base costs.
 *
 * @param costs - The calculated costs from calculateCosts()
 * @param markupMultiplier - Multiplier to apply (e.g., 1.5 for 50% markup)
 * @returns Costs with markup applied, in USD
 */
export function calculateUserCosts(
  costs: CalculatedCosts,
  markupMultiplier: number,
): CalculatedCosts {
  return {
    promptTokensCost:
      Math.round(costs.promptTokensCost * markupMultiplier * 1e8) / 1e8,
    completionTokensCost:
      Math.round(costs.completionTokensCost * markupMultiplier * 1e8) / 1e8,
    reasoningTokensCost:
      Math.round(costs.reasoningTokensCost * markupMultiplier * 1e8) / 1e8,
    cachedInputTokensCost:
      Math.round(costs.cachedInputTokensCost * markupMultiplier * 1e8) / 1e8,
    totalCost: Math.round(costs.totalCost * markupMultiplier * 1e8) / 1e8,
  };
}

// ============================================================================
// Pricing Data Parsing Functions
// ============================================================================

/**
 * Parse a single model's pricing data into our Pricing format.
 *
 * @param providerId - Provider identifier
 * @param providerName - Display name for the provider
 * @param modelId - Model identifier
 * @param model - Raw model data from models.dev API
 * @returns Formatted pricing record
 */
export function parseModelPricing(
  providerId: string,
  providerName: string,
  modelId: string,
  model: ModelsDevModel,
): Omit<Pricing, "_id" | "_creationTime"> {
  return {
    providerId,
    providerName,
    modelId,
    modelName: model.name || modelId,
    pricing: {
      input: model.cost?.input || 0,
      output: model.cost?.output || 0,
      reasoning: model.cost?.reasoning,
      cache_read: model.cost?.cache_read,
      cache_write: model.cost?.cache_write,
    },
    limits: {
      context: model.limit?.context || 0,
      output: model.limit?.output || 0,
    },
    lastUpdated: Date.now(),
  };
}

/**
 * Parse the models.dev API response into pricing data array.
 *
 * @param data - Raw API response from models.dev
 * @returns Array of formatted pricing records
 */
export function parseModelsDevResponse(
  data: ModelsDevApiResponse,
): Omit<Pricing, "_id" | "_creationTime">[] {
  const pricingUpdates: Omit<Pricing, "_id" | "_creationTime">[] = [];

  for (const [providerId, providerData] of Object.entries(data)) {
    // Skip invalid provider entries
    if (
      !providerData ||
      typeof providerData !== "object" ||
      !providerData.models
    ) {
      continue;
    }

    const providerName = providerData.name || providerId;

    // Process each model within the provider
    for (const [modelId, modelData] of Object.entries(providerData.models)) {
      if (!modelData || typeof modelData !== "object") {
        continue;
      }

      pricingUpdates.push(
        parseModelPricing(providerId, providerName, modelId, modelData),
      );
    }
  }

  return pricingUpdates;
}

/**
 * Check if pricing data has changed between existing and new data.
 *
 * @param existing - Current pricing record from database
 * @param newPricing - New pricing data to compare
 * @returns True if any pricing fields have changed
 */
export function hasPricingChanged(
  existing: Pricing,
  newPricing: Omit<Pricing, "_id" | "_creationTime">,
): boolean {
  return (
    existing.pricing.input !== newPricing.pricing.input ||
    existing.pricing.output !== newPricing.pricing.output ||
    existing.pricing.reasoning !== newPricing.pricing.reasoning ||
    existing.pricing.cache_read !== newPricing.pricing.cache_read ||
    existing.pricing.cache_write !== newPricing.pricing.cache_write ||
    existing.limits.context !== newPricing.limits.context ||
    existing.limits.output !== newPricing.limits.output ||
    existing.modelName !== newPricing.modelName ||
    existing.providerName !== newPricing.providerName
  );
}

// ============================================================================
// Tool Cost Calculation Functions
// ============================================================================

/**
 * Round a number to 8 decimal places for precision
 */
function round8(value: number): number {
  return Math.round(value * 1e8) / 1e8;
}

/**
 * Calculate tool costs based on usage and pricing.
 * Supports all pricing/usage type combinations.
 *
 * @param usage - Tool usage data
 * @param pricing - Tool pricing configuration
 * @param markupMultiplier - Optional markup multiplier (default: 1)
 * @returns Calculated cost and costForUser with breakdown
 */
export function calculateToolCost(
  usage: ToolUsage,
  pricing: ToolPricing,
  markupMultiplier: number = 1,
): CalculatedToolCost {
  let amount = 0;
  let breakdown: ToolCost["breakdown"];
  const currency = pricing.currency;

  switch (usage.type) {
    case "credits": {
      if (pricing.type !== "credits") {
        throw new Error(
          `Usage type 'credits' requires pricing type 'credits', got '${pricing.type}'`,
        );
      }
      // Check for credit type-specific pricing
      const rate =
        usage.creditType && pricing.creditTypes?.[usage.creditType]
          ? pricing.creditTypes[usage.creditType]
          : pricing.costPerCredit;
      amount = round8(usage.credits * rate);
      breakdown = {
        type: "credits",
        credits: usage.credits,
        costPerCredit: rate,
      };
      break;
    }

    case "tokens": {
      if (pricing.type !== "tokens") {
        throw new Error(
          `Usage type 'tokens' requires pricing type 'tokens', got '${pricing.type}'`,
        );
      }
      const inputCost = round8((usage.inputTokens / MILLION) * pricing.input);
      const outputCost = round8(
        (usage.outputTokens / MILLION) * pricing.output,
      );
      const reasoningCost = usage.reasoningTokens
        ? round8(
            (usage.reasoningTokens / MILLION) *
              (pricing.reasoning ?? pricing.output),
          )
        : undefined;
      const cacheReadCost = usage.cacheReadTokens
        ? round8(
            (usage.cacheReadTokens / MILLION) *
              (pricing.cache_read ?? pricing.input * 0.25),
          )
        : undefined;
      const cacheWriteCost = usage.cacheWriteTokens
        ? round8(
            (usage.cacheWriteTokens / MILLION) *
              (pricing.cache_write ?? pricing.output),
          )
        : undefined;

      amount = round8(
        inputCost +
          outputCost +
          (reasoningCost ?? 0) +
          (cacheReadCost ?? 0) +
          (cacheWriteCost ?? 0),
      );
      breakdown = {
        type: "tokens",
        inputTokensCost: inputCost,
        outputTokensCost: outputCost,
        reasoningTokensCost: reasoningCost,
        cacheReadTokensCost: cacheReadCost,
        cacheWriteTokensCost: cacheWriteCost,
      };
      break;
    }

    case "requests": {
      if (pricing.type !== "requests") {
        throw new Error(
          `Usage type 'requests' requires pricing type 'requests', got '${pricing.type}'`,
        );
      }
      const rate =
        usage.requestType && pricing.requestTypes?.[usage.requestType]
          ? pricing.requestTypes[usage.requestType]
          : pricing.costPerRequest;
      amount = round8(usage.requests * rate);
      breakdown = {
        type: "requests",
        requests: usage.requests,
        costPerRequest: rate,
      };
      break;
    }

    case "compute": {
      if (pricing.type !== "compute") {
        throw new Error(
          `Usage type 'compute' requires pricing type 'compute', got '${pricing.type}'`,
        );
      }
      let rate = pricing.costPerMs;
      if (usage.computeType && pricing.computeTypes?.[usage.computeType]) {
        rate = pricing.computeTypes[usage.computeType];
      }
      if (usage.tier && pricing.tiers?.[usage.tier]) {
        rate *= pricing.tiers[usage.tier];
      }
      amount = round8(usage.durationMs * rate);
      breakdown = {
        type: "compute",
        durationMs: usage.durationMs,
        costPerMs: rate,
        computeType: usage.computeType,
      };
      break;
    }

    case "storage": {
      if (pricing.type !== "storage") {
        throw new Error(
          `Usage type 'storage' requires pricing type 'storage', got '${pricing.type}'`,
        );
      }
      let rate = pricing.costPerByteSecond;
      if (usage.storageClass && pricing.storageClasses?.[usage.storageClass]) {
        rate = pricing.storageClasses[usage.storageClass];
      }
      const durationSeconds = usage.durationSeconds ?? 1;
      amount = round8(usage.bytes * durationSeconds * rate);
      breakdown = {
        type: "storage",
        bytes: usage.bytes,
        durationSeconds,
        costPerByteSecond: rate,
      };
      break;
    }

    case "bandwidth": {
      if (pricing.type !== "bandwidth") {
        throw new Error(
          `Usage type 'bandwidth' requires pricing type 'bandwidth', got '${pricing.type}'`,
        );
      }
      let regionMultiplier = 1;
      if (usage.region && pricing.regions?.[usage.region]) {
        regionMultiplier = pricing.regions[usage.region];
      }
      const bytesInCost = usage.bytesIn
        ? round8(
            usage.bytesIn * (pricing.costPerByteIn ?? 0) * regionMultiplier,
          )
        : undefined;
      const bytesOutCost = usage.bytesOut
        ? round8(
            usage.bytesOut * (pricing.costPerByteOut ?? 0) * regionMultiplier,
          )
        : undefined;
      amount = round8((bytesInCost ?? 0) + (bytesOutCost ?? 0));
      breakdown = {
        type: "bandwidth",
        bytesInCost,
        bytesOutCost,
      };
      break;
    }

    case "units": {
      if (pricing.type !== "units") {
        throw new Error(
          `Usage type 'units' requires pricing type 'units', got '${pricing.type}'`,
        );
      }
      amount = round8(usage.units * pricing.costPerUnit);
      breakdown = {
        type: "units",
        units: usage.units,
        unitType: usage.unitType,
        costPerUnit: pricing.costPerUnit,
      };
      break;
    }

    case "tiered": {
      if (pricing.type !== "tiered") {
        throw new Error(
          `Usage type 'tiered' requires pricing type 'tiered', got '${pricing.type}'`,
        );
      }
      let effectiveRate = 0;
      let tierApplied = "default";
      for (const tier of pricing.tiers) {
        if (
          usage.quantity >= tier.from &&
          (tier.to === undefined || usage.quantity <= tier.to)
        ) {
          effectiveRate = tier.rate;
          tierApplied = `${tier.from}-${tier.to ?? "∞"}`;
          break;
        }
      }
      amount = round8(usage.quantity * effectiveRate);
      breakdown = {
        type: "tiered",
        quantity: usage.quantity,
        tierApplied,
        effectiveRate,
      };
      break;
    }

    case "composite": {
      if (pricing.type !== "composite") {
        throw new Error(
          `Usage type 'composite' requires pricing type 'composite', got '${pricing.type}'`,
        );
      }
      const componentCosts = usage.components.map((usageComp) => {
        const pricingComp = pricing.components.find(
          (p) => p.name === usageComp.name,
        );
        const unitCost = pricingComp?.costPerUnit ?? 0;
        const totalCost = round8(usageComp.quantity * unitCost);
        return {
          name: usageComp.name,
          quantity: usageComp.quantity,
          unitCost,
          totalCost,
        };
      });
      amount = round8(componentCosts.reduce((sum, c) => sum + c.totalCost, 0));
      breakdown = {
        type: "composite",
        components: componentCosts,
      };
      break;
    }

    case "custom": {
      if (pricing.type !== "custom") {
        throw new Error(
          `Usage type 'custom' requires pricing type 'custom', got '${pricing.type}'`,
        );
      }
      // Custom pricing needs custom logic - return 0 by default
      // Caller should handle custom calculations
      amount = 0;
      breakdown = {
        type: "custom",
        data: usage.data,
      };
      break;
    }

    default: {
      const exhaustiveCheck: never = usage;
      throw new Error(`Unsupported usage type: ${exhaustiveCheck}`);
    }
  }

  const userAmount =
    markupMultiplier !== 1 ? round8(amount * markupMultiplier) : amount;

  return {
    cost: {
      amount,
      currency,
      breakdown,
    },
    costForUser: {
      amount: userAmount,
      currency,
      markupMultiplier: markupMultiplier !== 1 ? markupMultiplier : undefined,
      breakdown,
    },
  };
}

/**
 * Calculate tool cost from aiPricing (fallback for LLM-based tools).
 *
 * @param usage - Token-based usage data
 * @param pricing - AI model pricing data
 * @param markupMultiplier - Optional markup multiplier (default: 1)
 * @returns Calculated cost and costForUser with token breakdown
 */
export function calculateToolCostFromTokenPricing(
  usage: ToolUsage,
  pricing: Pricing,
  markupMultiplier: number = 1,
): CalculatedToolCost {
  if (usage.type !== "tokens") {
    throw new Error("Token pricing can only be used with token-based usage");
  }

  const inputCost = round8(
    (usage.inputTokens / MILLION) * pricing.pricing.input,
  );
  const outputCost = round8(
    (usage.outputTokens / MILLION) * pricing.pricing.output,
  );
  const reasoningCost = usage.reasoningTokens
    ? round8(
        (usage.reasoningTokens / MILLION) *
          (pricing.pricing.reasoning ?? pricing.pricing.output),
      )
    : undefined;
  const cacheReadCost = usage.cacheReadTokens
    ? round8(
        (usage.cacheReadTokens / MILLION) *
          (pricing.pricing.cache_read ?? pricing.pricing.input * 0.25),
      )
    : undefined;
  const cacheWriteCost = usage.cacheWriteTokens
    ? round8(
        (usage.cacheWriteTokens / MILLION) *
          (pricing.pricing.cache_write ?? pricing.pricing.output),
      )
    : undefined;

  const amount = round8(
    inputCost +
      outputCost +
      (reasoningCost ?? 0) +
      (cacheReadCost ?? 0) +
      (cacheWriteCost ?? 0),
  );

  const userAmount =
    markupMultiplier !== 1 ? round8(amount * markupMultiplier) : amount;

  const breakdown = {
    type: "tokens" as const,
    inputTokensCost: inputCost,
    outputTokensCost: outputCost,
    reasoningTokensCost: reasoningCost,
    cacheReadTokensCost: cacheReadCost,
    cacheWriteTokensCost: cacheWriteCost,
  };

  return {
    cost: {
      amount,
      currency: "USD",
      breakdown,
    },
    costForUser: {
      amount: userAmount,
      currency: "USD",
      markupMultiplier: markupMultiplier !== 1 ? markupMultiplier : undefined,
      breakdown,
    },
  };
}

// ============================================================================
// Markup Multiplier Types and Functions
// ============================================================================

/**
 * Get the markup multiplier for a specific model, provider, or tool.
 * Priority: model-specific > tool-specific > provider-specific > default (0)
 *
 * @param providerId - Provider identifier
 * @param modelId - Optional model identifier
 * @param toolId - Optional tool identifier
 * @param providerMarkupMultipliers - Array of provider-level markup multipliers
 * @param modelMarkupMultipliers - Array of model-level markup multipliers
 * @param toolMarkupMultipliers - Array of tool-level markup multipliers
 * @returns The applicable markup multiplier
 */
export function getMarkupMultiplier({
  providerId,
  modelId,
  toolId,
  providerMarkupMultipliers,
  modelMarkupMultipliers,
  toolMarkupMultipliers,
}: {
  providerId: string;
  modelId?: string;
  toolId?: string;
  providerMarkupMultipliers: ProviderMarkupMultiplier[];
  modelMarkupMultipliers: ModelMarkupMultiplier[];
  toolMarkupMultipliers: ToolMarkupMultiplier[];
}): number {
  // First, check for model-specific markup if modelId is provided
  if (modelId) {
    const modelMarkup = modelMarkupMultipliers.find(
      (m) => m.providerId === providerId && m.modelId === modelId,
    );
    if (modelMarkup) {
      return modelMarkup.markupMultiplier;
    }
  }

  // Check for tool-specific markup if toolId is provided
  if (toolId) {
    const toolMarkup = toolMarkupMultipliers.find(
      (t) => t.providerId === providerId && t.toolId === toolId,
    );
    if (toolMarkup) {
      return toolMarkup.markupMultiplier;
    }
  }

  // Fall back to provider-level markup
  const providerMarkup = providerMarkupMultipliers.find(
    (p) => p.providerId === providerId,
  );
  if (providerMarkup) {
    return providerMarkup.markupMultiplier;
  }

  return 0;
}
