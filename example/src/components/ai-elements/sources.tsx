import * as React from "react";

import { cn } from "../../lib/utils";

export function Sources({ children }: { children: React.ReactNode }) {
  return <div className="mt-3 flex flex-wrap gap-2 text-xs">{children}</div>;
}

export function SourcesTrigger({
  count,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { count?: number }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-2 py-1 text-muted-foreground",
        className,
      )}
      {...props}
    >
      Sources {count ? `(${count})` : ""}
    </div>
  );
}

export function SourcesContent({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)} {...props}>
      {children}
    </div>
  );
}

export function Source({
  href,
  title,
}: {
  href: string;
  title: string;
}) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-1 text-muted-foreground hover:text-foreground"
    >
      {title}
    </a>
  );
}
