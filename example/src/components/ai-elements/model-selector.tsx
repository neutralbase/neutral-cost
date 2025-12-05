import * as React from "react";

import { cn } from "../../lib/utils";

type ModelOption = {
  id: string;
  name: string;
  provider?: string;
};

type ModelSelectorContextValue = {
  open: boolean;
  setOpen: (value: boolean) => void;
  onSelect: (id: string) => void;
};

const ModelSelectorContext = React.createContext<ModelSelectorContextValue | null>(null);

export function ModelSelector({
  children,
  onOpenChange,
  open,
  onSelect,
}: {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <ModelSelectorContext.Provider
      value={{ open, setOpen: onOpenChange, onSelect }}
    >
      {children}
    </ModelSelectorContext.Provider>
  );
}

export function ModelSelectorTrigger({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactElement;
}) {
  const ctx = React.useContext(ModelSelectorContext);
  if (!ctx) return children;
  const child = React.Children.only(children);
  return React.cloneElement(child, {
    onClick: () => ctx.setOpen(!ctx.open),
    "aria-expanded": ctx.open,
  });
}

export function ModelSelectorContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(ModelSelectorContext);
  if (!ctx || !ctx.open) return null;
  return (
    <div
      className={cn(
        "absolute right-0 top-full z-10 mt-2 w-60 rounded-md border border-border bg-card p-2 shadow-lg",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ModelSelectorList({
  children,
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1", className)}>{children}</div>;
}

export function ModelSelectorGroup({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="px-2 text-xs font-medium text-muted-foreground">{heading}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function ModelSelectorItem({
  value,
  onSelect,
  children,
}: {
  value: string;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(ModelSelectorContext);
  return (
    <button
      type="button"
      onClick={() => {
        onSelect();
        ctx?.setOpen(false);
      }}
      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground hover:bg-muted"
    >
      {children}
    </button>
  );
}

export function ModelSelectorTriggerButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm hover:bg-muted",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function ModelSelectorInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "mb-2 w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function ModelSelectorEmpty({
  children,
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-2 py-1 text-sm text-muted-foreground", className)}>
      {children}
    </div>
  );
}

export function ModelSelectorLogo({ provider }: { provider?: string }) {
  if (!provider) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">
      {provider}
    </span>
  );
}

export function ModelSelectorName({ children }: { children: React.ReactNode }) {
  return <span className="text-sm">{children}</span>;
}

export function ModelSelectorLogoGroup({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex items-center gap-1">{children}</div>;
}
