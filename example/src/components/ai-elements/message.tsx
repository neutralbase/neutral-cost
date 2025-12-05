import * as React from "react";
import { Streamdown } from "streamdown";

import { cn } from "../../lib/utils";

type MessageProps = React.HTMLAttributes<HTMLDivElement> & {
  from?: "user" | "assistant";
};

export function Message({
  children,
  className,
  from = "assistant",
  ...props
}: MessageProps) {
  const isUser = from === "user";
  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "justify-end" : "justify-start",
        className,
      )}
      {...props}
    >
      {!isUser && (
        <div className="mt-1 flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          AI
        </div>
      )}
      <div
        className={cn(
          "max-w-[75%] rounded-2xl border border-border px-4 py-3 text-sm shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-card text-card-foreground",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function MessageContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("leading-relaxed whitespace-pre-line", className)} {...props} />
  );
}

type MessageResponseProps = React.ComponentProps<typeof Streamdown>;

export const MessageResponse = React.memo(
  ({ className, ...props }: MessageResponseProps) => (
    <Streamdown
      shikiTheme={["tokyo-night", "tokyo-night"]}
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      )}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);

MessageResponse.displayName = "MessageResponse";

export function MessageBranch({
  children,
  className,
  defaultBranch: _defaultBranch,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { defaultBranch?: number }) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {children}
    </div>
  );
}

export function MessageBranchContent({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {children}
    </div>
  );
}

export function MessageBranchSelector({
  children,
  className,
  from: _from,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { from?: "user" | "assistant" }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 text-xs text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function MessageBranchPrevious() {
  return <span aria-hidden="true">◀</span>;
}

export function MessageBranchPage() {
  return <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">1/1</span>;
}

export function MessageBranchNext() {
  return <span aria-hidden="true">▶</span>;
}
