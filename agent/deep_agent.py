"""Deep Agent harness: LLM-driven tool calling via deepagents, built on LangGraph."""

from __future__ import annotations

import os

from deepagents import SubAgent, create_deep_agent
from langchain_openai import ChatOpenAI

from prompts import SYSTEM_PROMPT
from tools import (
    check_breaking_api_changes,
    check_test_coverage_mentioned,
    flag_risky_diff_patterns,
    generate_rollback_plan,
    lookup_past_incidents,
)


def _build_model() -> ChatOpenAI:
    return ChatOpenAI(model=os.getenv("AGENT_MODEL", "gpt-4o-mini"))


_model = _build_model()

incident_analyst = SubAgent(
    name="incident-analyst",
    description=(
        "Investigates past incident history for a specific component (auth, payments, "
        "database, api, cache, or queue) and returns a concise risk summary. Call this "
        "once per relevant component mentioned in the PR."
    ),
    system_prompt=(
        "You research past incidents for one component using lookup_past_incidents and "
        "return a concise 1-2 sentence risk summary for the main reviewer. Do not editorialize "
        "beyond what the tool returns."
    ),
    tools=[lookup_past_incidents],
    model=_model,
)

agent = create_deep_agent(
    model=_model,
    tools=[
        flag_risky_diff_patterns,
        check_test_coverage_mentioned,
        check_breaking_api_changes,
        generate_rollback_plan,
    ],
    subagents=[incident_analyst],
    system_prompt=SYSTEM_PROMPT,
)
