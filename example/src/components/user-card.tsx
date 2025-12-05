import { DemoUser } from "../data/demo-users";
import { cn } from "../lib/utils";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

type UserCardProps = {
  user: DemoUser;
  isActive: boolean;
  onSelect: (userId: string) => void;
};

export function UserCard({ user, isActive, onSelect }: UserCardProps) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onSelect(user.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(user.id);
        }
      }}
      className={cn(
        "group relative text-left shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isActive ? "border-primary/70 bg-accent/20 ring-1 ring-primary/60" : "",
      )}
    >
      <CardHeader className="relative flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {user.role}
          </p>
          <CardTitle className="text-xl">{user.name}</CardTitle>
        </div>
        <Badge
          variant={isActive ? "default" : "outline"}
          className={cn(
            "font-mono uppercase tracking-wide",
            isActive
              ? "border-primary/60 bg-primary/30 text-emerald-100"
              : "border-border bg-muted/50",
          )}
        >
          user={user.id}
        </Badge>
      </CardHeader>
      <CardContent className="relative space-y-5 pt-0">
        <p className="text-sm text-muted-foreground">{user.summary}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-400/80 shadow-[0_0_12px_rgba(16,185,129,0.7)]" />
            Quick connect
          </div>
          <Button
            size="sm"
            variant={isActive ? "secondary" : "outline"}
            className="transition-all duration-200"
            onClick={(event) => {
              event.preventDefault();
              onSelect(user.id);
            }}
          >
            {isActive ? "Selected" : "Use this user"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
