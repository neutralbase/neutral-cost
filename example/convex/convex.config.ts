import { defineApp } from "convex/server";
import neutralCost from "neutral-cost/convex.config.js";
import agentComponent from "@convex-dev/agent/convex.config.js";

const app = defineApp();
app.use(neutralCost);
app.use(agentComponent);

export default app;
