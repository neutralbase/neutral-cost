import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
} from "convex/server";

// ============================================================================
// Context Types
// ============================================================================

/** Helper type for contexts that support runQuery, runMutation, or runAction */
export type CtxWith<T extends "runQuery" | "runMutation" | "runAction"> =
  T extends "runQuery"
    ? {
        runQuery: <Query extends FunctionReference<"query", "internal">>(
          query: Query,
          args: FunctionArgs<Query>,
        ) => Promise<FunctionReturnType<Query>>;
      }
    : T extends "runMutation"
      ? {
          runQuery: <Query extends FunctionReference<"query", "internal">>(
            query: Query,
            args: FunctionArgs<Query>,
          ) => Promise<FunctionReturnType<Query>>;
          runMutation: <
            Mutation extends FunctionReference<"mutation", "internal">,
          >(
            mutation: Mutation,
            args: FunctionArgs<Mutation>,
          ) => Promise<FunctionReturnType<Mutation>>;
        }
      : T extends "runAction"
        ? {
            runQuery: <Query extends FunctionReference<"query", "internal">>(
              query: Query,
              args: FunctionArgs<Query>,
            ) => Promise<FunctionReturnType<Query>>;
            runMutation: <
              Mutation extends FunctionReference<"mutation", "internal">,
            >(
              mutation: Mutation,
              args: FunctionArgs<Mutation>,
            ) => Promise<FunctionReturnType<Mutation>>;
            runAction: <Action extends FunctionReference<"action", "internal">>(
              action: Action,
              args: FunctionArgs<Action>,
            ) => Promise<FunctionReturnType<Action>>;
          }
        : never;

// ============================================================================
// Cost Types
// ============================================================================

/** Calculated cost breakdown in USD */
export type CalculatedCosts = {
  promptTokensCost: number;
  completionTokensCost: number;
  reasoningTokensCost: number;
  cachedInputTokensCost: number;
  totalCost: number;
};

// ============================================================================
// Models.dev API Types
// ============================================================================

/**
 * Model data from models.dev API
 */
export interface ModelsDevModel {
  name?: string;
  cost?: {
    input?: number;
    output?: number;
    reasoning?: number;
    cache_read?: number;
    cache_write?: number;
  };
  limit?: {
    context?: number;
    output?: number;
  };
}

/**
 * Provider data from models.dev API
 */
export interface ModelsDevProvider {
  name?: string;
  models?: Record<string, ModelsDevModel>;
}

/**
 * Full API response from models.dev
 */
export type ModelsDevApiResponse = Record<string, ModelsDevProvider>;

/**
 * Result of a pricing update operation
 */
export interface PricingUpdateResult {
  updatedModels: number;
  insertCount: number;
  updateCount: number;
  deleteCount: number;
}

export type ProviderMarkupMultiplier = {
  providerId: string;
  markupMultiplier: number;
};

export type ModelMarkupMultiplier = {
  providerId: string;
  modelId: string;
  markupMultiplier: number;
};

export type ToolMarkupMultiplier = {
  providerId: string;
  toolId: string;
  markupMultiplier: number;
};
