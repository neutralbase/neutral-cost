import * as React from "react";

import { cn } from "../../lib/utils";

type ConversationProps = React.HTMLAttributes<HTMLDivElement>;

export function Conversation({ className, ...props }: ConversationProps) {
  return <div className={cn("flex flex-col gap-4", className)} {...props} />;
}

export const ConversationContent = React.forwardRef<
  HTMLDivElement,
  ConversationProps
>(function ConversationContent({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "flex min-h-0 flex-col space-y-4 overflow-y-auto pr-2",
        className,
      )}
      {...props}
    />
  );
});

export function ConversationScrollButton({
  onClick,
}: {
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-auto inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      Scroll to latest
    </button>
  );
}
