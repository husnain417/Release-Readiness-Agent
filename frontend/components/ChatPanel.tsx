"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5" />
          New release review
        </CardTitle>
        <CardDescription>
          Paste a PR title, description, or diff. Release checks run first,
          then the agent synthesizes a verdict from those results.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="PR title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={loading}
          aria-label="PR title"
        />
        <Textarea
          placeholder="Paste PR description or diff…"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows={12}
          disabled={loading}
          className="font-mono text-sm"
          aria-label="PR description or diff"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleSubmit} disabled={loading || !inputText.trim()}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                Running review…
              </>
            ) : (
              "Run review"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            className={cn(
              "border-emerald-300 text-emerald-800 hover:bg-emerald-50",
              "dark:border-emerald-800 dark:text-emerald-200 dark:hover:bg-emerald-950"
            )}
            onClick={() => loadSample("go")}
          >
            Sample: Go
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            className={cn(
              "border-red-300 text-red-800 hover:bg-red-50",
              "dark:border-red-800 dark:text-red-200 dark:hover:bg-red-950"
            )}
            onClick={() => loadSample("noGo")}
          >
            Sample: No-Go
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            className={cn(
              "border-amber-300 text-amber-800 hover:bg-amber-50",
              "dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-950"
            )}
            onClick={() => loadSample("conditional")}
          >
            Sample: Conditional
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
