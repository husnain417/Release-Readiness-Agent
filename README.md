# Release Readiness Agent

An AI agent that reviews PR descriptions and diffs before deploy. It flags risky changes, checks for missing tests, consults incident history, suggests a rollback plan, and logs every review to a browsable history.

**Stack:** Next.js (Vercel) + FastAPI/deepagents (Railway) + Supabase (Postgres)

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
├── agent/             # FastAPI + deepagents
├── supabase/
│   └── migrations/    # SQL migrations (you run these)
└── README.md
```

## Your setup checklist (Supabase)

1. Create a Supabase project.
2. Run the migration in `supabase/migrations/20250703120000_initial_schema.sql` via the SQL editor or `supabase db push`.
3. Copy project URL and keys for env vars below.
4. **RLS is off** for this take-home (single-user, no auth). Note this tradeoff in your submission.

## Local development

### Agent backend

```bash
cd agent
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # fill in keys
uvicorn main:app --reload --port 8000
```

Test: `curl http://localhost:8000/health`

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in keys
npm run dev
```

Open http://localhost:3000

## Environment variables

**Agent (`agent/.env`)** — never expose these to the frontend:

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service role key (backend only) |
| `CORS_ORIGINS` | Optional comma-separated origins (default `*`) |
| `ANTHROPIC_MODEL` | Optional, default `anthropic:claude-sonnet-4-6` |

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

1. New project from this repo.
2. Set **root directory** to `agent`.
3. Add env vars from `agent/.env.example`.
4. Railway uses `Dockerfile` + `railway.toml` in that folder.
5. Copy the public URL → `NEXT_PUBLIC_AGENT_URL` on Vercel.

### Frontend → Vercel

1. Import repo, set **root directory** to `frontend`.
2. Add env vars from `frontend/.env.local.example`.
3. Set `NEXT_PUBLIC_AGENT_URL` to your Railway URL.
4. Tighten `CORS_ORIGINS` on the agent to your Vercel domain.

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/review` | Run review (sync) |
| `POST` | `/review/stream` | Run review (SSE, optional) |

**POST /review** body:

```json
{ "input_text": "PR description or diff…", "title": "optional PR title" }
```

## What to demo

1. Paste a PR with risky patterns (migration + IAM, no tests) → expect **no-go** or **go-with-conditions**.
2. Click history → show tool call trace from Supabase.
3. Walk through `agent/tools.py` and `agent/prompts.py` — domain knowledge + harness design.

## Next steps (if you had more time)

- GitHub webhook integration instead of paste-in
- Auth + Supabase RLS
- Real incident KB instead of seeded data
- Streaming UI wired to `/review/stream`
