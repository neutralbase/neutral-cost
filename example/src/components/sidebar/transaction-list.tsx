import { useCallback, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import {
  Bot,
  Wrench,
  CreditCard,
  RotateCcw,
  Settings2,
  Receipt,
  ChevronDown,
  MessageSquare,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { api } from "../../../convex/_generated/api";

type Transaction = {
  _id: string;
  userId: string;
  amount: number;
  userAmount?: number;
  type: "purchase" | "usage" | "refund" | "adjustment";
  description: string;
  referenceId?: string;
  threadId?: string;
  multiplier?: number;
  timestamp: string;
};

type TransactionListProps = {
  userId: string;
  onGoToThread?: (threadId: string) => void;
  currentThreadId?: string | null;
};

function getUsageCategory(
  description: string,
): "ai" | "tool" | "purchase" | "other" {
  if (description.toLowerCase().includes("tool usage")) {
    return "tool";
  }
  if (
    description.toLowerCase().includes("usage for") ||
    description.toLowerCase().includes("model")
  ) {
    return "ai";
  }
  if (description.toLowerCase().includes("purchased")) {
    return "purchase";
  }
  return "other";
}

function getTypeConfig(type: Transaction["type"], description: string) {
  if (type === "usage") {
    const category = getUsageCategory(description);
    if (category === "ai") {
      return {
        icon: Bot,
        label: "AI",
        color: "text-blue-400",
        bg: "bg-blue-500/10",
      };
    }
    if (category === "tool") {
      return {
        icon: Wrench,
        label: "Tool",
        color: "text-purple-400",
        bg: "bg-purple-500/10",
      };
    }
  }

  const configs = {
    purchase: {
      icon: CreditCard,
      label: "Credit",
      color: "text-green-400",
      bg: "bg-green-500/10",
    },
    refund: {
      icon: RotateCcw,
      label: "Refund",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    adjustment: {
      icon: Settings2,
      label: "Adjustment",
      color: "text-gray-400",
      bg: "bg-gray-500/10",
    },
    usage: {
      icon: Receipt,
      label: "Usage",
      color: "text-red-400",
      bg: "bg-red-500/10",
    },
  };

  return configs[type] || configs.usage;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDescription(description: string): string {
  return description
    .replace(/^Usage for /, "")
    .replace(/^Tool usage: /, "")
    .replace(/^Purchased /, "");
}

function truncateThreadId(threadId: string): string {
  if (threadId.length <= 12) return threadId;
  return `${threadId.slice(0, 6)}...${threadId.slice(-4)}`;
}

type ThreadGroup = {
  threadId: string | null;
  transactions: Transaction[];
  totalAmount: number;
  latestTimestamp: string;
};

export function TransactionList({ userId, onGoToThread, currentThreadId }: TransactionListProps) {
  const [collapsedThreads, setCollapsedThreads] = useState<Set<string>>(
    new Set(),
  );

  // Fetch transactions from Convex
  const transactions = useQuery(api.example.getTransactionsByUser, { userId });
  const isLoading = transactions === undefined;

  const toggleThread = useCallback((threadId: string) => {
    setCollapsedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });
  }, []);

  const groupedTransactions = useMemo(() => {
    if (!transactions) return [];

    const groups = new Map<string | null, Transaction[]>();

    for (const tx of transactions) {
      const key = tx.threadId ?? null;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(tx as Transaction);
    }

    const result: ThreadGroup[] = [];
    for (const [threadId, txs] of groups) {
      const sortedTxs = [...txs].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      const totalAmount = txs.reduce((sum, tx) => sum + tx.amount, 0);
      const latestTimestamp = sortedTxs[0]?.timestamp ?? "";

      result.push({
        threadId,
        transactions: sortedTxs,
        totalAmount,
        latestTimestamp,
      });
    }

    result.sort(
      (a, b) =>
        new Date(b.latestTimestamp).getTime() -
        new Date(a.latestTimestamp).getTime(),
    );

    return result;
  }, [transactions]);

  return (
    <Card className="flex min-h-0 flex-1 flex-col border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Receipt className="size-4" />
          Transactions
        </CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 pt-0">
        <ScrollArea className="h-full">
          {isLoading ? (
            <div className="flex h-full items-center justify-center p-6">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : groupedTransactions.length === 0 ? (
            <div className="rounded-xl border bg-muted/40 p-6 text-center">
              <Receipt className="mx-auto mb-2 size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No transactions</p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Activity will appear here
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {groupedTransactions.map((group) => {
                const groupKey = group.threadId ?? "no-thread";
                const isCollapsed = collapsedThreads.has(groupKey);

                if (!group.threadId) {
                  return (
                    <div key="no-thread" className="grid gap-2">
                      {group.transactions.map((transaction) => (
                        <TransactionRow
                          key={transaction._id}
                          transaction={transaction}
                        />
                      ))}
                    </div>
                  );
                }

                const isCurrentThread = currentThreadId === group.threadId;

                return (
                  <Collapsible
                    key={groupKey}
                    open={!isCollapsed}
                    onOpenChange={() => toggleThread(groupKey)}
                  >
                    <div className="flex items-center gap-1">
                      <CollapsibleTrigger asChild>
                        <button className="flex flex-1 items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-left transition-colors hover:bg-muted/50">
                          <div className="flex items-center gap-2">
                            <MessageSquare className={cn(
                              "size-4",
                              isCurrentThread ? "text-primary" : "text-muted-foreground"
                            )} />
                            <span className={cn(
                              "text-xs font-medium",
                              isCurrentThread ? "text-primary" : "text-muted-foreground"
                            )}>
                              Thread {truncateThreadId(group.threadId)}
                            </span>
                            <span className="text-[10px] text-muted-foreground/60">
                              {group.transactions.length} items
                            </span>
                            {isCurrentThread && (
                              <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium tabular-nums text-muted-foreground">
                              ${Math.abs(group.totalAmount).toFixed(2)}
                            </span>
                            <ChevronDown
                              className={cn(
                                "size-4 text-muted-foreground transition-transform",
                                isCollapsed && "-rotate-90",
                              )}
                            />
                          </div>
                        </button>
                      </CollapsibleTrigger>
                      {onGoToThread && !isCurrentThread && group.threadId && (
                        <button
                          onClick={() => onGoToThread(group.threadId!)}
                          className="flex size-8 items-center justify-center rounded-lg border bg-muted/30 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                          title="Switch to this thread"
                        >
                          <ExternalLink className="size-3.5" />
                        </button>
                      )}
                    </div>
                    <CollapsibleContent>
                      <div className="ml-2 grid gap-1.5 border-l-2 border-muted pl-2 pt-1.5">
                        {group.transactions.map((transaction) => (
                          <TransactionRow
                            key={transaction._id}
                            transaction={transaction}
                            compact
                          />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function TransactionRow({
  transaction,
  compact = false,
}: {
  transaction: Transaction;
  compact?: boolean;
}) {
  const config = getTypeConfig(transaction.type, transaction.description);
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border bg-card",
        compact ? "px-2 py-1.5" : "px-3 py-2.5",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div
          className={cn(
            "flex flex-shrink-0 items-center justify-center rounded-full",
            config.bg,
            compact ? "size-6" : "size-8",
          )}
        >
          <Icon className={cn(compact ? "size-3" : "size-4", config.color)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "font-medium",
                config.color,
                compact ? "text-[10px]" : "text-xs",
              )}
            >
              {config.label}
            </span>
            <span
              className={cn(
                "text-muted-foreground",
                compact ? "text-[9px]" : "text-[10px]",
              )}
            >
              {formatTimestamp(transaction.timestamp)}
            </span>
          </div>
          <p
            className={cn(
              "truncate text-muted-foreground",
              compact ? "max-w-[120px] text-[10px]" : "max-w-[160px] text-xs",
            )}
            title={transaction.description}
          >
            {formatDescription(transaction.description)}
          </p>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {/* Raw cost */}
        <span
          className={cn(
            "font-semibold tabular-nums",
            transaction.amount > 0 ? "text-green-400" : "text-muted-foreground",
            compact ? "text-xs" : "text-sm",
          )}
          title="Raw cost"
        >
          {transaction.amount > 0 ? "+" : ""}$
          {Math.abs(transaction.amount) < 0.01
            ? Math.abs(transaction.amount).toFixed(6)
            : Math.abs(transaction.amount).toFixed(4)}
        </span>
        {/* User cost (with markup) - always show if defined */}
        {transaction.userAmount !== undefined && (
          <span
            className={cn(
              "rounded bg-primary/10 px-1.5 py-0.5 font-medium tabular-nums text-primary",
              compact ? "text-[10px]" : "text-xs",
            )}
            title="User cost (with markup)"
          >
            →$
            {Math.abs(transaction.userAmount) < 0.01
              ? Math.abs(transaction.userAmount).toFixed(6)
              : Math.abs(transaction.userAmount).toFixed(4)}
          </span>
        )}
        {transaction.multiplier && transaction.multiplier !== 1 && (
          <span
            className={cn(
              "rounded bg-amber-500/15 px-1.5 py-0.5 font-medium tabular-nums text-amber-400",
              compact ? "text-[10px]" : "text-xs",
            )}
          >
            {transaction.multiplier}x
          </span>
        )}
      </div>
    </div>
  );
}
