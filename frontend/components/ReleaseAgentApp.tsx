"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { ChatPanel } from "@/components/ChatPanel";
import { ReviewHistory } from "@/components/ReviewHistory";
import { ReviewTrace } from "@/components/ReviewTrace";
import { VerdictCard } from "@/components/VerdictCard";
import { buttonVariants } from "@/components/ui/button";
import { submitReview } from "@/lib/api";
import {
  fetchReviewEvents,
  fetchReviews,
  fetchToolCalls,
} from "@/lib/supabase";
import type { Review, ReviewEvent, ToolCall } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ReleaseAgentApp() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [events, setEvents] = useState<ReviewEvent[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallbackUsed, setFallbackUsed] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const data = await fetchReviews();
      setReviews(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  async function loadReviewDetails(review: Review) {
    setSelectedReview(review);
    setFallbackUsed(false);
    try {
      const [reviewEvents, reviewToolCalls] = await Promise.all([
        fetchReviewEvents(review.id),
        fetchToolCalls(review.id),
      ]);
      setEvents(reviewEvents);
      setToolCalls(reviewToolCalls);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load review details"
      );
    }
  }

  async function handleSubmit(inputText: string, title?: string) {
    setLoading(true);
    setError(null);
    setFallbackUsed(false);

    try {
      const result = await submitReview(inputText, title);
      setFallbackUsed(result.fallback_used ?? false);
      await loadHistory();

      const refreshed = await fetchReviews();
      const saved =
        refreshed.find((review) => review.id === result.review_id) ?? null;

      if (saved) {
        await loadReviewDetails(saved);
      } else {
        setSelectedReview({
          id: result.review_id,
          created_at: new Date().toISOString(),
          title: title ?? inputText.slice(0, 60),
          input_text: inputText,
          verdict: result.verdict,
          summary: result.summary,
          rollback_plan: result.rollback_plan,
          status: "completed",
        });
        setToolCalls([]);
        setEvents([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2.5 transition-opacity hover:opacity-70"
            >
              <span
                className="flex size-7 items-center justify-center rounded-full border border-brand/20 bg-brand/5"
                aria-hidden
              >
                <span className="size-1.5 rounded-full bg-brand" />
              </span>
              <span className="text-base font-light tracking-tight">Clearpath</span>
            </Link>
            <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
            <span className="hidden text-sm font-light text-muted-foreground sm:inline">
              Review console
            </span>
          </div>
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "font-light text-muted-foreground"
            )}
          >
            Back to home
          </Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-10">
        <div className="animate-fade-up space-y-3">
          <p className="text-xs font-light uppercase tracking-[0.18em] text-brand">
            Console
          </p>
          <h1 className="text-3xl font-light tracking-tight md:text-4xl">
            Release review
          </h1>
          <p className="max-w-2xl font-light leading-relaxed text-muted-foreground">
            Paste a pull request description or diff. The agent runs structured
            release checks and returns a go, conditional, or no-go verdict.
          </p>
        </div>

        {error && (
          <div
            className="animate-fade-in rounded-xl border border-destructive/25 bg-destructive/5 px-5 py-4 text-sm font-light text-destructive"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="space-y-8">
            <div className="animate-fade-up delay-100">
              <ChatPanel onSubmit={handleSubmit} loading={loading} />
            </div>
            <div className="animate-fade-up delay-200">
              <VerdictCard
                review={selectedReview}
                loading={loading}
                fallbackUsed={fallbackUsed}
              />
            </div>
          </div>

          <div className="animate-fade-up delay-300 space-y-4">
            <div>
              <h2 className="mb-4 text-sm font-light uppercase tracking-[0.12em] text-ink-muted">
                Review history
              </h2>
              {historyLoading ? (
                <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-surface p-8 text-sm font-light text-muted-foreground">
                  <span className="spinner" aria-hidden />
                  Loading history
                </div>
              ) : (
                <ReviewHistory
                  reviews={reviews}
                  selectedId={selectedReview?.id ?? null}
                  onSelect={loadReviewDetails}
                />
              )}
            </div>
          </div>
        </div>

        <div className="animate-fade-up delay-400">
          <ReviewTrace events={events} toolCalls={toolCalls} />
        </div>
      </div>
    </div>
  );
}
