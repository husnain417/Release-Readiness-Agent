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
    let message = "Review failed";
    try {
      const body = await res.json();
      message = body.detail ?? message;
    } catch {
      message = (await res.text()) || message;
    }
    throw new Error(message);
  }

  return res.json();
}
