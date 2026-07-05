"use client";

import { useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CheckStatus, Finding, FormattedCheck } from "@/lib/traceFormat";
import {
  formatToolCalls,
  pipelineSummary,
} from "@/lib/traceFormat";
import type { ReviewEvent, ToolCall } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ReviewTraceProps {
  events: ReviewEvent[];
  toolCalls: ToolCall[];
}

const statusStyles: Record<
  CheckStatus,
  { dot: string; badge: string; label: string }
> = {
  clear: {
    dot: "bg-verdict-go",
    badge: "border-verdict-go/25 bg-verdict-go/8 text-verdict-go",
    label: "Clear",
  },
  flagged: {
    dot: "bg-verdict-nogo",
    badge: "border-verdict-nogo/25 bg-verdict-nogo/8 text-verdict-nogo",
    label: "Flagged",
  },
  warning: {
    dot: "bg-verdict-conditional",
    badge:
      "border-verdict-conditional/25 bg-verdict-conditional/8 text-verdict-conditional",
    label: "Attention",
  },
  info: {
    dot: "bg-brand",
    badge: "border-brand/25 bg-brand/8 text-brand",
    label: "Generated",
  },
};

const severityStyles: Record<Finding["severity"], string> = {
  high: "border-verdict-nogo/30 bg-verdict-nogo/6 text-verdict-nogo",
  medium:
    "border-verdict-conditional/30 bg-verdict-conditional/6 text-verdict-conditional",
  low: "border-border bg-muted/50 text-muted-foreground",
};

function SeverityBadge({ severity }: { severity: Finding["severity"] }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[3.25rem] items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-light uppercase tracking-[0.14em]",
        severityStyles[severity]
      )}
    >
      {severity}
    </span>
  );
}

