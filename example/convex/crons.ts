import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "Update AI Model Pricing Data",
  { minutes: 100 },
  api.example.updatePricingData,
  { envKeys: { MODELS_DEV_API_KEY: "<your-models-dev-api-key>" } },
);

export default crons;
