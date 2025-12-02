import { v, type Infer } from "convex/values";

// ============================================================================
// Environment Validators
// ============================================================================

/**
 * Generic validator for environment keys passed from the main app.
 * Components use this to accept any environment variables the caller provides.
 */
export const vEnvKeys = v.optional(v.record(v.string(), v.string()));

export type EnvKeys = Infer<typeof vEnvKeys>;

// ============================================================================
// Usage Validators
// ============================================================================

/** Token usage data from AI model responses */
export const vUsage = v.object({
  promptTokens: v.number(),
  completionTokens: v.number(),
  totalTokens: v.number(),
  reasoningTokens: v.optional(v.number()),
  cachedInputTokens: v.optional(v.number()),
});

export type Usage = Infer<typeof vUsage>;

// ============================================================================
// Tool Usage Validators
// ============================================================================

/**
 * Comprehensive usage validator for tools supporting multiple pricing models.
 *
 * Supported usage types:
 * - `credits`: Credit-based usage (e.g., Firecrawl, some API services)
 * - `tokens`: Token-based usage (e.g., OpenAI, Anthropic tools)
 * - `requests`: Flat per-request usage (e.g., simple API calls)
 * - `compute`: Compute-time based usage (e.g., GPU/CPU time)
 * - `storage`: Storage-based usage (e.g., file storage, data retention)
 * - `bandwidth`: Data transfer usage (e.g., CDN, streaming)
 * - `units`: Generic unit-based usage (e.g., images, documents, pages)
 * - `tiered`: Tiered usage with volume-based rates
 * - `composite`: Combined usage from multiple sources
 * - `custom`: Flexible structure for any other pricing model
 */
export const vToolUsage = v.union(
  // Credit-based usage (e.g., Firecrawl, API credits)
  v.object({
    type: v.literal("credits"),
    credits: v.number(),
    creditType: v.optional(v.string()), // e.g., "scrape", "crawl", "extract"
  }),

  // Token-based usage (e.g., LLM-powered tools)
  v.object({
    type: v.literal("tokens"),
    inputTokens: v.number(),
    outputTokens: v.number(),
    reasoningTokens: v.optional(v.number()),
    cacheReadTokens: v.optional(v.number()),
    cacheWriteTokens: v.optional(v.number()),
  }),

  // Flat per-request usage
  v.object({
    type: v.literal("requests"),
    requests: v.number(),
    requestType: v.optional(v.string()), // e.g., "search", "embed", "generate"
  }),

  // Compute-time based usage (e.g., GPU time, processing time)
  v.object({
    type: v.literal("compute"),
    durationMs: v.number(), // Duration in milliseconds
    computeType: v.optional(v.string()), // e.g., "gpu", "cpu", "tpu"
    tier: v.optional(v.string()), // e.g., "standard", "premium", "enterprise"
  }),

  // Storage-based usage (e.g., file storage, data retention)
  v.object({
    type: v.literal("storage"),
    bytes: v.number(),
    durationSeconds: v.optional(v.number()), // How long stored
    storageClass: v.optional(v.string()), // e.g., "hot", "cold", "archive"
  }),

  // Bandwidth/data transfer usage
  v.object({
    type: v.literal("bandwidth"),
    bytesIn: v.optional(v.number()),
    bytesOut: v.optional(v.number()),
    region: v.optional(v.string()), // e.g., "us-east", "eu-west"
  }),

  // Generic unit-based usage (e.g., images, documents, pages, characters)
  v.object({
    type: v.literal("units"),
    units: v.number(),
    unitType: v.string(), // e.g., "images", "pages", "documents", "characters", "words"
    metadata: v.optional(v.record(v.string(), v.any())), // Additional context
  }),

  // Tiered usage with volume tracking
  v.object({
    type: v.literal("tiered"),
    quantity: v.number(),
    tierName: v.optional(v.string()), // Which tier was applied
    unitType: v.string(), // What's being measured
  }),

  // Composite usage (multiple usage types combined)
  v.object({
    type: v.literal("composite"),
    components: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
        unitType: v.string(),
        cost: v.optional(v.number()),
      }),
    ),
  }),

  // Custom usage for any other pricing model
  v.object({
    type: v.literal("custom"),
    data: v.any(),
    description: v.optional(v.string()),
  }),
);

export type ToolUsage = Infer<typeof vToolUsage>;

// ============================================================================
// Tool Pricing Validators
// ============================================================================

