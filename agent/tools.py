"""Domain tools for release-readiness review."""

import re
from typing import Any

RISKY_KEYWORDS: dict[str, str] = {
    "migration": "high",
    "alter table": "high",
    "drop table": "high",
    "env var": "medium",
    "environment variable": "medium",
    "feature flag": "medium",
    "permission": "high",
    "iam": "high",
    "rbac": "high",
    "auth": "medium",
    "secret": "high",
    "credential": "high",
    "timeout": "low",
    "kubernetes": "medium",
    "terraform": "medium",
    "breaking change": "high",
}

TEST_SIGNALS = [
    "test added",
    "tests added",
    "unit test",
    "integration test",
    "e2e",
    "covered by test",
    "test coverage",
    "pytest",
    "jest",
    "vitest",
    "test suite",
]

INCIDENTS_DB: dict[str, str] = {
    "auth": (
        "2 past incidents: token refresh race condition (Mar 2025), "
        "session leak under high concurrency (Jan 2025)."
    ),
    "payments": (
        "1 past incident: webhook retry storm caused duplicate charges (Feb 2025). "
        "Requires idempotency key verification on deploy."
    ),
    "database": (
        "1 past incident: migration locked orders table for 40min under load (Apr 2025). "
        "Use online migrations for large tables."
    ),
    "api": (
        "1 past incident: rate limiter misconfiguration caused 429 storm (May 2025)."
    ),
    "cache": (
        "1 past incident: Redis failover caused stale reads for 12min (Mar 2025)."
    ),
    "queue": (
        "1 past incident: SQS visibility timeout too low caused duplicate processing (Feb 2025)."
    ),
}

COMPONENT_HINTS = ["auth", "payments", "database", "api", "cache", "queue"]

TOOL_ORDER = [
    "flag_risky_diff_patterns",
    "check_test_coverage_mentioned",
    "check_breaking_api_changes",
    "lookup_past_incidents",
    "generate_rollback_plan",
]


def _scrub_negated_phrases(text: str, keyword: str) -> str:
    scrubbed = text
    for prefix in (r"no\s+", r"without\s+", r"not\s+a\s+"):
        scrubbed = re.sub(
            rf"\b{prefix}{re.escape(keyword)}\b",
            "",
            scrubbed,
            flags=re.IGNORECASE,
        )
    return scrubbed


def _keyword_present(text: str, keyword: str) -> bool:
    lowered = text.lower()
    if keyword not in lowered:
        return False
    return keyword in _scrub_negated_phrases(lowered, keyword).lower()


def _component_in_text(text: str, component: str) -> bool:
    return bool(re.search(rf"\b{re.escape(component)}\b", text.lower()))


def flag_risky_diff_patterns(diff_or_description: str) -> str:
    """Scans a PR diff or description for risky patterns: schema migrations,
    config/env changes, auth/permission changes, removed feature flags,
    or infra changes. Returns a list of flags found with severity."""
    found: list[str] = []
    text = diff_or_description.lower()
    for keyword, severity in RISKY_KEYWORDS.items():
        if _keyword_present(text, keyword):
            found.append(f"{keyword} (severity: {severity})")
    if not found:
        return "No risky patterns detected."
    return "Risky patterns found:\n" + "\n".join(found)


def check_test_coverage_mentioned(pr_description: str) -> str:
    """Checks whether the PR description mentions tests being added or updated."""
    lowered = pr_description.lower()
    matched = [signal for signal in TEST_SIGNALS if signal in lowered]
    if matched:
        return f"Tests appear to be mentioned/covered. Signals: {', '.join(matched)}"
    return "No test coverage mentioned — flag for reviewer follow-up."


def lookup_past_incidents(component_name: str) -> str:
    """Looks up a small seeded knowledge base of past incidents related to a component name."""
    lowered = component_name.lower()
    if lowered in INCIDENTS_DB:
        return INCIDENTS_DB[lowered]
    return "No past incidents on record for this component."


