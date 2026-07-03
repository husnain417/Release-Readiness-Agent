import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

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
    icon: typeof CheckCircle2;
  }
> = {
  go: {
    label: "GO",
    badgeClass: "bg-emerald-600 text-white border-emerald-600",
    icon: CheckCircle2,
  },
  "go-with-conditions": {
    label: "GO WITH CONDITIONS",
    badgeClass: "bg-amber-500 text-white border-amber-500",
    icon: AlertTriangle,
  },
  "no-go": {
    label: "NO-GO",
    badgeClass: "bg-red-600 text-white border-red-600",
    icon: XCircle,
  },
};

interface VerdictCardProps {
  review: Review | null;
  loading?: boolean;
}

export function VerdictCard({ review, loading }: VerdictCardProps) {
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Release verdict</CardTitle>
          <CardDescription>Agent is reviewing your change…</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Running tools and synthesizing recommendation…
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!review) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Release verdict</CardTitle>
          <CardDescription>
            Paste a PR description or diff and run a review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The agent will flag risky patterns, check for test coverage,
            consult incident history, and produce a rollback plan.
          </p>
        </CardContent>
      </Card>
    );
  }

  const verdict = review.verdict;
  const config = verdict ? verdictConfig[verdict] : null;
  const Icon = config?.icon ?? AlertTriangle;

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{review.title || "Review result"}</CardTitle>
            <CardDescription>
              {new Date(review.created_at).toLocaleString()}
            </CardDescription>
          </div>
          {config ? (
            <Badge
              className={cn(
                "px-3 py-1 text-sm font-semibold tracking-wide",
                config.badgeClass
              )}
            >
              <Icon className="size-4" />
              {config.label}
            </Badge>
          ) : (
            <Badge variant="secondary">{review.status}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {review.summary && (
          <div>
            <h3 className="mb-2 text-sm font-medium">Summary</h3>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {review.summary}
            </p>
          </div>
        )}
        {review.rollback_plan && (
          <div className="rounded-lg border bg-muted/40 p-4">
            <h3 className="mb-2 text-sm font-medium">Rollback plan</h3>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {review.rollback_plan}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
