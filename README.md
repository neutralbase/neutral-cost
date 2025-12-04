# Neutral Cost

[![npm version](https://badge.fury.io/js/neutral-cost.svg)](https://badge.fury.io/js/neutral-cost)

Organizes all of your costs into one place. Seamlessly track your AI usage and tool costs and charge accordingly.

<!-- START: Include on https://convex.dev/components -->

## Why Neutral Cost?

This component makes it easy to define and track AI costs and tool costs, giving you visibility into:

- **Your actual costs** - Know exactly what each AI call and tool usage costs your business
- **Customer profitability** - Understand which customers are profitable and which need attention
- **Flexible billing** - Charge customers using prepaid credits with configurable markup multipliers
- **Sophisticated rate limiting** - For example, give users $10 of premium model usage, then unlimited access to lower-cost models to keep every customer profitable

Knowing your costs is the foundation for building your business AND your business model.

Found a bug? Feature request? [File it here](https://github.com/neutralbase/neutral-cost/issues).

## Pre-requisite: Convex

You'll need an existing Convex project to use the component.
Convex is a hosted backend platform, including a database, serverless functions,
and a ton more you can learn about [here](https://docs.convex.dev/get-started).

Run `npm create convex` or follow any of the [quickstarts](https://docs.convex.dev/home) to set one up.

## Installation

Install the component package:

```sh
npm install neutral-cost
```

Create a `convex.config.ts` file in your app's `convex/` folder and install the component by calling `use`:

```ts
// convex/convex.config.ts
import { defineApp } from "convex/server";
import costComponent from "neutral-cost/convex.config";

const app = defineApp();
app.use(costComponent);

export default app;
```

## Usage

```ts
import { components } from "./_generated/api";
import { CostComponent } from "neutral-cost";

const costs = new CostComponent(components.costComponent, {
  // Optional: Configure markup multipliers per provider, model, or tool
  providerMarkupMultiplier: [
    { providerId: "openai", multiplier: 1.5 }, // 50% markup on OpenAI
  ],
  modelMarkupMultiplier: [
    { modelId: "gpt-4", providerId: "openai", multiplier: 2.0 }, // 100% markup on GPT-4
  ],
  toolMarkupMultiplier: [
    { toolId: "web-search", providerId: "tavily", multiplier: 1.25 }, // 25% markup on web search
  ],
});
```

### Track AI Costs

```ts
// In an action
const result = await costs.addAICost(ctx, {
  messageId: "msg_123",
  userId: "user_456",
  threadId: "thread_789",
  usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
  modelId: "gpt-4",
  providerId: "openai",
});
```

### Track Tool Costs

```ts
// In an action
const result = await costs.addToolCost(ctx, {
  messageId: "msg_123",
  userId: "user_456",
  threadId: "thread_789",
  providerId: "tavily",
  toolId: "web-search",
  usage: { calls: 1 },
});
```

### Query Costs

```ts
// Get costs by thread or user
const threadCosts = await costs.getAICostsByThread(ctx, "thread_789");
const userCosts = await costs.getTotalAICostsByUser(ctx, "user_456");

// Get tool costs
const toolCosts = await costs.getToolCostsByUser(ctx, "user_456");
```

### Export Client API

Easily expose cost queries to your frontend:

```ts
// convex/costs.ts
import { components } from "./_generated/api";
import { CostComponent } from "neutral-cost";

const costs = new CostComponent(components.costComponent);

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
```

See more example usage in [example.ts](./example/convex/example.ts).

<!-- END: Include on https://convex.dev/components -->

## Development

Run the example:

```sh
npm i
npm run dev
```

## License

[FSL-1.1-ALv2](./LICENSE) - Functional Source License, Version 1.1, with Apache License 2.0 future license.

This means you can use the software for any purpose except competing uses. After two years from each release, that version becomes available under Apache 2.0.
