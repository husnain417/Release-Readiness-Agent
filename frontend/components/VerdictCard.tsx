import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Review, Verdict } from "@/lib/types";
import { cn } from "@/lib/utils";

const verdictConfig: Record<
  Verdict,
  {
    label: string;
    badgeClass: string;
    dotClass: string;
  }
> = {
  go: {
    label: "GO",
    badgeClass:
      "border-verdict-go/30 bg-verdict-go/8 text-verdict-go",
    dotClass: "status-dot-go",
  },
  "go-with-conditions": {
    label: "GO WITH CONDITIONS",
    badgeClass:
      "border-verdict-conditional/30 bg-verdict-conditional/8 text-verdict-conditional",
    dotClass: "status-dot-conditional",
  },
  "no-go": {
    label: "NO-GO",
    badgeClass: "border-verdict-nogo/30 bg-verdict-nogo/8 text-verdict-nogo",
    dotClass: "status-dot-nogo",
  },
};

interface VerdictCardProps {
  review: Review | null;
  loading?: boolean;
  fallbackUsed?: boolean;
}

export function VerdictCard({ review, loading, fallbackUsed }: VerdictCardProps) {
  if (loading) {
    return (
      <Card className="h-full border-border/70 bg-surface">
        <CardHeader>
          <CardTitle className="text-xl font-light tracking-tight">
            Release verdict
          </CardTitle>
          <CardDescription className="font-light">
            Agent is reviewing your change
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 font-light text-muted-foreground">
            <span className="spinner spinner-lg" aria-hidden />
            Running tools and synthesizing recommendation
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!review) {
    return (
      <Card className="h-full border-border/70 bg-surface-elevated">
        <CardHeader>
          <CardTitle className="text-xl font-light tracking-tight">
            Release verdict
          </CardTitle>
          <CardDescription className="font-light">
            Paste a PR description or diff and run a review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-light leading-relaxed text-muted-foreground">
            The agent will flag risky patterns, check for test coverage, consult
            incident history, and produce a rollback plan.
          </p>
        </CardContent>
      </Card>
    );
  }

  const verdict = review.verdict;
  const config = verdict ? verdictConfig[verdict] : null;

  return (
    <Card className="h-full border-border/70 bg-surface transition-shadow hover:shadow-[0_8px_40px_-16px_rgba(17,17,16,0.08)]">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-light tracking-tight">
              {review.title || "Review result"}
            </CardTitle>
            <CardDescription className="font-light">
              {new Date(review.created_at).toLocaleString()}
            </CardDescription>
          </div>
          {config ? (
            <Badge
              className={cn(
                "h-auto gap-2 rounded-full border px-3 py-1.5 text-xs font-light tracking-wide",
                config.badgeClass
              )}
            >
              <span className={cn("status-dot", config.dotClass)} aria-hidden />
              {config.label}
            </Badge>
          ) : (
            <Badge variant="outline" className="font-light capitalize">
              {review.status}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {fallbackUsed && (
          <p className="rounded-lg border border-dashed border-border px-4 py-3 text-xs font-light text-muted-foreground">
            Computed via deterministic fallback (deep agent unavailable or
            DEMO_MODE).
          </p>
        )}
        {review.summary && (
          <div>
            <h3 className="mb-2 text-xs font-light uppercase tracking-[0.12em] text-ink-muted">
              Summary
            </h3>
            <p className="font-light leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {review.summary}
            </p>
          </div>
        )}
        {review.rollback_plan && (
          <div className="rounded-xl border border-border/60 bg-muted/40 p-5">
            <h3 className="mb-2 text-xs font-light uppercase tracking-[0.12em] text-ink-muted">
              Rollback plan
            </h3>
            <p className="font-light leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {review.rollback_plan}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
