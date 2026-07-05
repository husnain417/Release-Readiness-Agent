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
  go: "border-verdict-go/25 bg-verdict-go/8 text-verdict-go",
  "go-with-conditions":
    "border-verdict-conditional/25 bg-verdict-conditional/8 text-verdict-conditional",
  "no-go": "border-verdict-nogo/25 bg-verdict-nogo/8 text-verdict-nogo",
};

const verdictDot: Record<string, string> = {
  go: "status-dot-go",
  "go-with-conditions": "status-dot-conditional",
  "no-go": "status-dot-nogo",
};

export function ReviewHistory({
  reviews,
  selectedId,
  onSelect,
}: ReviewHistoryProps) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-surface-elevated p-8 text-center text-sm font-light text-muted-foreground">
        No reviews yet. Your history will appear here after the first run.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[460px] rounded-xl border border-border/70 bg-surface">
      <div className="divide-y divide-border/60">
        {reviews.map((review) => (
          <button
            key={review.id}
            type="button"
            onClick={() => onSelect(review)}
            className={cn(
              "w-full px-5 py-4 text-left transition-all duration-300 hover:bg-muted/40",
              selectedId === review.id &&
                "bg-brand/5 ring-1 ring-inset ring-brand/15"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-light tracking-tight">
                  {review.title || "Untitled review"}
                </p>
                <p className="mt-1.5 text-xs font-light text-muted-foreground">
                  {new Date(review.created_at).toLocaleString()}
                </p>
              </div>
              {review.verdict ? (
                <Badge
                  className={cn(
                    "shrink-0 gap-1.5 rounded-full border font-light capitalize",
                    verdictBadge[review.verdict]
                  )}
                >
                  <span
                    className={cn("status-dot", verdictDot[review.verdict])}
                    aria-hidden
                  />
                  {review.verdict.replace(/-/g, " ")}
                </Badge>
              ) : (
                <Badge variant="outline" className="shrink-0 font-light capitalize">
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
