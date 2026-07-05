import Link from "next/link";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CAPABILITIES = [
  {
    number: "01",
    title: "Risk pattern detection",
    description:
      "Scans diffs for destructive migrations, IAM changes, feature flags without rollback, and other high-impact patterns.",
  },
  {
    number: "02",
    title: "Test coverage signals",
    description:
      "Identifies whether tests are mentioned or missing — surfacing gaps before they reach production.",
  },
  {
    number: "03",
    title: "Breaking API analysis",
    description:
      "Flags endpoint removals, schema changes, and contract breaks that affect downstream consumers.",
  },
  {
    number: "04",
    title: "Incident history lookup",
    description:
      "Cross-references past incidents by component to inform risk context for the current change.",
  },
  {
    number: "05",
    title: "Rollback planning",
    description:
      "Generates actionable rollback steps tailored to the specific changes in the pull request.",
  },
  {
    number: "06",
    title: "Structured verdict",
    description:
      "Synthesizes tool outputs into a clear go, conditional, or no-go recommendation with rationale.",
  },
] as const;

const STEPS = [
  {
    step: "1",
    title: "Paste your change",
    description: "Drop in a PR title, description, or diff. No integrations required.",
  },
  {
    step: "2",
    title: "Agent runs checks",
    description:
      "Specialized tools analyze risk, tests, APIs, and incident history in parallel.",
  },
  {
    step: "3",
    title: "Get your verdict",
    description:
      "Receive a structured recommendation with summary, rollback plan, and full trace.",
  },
] as const;

function PreviewCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-[0_24px_80px_-24px_rgba(17,17,16,0.12)]">
      <div className="flex items-center gap-2 border-b border-border/60 px-5 py-4">
        <span className="size-2 rounded-full bg-verdict-nogo/70" />
        <span className="size-2 rounded-full bg-verdict-conditional/70" />
        <span className="size-2 rounded-full bg-verdict-go/70" />
        <span className="ml-3 text-xs font-light tracking-wide text-ink-muted">
          Release review
        </span>
      </div>

      <div className="space-y-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-light text-ink-muted">Payment webhook retry</p>
            <p className="mt-1 text-lg font-light tracking-tight">
              Conditional release
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-verdict-conditional/30 bg-verdict-conditional/8 px-3 py-1 text-xs font-light tracking-wide text-verdict-conditional">
            <span className="status-dot status-dot-conditional" />
            Go with conditions
          </span>
        </div>

        <div className="space-y-2 rounded-xl bg-muted/50 p-4">
          <p className="text-xs font-light uppercase tracking-[0.12em] text-ink-muted">
            Summary
          </p>
          <p className="text-sm font-light leading-relaxed text-muted-foreground">
            IAM policy expansion and schema migration detected. Tests present but
            rollback path should be validated before deploy.
          </p>
        </div>

        <div className="grid gap-2">
          {[
            "flag_risky_diff_patterns",
            "check_test_coverage_mentioned",
            "lookup_past_incidents",
            "generate_rollback_plan",
          ].map((tool, i) => (
            <div
              key={tool}
              className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2.5 animate-fade-in"
              style={{ animationDelay: `${400 + i * 80}ms` }}
            >
              <span className="size-1.5 rounded-full bg-brand" />
              <span className="font-mono text-xs font-light text-muted-foreground">
                {tool}
              </span>
              <span className="ml-auto text-xs font-light text-verdict-go">done</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/60">
          <div className="absolute inset-0 grid-lines opacity-40" aria-hidden />
          <div
            className="absolute -right-32 -top-32 size-[480px] rounded-full opacity-30 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklch, var(--brand) 25%, transparent), transparent 70%)",
            }}
            aria-hidden
          />
          <div
            className="absolute -bottom-24 -left-24 size-[360px] rounded-full opacity-20 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklch, var(--accent) 30%, transparent), transparent 70%)",
            }}
            aria-hidden
          />

          <div className="relative mx-auto grid max-w-6xl gap-16 px-6 py-20 md:py-28 lg:grid-cols-2 lg:items-center lg:gap-12">
            <div className="space-y-8">
              <p className="animate-fade-up text-xs font-light uppercase tracking-[0.2em] text-brand">
                Release readiness agent
              </p>

              <h1 className="animate-fade-up delay-100 font-display text-balance text-5xl leading-[1.05] tracking-tight md:text-6xl lg:text-[4.25rem]">
                Ship with clarity before you merge
              </h1>

              <p className="animate-fade-up delay-200 max-w-lg text-lg font-light leading-relaxed text-muted-foreground">
                Clearpath reviews pull requests for release risk — running
                structured checks, consulting incident history, and delivering a
                verdict your team can act on.
              </p>

              <div className="animate-fade-up delay-300 flex flex-wrap items-center gap-4">
                <Link
                  href="/review"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-11 px-6 font-light"
                  )}
                >
                  Run a review
                </Link>
                <a
                  href="#how-it-works"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "h-11 px-6 font-light"
                  )}
                >
                  See how it works
                </a>
              </div>

              <div className="animate-fade-up delay-400 flex flex-wrap gap-8 border-t border-border/60 pt-8">
                {[
                  { value: "5+", label: "Release checks" },
                  { value: "3", label: "Verdict types" },
                  { value: "< 60s", label: "Typical runtime" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="text-2xl font-light tracking-tight text-foreground">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-sm font-light text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="animate-fade-up delay-300 lg:delay-400">
              <PreviewCard />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="border-b border-border/60 bg-surface-elevated py-20 md:py-28"
        >
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-16 max-w-xl">
              <p className="text-xs font-light uppercase tracking-[0.2em] text-brand">
                Process
              </p>
              <h2 className="mt-3 text-3xl font-light tracking-tight md:text-4xl">
                How it works
              </h2>
              <p className="mt-4 font-light leading-relaxed text-muted-foreground">
                Three steps from pull request to release decision. No setup, no
                plugins — paste and review.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {STEPS.map((item, i) => (
                <article
                  key={item.step}
                  className="hover-lift group rounded-2xl border border-border/70 bg-surface p-8 animate-fade-up"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <span className="inline-flex size-10 items-center justify-center rounded-full border border-brand/15 bg-brand/5 text-sm font-light text-brand">
                    {item.step}
                  </span>
                  <h3 className="mt-6 text-xl font-light tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-3 font-light leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section id="capabilities" className="py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-16 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-xl">
                <p className="text-xs font-light uppercase tracking-[0.2em] text-brand">
                  Capabilities
                </p>
                <h2 className="mt-3 text-3xl font-light tracking-tight md:text-4xl">
                  Every check your release needs
                </h2>
              </div>
              <p className="max-w-md font-light leading-relaxed text-muted-foreground">
                Purpose-built tools run before synthesis — so every verdict is
                grounded in evidence, not guesswork.
              </p>
            </div>

            <div className="grid gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/70 md:grid-cols-2 lg:grid-cols-3">
              {CAPABILITIES.map((cap, i) => (
                <article
                  key={cap.number}
                  className="bg-surface p-8 transition-colors hover:bg-surface-elevated animate-fade-up"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <span className="text-xs font-light tracking-[0.15em] text-ink-muted">
                    {cap.number}
                  </span>
                  <h3 className="mt-4 text-lg font-light tracking-tight">
                    {cap.title}
                  </h3>
                  <p className="mt-3 text-sm font-light leading-relaxed text-muted-foreground">
                    {cap.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border/60 bg-brand py-20 text-primary-foreground md:py-24">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <h2 className="font-display text-3xl tracking-tight md:text-5xl">
              Ready to review your next release?
            </h2>
            <p className="mx-auto mt-5 max-w-lg font-light leading-relaxed text-primary-foreground/75">
              Paste a PR description and get a structured verdict with rollback
              planning in under a minute.
            </p>
            <div className="mt-10">
              <Link
                href="/review"
                className={cn(
                  buttonVariants({ size: "lg", variant: "secondary" }),
                  "inline-flex h-11 bg-primary-foreground px-8 font-light text-brand hover:bg-primary-foreground/90"
                )}
              >
                Open review console
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
