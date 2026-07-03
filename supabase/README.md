# Supabase migrations

Run `20250703120000_initial_schema.sql` in your Supabase project:

- **SQL Editor:** paste and run the file contents, or
- **Supabase CLI:** `supabase db push` (after linking your project)

Tables created:

- `reviews` — verdict, summary, rollback plan, status
- `review_events` — user/assistant/tool message trace
- `tool_calls` — tool inputs and outputs per review

RLS is not enabled in this migration (intentional for take-home scope).