def generate_rollback_plan(change_summary: str) -> str:
    """Generates a basic rollback plan template based on the type of change described."""
    lowered = change_summary.lower()
    if "delete /" in lowered or "removed endpoint" in lowered:
        return (
            "Rollback plan: restore deleted endpoint/handlers, redeploy previous API "
            "version, notify client teams, and monitor 4xx/5xx rates for 30 minutes."
        )
    if _keyword_present(lowered, "migration") or "alter table" in lowered:
        return (
            "Rollback plan: revert migration via down-script, restore from last "
            "snapshot if down-script unsafe, verify row counts post-rollback, "
            "and monitor replication lag for 30 minutes."
        )
    if "feature flag" in lowered:
        return (
            "Rollback plan: disable feature flag immediately, verify traffic split "
            "returns to control, monitor error rates for 15 minutes."
        )
    if "config" in lowered or re.search(r"\benv\b", lowered):
        return (
            "Rollback plan: revert config/env to previous values, redeploy if needed, "
            "verify health checks and smoke tests pass."
        )
    return (
        "Rollback plan: redeploy previous container image/tag, verify health checks, "
        "monitor error rate and latency for 15 minutes post-rollback."
    )


def check_breaking_api_changes(diff_or_description: str) -> str:
    """Detects potential breaking API changes such as removed endpoints, renamed fields,
    or changed response shapes. Useful for public API releases."""
    text = diff_or_description.lower()
    breaking_signals = [
        ("removed endpoint", "high"),
        ("delete /", "high"),
        ("breaking change", "high"),
        ("deprecated", "medium"),
        ("response shape", "medium"),
        ("renamed field", "medium"),
        ("status code", "low"),
    ]
    found = [
        f"{signal} (severity: {severity})"
        for signal, severity in breaking_signals
        if signal in text
    ]
    if not found:
        return "No obvious breaking API changes detected."
    return "Potential breaking API changes:\n" + "\n".join(found)


def run_tools_pipeline(input_text: str) -> list[dict[str, Any]]:
    """Run all release checks deterministically. Returns rows for tool_calls table."""
    rows: list[dict[str, Any]] = []

    risky = flag_risky_diff_patterns(input_text)
    rows.append(
        {
            "tool_name": "flag_risky_diff_patterns",
            "input": {"diff_or_description": input_text},
            "output": risky,
        }
    )

    tests = check_test_coverage_mentioned(input_text)
    rows.append(
        {
            "tool_name": "check_test_coverage_mentioned",
            "input": {"pr_description": input_text},
            "output": tests,
        }
    )

    breaking = check_breaking_api_changes(input_text)
    rows.append(
        {
            "tool_name": "check_breaking_api_changes",
            "input": {"diff_or_description": input_text},
            "output": breaking,
        }
    )

    for component in COMPONENT_HINTS:
        if _component_in_text(input_text, component):
            incident = lookup_past_incidents(component)
            rows.append(
                {
                    "tool_name": "lookup_past_incidents",
                    "input": {"component_name": component},
                    "output": incident,
                }
            )

    rollback = generate_rollback_plan(input_text)
    rows.append(
        {
            "tool_name": "generate_rollback_plan",
            "input": {"change_summary": input_text},
            "output": rollback,
        }
    )

    return rows


def tool_results_dict(rows: list[dict[str, Any]]) -> dict[str, str]:
    """Flatten pipeline rows into a single dict for synthesis."""
    results: dict[str, str] = {}
    incidents: list[str] = []
    for row in rows:
        name = row["tool_name"]
        output = row["output"]
        if name == "lookup_past_incidents":
            if "No past incidents" not in output:
                incidents.append(output)
        else:
            results[name] = output
    results["lookup_past_incidents"] = (
        "\n".join(incidents) if incidents else "No past incidents on record for this component."
    )
    return results
