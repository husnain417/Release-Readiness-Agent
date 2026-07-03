"""Quick local test for domain tools (no API key required)."""

from tools import (
    check_breaking_api_changes,
    check_test_coverage_mentioned,
    flag_risky_diff_patterns,
    generate_rollback_plan,
    lookup_past_incidents,
)

SAMPLE = """
PR: Update payment webhook retry + auth policy

- Adds exponential backoff for Stripe webhooks
- Updates IAM policy for new SQS queue
- Migration: ALTER TABLE payments ADD COLUMN retry_count int
"""

if __name__ == "__main__":
    print("=== flag_risky_diff_patterns ===")
    print(flag_risky_diff_patterns(SAMPLE))
    print("\n=== check_test_coverage_mentioned ===")
    print(check_test_coverage_mentioned(SAMPLE))
    print("\n=== check_breaking_api_changes ===")
    print(check_breaking_api_changes(SAMPLE))
    print("\n=== lookup_past_incidents ===")
    print(lookup_past_incidents("payments"))
    print("\n=== generate_rollback_plan ===")
    print(generate_rollback_plan(SAMPLE))
