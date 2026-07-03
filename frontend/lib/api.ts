import type { ReviewResponse } from "@/lib/types";

function getAgentUrl(): string {
  const url = process.env.NEXT_PUBLIC_AGENT_URL;
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_AGENT_URL");
  }
  return url.replace(/\/$/, "");
}

export async function submitReview(
  inputText: string,
  title?: string
): Promise<ReviewResponse> {
  const res = await fetch(`${getAgentUrl()}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input_text: inputText, title }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || "Review failed");
  }

  return res.json();
}
