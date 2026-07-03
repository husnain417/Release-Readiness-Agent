"""LLM synthesis step — single completion, no tool-calling loop."""

from __future__ import annotations

import asyncio
import json
import os
from typing import Any

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

from parsers import format_rule_based_response, resolve_review_fields
from prompts import SYNTHESIS_PROMPT
from tools import tool_results_dict

load_dotenv()

SYNTHESIS_TIMEOUT_SECONDS = 60
MAX_RETRIES = 2  # retries after first attempt


class RateLimitError(Exception):
    """Raised when Gemini quota is exhausted after retries."""


def _parse_model_env(name: str, default: str) -> str:
    raw = os.getenv(name, default)
    return raw.split(":", 1)[-1]


def primary_model() -> str:
    return _parse_model_env("AGENT_MODEL", "google_genai:gemini-2.5-flash")


def fallback_model() -> str | None:
    raw = os.getenv("GEMINI_MODEL_FALLBACK")
    if not raw:
        return None
    return raw.split(":", 1)[-1]


def _is_rate_limit(exc: BaseException) -> bool:
    msg = str(exc).lower()
    return "429" in msg or "resource_exhausted" in msg


def _get_llm(model: str) -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(model=model)


def build_synthesis_prompt(input_text: str, tool_results: dict[str, str]) -> str:
    return (
        f"{SYNTHESIS_PROMPT}\n\n"
        f"## PR input\n{input_text}\n\n"
        f"## Tool results (use ONLY these findings — do not invent others)\n"
        f"```json\n{json.dumps(tool_results, indent=2)}\n```"
    )


@retry(
    retry=retry_if_exception(_is_rate_limit),
    stop=stop_after_attempt(MAX_RETRIES + 1),
    wait=wait_exponential(multiplier=2, min=2, max=10),
    reraise=True,
)
def _invoke_model(model: str, prompt: str) -> str:
    llm = _get_llm(model)
    response = llm.invoke(prompt)
    content = response.content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(str(block.get("text", "")))
            else:
                parts.append(str(block))
        return "\n".join(p for p in parts if p)
    return str(content)


def invoke_synthesis_sync(input_text: str, tool_rows: list[dict[str, Any]]) -> str:
    """Call Gemini once to synthesize verdict from pre-computed tool results."""
    tool_results = tool_results_dict(tool_rows)
    prompt = build_synthesis_prompt(input_text, tool_results)
    models = [primary_model()]
    fb = fallback_model()
    if fb and fb not in models:
        models.append(fb)

    last_exc: Exception | None = None
    for model in models:
        try:
            return _invoke_model(model, prompt)
        except Exception as exc:
            last_exc = exc
            if not _is_rate_limit(exc):
                raise
    raise RateLimitError(str(last_exc)) from last_exc


async def invoke_synthesis(input_text: str, tool_rows: list[dict[str, Any]]) -> str:
    if os.getenv("DEMO_MODE", "").lower() in {"1", "true", "yes"}:
        return format_rule_based_response(input_text, tool_rows)
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(invoke_synthesis_sync, input_text, tool_rows),
            timeout=SYNTHESIS_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError as exc:
        raise TimeoutError("LLM synthesis timed out after 60 seconds") from exc


def build_review_response(
    input_text: str,
    assistant_text: str,
    tool_rows: list[dict[str, Any]],
) -> dict[str, str | None]:
    messages = [
        {"role": "user", "content": input_text},
        {"role": "assistant", "content": assistant_text},
    ]
    return resolve_review_fields(messages, assistant_text, input_text, tool_rows)
