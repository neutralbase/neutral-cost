import {
  addAICost,
  saveAICost,
  getAICostsByThread,
  getAICostsByUser,
  getTotalAICostsByUser,
  getTotalAICostsByThread,
} from "./aiCosts.js";
import {
  getMarkupMultipliers,
  getMarkupMultiplier,
  upsertProviderMarkup,
  upsertModelMarkup,
  upsertToolMarkup,
  deleteMarkup,
} from "./markup.js";
import {
  getAllPricing,
  getPricing,
  getPricingByProvider,
  searchPricingByModelName,
  updatePricingData,
  updatePricingTable,
  getToolPricing,
  getAllToolPricing,
  getToolPricingByProvider,
  upsertToolPricing,
  deleteToolPricing,
} from "./pricing.js";
import {
  addToolCost,
  saveToolCost,
  getToolCostsByThread,
  getToolCostsByUser,
  getToolCostsByProviderAndTool,
  getTotalToolCostsByUser,
  getTotalToolCostsByThread,
} from "./toolCosts.js";

/**
 * Creates an API object for managing AI costs.
 *
 * This function returns an object with methods to add, save, and query AI costs,
 * providing a centralized interface for cost-related operations.
 *
 * @returns An object containing AI cost actions and queries.
 */
export function createAICostsApi() {
  return {
    addAICost,
    saveAICost,
    getAICostsByThread,
    getAICostsByUser,
    getTotalAICostsByUser,
    getTotalAICostsByThread,
  };
}

/**
 * Creates an API object for managing pricing data.
 *
 * This function returns an object with methods to get, update, and manage
 * pricing information for both AI models and tools.
 *
 * @returns An object containing pricing-related actions and queries.
 */
export function createPricingApi() {
  return {
    getAllPricing,
    getPricing,
    getPricingByProvider,
    searchPricingByModelName,
    updatePricingData,
    updatePricingTable,
    getToolPricing,
    getAllToolPricing,
    getToolPricingByProvider,
    upsertToolPricing,
    deleteToolPricing,
  };
}

/**
 * Creates an API object for managing tool costs.
 *
 * This function returns an object with methods to add, save, and query tool costs,
 * providing a centralized interface for tool cost-related operations.
 *
 * @returns An object containing tool cost actions and queries.
 */
export function createToolCostApi() {
  return {
    addToolCost,
    saveToolCost,
    getToolCostsByThread,
    getToolCostsByUser,
    getToolCostsByProviderAndTool,
    getTotalToolCostsByUser,
    getTotalToolCostsByThread,
  };
}

export function createMarkupApi() {
  return {
    getMarkupMultipliers,
    getMarkupMultiplier,
    upsertProviderMarkup,
    upsertModelMarkup,
    upsertToolMarkup,
    deleteMarkup,
  };
}
