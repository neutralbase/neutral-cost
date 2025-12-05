import { createTool } from "@convex-dev/agent";
import z from "zod";
import { costs } from "./example";

/**
 * A tool that calculates Body Mass Index (BMI) from weight and height.
 *
 * @description This tool takes weight in kilograms and height in meters as string inputs,
 * parses them to numbers, and returns the calculated BMI value.
 * Each usage of this tool incurs a cost of 2 credits.
 *
 * @remarks
 * Before using this tool, ensure that you have added the corresponding tools pricing
 * configuration in the database. The tool is registered with:
 * - `toolId`: "bmiCalculator"
 * - `providerId`: "internal"
 *
 * @throws {Error} Throws an error if the height value is zero to prevent division by zero.
 *
 * @example
 * ```typescript
 * const result = await bmiCalculator.handler(ctx, { weight: "70", height: "1.75" });
 * // result: { bmi: 22.86 }
 * ```
 */
export const bmiCalculator = createTool({
  description:
    "Calculates Body Mass Index (BMI) given weight in kilograms and height in meters.",
  args: z.object({
    weight: z.string(),
    height: z.string(),
  }),
  handler: async (ctx, { weight, height }) => {
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);
    if (heightNum === 0) throw new Error("Height cannot be zero");
    const bmi = weightNum / (heightNum * heightNum);

    // Add cost for tool usage
    // NOTE: You have to add the tools pricing configuration in the database first with toolId: "bmi" and providerId: "calculator"
    await costs.addToolCost(ctx, {
      toolId: "bmi",
      providerId: "calculator",
      userId: ctx.userId || "",
      messageId: ctx.messageId || "",
      threadId: ctx.threadId || "",
      usage: {
        type: "credits",
        credits: 2,
      },
    });

    return { bmi };
  },
});
