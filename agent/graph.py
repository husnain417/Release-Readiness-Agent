"""LangGraph workflow: deterministic tool checks → LLM synthesis."""

from __future__ import annotations

from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from synthesis import invoke_synthesis
from tools import run_tools_pipeline


class ReviewState(TypedDict):
    input_text: str
    tool_rows: list[dict[str, Any]]
    assistant_text: str


def run_checks(state: ReviewState) -> dict[str, Any]:
    """Run all release checks deterministically (fixed order, real function calls)."""
    return {"tool_rows": run_tools_pipeline(state["input_text"])}


async def synthesize(state: ReviewState) -> dict[str, Any]:
    """Synthesize verdict from pre-computed tool results (single LLM call)."""
    assistant_text = await invoke_synthesis(state["input_text"], state["tool_rows"])
    return {"assistant_text": assistant_text}


_builder = StateGraph(ReviewState)
_builder.add_node("run_checks", run_checks)
_builder.add_node("synthesize", synthesize)
_builder.add_edge(START, "run_checks")
_builder.add_edge("run_checks", "synthesize")
_builder.add_edge("synthesize", END)

graph = _builder.compile()
