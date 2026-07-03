export type Verdict = "go" | "no-go" | "go-with-conditions";

export type ReviewStatus = "running" | "completed" | "failed";

export interface Review {
  id: string;
  created_at: string;
  title: string | null;
  input_text: string;
  verdict: Verdict | null;
  summary: string | null;
  rollback_plan: string | null;
  status: ReviewStatus;
}

export interface ReviewEvent {
  id: string;
  review_id: string;
  created_at: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string | null;
}

export interface ToolCall {
  id: string;
  review_id: string;
  created_at: string;
  tool_name: string;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | string | null;
}

export interface ReviewResponse {
  review_id: string;
  summary: string;
  verdict: Verdict | null;
  rollback_plan: string | null;
}