/**
 * Comprehensive pricing validator for tools supporting multiple pricing models.
 * Each pricing type corresponds to a usage type in vToolUsage.
 *
 * Supported pricing types:
 * - `credits`: Credit-based pricing (e.g., Firecrawl, some API services)
 * - `tokens`: Token-based pricing (e.g., OpenAI, Anthropic tools)
 * - `requests`: Flat per-request pricing (e.g., simple API calls)
 * - `compute`: Compute-time based pricing (e.g., GPU/CPU time)
 * - `storage`: Storage-based pricing (e.g., file storage, data retention)
 * - `bandwidth`: Data transfer pricing (e.g., CDN, streaming)
 * - `units`: Generic unit-based pricing (e.g., images, documents, pages)
 * - `tiered`: Tiered pricing with volume-based rates
 * - `composite`: Combined pricing from multiple sources
 * - `custom`: Flexible structure for any other pricing model
 */
export const vToolPricing = v.union(
  // Credit-based pricing (e.g., Firecrawl, API credits)
  v.object({
    type: v.literal("credits"),
    costPerCredit: v.number(),
    currency: v.string(),
    creditTypes: v.optional(v.record(v.string(), v.number())), // Different rates per credit type
  }),

  // Token-based pricing (e.g., LLM-powered tools)
  v.object({
    type: v.literal("tokens"),
    input: v.number(),
    output: v.number(),
    reasoning: v.optional(v.number()),
    cache_read: v.optional(v.number()),
    cache_write: v.optional(v.number()),
    currency: v.string(),
  }),

  // Flat rate per request
  v.object({
    type: v.literal("requests"),
    costPerRequest: v.number(),
    currency: v.string(),
    requestTypes: v.optional(v.record(v.string(), v.number())), // Different rates per request type
  }),

  // Compute-time based pricing (e.g., GPU time)
  v.object({
    type: v.literal("compute"),
    costPerMs: v.number(), // Cost per millisecond
    currency: v.string(),
    computeTypes: v.optional(v.record(v.string(), v.number())), // e.g., { "gpu": 0.001, "cpu": 0.0001 }
    tiers: v.optional(v.record(v.string(), v.number())), // e.g., { "standard": 1, "premium": 2 }
  }),

  // Storage-based pricing
  v.object({
    type: v.literal("storage"),
    costPerByteSecond: v.number(), // Cost per byte per second
    currency: v.string(),
    storageClasses: v.optional(v.record(v.string(), v.number())), // e.g., { "hot": 1, "cold": 0.1 }
  }),

  // Bandwidth/data transfer pricing
  v.object({
    type: v.literal("bandwidth"),
    costPerByteIn: v.optional(v.number()),
    costPerByteOut: v.optional(v.number()),
    currency: v.string(),
    regions: v.optional(v.record(v.string(), v.number())), // Regional multipliers
  }),

  // Generic unit-based pricing
  v.object({
    type: v.literal("units"),
    costPerUnit: v.number(),
    unitType: v.string(), // e.g., "images", "pages", "documents"
    currency: v.string(),
  }),

  // Tiered pricing with volume-based rates
  v.object({
    type: v.literal("tiered"),
    tiers: v.array(
      v.object({
        from: v.number(),
        to: v.optional(v.number()), // undefined means unlimited
        rate: v.number(),
      }),
    ),
    unitType: v.string(),
    currency: v.string(),
  }),

  // Composite pricing (multiple pricing components)
  v.object({
    type: v.literal("composite"),
    components: v.array(
      v.object({
        name: v.string(),
        costPerUnit: v.number(),
        unitType: v.string(),
      }),
    ),
    currency: v.string(),
  }),

  // Custom pricing for any other model
  v.object({
    type: v.literal("custom"),
    data: v.any(),
    currency: v.string(),
    description: v.optional(v.string()),
  }),
);

export type ToolPricing = Infer<typeof vToolPricing>;

/**
 * Rate limits and usage limits for tools
 */
export const vToolLimits = v.optional(
  v.object({
    maxRequestsPerSecond: v.optional(v.number()),
    maxRequestsPerMinute: v.optional(v.number()),
    maxRequestsPerHour: v.optional(v.number()),
    maxRequestsPerDay: v.optional(v.number()),
    maxRequestsPerMonth: v.optional(v.number()),
    maxConcurrentRequests: v.optional(v.number()),
    maxBytesPerRequest: v.optional(v.number()),
    maxTokensPerRequest: v.optional(v.number()),
  }),
);

