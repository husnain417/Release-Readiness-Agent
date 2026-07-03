"""Domain tools for release-readiness review."""

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


def flag_risky_diff_patterns(diff_or_description: str) -> str:
    """Scans a PR diff or description for risky patterns: schema migrations,
    config/env changes, auth/permission changes, removed feature flags,
    or infra changes. Returns a list of flags found with severity."""
    found: list[str] = []
    text = diff_or_description.lower()
    for keyword, severity in RISKY_KEYWORDS.items():
        if keyword in text:
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
    matches = [value for key, value in INCIDENTS_DB.items() if key in lowered]
    if matches:
        return "\n".join(matches)
    return "No past incidents on record for this component."


def generate_rollback_plan(change_summary: str) -> str:
    """Generates a basic rollback plan template based on the type of change described."""
    lowered = change_summary.lower()
    if "migration" in lowered or "alter table" in lowered:
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
    if "config" in lowered or "env" in lowered:
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
        ("breaking", "high"),
        ("deprecated", "medium"),
        ("response shape", "medium"),
        ("renamed field", "medium"),
        ("status code", "low"),
    ]
    found = [f"{signal} (severity: {severity})" for signal, severity in breaking_signals if signal in text]
    if not found:
        return "No obvious breaking API changes detected."
    return "Potential breaking API changes:\n" + "\n".join(found)
