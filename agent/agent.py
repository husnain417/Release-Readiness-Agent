import os

from deepagents import create_deep_agent
from dotenv import load_dotenv

from prompts import SYSTEM_PROMPT
from tools import (
    check_breaking_api_changes,
    check_test_coverage_mentioned,
    flag_risky_diff_patterns,
    generate_rollback_plan,
    lookup_past_incidents,
)

load_dotenv()

# Gemini via langchain-google-genai (reads GOOGLE_API_KEY from env)
MODEL = os.getenv("AGENT_MODEL", "google_genai:gemini-2.5-flash-lite")

agent = create_deep_agent(
    model=MODEL,
    tools=[
        flag_risky_diff_patterns,
        check_test_coverage_mentioned,
        lookup_past_incidents,
        generate_rollback_plan,
        check_breaking_api_changes,
    ],
    system_prompt=SYSTEM_PROMPT,
)
