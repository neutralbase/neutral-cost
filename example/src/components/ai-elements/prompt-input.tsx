import * as React from "react";

import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

type ButtonProps = React.ComponentProps<typeof Button>;

export type PromptInputMessage = {
  text: string;
  files?: File[];
};

type PromptInputProps = {
  children: React.ReactNode;
  onSubmit: (message: PromptInputMessage) => void;
};

export function PromptInput({ children, onSubmit }: PromptInputProps) {
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const text = (formData.get("prompt-text") as string) || "";
        onSubmit({ text });
      }}
    >
      {children}
    </form>
  );
}

export function PromptInputHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props} />
  );
}

export function PromptInputBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-start gap-2", className)} {...props} />;
}

export function PromptInputFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function PromptInputTextarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      name="prompt-text"
      className={cn(
        "min-h-[96px] flex-1 resize-none rounded-lg border border-input px-3 py-2 text-sm text-foreground shadow-sm outline-none ring-offset-background focus:border-primary focus:ring-2 focus:ring-primary/40",
        className,
      )}
      {...props}
    />
  );
}

export function PromptInputTools({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props} />
  );
}

type PromptInputButtonProps = ButtonProps & { children: React.ReactNode };

export function PromptInputButton({
  className,
  children,
  ...props
}: PromptInputButtonProps) {
  return (
    <Button
      type={props.type ?? "button"}
      variant={props.variant ?? "ghost"}
      size={props.size ?? "icon"}
      className={cn("size-9", className)}
      {...props}
    >
      {children}
    </Button>
  );
}

export function PromptInputSubmit({
  className,
  status,
  children,
  ...props
}: ButtonProps & { status?: string }) {
  return (
    <Button
      type="submit"
      size={props.size ?? "sm"}
      variant={props.variant ?? "default"}
      className={cn("inline-flex items-center gap-2", className)}
      {...props}
    >
      {children ?? (status === "streaming" ? "Generating..." : "Send")}
    </Button>
  );
}

// Lightweight stubs to align with the example API surface.
export function PromptInputAttachments({
  children,
}: {
  children: (file: File) => React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {children as unknown as React.ReactNode}
    </div>
  );
}

export function PromptInputAttachment({ data }: { data: File }) {
  return (
    <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
      {data.name}
    </span>
  );
}

export function PromptInputActionMenu({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("relative", className)}>{children}</div>;
}

export function PromptInputActionMenuTrigger({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className={cn("size-9", className)}
      {...props}
    >
      +
    </Button>
  );
}

export function PromptInputActionMenuContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute right-0 top-full z-10 mt-1 min-w-[160px] rounded-md border border-border bg-card p-2 shadow-md",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PromptInputActionAddAttachments() {
  return (
    <button
      type="button"
      className="w-full rounded-md px-2 py-1 text-left text-sm text-foreground hover:bg-muted"
    >
      Add attachment (stub)
    </button>
  );
}
