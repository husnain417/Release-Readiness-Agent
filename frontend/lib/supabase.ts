import { createClient, SupabaseClient } from "@supabase/supabase-js";

import type { Review, ReviewEvent, ToolCall } from "@/lib/types";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  client = createClient(url, key);
  return client;
}

export async function fetchReviews(): Promise<Review[]> {
  const { data, error } = await getSupabase()
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Review[];
}

export async function fetchReviewEvents(
  reviewId: string
): Promise<ReviewEvent[]> {
  const { data, error } = await getSupabase()
    .from("review_events")
    .select("*")
    .eq("review_id", reviewId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ReviewEvent[];
}

export async function fetchToolCalls(reviewId: string): Promise<ToolCall[]> {
  const { data, error } = await getSupabase()
    .from("tool_calls")
    .select("*")
    .eq("review_id", reviewId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ToolCall[];
}
