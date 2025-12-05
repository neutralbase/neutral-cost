import type {
  ApiFromModules,
  GenericActionCtx,
  GenericDataModel,
  GenericQueryCtx,
} from "convex/server";
import { actionGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import type { ComponentApi } from "../component/_generated/component.js";
import type { Usage, ToolUsage } from "../validators.js";
import { vAddAICost, vAddToolCost } from "../validators.js";
import type { AddAICostResult } from "../component/aiCosts.js";
import type { AddToolCostResult } from "../component/toolCosts.js";
import type {
  CtxWith,
  ModelMarkupMultiplier,
  ProviderMarkupMultiplier,
  ToolMarkupMultiplier,
} from "./types.js";
import { getMarkupMultiplier } from "../shared.js";

// API factory functions
export {
  createAICostsApi,
  createPricingApi,
  createToolCostApi,
  createMarkupApi,
} from "../component/api.js";

// Validators
export {
  vUsage,
  vToolUsage,
  vToolPricing,
  vCost,
  vCostForUser,
  vToolCost,
  vToolCostForUser,
  vAddAICost,
  vAddToolCost,
  vToolLimits,
  vMarkupMultiplierConfig,
  vProviderMarkup,
  vModelMarkup,
  vToolMarkup,
} from "../validators.js";

// Types
export type {
  Usage,
  ToolUsage,
  ToolPricing,
  Cost,
  CostForUser,
  ToolCost,
  ToolCostForUser,
  AddAICostArgs,
  AddToolCostArgs,
  MarkupMultiplierConfig,
  ProviderMarkup,
  ModelMarkup,
  ToolMarkup,
} from "../validators.js";

// Shared calculation functions
export {
  calculateCosts,
  calculateUserCosts,
  calculateToolCost,
  calculateToolCostFromTokenPricing,
} from "../shared.js";

// Result types
export type { AddAICostResult } from "../component/aiCosts.js";
export type { AddToolCostResult } from "../component/toolCosts.js";

// Export the ComponentApi type for consumers
export type { ComponentApi };

// Re-export CtxWith type for consumers
export type { CtxWith } from "./types.js";

// Client API type for use with clientApi method
export type ClientApi = ApiFromModules<{
  client: ReturnType<CostComponent["clientApi"]>;
}>["client"];

// ============================================================================
// CostComponent Class
// ============================================================================

/**
 * Backend API for the Cost component.
 *
 * Provides methods for tracking AI and tool usage costs, managing pricing data,
 * and querying cost information.
 *
 * Typically used like:
 *
 * ```ts
 * import { components } from "./_generated/api";
 * import { CostComponent } from "cost-component";
 *
 * const costs = new CostComponent(components.costBillingComponent, {
 *   defaultMarkupMultiplier: 1.5, // 50% markup
 * });
 *
 * // In an action:
 * const result = await costs.addAICost(ctx, {
 *   messageId: "msg_123",
 *   userId: "user_456",
 *   threadId: "thread_789",
 *   usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
 *   modelId: "gpt-4",
 *   providerId: "openai",
 * });
 * ```
 */
export class CostComponent {
  public readonly providerMarkupMultipliers:
    | ProviderMarkupMultiplier[]
    | undefined;
  public readonly modelMarkupMultipliers: ModelMarkupMultiplier[] | undefined;
  public readonly toolMarkupMultipliers: ToolMarkupMultiplier[] | undefined;

  /**
   * Create a new CostComponent instance.
   *
   * @param component - The component API, typically `components.costBillingComponent`
   *   from `./_generated/api` once configured in `convex.config.ts`.
   * @param options - Optional configuration.
   *   - `defaultMarkupMultiplier` - Default markup multiplier for user costs (default: 1.5 for 50% markup).
   */
  constructor(
    public component: ComponentApi,
    public options: {
      providerMarkupMultiplier?: ProviderMarkupMultiplier[];
      modelMarkupMultiplier?: ModelMarkupMultiplier[];
      toolMarkupMultiplier?: ToolMarkupMultiplier[];
    } = {},
  ) {
    this.providerMarkupMultipliers = options.providerMarkupMultiplier;
    this.modelMarkupMultipliers = options.modelMarkupMultiplier;
    this.toolMarkupMultipliers = options.toolMarkupMultiplier;
  }

  // ==========================================================================
  // AI Costs
  // ==========================================================================

  /**
   * Add an AI cost record.
   * Fetches pricing, calculates costs, and saves to database.
   *
   * @param ctx - A Convex action context.
   * @param args - Cost parameters.
   * @returns The calculated costs and database record ID.
   */
  async addAICost(
    ctx: CtxWith<"runAction">,
    args: {
      messageId: string;
      userId?: string;
      threadId: string;
      usage: Usage;
      modelId: string;
      providerId: string;
      markupMultiplier?: number;
    },
  ): Promise<AddAICostResult> {
    const markup = getMarkupMultiplier({
      providerId: args.providerId,
      modelId: args.modelId,
      toolId: undefined,
      providerMarkupMultipliers: this.providerMarkupMultipliers ?? [],
      modelMarkupMultipliers: this.modelMarkupMultipliers ?? [],
      toolMarkupMultipliers: this.toolMarkupMultipliers ?? [],
    });

    return ctx.runAction(this.component.aiCosts.addAICost, {
      ...args,
      markupMultiplier: args.markupMultiplier || markup,
    });
  }

  /**
   * Get AI costs for a specific thread.
   *
   * @param ctx - A Convex query context.
   * @param threadId - The thread identifier.
   * @returns Array of AI cost records for the thread.
   */
  async getAICostsByThread(ctx: CtxWith<"runQuery">, threadId: string) {
    return ctx.runQuery(this.component.aiCosts.getAICostsByThread, {
      threadId,
    });
  }

  /**
   * Get AI costs for a specific user.
   *
   * @param ctx - A Convex query context.
   * @param userId - The user identifier.
   * @returns Array of AI cost records for the user.
   */
  async getAICostsByUser(ctx: CtxWith<"runQuery">, userId: string) {
    return ctx.runQuery(this.component.aiCosts.getAICostsByUser, { userId });
  }

  /**
   * Get AI cost for a specific message.
   *
   * @param ctx - A Convex query context.
   * @param messageId - The message identifier.
   * @returns The AI cost record for the message or null if not found.
   */
  async getAICostByMessageId(ctx: CtxWith<"runQuery">, messageId: string) {
    return ctx.runQuery(this.component.aiCosts.getAICostByMessageId, {
      messageId,
    });
  }

  /**
   * Get aggregated AI costs for a user.
   *
   * @param ctx - A Convex query context.
   * @param userId - The user identifier.
   * @returns Count and total costs (raw and user-facing).
   */
  async getTotalAICostsByUser(ctx: CtxWith<"runQuery">, userId: string) {
    return ctx.runQuery(this.component.aiCosts.getTotalAICostsByUser, {
      userId,
    });
  }

  /**
   * Get aggregated AI costs for a thread.
   *
   * @param ctx - A Convex query context.
   * @param threadId - The thread identifier.
   * @returns Count and total costs (raw and user-facing).
   */
  async getTotalAICostsByThread(ctx: CtxWith<"runQuery">, threadId: string) {
    return ctx.runQuery(this.component.aiCosts.getTotalAICostsByThread, {
      threadId,
    });
  }

  // ==========================================================================
  // Tool Costs
  // ==========================================================================

  /**
   * Add a tool cost record.
   * Fetches pricing, calculates costs, and saves to database.
   *
   * @param ctx - A Convex action context.
   * @param args - Cost parameters.
   * @returns The calculated cost and database record ID.
   */
  async addToolCost(
    ctx: CtxWith<"runAction">,
    args: {
      messageId: string;
      userId?: string;
      threadId: string;
      providerId: string;
      toolId: string;
      usage: ToolUsage;
      markupMultiplier?: number;
    },
  ): Promise<AddToolCostResult> {
    const markup = getMarkupMultiplier({
      providerId: args.providerId,
      toolId: args.toolId,
      providerMarkupMultipliers: this.providerMarkupMultipliers ?? [],
      modelMarkupMultipliers: this.modelMarkupMultipliers ?? [],
      toolMarkupMultipliers: this.toolMarkupMultipliers ?? [],
    });

    return ctx.runAction(this.component.toolCosts.addToolCost, {
      ...args,
      markupMultiplier: args.markupMultiplier ?? markup,
    });
  }

  /**
   * Get tool costs for a specific thread.
   *
   * @param ctx - A Convex query context.
   * @param threadId - The thread identifier.
   * @returns Array of tool cost records for the thread.
   */
  async getToolCostsByThread(ctx: CtxWith<"runQuery">, threadId: string) {
    return ctx.runQuery(this.component.toolCosts.getToolCostsByThread, {
      threadId,
    });
  }

  /**
   * Get tool costs for a specific user.
   *
   * @param ctx - A Convex query context.
   * @param userId - The user identifier.
   * @returns Array of tool cost records for the user.
   */
  async getToolCostsByUser(ctx: CtxWith<"runQuery">, userId: string) {
    return ctx.runQuery(this.component.toolCosts.getToolCostsByUser, {
      userId,
    });
  }

  /**
   * Get tool costs by provider and optional tool ID.
   *
   * @param ctx - A Convex query context.
   * @param providerId - The provider identifier.
   * @param toolId - Optional tool identifier.
   * @returns Array of tool cost records matching the criteria.
   */
  async getToolCostsByProviderAndTool(
    ctx: CtxWith<"runQuery">,
    providerId: string,
    toolId?: string,
  ) {
    return ctx.runQuery(
      this.component.toolCosts.getToolCostsByProviderAndTool,
      {
        providerId,
        toolId,
      },
    );
  }

  /**
   * Get aggregated tool costs for a user.
   *
   * @param ctx - A Convex query context.
   * @param userId - The user identifier.
   * @returns Count and total costs (raw and user-facing).
   */
  async getTotalToolCostsByUser(ctx: CtxWith<"runQuery">, userId: string) {
    return ctx.runQuery(this.component.toolCosts.getTotalToolCostsByUser, {
      userId,
    });
  }

  /**
   * Get aggregated tool costs for a thread.
   *
   * @param ctx - A Convex query context.
   * @param threadId - The thread identifier.
   * @returns Count and total costs (raw and user-facing).
   */
  async getTotalToolCostsByThread(ctx: CtxWith<"runQuery">, threadId: string) {
    return ctx.runQuery(this.component.toolCosts.getTotalToolCostsByThread, {
      threadId,
    });
  }

  // ==========================================================================
  // Pricing
  // ==========================================================================

  /**
   * Get pricing for a specific AI model.
   *
   * @param ctx - A Convex query context.
   * @param modelId - The model identifier.
   * @param providerId - The provider identifier.
   * @returns The pricing record or null if not found.
   */
  async getPricing(
    ctx: CtxWith<"runQuery">,
    modelId: string,
    providerId: string,
  ) {
    return ctx.runQuery(this.component.pricing.getPricing, {
      modelId,
      providerId,
    });
  }

  /**
   * Get all AI model pricing records.
   *
   * @param ctx - A Convex query context.
   * @returns Array of all pricing records.
   */
  async getAllPricing(ctx: CtxWith<"runQuery">) {
    return ctx.runQuery(this.component.pricing.getAllPricing, {});
  }

  /**
   * Get pricing records for a specific provider.
   *
   * @param ctx - A Convex query context.
   * @param providerId - The provider identifier.
   * @returns Array of pricing records for the provider.
   */
  async getPricingByProvider(ctx: CtxWith<"runQuery">, providerId: string) {
    return ctx.runQuery(this.component.pricing.getPricingByProvider, {
      providerId,
    });
  }

  /**
   * Search pricing by model name.
   *
   * @param ctx - A Convex query context.
   * @param searchTerm - The search term to match against model names.
   * @returns Array of matching pricing records.
   */
  async searchPricingByModelName(ctx: CtxWith<"runQuery">, searchTerm: string) {
    return ctx.runQuery(this.component.pricing.searchPricingByModelName, {
      searchTerm,
    });
  }

  /**
   * Update pricing data from the models.dev API.
   *
   * @param ctx - A Convex action context.
   * @param envKeys - Optional environment keys for API configuration.
   */
  async updatePricingData(
    ctx: CtxWith<"runAction">,
    envKeys?: Record<string, string>,
  ) {
    return ctx.runAction(this.component.pricing.updatePricingData, {
      envKeys,
    });
  }

  /**
   * Get tool pricing for a specific tool.
   *
   * @param ctx - A Convex query context.
   * @param providerId - The provider identifier.
   * @param toolId - The tool identifier.
   * @returns The tool pricing record or null if not found.
   */
  async getToolPricing(
    ctx: CtxWith<"runQuery">,
    providerId: string,
    toolId: string,
  ) {
    return ctx.runQuery(this.component.pricing.getToolPricing, {
      providerId,
      toolId,
    });
  }

  /**
   * Get all tool pricing records.
   *
   * @param ctx - A Convex query context.
   * @returns Array of all tool pricing records.
   */
  async getAllToolPricing(ctx: CtxWith<"runQuery">) {
    return ctx.runQuery(this.component.pricing.getAllToolPricing, {});
  }

  /**
   * Get tool pricing records for a specific provider.
   *
   * @param ctx - A Convex query context.
   * @param providerId - The provider identifier.
   * @returns Array of tool pricing records for the provider.
   */
  async getToolPricingByProvider(ctx: CtxWith<"runQuery">, providerId: string) {
    return ctx.runQuery(this.component.pricing.getToolPricingByProvider, {
      providerId,
    });
  }

  // ==========================================================================
  // Markup
  // ==========================================================================

  /**
   * Get the markup multiplier for a specific provider/model/tool combination.
   * Priority: model-specific > tool-specific > provider-specific > 0
   *
   * @param ctx - A Convex query context.
   * @param args - The provider, model, and tool identifiers.
   * @returns The applicable markup multiplier.
   */
  async getMarkupMultiplier(
    ctx: CtxWith<"runQuery">,
    args: {
      providerId: string;
      modelId?: string;
      toolId?: string;
    },
  ) {
    return ctx.runQuery(this.component.markup.getMarkupMultiplier, args);
  }

  /**
   * Get a markup multiplier by its ID.
   *
   * @param ctx - A Convex query context.
   * @param markupMultiplierId - The markup multiplier document ID.
   * @returns The markup multiplier document or null if not found.
   */
  async getMarkupMultiplierById(
    ctx: CtxWith<"runQuery">,
    markupMultiplierId: string,
  ) {
    return ctx.runQuery(this.component.markup.getMarkupMultiplierById, {
      markupMultiplierId,
    });
  }

  // ==========================================================================
  // Client API
  // ==========================================================================

  /**
   * Returns Convex functions that can be exported directly from a Convex file.
   * These functions are designed to be called from the client side.
   *
   * Usage:
   * ```ts
   * // In your convex file (e.g., convex/costs.ts)
   * import { components } from "./_generated/api";
   * import { CostComponent } from "cost-component";
   *
   * const costs = new CostComponent(components.costBillingComponent);
   *
   * export const {
   *   getAICostsByThread,
   *   getAICostsByUser,
   *   getAICostByMessageId,
   *   getTotalAICostsByUser,
   *   getTotalAICostsByThread,
   *   getToolCostsByThread,
   *   getToolCostsByUser,
   *   getTotalToolCostsByUser,
   *   getTotalToolCostsByThread,
   * } = costs.clientApi();
   * ```
   *
   * @param opts - Optional callbacks for permission checks.
   * @returns Functions to export for client-side use.
   */
  clientApi<DataModel extends GenericDataModel>(opts?: {
    checkAICostAccess?: (
      ctx: GenericQueryCtx<DataModel>,
      threadId?: string,
      userId?: string,
      messageId?: string,
    ) => void | Promise<void>;
    checkToolCostAccess?: (
      ctx: GenericQueryCtx<DataModel>,
      threadId?: string,
      userId?: string,
    ) => void | Promise<void>;
    checkPricingAccess?: (
      ctx: GenericQueryCtx<DataModel>,
    ) => void | Promise<void>;
    checkAddAICost?: (
      ctx: GenericActionCtx<DataModel>,
      args: {
        messageId: string;
        userId?: string;
        threadId: string;
        modelId: string;
        providerId: string;
      },
    ) => void | Promise<void>;
    checkAddToolCost?: (
      ctx: GenericActionCtx<DataModel>,
      args: {
        messageId: string;
        userId?: string;
        threadId: string;
        providerId: string;
        toolId: string;
      },
    ) => void | Promise<void>;
    checkUpdatePricing?: (
      ctx: GenericActionCtx<DataModel>,
    ) => void | Promise<void>;
  }) {
    return {
      // =======================================================================
      // AI Cost Actions
      // =======================================================================

      addAICost: actionGeneric({
        args: vAddAICost,
        handler: async (ctx, args): Promise<AddAICostResult> => {
          if (opts?.checkAddAICost) {
            await opts.checkAddAICost(ctx, {
              messageId: args.messageId,
              userId: args.userId,
              threadId: args.threadId,
              modelId: args.modelId,
              providerId: args.providerId,
            });
          }

          const markup = getMarkupMultiplier({
            providerId: args.providerId,
            modelId: args.modelId,
            toolId: undefined,
            providerMarkupMultipliers: this.providerMarkupMultipliers ?? [],
            modelMarkupMultipliers: this.modelMarkupMultipliers ?? [],
            toolMarkupMultipliers: this.toolMarkupMultipliers ?? [],
          });

          return ctx.runAction(this.component.aiCosts.addAICost, {
            ...args,
            markupMultiplier: args.markupMultiplier ?? markup,
          });
        },
      }),

      // =======================================================================
      // Tool Cost Actions
      // =======================================================================

      addToolCost: actionGeneric({
        args: vAddToolCost,
        handler: async (ctx, args): Promise<AddToolCostResult> => {
          if (opts?.checkAddToolCost) {
            await opts.checkAddToolCost(ctx, {
              messageId: args.messageId,
              userId: args.userId,
              threadId: args.threadId,
              providerId: args.providerId,
              toolId: args.toolId,
            });
          }

          const markup = getMarkupMultiplier({
            providerId: args.providerId,
            toolId: args.toolId,
            providerMarkupMultipliers: this.providerMarkupMultipliers ?? [],
            modelMarkupMultipliers: this.modelMarkupMultipliers ?? [],
            toolMarkupMultipliers: this.toolMarkupMultipliers ?? [],
          });

          return ctx.runAction(this.component.toolCosts.addToolCost, {
            ...args,
            markupMultiplier: args.markupMultiplier ?? markup,
          });
        },
      }),

      // =======================================================================
      // Pricing Actions
      // =======================================================================

      updatePricingData: actionGeneric({
        args: {
          envKeys: v.optional(v.record(v.string(), v.string())),
        },
        handler: async (ctx, args) => {
          if (opts?.checkUpdatePricing) {
            await opts.checkUpdatePricing(ctx);
          }
          return ctx.runAction(this.component.pricing.updatePricingData, {
            envKeys: args.envKeys,
          });
        },
      }),

      // =======================================================================
      // AI Cost Queries
      // =======================================================================

      getAICostsByThread: queryGeneric({
        args: { threadId: v.string() },
        handler: async (ctx, args) => {
          if (opts?.checkAICostAccess) {
            await opts.checkAICostAccess(
              ctx,
              args.threadId,
              undefined,
              undefined,
            );
          }
          return ctx.runQuery(this.component.aiCosts.getAICostsByThread, {
            threadId: args.threadId,
          });
        },
      }),

      getAICostsByUser: queryGeneric({
        args: { userId: v.string() },
        handler: async (ctx, args) => {
          if (opts?.checkAICostAccess) {
            await opts.checkAICostAccess(
              ctx,
              undefined,
              args.userId,
              undefined,
            );
          }
          return ctx.runQuery(this.component.aiCosts.getAICostsByUser, {
            userId: args.userId,
          });
        },
      }),

      getAICostByMessageId: queryGeneric({
        args: { messageId: v.string() },
        handler: async (ctx, args) => {
          if (opts?.checkAICostAccess) {
            await opts.checkAICostAccess(
              ctx,
              undefined,
              undefined,
              args.messageId,
            );
          }
          return ctx.runQuery(this.component.aiCosts.getAICostByMessageId, {
            messageId: args.messageId,
          });
        },
      }),

      getTotalAICostsByUser: queryGeneric({
        args: { userId: v.string() },
        handler: async (ctx, args) => {
          if (opts?.checkAICostAccess) {
            await opts.checkAICostAccess(
              ctx,
              undefined,
              args.userId,
              undefined,
            );
          }
          return ctx.runQuery(this.component.aiCosts.getTotalAICostsByUser, {
            userId: args.userId,
          });
        },
      }),

      getTotalAICostsByThread: queryGeneric({
        args: { threadId: v.string() },
        handler: async (ctx, args) => {
          if (opts?.checkAICostAccess) {
            await opts.checkAICostAccess(
              ctx,
              args.threadId,
              undefined,
              undefined,
            );
          }
          return ctx.runQuery(this.component.aiCosts.getTotalAICostsByThread, {
            threadId: args.threadId,
          });
        },
      }),

      // Tool Cost Queries
      getToolCostsByThread: queryGeneric({
        args: { threadId: v.string() },
        handler: async (ctx, args) => {
          if (opts?.checkToolCostAccess) {
            await opts.checkToolCostAccess(ctx, args.threadId, undefined);
          }
          return ctx.runQuery(this.component.toolCosts.getToolCostsByThread, {
            threadId: args.threadId,
          });
        },
      }),

      getToolCostsByUser: queryGeneric({
        args: { userId: v.string() },
        handler: async (ctx, args) => {
          if (opts?.checkToolCostAccess) {
            await opts.checkToolCostAccess(ctx, undefined, args.userId);
          }
          return ctx.runQuery(this.component.toolCosts.getToolCostsByUser, {
            userId: args.userId,
          });
        },
      }),

      getTotalToolCostsByUser: queryGeneric({
        args: { userId: v.string() },
        handler: async (ctx, args) => {
          if (opts?.checkToolCostAccess) {
            await opts.checkToolCostAccess(ctx, undefined, args.userId);
          }
          return ctx.runQuery(
            this.component.toolCosts.getTotalToolCostsByUser,
            {
              userId: args.userId,
            },
          );
        },
      }),

      getTotalToolCostsByThread: queryGeneric({
        args: { threadId: v.string() },
        handler: async (ctx, args) => {
          if (opts?.checkToolCostAccess) {
            await opts.checkToolCostAccess(ctx, args.threadId, undefined);
          }
          return ctx.runQuery(
            this.component.toolCosts.getTotalToolCostsByThread,
            {
              threadId: args.threadId,
            },
          );
        },
      }),

      // Pricing Queries
      getAllPricing: queryGeneric({
        args: {},
        handler: async (ctx) => {
          if (opts?.checkPricingAccess) {
            await opts.checkPricingAccess(ctx);
          }
          return ctx.runQuery(this.component.pricing.getAllPricing, {});
        },
      }),

      getPricingByProvider: queryGeneric({
        args: { providerId: v.string() },
        handler: async (ctx, args) => {
          if (opts?.checkPricingAccess) {
            await opts.checkPricingAccess(ctx);
          }
          return ctx.runQuery(this.component.pricing.getPricingByProvider, {
            providerId: args.providerId,
          });
        },
      }),

      searchPricingByModelName: queryGeneric({
        args: { searchTerm: v.string() },
        handler: async (ctx, args) => {
          if (opts?.checkPricingAccess) {
            await opts.checkPricingAccess(ctx);
          }
          return ctx.runQuery(this.component.pricing.searchPricingByModelName, {
            searchTerm: args.searchTerm,
          });
        },
      }),

      getAllToolPricing: queryGeneric({
        args: {},
        handler: async (ctx) => {
          if (opts?.checkPricingAccess) {
            await opts.checkPricingAccess(ctx);
          }
          return ctx.runQuery(this.component.pricing.getAllToolPricing, {});
        },
      }),

      getToolPricingByProvider: queryGeneric({
        args: { providerId: v.string() },
        handler: async (ctx, args) => {
          if (opts?.checkPricingAccess) {
            await opts.checkPricingAccess(ctx);
          }
          return ctx.runQuery(this.component.pricing.getToolPricingByProvider, {
            providerId: args.providerId,
          });
        },
      }),

      // Markup Queries
      getMarkupMultiplier: queryGeneric({
        args: {
          providerId: v.string(),
          modelId: v.optional(v.string()),
          toolId: v.optional(v.string()),
        },
        handler: async (ctx, args) => {
          return ctx.runQuery(this.component.markup.getMarkupMultiplier, args);
        },
      }),

      getMarkupMultiplierById: queryGeneric({
        args: {
          markupMultiplierId: v.id("markupMultiplier"),
        },
        handler: async (ctx, args) => {
          return ctx.runQuery(
            this.component.markup.getMarkupMultiplierById,
            args,
          );
        },
      }),
    };
  }
}
