-- Release Readiness Agent — initial schema
-- Run via Supabase SQL editor or: supabase db push

create extension if not exists "pgcrypto";

create table reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text,
  input_text text not null,
  verdict text check (verdict in ('go', 'no-go', 'go-with-conditions')),
  summary text,
  rollback_plan text,
  status text not null default 'completed' check (status in ('running', 'completed', 'failed'))
);

create table review_events (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews(id) on delete cascade,
  created_at timestamptz not null default now(),
  role text not null check (role in ('user', 'assistant', 'tool', 'system')),
  content text
);

create table tool_calls (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews(id) on delete cascade,
  created_at timestamptz not null default now(),
  tool_name text not null,
  input jsonb,
  output jsonb
);

create index reviews_created_at_idx on reviews (created_at desc);
create index review_events_review_id_idx on review_events (review_id);
create index tool_calls_review_id_idx on tool_calls (review_id);
