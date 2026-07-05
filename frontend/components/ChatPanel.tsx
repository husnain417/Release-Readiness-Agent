"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  onSubmit: (inputText: string, title?: string) => Promise<void>;
  loading: boolean;
}

const SAMPLES = {
  go: {
    title: "README typo fix",
    input: `PR: Fix typo in README

- Corrects spelling in docs/README.md
- No code or infra changes
- Unit tests added with pytest to verify docs build`,
  },
  noGo: {
    title: "Remove legacy payments API",
    input: `PR: Remove deprecated v1 payments API

- DELETE /api/v1/payments/{id} — breaking change for mobile clients
- No migration
- No tests mentioned`,
  },
  conditional: {
    title: "Payment webhook retry",
    input: `PR: Add payment webhook retry logic

- Adds exponential backoff for failed Stripe webhooks
- Updates IAM policy for new SQS queue
- Migration: ALTER TABLE payments ADD COLUMN retry_count int
- Added unit tests in test_webhook_retry.py (pytest)`,
  },
} as const;

const sampleStyles = {
  go: "border-verdict-go/25 text-verdict-go hover:bg-verdict-go/5",
  noGo: "border-verdict-nogo/25 text-verdict-nogo hover:bg-verdict-nogo/5",
  conditional:
    "border-verdict-conditional/25 text-verdict-conditional hover:bg-verdict-conditional/5",
} as const;

export function ChatPanel({ onSubmit, loading }: ChatPanelProps) {
  const [title, setTitle] = useState("");
  const [inputText, setInputText] = useState("");

  async function handleSubmit() {
    if (!inputText.trim() || loading) return;
    await onSubmit(inputText.trim(), title.trim() || undefined);
  }

  function loadSample(kind: keyof typeof SAMPLES) {
    const sample = SAMPLES[kind];
    setTitle(sample.title);
    setInputText(sample.input);
  }

  return (
    <Card className="border-border/70 bg-surface shadow-[0_8px_40px_-16px_rgba(17,17,16,0.08)]">
      <CardHeader>
        <CardTitle className="text-xl font-light tracking-tight">
          New release review
        </CardTitle>
        <CardDescription className="font-light leading-relaxed">
          Paste a PR title, description, or diff. Release checks run first, then
          the agent synthesizes a verdict from those results.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Input
          placeholder="PR title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={loading}
          aria-label="PR title"
          className="h-10 font-light"
        />
        <Textarea
          placeholder="Paste PR description or diff…"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows={12}
          disabled={loading}
          className="font-mono text-sm font-light leading-relaxed"
          aria-label="PR description or diff"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleSubmit}
            disabled={loading || !inputText.trim()}
            className="h-9 px-5 font-light"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="spinner" aria-hidden />
                Running review
              </span>
            ) : (
              "Run review"
            )}
          </Button>
          {(Object.keys(SAMPLES) as Array<keyof typeof SAMPLES>).map((kind) => (
            <Button
              key={kind}
              type="button"
              variant="outline"
              disabled={loading}
              className={cn("h-9 font-light", sampleStyles[kind])}
              onClick={() => loadSample(kind)}
            >
              {kind === "go"
                ? "Sample: Go"
                : kind === "noGo"
                  ? "Sample: No-Go"
                  : "Sample: Conditional"}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
