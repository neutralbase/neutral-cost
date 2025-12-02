/// <reference types="vite/client" />
import { test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";

const modules = import.meta.glob("./**/*.*s");

export function initConvexTest() {
  const t = convexTest(schema, modules);
  return t;
}

test("setup", () => {});
