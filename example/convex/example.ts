import { components } from "./_generated/api.js";
import { CostComponent } from "neutral-cost";
import { query } from "./_generated/server";
import { v } from "convex/values";

// Initialize the cost component
/**
 * Cost configuration component for managing pricing markups across different AI providers, models, and tools.
 *
 * @remarks
 * This configuration allows setting custom markup multipliers at three levels:
 * - Provider level: Applied to all requests for a specific provider
 * - Model level: Applied to requests using a specific model from a provider
 * - Tool level: Applied to requests using a specific tool from a provider
 *
 * **Note:** You can also define markup multipliers directly in the database.
 * If markups are defined in the database, these configuration-based markups will be ignored.
 * See https://docs.example.com/neutral-cost/database-markups for more information.
 *
 * @example
 * ```typescript
 * // A provider markup of 2 means costs are doubled for all Google requests
 * // A model markup of 1.25 means an additional 25% markup for Gemini 2.5 Flash
 * // A tool markup of 1.5 means a 50% markup for Firecrawl scrape operations
 * ```
 */
export const costs = new CostComponent(components.neutralCost, {
  providerMarkupMultiplier: [
    {
      markupMultiplier: 2,
      providerId: "google",
    },
  ],
  modelMarkupMultiplier: [
    {
      markupMultiplier: 1.25,
      providerId: "google",
      modelId: "gemini-2.5-flash",
    },
  ],
  toolMarkupMultiplier: [
    {
      markupMultiplier: 1.5,
      providerId: "firecrawl",
      toolId: "scrape",
    },
  ],
});

// Export client API methods for querying costs
export const {
  getAICostsByThread,
  getAICostsByUser,
  getTotalAICostsByUser,
  getTotalAICostsByThread,
  getToolCostsByThread,
  getToolCostsByUser,
  getTotalToolCostsByUser,
  getTotalToolCostsByThread,
  getAllPricing,
  addAICost,
  addToolCost,
  updatePricingData,
  getAllToolPricing,
  getToolPricingByProvider,
  getMarkupMultiplier,
  getMarkupMultiplierById,
  getPricingByProvider,
  searchPricingByModelName,
  getAICostByMessageId,
} = costs.clientApi();

// Combined transactions query for the UI
export const getTransactionsByUser = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, { userId }) => {
    // Get AI costs for the user
    const aiCosts = await ctx.runQuery(
      components.neutralCost.aiCosts.getAICostsByUser,
      { userId },
    );

    // Get tool costs for the user
    const toolCosts = await ctx.runQuery(
      components.neutralCost.toolCosts.getToolCostsByUser,
      { userId },
    );

    // Transform AI costs to transaction format
    // Include both raw cost and user cost (with markup)
    const aiTransactions = aiCosts.map((cost: { _id: string; userId?: string; cost?: { totalCost?: number }; costForUser?: { totalCost?: number }; threadId?: string; _creationTime: number }) => ({
      _id: cost._id,
      userId: cost.userId ?? userId,
      amount: -(cost.cost?.totalCost ?? 0),
      userAmount: -(cost.costForUser?.totalCost ?? 0),
      type: "usage" as const,
      description: `Usage for AI model`,
      threadId: cost.threadId,
      timestamp: new Date(cost._creationTime).toISOString(),
    }));

    // Transform tool costs to transaction format
    // Tool costs use 'amount' field instead of 'totalCost'
    const toolTransactions = toolCosts.map((cost: { _id: string; userId?: string; cost?: { amount?: number }; costForUser?: { amount?: number }; toolId?: string; threadId?: string; _creationTime: number }) => ({
      _id: cost._id,
      userId: cost.userId ?? userId,
      amount: -(cost.cost?.amount ?? 0),
      userAmount: -(cost.costForUser?.amount ?? 0),
      type: "usage" as const,
      description: `Tool usage: ${cost.toolId ?? "unknown"}`,
      threadId: cost.threadId,
      timestamp: new Date(cost._creationTime).toISOString(),
    }));

    // Combine and sort by timestamp (newest first)
    const allTransactions = [...aiTransactions, ...toolTransactions].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return allTransactions;
  },
});
