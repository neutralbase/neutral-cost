import * as React from "react";

import { cn } from "../../lib/utils";

export function Suggestions({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-2 text-xs", className)}
      {...props}
    />
  );
}

export function Suggestion({
  suggestion,
  onClick,
  className,
}: {
  suggestion: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border border-border bg-muted/40 px-3 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      {suggestion}
    </button>
  );
}
