import { describe, expect, test } from "vitest";
import { initConvexTest } from "./setup.test";

describe("example", () => {
  test("setup works", async () => {
    const t = initConvexTest();
    expect(t).toBeDefined();
  });
});
