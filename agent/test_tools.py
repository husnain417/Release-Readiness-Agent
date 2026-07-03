"""Quick local test for domain tools (no API key required)."""

from tools import run_tools_pipeline, tool_results_dict

SAMPLE = """
PR: Update payment webhook retry + auth policy

- Adds exponential backoff for Stripe webhooks
- Updates IAM policy for new SQS queue
- Migration: ALTER TABLE payments ADD COLUMN retry_count int
"""

if __name__ == "__main__":
    rows = run_tools_pipeline(SAMPLE)
    print(f"Ran {len(rows)} tool calls:\n")
    for row in rows:
        print(f"=== {row['tool_name']} ===")
        print(f"input: {row['input']}")
        print(f"output: {row['output']}\n")

    print("=== aggregated ===")
    print(tool_results_dict(rows))
