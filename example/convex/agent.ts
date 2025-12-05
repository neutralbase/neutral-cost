import {
  Agent,
  listUIMessages,
  saveMessage,
  stepCountIs,
  syncStreams,
  vStreamArgs,
} from "@convex-dev/agent";
import { google } from "@ai-sdk/google";
import { internalAction, mutation, query } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { costs } from "./example";
import { bmiCalculator } from "./tools";

const MODEL_ID = "gemini-2.5-flash";

const agent = new Agent(components.agent, {
  name: "Neutral-Agent",
  languageModel: google.chat(MODEL_ID),
  instructions:
    "You're an helpful assistant. Provide clear and concise answers to user questions.",
  maxSteps: 5,
  stopWhen: stepCountIs(5),
  tools: { bmiCalculator },
});

export const createThread = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, { userId }) => {
    const { threadId } = await agent.createThread(ctx, {
      userId,
    });

    return threadId;
  },
});

export const getAllThreads = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, { userId }) => {
    const threads = await ctx.runQuery(
      components.agent.threads.listThreadsByUserId,
      { userId },
    );
    return threads;
  },
});

export const sendMessage = mutation({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, { threadId, prompt, userId }) => {
    const { messageId } = await saveMessage(ctx, components.agent, {
      threadId,
      prompt,
      userId,
    });

    await ctx.scheduler.runAfter(0, internal.agent.generateResponseAsync, {
      threadId,
      promptMessageId: messageId,
      userId,
    });
  },
});

export const generateResponseAsync = internalAction({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
    prompt: v.optional(v.string()),
    userId: v.string(),
  },
  handler: async (ctx, { threadId, promptMessageId, userId }) => {
    const result = await agent.streamText(
      ctx,
      { threadId, userId },
      { promptMessageId },
      {
        saveStreamDeltas: true,
      },
    );

    await result.consumeStream();

    for (const msg of result.savedMessages || []) {
      await ctx.scheduler.runAfter(0, internal.agent.addAICostTransaction, {
        messageId: msg._id,
      });
    }
  },
});

export const addAICostTransaction = internalAction({
  args: {
    messageId: v.string(),
  },
  handler: async (ctx, { messageId }) => {
    const messages = await ctx.runQuery(
      components.agent.messages.getMessagesByIds,
      {
        messageIds: [messageId],
      },
    );

    const message = messages[0];

    console.log("Adding AI cost transaction for message ID:", message);

    if (!message) {
      throw new Error(`Message with ID ${messageId} not found.`);
    }

    if (!message.usage) {
      console.log("No usage data for message ID:", messageId);
      return;
    }

    const cost = await ctx.runQuery(
      components.neutralCost.aiCosts.getAICostByMessageId,
      { messageId },
    );

    console.log("Existing cost for message:", cost);

    if (cost) {
      // Cost already exists for this message, skip adding a new one
      return cost._id;
    }

    console.log("No existing cost found, creating a new one.");

    console.log("Adding AI cost for message ID:", message);

    return await costs.addAICost(ctx, {
      messageId,
      userId: message.userId,
      threadId: message?.threadId,
      modelId: MODEL_ID,
      providerId: "google",
      usage: message.usage!,
    });
  },
});

export const listThreadMessages = query({
  args: {
    threadId: v.string(),
    // Pagination options for the non-streaming messages.
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    // Fetches the regular non-streaming messages.
    const paginated = await listUIMessages(
      ctx,
      components.agent as Parameters<typeof listUIMessages>[1],
      args,
    );

    const streams = await syncStreams(
      ctx,
      components.agent as Parameters<typeof syncStreams>[1],
      args,
    );
    return { ...paginated, streams };
  },
});