export type ToolLimits = Infer<typeof vToolLimits>;

/** Pricing data structure for AI models ($ per million tokens) */
export const vPricingData = v.object({
  input: v.number(),
  output: v.number(),
  reasoning: v.optional(v.number()),
  cache_read: v.optional(v.number()),
  cache_write: v.optional(v.number()),
});

/** Context and output limits for AI models */
export const vLimits = v.object({
  context: v.number(),
  output: v.number(),
});

/** Complete AI model pricing record */
export const vPricing = v.object({
  providerId: v.string(),
  providerName: v.string(),
  modelId: v.string(),
  modelName: v.string(),
  pricing: vPricingData,
  limits: vLimits,
  lastUpdated: v.number(),
});

export type Pricing = Infer<typeof vPricing>;

// ============================================================================
// Cost Validators
// ============================================================================

/** Calculated cost breakdown for AI model usage */
export const vCost = v.object({
  promptTokensCost: v.number(),
  completionTokensCost: v.number(),
  reasoningTokensCost: v.optional(v.number()),
  cachedInputTokensCost: v.optional(v.number()),
  totalCost: v.number(),
});

export type Cost = Infer<typeof vCost>;

/** User-facing cost with markup applied */
export const vCostForUser = v.object({
  promptTokensCost: v.number(),
  completionTokensCost: v.number(),
  reasoningTokensCost: v.optional(v.number()),
  cachedInputTokensCost: v.optional(v.number()),
  totalCost: v.number(),
});

export type CostForUser = Infer<typeof vCostForUser>;

/** Arguments for adding AI cost */
export const vAddAICost = v.object({
  messageId: v.string(),
  userId: v.optional(v.string()),
  threadId: v.string(),
  usage: vUsage,
  modelId: v.string(),
  providerId: v.string(),
  markupMultiplier: v.optional(v.number()),
});

export type AddAICostArgs = Infer<typeof vAddAICost>;

/** Arguments for adding tool cost */
export const vAddToolCost = v.object({
  messageId: v.string(),
  userId: v.optional(v.string()),
  threadId: v.string(),
  providerId: v.string(),
  toolId: v.string(),
  usage: vToolUsage,
  markupMultiplier: v.optional(v.number()),
});

export type AddToolCostArgs = Infer<typeof vAddToolCost>;

// ============================================================================
// Tool Cost Validators
// ============================================================================

/**
 * Comprehensive cost breakdown for tool usage.
 * Stores the raw cost with optional detailed breakdown.
 */
export const vToolCost = v.object({
  // Total cost (raw, before markup)
  amount: v.number(), // Raw cost in smallest currency unit (e.g., cents) or as decimal
  currency: v.string(), // ISO 4217 currency code (e.g., "USD", "EUR")

  // Detailed breakdown (optional, matches usage types)
  breakdown: v.optional(
    v.union(
      // Credit-based cost breakdown
      v.object({
        type: v.literal("credits"),
        credits: v.number(),
        costPerCredit: v.number(),
      }),

      // Token-based cost breakdown
      v.object({
        type: v.literal("tokens"),
        inputTokensCost: v.optional(v.number()),
        outputTokensCost: v.optional(v.number()),
        reasoningTokensCost: v.optional(v.number()),
        cacheReadTokensCost: v.optional(v.number()),
        cacheWriteTokensCost: v.optional(v.number()),
      }),

      // Request-based cost breakdown
      v.object({
        type: v.literal("requests"),
        requests: v.number(),
        costPerRequest: v.number(),
      }),

      // Compute-based cost breakdown
      v.object({
        type: v.literal("compute"),
        durationMs: v.number(),
        costPerMs: v.number(),
        computeType: v.optional(v.string()),
      }),

      // Storage-based cost breakdown
      v.object({
        type: v.literal("storage"),
        bytes: v.number(),
        durationSeconds: v.number(),
        costPerByteSecond: v.number(),
      }),

      // Bandwidth-based cost breakdown
      v.object({
        type: v.literal("bandwidth"),
        bytesInCost: v.optional(v.number()),
        bytesOutCost: v.optional(v.number()),
      }),

      // Unit-based cost breakdown
      v.object({
        type: v.literal("units"),
        units: v.number(),
        unitType: v.string(),
        costPerUnit: v.number(),
      }),

      // Tiered cost breakdown
      v.object({
        type: v.literal("tiered"),
        quantity: v.number(),
        tierApplied: v.string(),
        effectiveRate: v.number(),
      }),

      // Composite cost breakdown
      v.object({
        type: v.literal("composite"),
        components: v.array(
          v.object({
            name: v.string(),
            quantity: v.number(),
            unitCost: v.number(),
            totalCost: v.number(),
          }),
        ),
      }),

      // Custom cost breakdown
      v.object({
        type: v.literal("custom"),
        data: v.any(),
      }),
    ),
  ),
});

