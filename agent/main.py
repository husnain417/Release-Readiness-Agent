import asyncio
import os

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import AIMessage, ToolMessage
from pydantic import BaseModel, Field

from deep_agent import agent
from parsers import format_rule_based_response, resolve_review_fields
from supabase_client import (
    create_running_review,
    finalize_review,
    mark_review_failed,
    save_tool_calls,
)
from tools import run_tools_pipeline

app = FastAPI(title="Release Readiness Agent", version="2.0.0")

cors_origins = os.getenv("CORS_ORIGINS", "*")
allow_origins = ["*"] if cors_origins.strip() == "*" else [o.strip() for o in cors_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

AGENT_TIMEOUT_SECONDS = 60
DEMO_MODE = os.getenv("DEMO_MODE", "").lower() in {"1", "true", "yes"}


class ReviewRequest(BaseModel):
    input_text: str = Field(..., min_length=1)
    title: str | None = None


class ReviewResponse(BaseModel):
    review_id: str
    summary: str
    verdict: str | None = None
    rollback_plan: str | None = None
    fallback_used: bool = False


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def extract_tool_rows(messages: list) -> list[dict]:
    """Match AIMessage tool_calls to their ToolMessage results by tool_call_id."""
    calls_by_id: dict[str, dict] = {}
    order: list[str] = []
    for msg in messages:
        if isinstance(msg, AIMessage) and getattr(msg, "tool_calls", None):
            for tc in msg.tool_calls:
                calls_by_id[tc["id"]] = {
                    "tool_name": tc["name"],
                    "input": tc.get("args", {}),
                    "output": None,
                }
                order.append(tc["id"])
        elif isinstance(msg, ToolMessage):
            if msg.tool_call_id in calls_by_id:
                calls_by_id[msg.tool_call_id]["output"] = msg.content
    return [calls_by_id[tc_id] for tc_id in order]


async def _run_deep_agent(input_text: str) -> tuple[list[dict], str]:
    result = await asyncio.wait_for(
        agent.ainvoke({"messages": [{"role": "user", "content": input_text}]}),
        timeout=AGENT_TIMEOUT_SECONDS,
    )
    messages = result["messages"]
    tool_rows = extract_tool_rows(messages)
    if not tool_rows:
        raise RuntimeError("Agent completed without calling any tools")
    assistant_text = messages[-1].content
    return tool_rows, assistant_text


def _run_fallback(input_text: str) -> tuple[list[dict], str]:
    tool_rows = run_tools_pipeline(input_text)
    assistant_text = format_rule_based_response(input_text, tool_rows)
    return tool_rows, assistant_text


@app.post("/review", response_model=ReviewResponse)
async def review(req: ReviewRequest) -> ReviewResponse:
    title = req.title or req.input_text[:60].strip() or "Untitled review"
    review_row = create_running_review(title=title, input_text=req.input_text)
    review_id = review_row["id"]

    fallback_used = False
    try:
        if DEMO_MODE:
            tool_rows, assistant_text = _run_fallback(req.input_text)
            fallback_used = True
        else:
            try:
                tool_rows, assistant_text = await _run_deep_agent(req.input_text)
            except Exception:
                # Deterministic safety net: keep the review usable even if the LLM/agent
                # call fails, times out, or hits a rate limit.
                tool_rows, assistant_text = _run_fallback(req.input_text)
                fallback_used = True

        save_tool_calls(review_id, tool_rows)

        saved = finalize_review(
            review_id=review_id,
            title=title,
            input_text=req.input_text,
            assistant_text=assistant_text,
            tool_rows=tool_rows,
        )

        fields = resolve_review_fields(
            messages=[
                {"role": "user", "content": req.input_text},
                {"role": "assistant", "content": assistant_text},
            ],
            raw_summary=assistant_text,
            input_text=req.input_text,
            tool_rows=tool_rows,
        )

    except Exception as exc:
        mark_review_failed(review_id, str(exc))
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return ReviewResponse(
        review_id=saved["id"],
        summary=fields["summary"] or saved.get("summary") or "",
        verdict=fields["verdict"] or saved.get("verdict"),
        rollback_plan=fields["rollback_plan"] or saved.get("rollback_plan"),
        fallback_used=fallback_used,
    )
