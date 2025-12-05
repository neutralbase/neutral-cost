import { useState } from "react";
import { Loader2, LogOut, Wallet } from "lucide-react";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Separator } from "../ui/separator";

type PricingTier = { id: string; name: string; price: number };

type BalanceCardProps = {
  balance: number;
  tiers: PricingTier[];
  onSignOut: () => void;
};

export function BalanceCard({ balance, tiers, onSignOut }: BalanceCardProps) {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState("");

  const handleSelectTier = (price: number, tierId: string) => {
    setLoadingTier(tierId);
    console.log(`[Mock] Adding $${price} to balance via ${tierId}`);

    // Simulate loading
    setTimeout(() => {
      setLoadingTier(null);
      console.log(`[Mock] Would redirect to checkout for $${price}`);
    }, 1000);
  };

  const handleCustomSubmit = () => {
    const price = Number(customAmount);
    if (!price || price <= 0) return;

    setLoadingTier("custom");
    console.log(`[Mock] Adding custom amount: $${price}`);

    setTimeout(() => {
      setLoadingTier(null);
      setCustomAmount("");
      console.log(`[Mock] Would redirect to checkout for $${price}`);
    }, 1000);
  };

  return (
    <Card className="border-border/70">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="size-4" />
            Balance
          </CardTitle>
          <CardDescription>Linked to your account</CardDescription>
        </div>
        <Button onClick={onSignOut} size="sm" variant="outline">
          <LogOut className="size-4" />
          Sign out
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border bg-muted/40 p-4 text-center">
          <p className="text-sm text-muted-foreground">Current Balance</p>
          <p className="text-4xl font-semibold">${balance.toFixed(2)}</p>
          <p className="mt-1 text-xs text-muted-foreground">USD</p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Add Balance</p>
          <div className="grid gap-2">
            {tiers.map((tier) => (
              <Button
                key={tier.id}
                className="h-fit justify-between"
                onClick={() => handleSelectTier(tier.price, tier.id)}
                disabled={loadingTier !== null}
                variant="outline"
              >
                <span className="flex flex-col items-start">
                  <span className="font-medium">{tier.name}</span>
                  <span className="text-xs text-muted-foreground">
                    Add ${tier.price} to balance
                  </span>
                </span>
                <span className="flex items-center gap-2 font-semibold">
                  ${tier.price}
                  {loadingTier === tier.id && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                </span>
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Custom Amount</p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                className="pl-7"
                min="1"
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="0"
                type="number"
                value={customAmount}
              />
            </div>
            <Button
              disabled={!customAmount || loadingTier !== null}
              onClick={handleCustomSubmit}
            >
              {loadingTier === "custom" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Add"
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {customAmount
              ? `Add $${Number(customAmount).toFixed(2)} to your balance`
              : "Enter amount in USD"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
