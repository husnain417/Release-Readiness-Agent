# Release Readiness Agent

An AI agent that reviews PR descriptions and diffs before deploy. It flags risky changes, checks for missing tests, consults incident history, suggests a rollback plan, and logs every review to a browsable history.

**Stack:** Next.js (Vercel) + FastAPI + LangGraph-style pipeline (Railway) + Supabase (Postgres)

## How it works (harness design)

This is a **deterministic-first orchestration**, not LLM-decided tool calling:

```
PR input
   │
   ▼
┌─────────────────────────────┐
│  Tool pipeline (always runs) │  flag_risky_diff_patterns
│  Fixed order, real function  │  check_test_coverage_mentioned
│  calls with real inputs      │  check_breaking_api_changes
│                              │  lookup_past_incidents (per component)
│                              │  generate_rollback_plan
└──────────────┬──────────────┘
               │ tool results persisted to Supabase
               ▼
┌─────────────────────────────┐
│  LLM synthesis (1 call)     │  Verdict + explanation from tool output
│  No function-calling loop    │  (or DEMO_MODE rule-based fallback)
└──────────────┬──────────────┘
               ▼
         reviews / events / tool_calls
```

**Why:** All release checks must always run. The LLM synthesizes a verdict from real findings — it does not decide whether to call tools.

## Architecture

```
Frontend (Next.js)  ──POST /review──▶  Agent Backend (FastAPI)
       │                                        │
       │ reads history                          │ writes reviews,
       └──────────── Supabase ◀─────────────────┘ events, tool_calls
```

Two deployable services — the Python agent does **not** run on Vercel.

## Repo structure

```
├── frontend/          # Next.js + Tailwind + shadcn
├── agent/             # FastAPI + tool pipeline + LLM synthesis
│   └── scripts/       # reset_demo_data.py
├── supabase/
│   └── migrations/
└── README.md
```

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/migrations/20250703120000_initial_schema.sql` via SQL editor or `supabase db push`.
3. Copy project URL and keys for env vars below.
4. **RLS is off** for this take-home (single-user, no auth) — documented tradeoff.

## Local development

### Agent backend

```bash
cd agent
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # fill in keys
uvicorn main:app --reload --port 8000
```

Test tools (no API key):

```bash
python3 test_tools.py
```

Test health:

```bash
curl http://localhost:8000/health
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in keys
npm run dev
```

Open http://localhost:3000 — use the three sample buttons (Go / No-Go / Conditional).

### Seed clean demo data

After backend is running:

```bash
cd agent
python scripts/reset_demo_data.py
```

Set `AGENT_URL` if not localhost (e.g. `AGENT_URL=https://your-agent.up.railway.app python scripts/reset_demo_data.py`).

Run again immediately before final submission to wipe test history.

## Environment variables

**Agent (`agent/.env`)** — never expose to frontend:

| Variable | Description |
|----------|-------------|
| `GOOGLE_API_KEY` | Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service role key (backend only) |
| `AGENT_MODEL` | Optional. Default `google_genai:gemini-2.5-flash` |
| `GEMINI_MODEL_FALLBACK` | Optional fallback model if primary hits quota (e.g. `gemini-2.5-flash-lite`) |
| `DEMO_MODE` | Set `true` to skip LLM and use rule-based synthesis (tools still run) |
| `CORS_ORIGINS` | Optional comma-separated origins (default `*`) |

**Frontend (`frontend/.env.local`)**:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key only |
| `NEXT_PUBLIC_AGENT_URL` | Agent backend URL (e.g. `http://localhost:8000`) |

## Agent tools

| Tool | Purpose |
|------|---------|
| `flag_risky_diff_patterns` | Scans for migrations, IAM, secrets, etc. |
| `check_test_coverage_mentioned` | Checks if tests are mentioned in the PR |
| `check_breaking_api_changes` | Detects breaking API signals |
| `lookup_past_incidents` | Seeded incident KB (auth, payments, db, …) |
| `generate_rollback_plan` | Template rollback plan by change type |

## Deploy

### Agent → Railway

1. New project from this repo, **root directory** = `agent`.
2. Add env vars from `agent/.env.example`.
3. Set `CORS_ORIGINS` to your Vercel domain.
4. Copy public URL → `NEXT_PUBLIC_AGENT_URL` on Vercel.

### Frontend → Vercel

1. Import repo, **root directory** = `frontend`.
2. Add env vars from `frontend/.env.local.example`.
3. Point `NEXT_PUBLIC_AGENT_URL` at Railway URL.

### Before submitting

```bash
AGENT_URL=https://your-live-agent-url python agent/scripts/reset_demo_data.py
```

Then click all 3 sample buttons on the live URL to verify.

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness check (no Supabase/Gemini) |
| `POST` | `/review` | Run review |

**POST /review** body:

```json
{ "input_text": "PR description or diff…", "title": "optional PR title" }
```

Returns `503` with a clean message if Gemini rate-limited.

## Known tradeoffs

- **Keyword heuristics**, not static analysis — tools scan text patterns, not ASTs
- **No auth / RLS off** — single-user take-home scope
- **No job queue** — synchronous review (~15–30s)
- **Gemini free tier** — limited daily quota; use `DEMO_MODE` or `GEMINI_MODEL_FALLBACK` as safety nets
- **Seeded incident KB** — hardcoded, not a real database

## What to demo

1. Click **Sample: Go**, **Sample: No-Go**, **Sample: Conditional** — show full verdict range
2. Expand **Release checks** trace — every row is a real function call with input + output
3. Walk through `agent/tools.py` and `agent/synthesis.py` — deterministic pipeline + LLM synthesis

## Next steps

- GitHub webhook integration instead of paste-in
- Auth + Supabase RLS
- Real incident KB
- Streaming UI for synthesis step
