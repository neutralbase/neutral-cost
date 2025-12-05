import { Loader2, RefreshCw, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { useUIMessages, useSmoothText } from "@convex-dev/agent/react";
import type { UIMessage } from "@convex-dev/agent";
import { api } from "../../convex/_generated/api";

import { DemoUser } from "../data/demo-users";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "./ai-elements/conversation";
import {
  Message,
  MessageBranch,
  MessageBranchContent,
  MessageContent,
  MessageResponse,
} from "./ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "./ai-elements/prompt-input";
import { Suggestion, Suggestions } from "./ai-elements/suggestion";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

const suggestions = [
  "What can you help me build?",
  "Summarize the last conversation.",
  "Draft a status update for the project.",
  "Show me how to use agent tools.",
];

// ChatMessage component that uses useSmoothText for streaming text
function ChatMessage({ message }: { message: UIMessage }) {
  const isStreaming = message.status === "streaming";

  const [visibleText] = useSmoothText(message.text ?? "", {
    startStreaming: isStreaming,
  });

  return (
    <MessageBranch key={message.id} defaultBranch={0}>
      <MessageBranchContent>
        <Message from={message.role as "user" | "assistant"}>
          <MessageContent>
            <MessageResponse>{visibleText}</MessageResponse>
          </MessageContent>
        </Message>
      </MessageBranchContent>
    </MessageBranch>
  );
}

type ChatPanelProps = {
  user: DemoUser;
  threadId?: string | null;
  onThreadChange?: (threadId: string | null) => void;
};

export function ChatPanel({ user, threadId: externalThreadId, onThreadChange }: ChatPanelProps) {
  const [internalThreadId, setInternalThreadId] = useState<string | null>(null);

  // Use external threadId if provided, otherwise use internal state
  const threadId = externalThreadId !== undefined ? externalThreadId : internalThreadId;

  const setThreadId = useCallback((newThreadId: string | null) => {
    if (onThreadChange) {
      onThreadChange(newThreadId);
    } else {
      setInternalThreadId(newThreadId);
    }
  }, [onThreadChange]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const createThread = useMutation(api.agent.createThread);
  const sendMessage = useMutation(api.agent.sendMessage);

  // Query messages for the current thread using useUIMessages for streaming support
  const { results: messages, status: messagesStatus } = useUIMessages(
    api.agent.listThreadMessages,
    threadId ? { threadId } : ("skip" as const),
    {
      initialNumItems: 50,
      stream: true,
    },
  );

  const isStreaming = (messages ?? []).some(
    (msg) => msg.status === "streaming",
  );
  const isLoadingMessages = messagesStatus === "LoadingFirstPage";

  // Create thread on mount or when user changes (only if no external threadId)
  useEffect(() => {
    // If external threadId is provided, don't create a new one
    if (externalThreadId !== undefined && externalThreadId !== null) {
      return;
    }

    const initThread = async () => {
      setIsCreatingThread(true);
      try {
        const newThreadId = await createThread({ userId: user.id });
        setThreadId(newThreadId);
      } catch (error) {
        console.error("Failed to create thread:", error);
      } finally {
        setIsCreatingThread(false);
      }
    };

    setThreadId(null);
    initThread();
  }, [user.id, createThread, externalThreadId, setThreadId]);

  const scrollToBottom = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !threadId || isSending) return;

      setDraft("");
      setIsSending(true);

      try {
        await sendMessage({
          threadId,
          prompt: content.trim(),
          userId: user.id,
        });
      } catch (error) {
        console.error("Failed to send message:", error);
      } finally {
        setIsSending(false);
      }
    },
    [threadId, isSending, sendMessage, user.id],
  );

  const handleSubmit = (message: PromptInputMessage) => {
    handleSendMessage(message.text);
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const handleNewThread = async () => {
    setIsCreatingThread(true);
    try {
      const newThreadId = await createThread({
        userId: user.id,
      });
      setThreadId(newThreadId);
    } catch (error) {
      console.error("Failed to create thread:", error);
    } finally {
      setIsCreatingThread(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Agent Chat</h2>
            <p className="text-sm text-muted-foreground">
              Converse with your neutral agent. Balance and thread state stay in
              sync while you work.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline">
                Thread:{" "}
                {threadId ? threadId.slice(0, 12) + "..." : "creating..."}
              </Badge>
              <Badge variant="outline">User: {user.id}</Badge>
              {isStreaming && <Badge variant="secondary">Streaming</Badge>}
              {isSending && <Badge variant="secondary">Sending</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleNewThread}
              disabled={isCreatingThread}
            >
              {isCreatingThread ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              New thread
            </Button>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 p-4">
          <Conversation className="h-full rounded-xl border bg-muted/30">
            <ConversationContent ref={scrollRef} className="h-full p-6">
              {!threadId ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Creating thread...
                </div>
              ) : isLoadingMessages ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Loading messages...
                </div>
              ) : (messages ?? []).length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  Start a conversation by sending a message
                </div>
              ) : (
                (messages ?? []).map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))
              )}
            </ConversationContent>
            <ConversationScrollButton onClick={scrollToBottom} />
          </Conversation>
        </div>

        {/* Input area */}
        <div className="space-y-3 border-t border-border bg-card/70 p-4">
          <Suggestions>
            {suggestions.map((suggestion) => (
              <Suggestion
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                suggestion={suggestion}
              />
            ))}
          </Suggestions>

          <PromptInput onSubmit={handleSubmit}>
            <PromptInputBody>
              <PromptInputTextarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Type a message..."
                disabled={isSending || isStreaming || !threadId}
              />
            </PromptInputBody>
            <PromptInputFooter className="items-center">
              <div className="text-xs text-muted-foreground">
                {isStreaming
                  ? "Generating..."
                  : isSending
                    ? "Sending..."
                    : "Ready"}
              </div>
              <PromptInputSubmit
                disabled={
                  isSending || isStreaming || !draft.trim() || !threadId
                }
                status={
                  isStreaming ? "streaming" : isSending ? "submitted" : "ready"
                }
              >
                {isSending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </PromptInputSubmit>
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
