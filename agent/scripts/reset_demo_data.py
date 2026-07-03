#!/usr/bin/env python3
"""Reset Supabase demo data and seed 3 reviews via the real /review API."""

from __future__ import annotations

import os
import sys
import time

import httpx
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SEED_REVIEWS = [
    {
        "title": "README typo fix",
        "input_text": """PR: Fix typo in README

- Corrects spelling in docs/README.md
- No code or infra changes
- Unit tests added with pytest to verify docs build""",
        "expected_verdict": "go",
    },
    {
        "title": "Remove legacy payments API",
        "input_text": """PR: Remove deprecated v1 payments API

- DELETE /api/v1/payments/{id} — breaking change for mobile clients
- No migration
- No tests mentioned""",
        "expected_verdict": "no-go",
    },
    {
        "title": "Payment webhook retry",
        "input_text": """PR: Add payment webhook retry logic

- Adds exponential backoff for failed Stripe webhooks
- Updates IAM policy for new SQS queue
- Migration: ALTER TABLE payments ADD COLUMN retry_count int
- Added unit tests in test_webhook_retry.py (pytest)""",
        "expected_verdict": "go-with-conditions",
    },
]


def get_supabase():
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_KEY"]
    return create_client(url, key)


def clear_tables(client) -> None:
    print("Clearing existing data (FK-safe order)...")
    client.table("tool_calls").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    client.table("review_events").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    client.table("reviews").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    print("  Cleared tool_calls, review_events, reviews")


def run_review(agent_url: str, title: str, input_text: str) -> dict:
    url = f"{agent_url.rstrip('/')}/review"
    response = httpx.post(
        url,
        json={"title": title, "input_text": input_text},
        timeout=120.0,
    )
    response.raise_for_status()
    return response.json()


def main() -> int:
    agent_url = os.getenv("AGENT_URL", "http://localhost:8000")
    if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_SERVICE_KEY"):
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in agent/.env")
        return 1

    client = get_supabase()
    clear_tables(client)

    print(f"\nSeeding via {agent_url}/review ...\n")
    created = []

    for seed in SEED_REVIEWS:
        print(f"  Running: {seed['title']}...")
        try:
            result = run_review(agent_url, seed["title"], seed["input_text"])
            verdict = result.get("verdict")
            created.append(
                {
                    "review_id": result["review_id"],
                    "title": seed["title"],
                    "verdict": verdict,
                    "expected": seed["expected_verdict"],
                }
            )
            match = "✓" if verdict == seed["expected_verdict"] else "⚠ mismatch"
            print(f"    {match} verdict={verdict} (expected {seed['expected_verdict']})")
            time.sleep(2)
        except httpx.HTTPError as exc:
            print(f"    FAILED: {exc}")
            return 1

    print("\n=== Seed summary ===")
    for row in created:
        print(f"  {row['review_id']}  {row['title']}  →  {row['verdict']}")

    print("\nDone. Review history is ready for demo.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