export type ToolCost = Infer<typeof vToolCost>;

/**
 * User-facing tool cost with markup applied.
 * Mirrors vToolCost structure for user-facing amounts.
 */
export const vToolCostForUser = v.object({
  // Total cost to charge user (with markup)
  amount: v.number(),
  currency: v.string(),

  // Markup information
  markupMultiplier: v.optional(v.number()),

  // Detailed breakdown (optional, matches usage types)
  breakdown: v.optional(
    v.union(
      // Credit-based cost breakdown
      v.object({
        type: v.literal("credits"),
        credits: v.number(),
        costPerCredit: v.number(),
      }),

      // Token-based cost breakdown
      v.object({
        type: v.literal("tokens"),
        inputTokensCost: v.optional(v.number()),
        outputTokensCost: v.optional(v.number()),
        reasoningTokensCost: v.optional(v.number()),
        cacheReadTokensCost: v.optional(v.number()),
        cacheWriteTokensCost: v.optional(v.number()),
      }),

      // Request-based cost breakdown
      v.object({
        type: v.literal("requests"),
        requests: v.number(),
        costPerRequest: v.number(),
      }),

      // Compute-based cost breakdown
      v.object({
        type: v.literal("compute"),
        durationMs: v.number(),
        costPerMs: v.number(),
        computeType: v.optional(v.string()),
      }),

      // Storage-based cost breakdown
      v.object({
        type: v.literal("storage"),
        bytes: v.number(),
        durationSeconds: v.number(),
        costPerByteSecond: v.number(),
      }),

      // Bandwidth-based cost breakdown
      v.object({
        type: v.literal("bandwidth"),
        bytesInCost: v.optional(v.number()),
        bytesOutCost: v.optional(v.number()),
      }),

      // Unit-based cost breakdown
      v.object({
        type: v.literal("units"),
        units: v.number(),
        unitType: v.string(),
        costPerUnit: v.number(),
      }),

      // Tiered cost breakdown
      v.object({
        type: v.literal("tiered"),
        quantity: v.number(),
        tierApplied: v.string(),
        effectiveRate: v.number(),
      }),

      // Composite cost breakdown
      v.object({
        type: v.literal("composite"),
        components: v.array(
          v.object({
            name: v.string(),
            quantity: v.number(),
            unitCost: v.number(),
            totalCost: v.number(),
          }),
        ),
      }),

      // Custom cost breakdown
      v.object({
        type: v.literal("custom"),
        data: v.any(),
      }),
    ),
  ),
});

export type ToolCostForUser = Infer<typeof vToolCostForUser>;

// ============================================================================
// Markup Multiplier Validators
// ============================================================================

/**
 * Markup multiplier configuration with union type.
 * - Provider scope: only requires providerId
 * - Model scope: requires providerId + modelId
 * - Tool scope: requires providerId + toolId
 */
export const vMarkupMultiplierConfig = v.union(
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
);

export type MarkupMultiplierConfig = Infer<typeof vMarkupMultiplierConfig>;

/** Provider-level markup */
export const vProviderMarkup = v.object({
  scope: v.literal("provider"),
  providerId: v.string(),
  markupMultiplier: v.number(),
});

export type ProviderMarkup = Infer<typeof vProviderMarkup>;

/** Model-level markup */
export const vModelMarkup = v.object({
  scope: v.literal("model"),
  providerId: v.string(),
  modelId: v.string(),
  markupMultiplier: v.number(),
});

export type ModelMarkup = Infer<typeof vModelMarkup>;

/** Tool-level markup */
export const vToolMarkup = v.object({
  scope: v.literal("tool"),
  providerId: v.string(),
  toolId: v.string(),
  markupMultiplier: v.number(),
});

export type ToolMarkup = Infer<typeof vToolMarkup>;
