import json
import os
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from agent import agent
from parsers import _message_content, get_best_assistant_summary, resolve_review_fields
from supabase_client import create_running_review, mark_review_failed, save_review

load_dotenv()

app = FastAPI(title="Release Readiness Agent", version="1.0.0")

cors_origins = os.getenv("CORS_ORIGINS", "*")
allow_origins = ["*"] if cors_origins.strip() == "*" else [o.strip() for o in cors_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ReviewRequest(BaseModel):
    input_text: str = Field(..., min_length=1)
    title: str | None = None


class ReviewResponse(BaseModel):
    review_id: str
    summary: str
    verdict: str | None = None
    rollback_plan: str | None = None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/review", response_model=ReviewResponse)
def review(req: ReviewRequest) -> ReviewResponse:
    title = req.title or req.input_text[:60].strip() or "Untitled review"
    review_row = create_running_review(title=title, input_text=req.input_text)
    review_id = review_row["id"]

    try:
        result = agent.invoke(
            {"messages": [{"role": "user", "content": req.input_text}]}
        )
        messages = result["messages"]
        final_message = get_best_assistant_summary(messages) or _message_content(messages[-1])

        saved = save_review(
            title=title,
            input_text=req.input_text,
            summary=final_message,
            messages=messages,
            review_id=review_id,
        )
    except Exception as exc:
        mark_review_failed(review_id, str(exc))
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    fields = resolve_review_fields(messages, final_message, req.input_text)

    return ReviewResponse(
        review_id=saved["id"],
        summary=fields["summary"] or saved.get("summary") or "",
        verdict=fields["verdict"] or saved.get("verdict"),
        rollback_plan=fields["rollback_plan"] or saved.get("rollback_plan"),
    )


@app.post("/review/stream")
def review_stream(req: ReviewRequest) -> StreamingResponse:
    """SSE stream of agent progress — optional polish endpoint."""

    def event_stream():
        title = req.title or req.input_text[:60].strip() or "Untitled review"
        review_row = create_running_review(title=title, input_text=req.input_text)
        review_id = review_row["id"]
        messages: list[Any] = []

        yield f"data: {json.dumps({'type': 'start', 'review_id': review_id})}\n\n"

        try:
            for state in agent.stream(
                {"messages": [{"role": "user", "content": req.input_text}]},
                stream_mode="values",
            ):
                messages = state.get("messages", messages)
                yield f"data: {json.dumps({'type': 'update', 'message_count': len(messages)})}\n\n"
            final_message = _message_content(messages[-1])
            saved = save_review(
                title=title,
                input_text=req.input_text,
                summary=final_message,
                messages=messages,
                review_id=review_id,
            )
            yield f"data: {json.dumps({'type': 'done', 'review_id': saved['id'], 'summary': saved.get('summary'), 'verdict': saved.get('verdict'), 'rollback_plan': saved.get('rollback_plan')})}\n\n"
        except Exception as exc:
            mark_review_failed(review_id, str(exc))
            yield f"data: {json.dumps({'type': 'error', 'detail': str(exc)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
