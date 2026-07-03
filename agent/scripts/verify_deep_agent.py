#!/usr/bin/env python3
"""One-shot check: deep agent calls tools and returns fallback_used=false path."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from langchain_core.messages import AIMessage  # noqa: E402

from deep_agent import agent  # noqa: E402
from main import extract_tool_rows  # noqa: E402

SAMPLE = (
    "PR: Update payment webhook retry + auth policy. "
    "Migration: ALTER TABLE payments ADD COLUMN retry_count int."
)


async def main() -> int:
    print("Invoking deep agent (may take 30–90s, multiple LLM calls)...")
    result = await asyncio.wait_for(
        agent.ainvoke({"messages": [{"role": "user", "content": SAMPLE}]}),
        timeout=120,
    )
    messages = result["messages"]
    tool_rows = extract_tool_rows(messages)
    names = [r["tool_name"] for r in tool_rows]
    last = messages[-1] if messages else None

    print(f"tool_rows ({len(tool_rows)}): {names}")
    if last and isinstance(last, AIMessage):
        print(f"final content length: {len(str(last.content or ''))}")

    if not tool_rows:
        print("FAIL: no tool calls")
        return 1
    if "task" not in names:
        print("WARN: no task (subagent) row — input may lack known components")
    print("SUCCESS: deep agent loop verified")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(asyncio.run(main()))
    except Exception:
        print("FAIL: exception during deep agent run", file=sys.stderr)
        import traceback

        traceback.print_exc()
        raise SystemExit(1) from None
