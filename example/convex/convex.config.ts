import { defineApp } from "convex/server";
import costComponent from "neutral-cost/convex.config.js";

const app = defineApp();
app.use(costComponent);

export default app;
