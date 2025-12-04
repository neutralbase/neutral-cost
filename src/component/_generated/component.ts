/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    aiCosts: {
      addAICost: FunctionReference<
        "action",
        "internal",
        {
          markupMultiplier?: number;
          messageId: string;
          modelId: string;
          providerId: string;
          threadId: string;
          usage: {
            cachedInputTokens?: number;
            completionTokens: number;
            promptTokens: number;
            reasoningTokens?: number;
            totalTokens: number;
          };
          userId?: string;
        },
        any,
        Name
      >;
      getAICostsByThread: FunctionReference<
        "query",
        "internal",
        { threadId: string },
        any,
        Name
      >;
      getAICostsByUser: FunctionReference<
        "query",
        "internal",
        { userId: string },
        any,
        Name
      >;
      getTotalAICostsByThread: FunctionReference<
        "query",
        "internal",
        { threadId: string },
        any,
        Name
      >;
      getTotalAICostsByUser: FunctionReference<
        "query",
        "internal",
        { userId: string },
        any,
        Name
      >;
    };
    markup: {
      deleteMarkup: FunctionReference<
        "mutation",
        "internal",
        {
          modelId?: string;
          providerId: string;
          scope: "provider" | "model" | "tool";
          toolId?: string;
        },
        boolean,
        Name
      >;
      getMarkupMultiplier: FunctionReference<
        "query",
        "internal",
        { modelId?: string; providerId: string; toolId?: string },
        number,
        Name
      >;
      getMarkupMultiplierById: FunctionReference<
        "query",
        "internal",
        { markupMultiplierId: string },
        any,
        Name
      >;
      getMarkupMultipliers: FunctionReference<
        "query",
        "internal",
        {},
        {
          modelMarkupMultipliers: Array<{
            markupMultiplier: number;
            modelId: string;
            providerId: string;
          }>;
          providerMultipliers: Array<{
            markupMultiplier: number;
            providerId: string;
          }>;
          toolMarkupMultipliers: Array<{
            markupMultiplier: number;
            providerId: string;
            toolId: string;
          }>;
        },
        Name
      >;
      upsertModelMarkup: FunctionReference<
        "mutation",
        "internal",
        {
          markupMultiplier: number;
          modelId: string;
          providerId: string;
          scope: "model";
        },
        string,
        Name
      >;
      upsertProviderMarkup: FunctionReference<
        "mutation",
        "internal",
        { markupMultiplier: number; providerId: string; scope: "provider" },
        string,
        Name
      >;
      upsertToolMarkup: FunctionReference<
        "mutation",
        "internal",
        {
          markupMultiplier: number;
          providerId: string;
          scope: "tool";
          toolId: string;
        },
        string,
        Name
      >;
    };
    pricing: {
      deleteToolPricing: FunctionReference<
        "mutation",
        "internal",
        { modelId?: string; providerId: string },
        any,
        Name
      >;
      getAllPricing: FunctionReference<"query", "internal", {}, any, Name>;
      getAllToolPricing: FunctionReference<"query", "internal", {}, any, Name>;
      getPricing: FunctionReference<
        "query",
        "internal",
        { modelId: string; providerId: string },
        any,
        Name
      >;
      getPricingByProvider: FunctionReference<
        "query",
        "internal",
        { providerId: string },
        any,
        Name
      >;
      getToolPricing: FunctionReference<
        "query",
        "internal",
        { providerId: string; toolId: string },
        any,
        Name
      >;
      getToolPricingByProvider: FunctionReference<
        "query",
        "internal",
        { providerId: string },
        any,
        Name
      >;
      searchPricingByModelName: FunctionReference<
        "query",
        "internal",
        { searchTerm: string },
        any,
        Name
      >;
      updatePricingData: FunctionReference<
        "action",
        "internal",
        { envKeys?: Record<string, string> },
        any,
        Name
      >;
      updatePricingTable: FunctionReference<
        "mutation",
        "internal",
        {
          pricingData: Array<{
            lastUpdated: number;
            limits: { context: number; output: number };
            modelId: string;
            modelName: string;
            pricing: {
              cache_read?: number;
              cache_write?: number;
              input: number;
              output: number;
              reasoning?: number;
            };
            providerId: string;
            providerName: string;
          }>;
        },
        any,
        Name
      >;
      upsertToolPricing: FunctionReference<
        "mutation",
        "internal",
        {
          limits?: {
            maxBytesPerRequest?: number;
            maxConcurrentRequests?: number;
            maxRequestsPerDay?: number;
            maxRequestsPerHour?: number;
            maxRequestsPerMinute?: number;
            maxRequestsPerMonth?: number;
            maxRequestsPerSecond?: number;
            maxTokensPerRequest?: number;
          };
          modelId?: string;
          modelName?: string;
          pricing:
            | {
                costPerCredit: number;
                creditTypes?: Record<string, number>;
                currency: string;
                type: "credits";
              }
            | {
                cache_read?: number;
                cache_write?: number;
                currency: string;
                input: number;
                output: number;
                reasoning?: number;
                type: "tokens";
              }
            | {
                costPerRequest: number;
                currency: string;
                requestTypes?: Record<string, number>;
                type: "requests";
              }
            | {
                computeTypes?: Record<string, number>;
                costPerMs: number;
                currency: string;
                tiers?: Record<string, number>;
                type: "compute";
              }
            | {
                costPerByteSecond: number;
                currency: string;
                storageClasses?: Record<string, number>;
                type: "storage";
              }
            | {
                costPerByteIn?: number;
                costPerByteOut?: number;
                currency: string;
                regions?: Record<string, number>;
                type: "bandwidth";
              }
            | {
                costPerUnit: number;
                currency: string;
                type: "units";
                unitType: string;
              }
            | {
                currency: string;
                tiers: Array<{ from: number; rate: number; to?: number }>;
                type: "tiered";
                unitType: string;
              }
            | {
                components: Array<{
                  costPerUnit: number;
                  name: string;
                  unitType: string;
                }>;
                currency: string;
                type: "composite";
              }
            | {
                currency: string;
                data: any;
                description?: string;
                type: "custom";
              };
          providerId: string;
          providerName: string;
        },
        any,
        Name
      >;
    };
    toolCosts: {
      addToolCost: FunctionReference<
        "action",
        "internal",
        {
          markupMultiplier?: number;
          messageId: string;
          providerId: string;
          threadId: string;
          toolId: string;
          usage:
            | { creditType?: string; credits: number; type: "credits" }
            | {
                cacheReadTokens?: number;
                cacheWriteTokens?: number;
                inputTokens: number;
                outputTokens: number;
                reasoningTokens?: number;
                type: "tokens";
              }
            | { requestType?: string; requests: number; type: "requests" }
            | {
                computeType?: string;
                durationMs: number;
                tier?: string;
                type: "compute";
              }
            | {
                bytes: number;
                durationSeconds?: number;
                storageClass?: string;
                type: "storage";
              }
            | {
                bytesIn?: number;
                bytesOut?: number;
                region?: string;
                type: "bandwidth";
              }
            | {
                metadata?: Record<string, any>;
                type: "units";
                unitType: string;
                units: number;
              }
            | {
                quantity: number;
                tierName?: string;
                type: "tiered";
                unitType: string;
              }
            | {
                components: Array<{
                  cost?: number;
                  name: string;
                  quantity: number;
                  unitType: string;
                }>;
                type: "composite";
              }
            | { data: any; description?: string; type: "custom" };
          userId?: string;
        },
        any,
        Name
      >;
      getToolCostsByProviderAndTool: FunctionReference<
        "query",
        "internal",
        { providerId: string; toolId?: string },
        any,
        Name
      >;
      getToolCostsByThread: FunctionReference<
        "query",
        "internal",
        { threadId: string },
        any,
        Name
      >;
      getToolCostsByUser: FunctionReference<
        "query",
        "internal",
        { userId: string },
        any,
        Name
      >;
      getTotalToolCostsByThread: FunctionReference<
        "query",
        "internal",
        { threadId: string },
        any,
        Name
      >;
      getTotalToolCostsByUser: FunctionReference<
        "query",
        "internal",
        { userId: string },
        any,
        Name
      >;
    };
  };
