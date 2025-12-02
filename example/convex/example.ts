import { components } from "./_generated/api.js";
import { CostComponent } from "neutral-cost";

// Initialize the cost component
const costs = new CostComponent(components.costComponent, {});

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
} = costs.clientApi();
