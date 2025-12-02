// Helper type for functions that can have custom args and optional transform
type FunctionWithArgs = {
  fn: any;
  args?: Record<string, any>;
  /**
   * Optional transform function to modify the merged args before passing to the function.
   * Useful for converting arg structure (e.g., messages array to message object)
   */
  transform?: (mergedArgs: any) => any;
};

// Accept either a function or a function with custom args
type FlexibleFunction = any | FunctionWithArgs;

export async function runAfter(
  ctx: any,
  queries?: FlexibleFunction[],
  mutations?: FlexibleFunction[],
  actions?: FlexibleFunction[],
  args?: any[] & any,
) {
  // Helper to extract function and merge args
  const getFunctionAndArgs = (item: FlexibleFunction) => {
    if (item && typeof item === 'object' && 'fn' in item) {
      // Item is { fn, args, transform } - merge base args, runAfterArgs, and custom args
      const mergedArgs = { ...args, ...item.args };
      // Apply transform if provided
      const finalArgs = item.transform ? item.transform(mergedArgs) : mergedArgs;
      return {
        fn: item.fn,
        args: finalArgs,
      };
    }
    // Item is just a function - use merged base args and runAfterArgs
    return {
      fn: item,
      args: { ...args },
    };
  };

  if (queries && queries?.length > 0 && "runQuery" in ctx) {
    for (const query of queries) {
      const { fn, args: mergedArgs } = getFunctionAndArgs(query);
      await ctx.runQuery(fn, mergedArgs);
    }
  }

  if (mutations && mutations?.length > 0 && "runMutation" in ctx) {
    for (const mutation of mutations) {
      const { fn, args: mergedArgs } = getFunctionAndArgs(mutation);
      await ctx.runMutation(fn, mergedArgs);
    }
  }

  if (actions && actions?.length > 0) {
    if ("runAction" in ctx) {
      for (const action of actions) {
        const { fn, args: mergedArgs } = getFunctionAndArgs(action);
        await ctx.runAction(fn, mergedArgs);
      }
    } else if (!("runAction" in ctx) && "scheduler" in ctx) {
      for (const action of actions) {
        const { fn, args: mergedArgs } = getFunctionAndArgs(action);
        await ctx.scheduler.runAfter(0, fn, mergedArgs);
      }
    }
  }
}

export type RunAfterApis = {
  queries?: FlexibleFunction[];
  mutations?: FlexibleFunction[];
  actions?: FlexibleFunction[];
};
