import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CostComponent } from "./index.js";
import type { DataModelFromSchemaDefinition } from "convex/server";
import {
  anyApi,
  queryGeneric,
  actionGeneric,
} from "convex/server";
import type {
  ApiFromModules,
  ActionBuilder,
  QueryBuilder,
} from "convex/server";
import { v } from "convex/values";
import { defineSchema } from "convex/server";
import { components, initConvexTest } from "./setup.test.js";

// The schema for the tests
const schema = defineSchema({});
type DataModel = DataModelFromSchemaDefinition<typeof schema>;
const query = queryGeneric as QueryBuilder<DataModel, "public">;
const action = actionGeneric as ActionBuilder<DataModel, "public">;

const costs = new CostComponent(components.costComponent, {});

export const testGetAICostsByThread = query({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    return await costs.getAICostsByThread(ctx, args.threadId);
  },
});

export const testGetTotalAICostsByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await costs.getTotalAICostsByUser(ctx, args.userId);
  },
});

const testApi: ApiFromModules<{
  fns: {
    testGetAICostsByThread: typeof testGetAICostsByThread;
    testGetTotalAICostsByUser: typeof testGetTotalAICostsByUser;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}>["fns"] = anyApi["index.test"] as any;

describe("CostComponent thick client", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  test("should make thick client", async () => {
    const c = new CostComponent(components.costComponent);
    const t = initConvexTest(schema);
    await t.run(async (ctx) => {
      const costs = await c.getAICostsByThread(ctx, "test-thread");
      expect(costs).toEqual([]);
    });
  });
  test("should work from a test function", async () => {
    const t = initConvexTest(schema);
    const result = await t.query(testApi.testGetAICostsByThread, {
      threadId: "test-thread",
    });
    expect(result).toEqual([]);
  });
});
