"""Parse agent output and LangChain message objects for persistence."""

from __future__ import annotations

import json
import re
from typing import Any


VERDICT_PATTERN = re.compile(
    r"VERDICT:\s*(go-with-conditions|no-go|go)\b",
    re.IGNORECASE,
)
SUMMARY_PATTERN = re.compile(
    r"SUMMARY:\s*(.+?)(?=\nROLLBACK_PLAN:|\nCONDITIONS:|\Z)",
    re.IGNORECASE | re.DOTALL,
)
ROLLBACK_PATTERN = re.compile(
    r"ROLLBACK_PLAN:\s*(.+?)(?=\nCONDITIONS:|\Z)",
    re.IGNORECASE | re.DOTALL,
)


def parse_verdict(summary: str) -> str | None:
    match = VERDICT_PATTERN.search(summary)
    if not match:
        return None
    return match.group(1).lower()


def parse_summary(summary: str) -> str:
    match = SUMMARY_PATTERN.search(summary)
    if match:
        return match.group(1).strip()
    return summary.strip()


def parse_rollback_plan(summary: str) -> str | None:
    match = ROLLBACK_PATTERN.search(summary)
    if match:
        return match.group(1).strip()
    return None


def _message_role(message: Any) -> str:
    role = getattr(message, "type", None) or getattr(message, "role", None)
    if role in {"human", "user"}:
        return "user"
    if role in {"ai", "assistant"}:
        return "assistant"
    if role == "tool":
        return "tool"
    if role == "system":
        return "system"
    return str(role or "unknown")


def _message_content(message: Any) -> str:
    content = getattr(message, "content", message)
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, dict):
                if block.get("type") == "text":
                    parts.append(str(block.get("text", "")))
                else:
                    parts.append(json.dumps(block))
            else:
                parts.append(str(block))
        return "\n".join(p for p in parts if p)
    return str(content)


def serialize_messages(messages: list[Any]) -> list[dict[str, str]]:
    return [
        {"role": _message_role(message), "content": _message_content(message)}
        for message in messages
    ]


def extract_tool_outputs(messages: list[Any]) -> dict[str, str]:
    outputs: dict[str, str] = {}
    for message in messages:
        if _message_role(message) != "tool":
            continue
        name = getattr(message, "name", None)
        if name:
            outputs[name] = _message_content(message)
    return outputs


def get_best_assistant_summary(messages: list[Any]) -> str:
    """Prefer the last assistant message that contains a parsed VERDICT block."""
    for message in reversed(messages):
        if _message_role(message) != "assistant":
            continue
        content = _message_content(message).strip()
        if not content:
            continue
        if parse_verdict(content):
            return content
    for message in reversed(messages):
        if _message_role(message) != "assistant":
            continue
        content = _message_content(message).strip()
        if content and len(content) > 20:
            return content
    return ""


def synthesize_fallback_review(messages: list[Any], input_text: str) -> dict[str, str]:
    """Build verdict/summary/rollback when the model stops before the final block."""
    from tools import generate_rollback_plan

    outputs = extract_tool_outputs(messages)
    risky = outputs.get("flag_risky_diff_patterns", "")
    tests = outputs.get("check_test_coverage_mentioned", "")
    breaking = outputs.get("check_breaking_api_changes", "")
    rollback = outputs.get(
        "generate_rollback_plan",
        generate_rollback_plan(input_text),
    )

    high_risk = "severity: high" in risky
    no_risky = risky.startswith("No risky")
    no_tests = "No test coverage" in tests
    has_breaking = "Potential breaking" in breaking

    incident_notes = [
        v for k, v in outputs.items() if k == "lookup_past_incidents" and "No past incidents" not in v
    ]

    if has_breaking and high_risk:
        verdict = "no-go"
    elif not no_risky and (high_risk or no_tests):
        verdict = "go-with-conditions"
    elif not no_risky:
        verdict = "go-with-conditions"
    else:
        verdict = "go"

    summary_parts: list[str] = []
    if not no_risky:
        summary_parts.append(risky.replace("Risky patterns found:\n", "Risky patterns: "))
    if no_tests:
        summary_parts.append("No test coverage mentioned in the PR.")
    elif tests:
        summary_parts.append(tests)
    if has_breaking:
        summary_parts.append(breaking.replace("Potential breaking API changes:\n", "Breaking API signals: "))
    if incident_notes:
        summary_parts.append(incident_notes[0])

    summary = " ".join(summary_parts) if summary_parts else "Review completed from tool outputs."

    return {
        "verdict": verdict,
        "summary": summary,
        "rollback_plan": rollback,
    }


def resolve_review_fields(messages: list[Any], raw_summary: str, input_text: str) -> dict[str, str | None]:
    """Parse model output, falling back to tool-based synthesis if needed."""
    best_text = raw_summary.strip() or get_best_assistant_summary(messages)
    verdict = parse_verdict(best_text)
    summary = parse_summary(best_text) if verdict else best_text.strip()
    rollback_plan = parse_rollback_plan(best_text)

    if not verdict or not summary or len(summary) < 30:
        fallback = synthesize_fallback_review(messages, input_text)
        verdict = verdict or fallback["verdict"]
        if not summary or len(summary) < 30 or summary.lower().startswith("here's"):
            summary = fallback["summary"]
        rollback_plan = rollback_plan or fallback["rollback_plan"]

    return {
        "verdict": verdict,
        "summary": summary,
        "rollback_plan": rollback_plan,
    }


def extract_tool_calls(messages: list[Any]) -> list[dict[str, Any]]:
    """Extract tool call inputs/outputs from LangChain message stream."""
    tool_calls: list[dict[str, Any]] = []
    pending: dict[str, dict[str, Any]] = {}

    for message in messages:
        role = _message_role(message)

        if role == "assistant":
            for call in getattr(message, "tool_calls", None) or []:
                call_id = call.get("id") or call.get("name", "unknown")
                pending[call_id] = {
                    "tool_name": call.get("name", "unknown"),
                    "input": call.get("args", call.get("input")),
                    "output": None,
                }

        if role == "tool":
            tool_call_id = getattr(message, "tool_call_id", None)
            name = getattr(message, "name", None) or "unknown"
            output = _message_content(message)
            if tool_call_id and tool_call_id in pending:
                pending[tool_call_id]["output"] = output
            else:
                tool_calls.append(
                    {
                        "tool_name": name,
                        "input": None,
                        "output": output,
                    }
                )

    tool_calls.extend(pending.values())
    return tool_calls
