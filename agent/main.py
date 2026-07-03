import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from graph import graph
from supabase_client import (
    create_running_review,
    finalize_review,
    mark_review_failed,
    save_tool_calls,
)
from synthesis import RateLimitError, build_review_response

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
async def review(req: ReviewRequest) -> ReviewResponse:
    title = req.title or req.input_text[:60].strip() or "Untitled review"
    review_row = create_running_review(title=title, input_text=req.input_text)
    review_id = review_row["id"]

    try:
        result = await graph.ainvoke({"input_text": req.input_text})
        tool_rows = result["tool_rows"]
        assistant_text = result["assistant_text"]

        save_tool_calls(review_id, tool_rows)

        saved = finalize_review(
            review_id=review_id,
            title=title,
            input_text=req.input_text,
            assistant_text=assistant_text,
            tool_rows=tool_rows,
        )

        fields = build_review_response(req.input_text, assistant_text, tool_rows)

    except RateLimitError:
        mark_review_failed(review_id, "rate_limited")
        raise HTTPException(
            status_code=503,
            detail="The review service is temporarily rate-limited. Please try again in a minute.",
        ) from None
    except TimeoutError as exc:
        mark_review_failed(review_id, str(exc))
        raise HTTPException(status_code=504, detail=str(exc)) from exc
    except Exception as exc:
        mark_review_failed(review_id, str(exc))
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return ReviewResponse(
        review_id=saved["id"],
        summary=fields["summary"] or saved.get("summary") or "",
        verdict=fields["verdict"] or saved.get("verdict"),
        rollback_plan=fields["rollback_plan"] or saved.get("rollback_plan"),
    )
