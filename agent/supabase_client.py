import os
from typing import Any

from dotenv import load_dotenv
from supabase import Client, create_client

from parsers import resolve_review_fields, serialize_messages

load_dotenv()

_supabase: Client | None = None


def get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_KEY")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        _supabase = create_client(url, key)
    return _supabase


def create_running_review(title: str, input_text: str) -> dict[str, Any]:
    res = (
        get_supabase()
        .table("reviews")
        .insert(
            {
                "title": title,
                "input_text": input_text,
                "status": "running",
            }
        )
        .execute()
    )
    return res.data[0]


def save_tool_calls(review_id: str, tool_rows: list[dict[str, Any]]) -> None:
    if not tool_rows:
        return
    rows = [{**row, "review_id": review_id} for row in tool_rows]
    get_supabase().table("tool_calls").insert(rows).execute()


def save_review_events(review_id: str, events: list[dict[str, str]]) -> None:
    if not events:
        return
    rows = [{**event, "review_id": review_id} for event in events]
    get_supabase().table("review_events").insert(rows).execute()


def finalize_review(
    review_id: str,
    title: str,
    input_text: str,
    assistant_text: str,
    tool_rows: list[dict[str, Any]],
    status: str = "completed",
) -> dict[str, Any]:
    messages = [
        {"role": "user", "content": input_text},
        {"role": "assistant", "content": assistant_text},
    ]
    fields = resolve_review_fields(messages, assistant_text, input_text, tool_rows)

    review_payload = {
        "title": title,
        "input_text": input_text,
        "summary": fields["summary"],
        "verdict": fields["verdict"],
        "rollback_plan": fields["rollback_plan"],
        "status": status,
    }

    res = (
        get_supabase()
        .table("reviews")
        .update(review_payload)
        .eq("id", review_id)
        .execute()
    )
    review = res.data[0] if res.data else {**review_payload, "id": review_id}

    save_review_events(
        review_id,
        serialize_messages(messages),
    )

    return review


def mark_review_failed(review_id: str, error: str) -> None:
    get_supabase().table("reviews").update(
        {
            "status": "failed",
            "summary": f"Review failed: {error}",
        }
    ).eq("id", review_id).execute()
