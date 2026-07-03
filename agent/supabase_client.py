import os
from typing import Any

from dotenv import load_dotenv
from supabase import Client, create_client

from parsers import (
    extract_tool_calls,
    resolve_review_fields,
    serialize_messages,
)

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


def save_review(
    title: str,
    input_text: str,
    summary: str,
    messages: list[Any],
    review_id: str | None = None,
    status: str = "completed",
) -> dict[str, Any]:
    fields = resolve_review_fields(messages, summary, input_text)

    review_payload = {
        "title": title,
        "input_text": input_text,
        "summary": fields["summary"],
        "verdict": fields["verdict"],
        "rollback_plan": fields["rollback_plan"],
        "status": status,
    }

    supabase = get_supabase()
    if review_id:
        res = supabase.table("reviews").update(review_payload).eq("id", review_id).execute()
        review = res.data[0] if res.data else {**review_payload, "id": review_id}
    else:
        res = supabase.table("reviews").insert(review_payload).execute()
        review = res.data[0]

    rid = review["id"]

    events = [
        {**event, "review_id": rid}
        for event in serialize_messages(messages)
    ]
    if events:
        supabase.table("review_events").insert(events).execute()

    tool_rows = [
        {**call, "review_id": rid}
        for call in extract_tool_calls(messages)
    ]
    if tool_rows:
        supabase.table("tool_calls").insert(tool_rows).execute()

    return review


def mark_review_failed(review_id: str, error: str) -> None:
    get_supabase().table("reviews").update(
        {
            "status": "failed",
            "summary": f"Review failed: {error}",
        }
    ).eq("id", review_id).execute()
