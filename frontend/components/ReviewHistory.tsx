import { Clock3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Review } from "@/lib/types";

interface ReviewHistoryProps {
  reviews: Review[];
  selectedId: string | null;
  onSelect: (review: Review) => void;
}

const verdictBadge: Record<string, string> = {
  go: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  "go-with-conditions":
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  "no-go": "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

export function ReviewHistory({
  reviews,
  selectedId,
  onSelect,
}: ReviewHistoryProps) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No reviews yet. Your history will appear here after the first run.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[420px] rounded-lg border">
      <div className="divide-y">
        {reviews.map((review) => (
          <button
            key={review.id}
            type="button"
            onClick={() => onSelect(review)}
            className={cn(
              "w-full px-4 py-3 text-left transition-colors hover:bg-muted/50",
              selectedId === review.id && "bg-muted"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {review.title || "Untitled review"}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock3 className="size-3" />
                  {new Date(review.created_at).toLocaleString()}
                </p>
              </div>
              {review.verdict ? (
                <Badge
                  className={cn(
                    "shrink-0 capitalize",
                    verdictBadge[review.verdict]
                  )}
                >
                  {review.verdict.replace(/-/g, " ")}
                </Badge>
              ) : (
                <Badge variant="outline" className="shrink-0 capitalize">
                  {review.status}
                </Badge>
              )}
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
