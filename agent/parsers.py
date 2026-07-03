"""Parse agent output and build rule-based synthesis for DEMO_MODE."""

from __future__ import annotations

import json
import re
from typing import Any

from tools import tool_results_dict

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
CONDITIONS_PATTERN = re.compile(
    r"CONDITIONS:\s*(.+?)\Z",
    re.IGNORECASE | re.DOTALL,
)


def parse_verdict(text: str) -> str | None:
    match = VERDICT_PATTERN.search(text)
    if not match:
        return None
    return match.group(1).lower()


def parse_summary(text: str) -> str:
    match = SUMMARY_PATTERN.search(text)
    if match:
        return match.group(1).strip()
    cleaned = text.strip()
    if cleaned.upper().startswith("VERDICT:"):
        return ""
    return cleaned


def parse_rollback_plan(text: str) -> str | None:
    match = ROLLBACK_PATTERN.search(text)
    if match:
        return match.group(1).strip()
    return None


def parse_conditions(text: str) -> str | None:
    match = CONDITIONS_PATTERN.search(text)
    if not match:
        return None
    value = match.group(1).strip()
    if value.lower() in {"none", "n/a", "-"}:
        return None
    return value


def _count_severity(text: str, level: str) -> int:
    return text.lower().count(f"severity: {level}")


def compute_verdict_from_tools(outputs: dict[str, str]) -> str:
    risky = outputs.get("flag_risky_diff_patterns", "")
    tests = outputs.get("check_test_coverage_mentioned", "")
    breaking = outputs.get("check_breaking_api_changes", "")
    incidents = outputs.get("lookup_past_incidents", "")

    no_risky = risky.startswith("No risky")
    has_tests = "Tests appear" in tests
    no_tests = "No test coverage" in tests
    has_breaking = "Potential breaking" in breaking
    has_incidents = "No past incidents" not in incidents

    high_risk_count = _count_severity(risky, "high")
    medium_risk_count = _count_severity(risky, "medium")
    breaking_high = _count_severity(breaking, "high")
    has_migration = "migration" in risky.lower() or "alter table" in risky.lower()

    if no_risky and not has_breaking:
        return "go"

    if has_breaking and breaking_high >= 1:
        return "no-go"

    if has_migration and no_tests and has_incidents:
        return "no-go"

    if has_migration and high_risk_count >= 1 and no_tests:
        return "no-go"

    if not has_migration and high_risk_count >= 1 and no_tests and not has_breaking:
        return "go-with-conditions"

    if high_risk_count >= 1 and has_tests:
        return "go-with-conditions"

    if medium_risk_count >= 1 and no_tests:
        return "go-with-conditions"

    if high_risk_count == 0 and has_tests:
        return "go"

    if not no_risky and no_tests:
        return "go-with-conditions"

    return "go"


def build_summary_from_tools(outputs: dict[str, str]) -> str:
    sections: list[str] = []
    risky = outputs.get("flag_risky_diff_patterns", "")
    if risky.startswith("No risky"):
        sections.append("No risky change patterns detected.")
    else:
        sections.append(risky)
    sections.append(outputs.get("check_test_coverage_mentioned", ""))
    sections.append(outputs.get("check_breaking_api_changes", ""))
    incidents = outputs.get("lookup_past_incidents", "")
    if "No past incidents" not in incidents:
        sections.append(f"Incident history: {incidents}")
    return "\n\n".join(s for s in sections if s)


def build_conditions(verdict: str, outputs: dict[str, str]) -> str | None:
    conditions: list[str] = []
    if verdict == "go-with-conditions":
        if "No test coverage" in outputs.get("check_test_coverage_mentioned", ""):
            conditions.append("Add or document test coverage before deploy.")
        if _count_severity(outputs.get("flag_risky_diff_patterns", ""), "high") > 0:
            conditions.append("Senior reviewer sign-off on high-risk changes.")
        if "No past incidents" not in outputs.get("lookup_past_incidents", ""):
            conditions.append("Verify mitigations for known incident patterns.")
    elif verdict == "no-go":
        conditions.append("Resolve blocking issues before re-submitting for review.")
    if not conditions:
        return None
    return "\n".join(f"- {c}" for c in conditions)


def format_rule_based_response(input_text: str, tool_rows: list[dict[str, Any]]) -> str:
    """DEMO_MODE: build structured verdict from tool results without LLM."""
    outputs = tool_results_dict(tool_rows)
    verdict = compute_verdict_from_tools(outputs)
    summary = build_summary_from_tools(outputs)
    rollback = outputs.get("generate_rollback_plan", "")
    conditions = build_conditions(verdict, outputs) or "none"
    return (
        f"VERDICT: {verdict}\n"
        f"SUMMARY: {summary}\n"
        f"ROLLBACK_PLAN: {rollback}\n"
        f"CONDITIONS: {conditions}"
    )


def resolve_review_fields(
    messages: list[dict[str, str]],
    raw_summary: str,
    input_text: str,
    tool_rows: list[dict[str, Any]],
) -> dict[str, str | None]:
    """Parse LLM synthesis output, falling back to tool-based fields if needed."""
    outputs = tool_results_dict(tool_rows)
    tool_verdict = compute_verdict_from_tools(outputs)
    tool_summary = build_summary_from_tools(outputs)
    tool_rollback = outputs.get("generate_rollback_plan", "")
    tool_conditions = build_conditions(tool_verdict, outputs)

    best_text = raw_summary.strip()
    model_verdict = parse_verdict(best_text)
    model_summary = parse_summary(best_text)
    model_rollback = parse_rollback_plan(best_text)
    model_conditions = parse_conditions(best_text)

    use_model_summary = bool(model_summary and len(model_summary) >= 40)

    summary = model_summary if use_model_summary else tool_summary
    rollback_plan = model_rollback or tool_rollback
    conditions = model_conditions or tool_conditions
    verdict = model_verdict or tool_verdict

    if model_verdict == "go-with-conditions" and tool_verdict in {"no-go", "go"}:
        if tool_verdict == "no-go":
            verdict = "no-go"
        elif not use_model_summary:
            verdict = tool_verdict

    if conditions and conditions not in (summary or ""):
        summary = f"{summary}\n\nConditions:\n{conditions}"

    return {
        "verdict": verdict,
        "summary": summary,
        "rollback_plan": rollback_plan,
        "conditions": conditions,
    }


def serialize_messages(messages: list[dict[str, str]]) -> list[dict[str, str]]:
    return messages
