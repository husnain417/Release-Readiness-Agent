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

interface ChatPanelProps {
  onSubmit: (inputText: string, title?: string) => Promise<void>;
  loading: boolean;
}

const SAMPLE_INPUT = `PR: Add payment webhook retry logic

- Adds exponential backoff for failed Stripe webhooks
- Updates IAM policy for new SQS queue
- Migration: ALTER TABLE payments ADD COLUMN retry_count int
- No tests mentioned yet`;

export function ChatPanel({ onSubmit, loading }: ChatPanelProps) {
  const [title, setTitle] = useState("");
  const [inputText, setInputText] = useState("");

  async function handleSubmit() {
    if (!inputText.trim() || loading) return;
    await onSubmit(inputText.trim(), title.trim() || undefined);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5" />
          New release review
        </CardTitle>
        <CardDescription>
          Paste a PR title, description, or diff. The agent runs domain tools
          before recommending go / no-go.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="PR title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={loading}
        />
        <Textarea
          placeholder="Paste PR description or diff…"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows={12}
          disabled={loading}
          className="font-mono text-sm"
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
            onClick={() => setInputText(SAMPLE_INPUT)}
          >
            Load sample
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