function PipelineMetric({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-surface-elevated px-4 py-3">
      <p
        className={cn(
          "text-2xl font-light tabular-nums tracking-tight",
          accent && "text-verdict-nogo"
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs font-light text-muted-foreground">{label}</p>
    </div>
  );
}

function CheckCard({
  check,
  isLast,
  index,
}: {
  check: FormattedCheck;
  isLast: boolean;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const styles = statusStyles[check.status];
  const isRollback = check.id.startsWith("generate_rollback_plan");
  const rollbackSteps = isRollback && check.detail
    ? check.detail.split(/,\s*(?=[a-z])/i).map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <div
      className="relative flex gap-5 animate-fade-up"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {/* Timeline */}
      <div className="flex flex-col items-center pt-1">
        <span
          className={cn(
            "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-border/80 bg-surface text-xs font-light tabular-nums text-muted-foreground"
          )}
        >
          {String(check.step).padStart(2, "0")}
        </span>
        {!isLast && (
          <span
            className="mt-1 w-px flex-1 bg-border/80"
            style={{ minHeight: "2rem" }}
            aria-hidden
          />
        )}
      </div>

      {/* Card */}
      <article className="mb-6 min-w-0 flex-1 rounded-xl border border-border/70 bg-surface transition-shadow hover:shadow-[0_8px_32px_-16px_rgba(17,17,16,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 px-5 py-4">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-light uppercase tracking-[0.16em] text-ink-muted">
              {check.category}
            </p>
            <h4 className="text-base font-light tracking-tight">{check.title}</h4>
            <p className="text-sm font-light text-muted-foreground">
              {check.description}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-light",
              styles.badge
            )}
          >
            <span className={cn("status-dot", styles.dot)} aria-hidden />
            {check.statusLabel}
          </span>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="rounded-lg bg-muted/35 px-4 py-3">
            <p className="text-[10px] font-light uppercase tracking-[0.14em] text-ink-muted">
              Result
            </p>
            <p className="mt-1.5 text-sm font-light leading-relaxed">
              {check.summary}
            </p>
          </div>

          {check.findings.length > 0 && (
            <div>
              <p className="mb-2.5 text-[10px] font-light uppercase tracking-[0.14em] text-ink-muted">
                Findings
              </p>
              <ul className="space-y-2">
                {check.findings.map((finding, i) => (
                  <li
                    key={`${finding.label}-${i}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2.5"
                  >
                    <span className="text-sm font-light">{finding.label}</span>
                    <SeverityBadge severity={finding.severity} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isRollback && rollbackSteps.length > 0 && (
            <div>
              <p className="mb-2.5 text-[10px] font-light uppercase tracking-[0.14em] text-ink-muted">
                Recovery steps
              </p>
              <ol className="space-y-2">
                {rollbackSteps.map((step, i) => (
                  <li
                    key={i}
                    className="flex gap-3 rounded-lg border border-border/50 px-3 py-2.5 text-sm font-light leading-relaxed"
                  >
                    <span className="shrink-0 tabular-nums text-ink-muted">
                      {i + 1}.
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {check.detail && !isRollback && (
            <div className="rounded-lg border border-verdict-conditional/20 bg-verdict-conditional/5 px-4 py-3">
              <p className="mb-1.5 text-[10px] font-light uppercase tracking-[0.14em] text-verdict-conditional">
                Operational context
              </p>
              <p className="text-sm font-light leading-relaxed text-muted-foreground">
                {check.detail}
              </p>
            </div>
          )}

          {check.inputPreview && (
            <div>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-xs font-light text-muted-foreground transition-colors hover:text-foreground"
                aria-expanded={expanded}
              >
                {expanded ? "Hide input context" : "View input context"}
              </button>
              {expanded && (
                <p className="mt-2 rounded-lg border border-border/50 bg-surface-elevated px-3 py-2.5 text-xs font-light leading-relaxed text-muted-foreground">
                  {check.inputPreview}
                </p>
              )}
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

export function ReviewTrace({ events, toolCalls }: ReviewTraceProps) {
  if (events.length === 0 && toolCalls.length === 0) {
    return null;
  }

  const checks = formatToolCalls(toolCalls);
  const summary = pipelineSummary(checks);

  return (
    <Card className="border-border/70 bg-surface">
      <CardHeader className="border-b border-border/50">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-light uppercase tracking-[0.18em] text-brand">
              Analysis pipeline
            </p>
            <CardTitle className="mt-2 text-xl font-light tracking-tight">
              Release readiness report
            </CardTitle>
            <CardDescription className="mt-2 max-w-xl font-light leading-relaxed">
              {summary.totalChecks} structured checks executed against your
              change. Findings are classified by severity before verdict
              synthesis.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs font-light text-muted-foreground">
            <span className="size-2 rounded-full bg-verdict-go animate-pulse" />
            Pipeline complete
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-8 pt-8">
        {checks.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <PipelineMetric label="Checks run" value={summary.totalChecks} />
              <PipelineMetric
                label="Total findings"
                value={summary.totalFindings}
                accent={summary.totalFindings > 0}
              />
              <PipelineMetric
                label="High severity"
                value={summary.highSeverity}
                accent={summary.highSeverity > 0}
              />
              <PipelineMetric
                label="Needs attention"
                value={summary.flaggedChecks + summary.warningChecks}
                accent={summary.flaggedChecks + summary.warningChecks > 0}
              />
            </div>

            <div className="rounded-xl border border-border/60 bg-surface-elevated p-5 md:p-6">
              <div className="mb-6 flex items-center justify-between gap-4">
                <h3 className="text-sm font-light uppercase tracking-[0.12em] text-ink-muted">
                  Execution timeline
                </h3>
                <span className="text-xs font-light text-muted-foreground">
                  Sequential analysis
                </span>
              </div>
              <div>
                {checks.map((check, index) => (
                  <CheckCard
                    key={check.id}
                    check={check}
                    isLast={index === checks.length - 1}
                    index={index}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {events.length > 0 && (
          <div className="border-t border-border/50 pt-8">
            <h3 className="mb-4 text-sm font-light uppercase tracking-[0.12em] text-ink-muted">
              Synthesis log
            </h3>
            <div className="space-y-3">
              {events.map((event, index) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-border/60 bg-surface-elevated px-5 py-4 animate-fade-in"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-brand" aria-hidden />
                    <span className="text-[10px] font-light uppercase tracking-[0.14em] text-brand">
                      {event.role}
                    </span>
                    <span className="text-[10px] font-light text-ink-muted">
                      {new Date(event.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="font-light leading-relaxed whitespace-pre-wrap text-muted-foreground">
                    {event.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
