"use client";

import { useCallback, useEffect, useState } from "react";

import { ChatPanel } from "@/components/ChatPanel";
import { ReviewHistory } from "@/components/ReviewHistory";
import { ReviewTrace } from "@/components/ReviewTrace";
import { VerdictCard } from "@/components/VerdictCard";
import { submitReview } from "@/lib/api";
import {
  fetchReviewEvents,
  fetchReviews,
  fetchToolCalls,
} from "@/lib/supabase";
import type { Review, ReviewEvent, ToolCall } from "@/lib/types";

export function ReleaseAgentApp() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [events, setEvents] = useState<ReviewEvent[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    try {
      const result = await submitReview(inputText, title);
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
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Z360 Take-Home
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Release Readiness Agent
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          Paste a PR description or diff. Release checks run first, then the
          agent synthesizes a go / no-go verdict from those results.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <ChatPanel onSubmit={handleSubmit} loading={loading} />
          <VerdictCard review={selectedReview} loading={loading} />
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="mb-3 text-lg font-medium">Review history</h2>
            {historyLoading ? (
              <div className="rounded-lg border p-6 text-sm text-muted-foreground">
                Loading history…
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

      <ReviewTrace events={events} toolCalls={toolCalls} />
    </div>
  );
}
