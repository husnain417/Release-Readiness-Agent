import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-surface-elevated">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <p className="text-lg font-light tracking-tight">Clearpath</p>
          <p className="max-w-sm text-sm font-light leading-relaxed text-muted-foreground">
            Release readiness reviews powered by structured agent tooling — built
            for teams shipping with confidence.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm font-light text-muted-foreground">
          <Link href="/review" className="link-underline hover:text-foreground">
            Console
          </Link>
          <a href="#how-it-works" className="link-underline hover:text-foreground">
            How it works
          </a>
          <a href="#capabilities" className="link-underline hover:text-foreground">
            Capabilities
          </a>
        </div>
      </div>

      <div className="border-t border-border/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 text-xs font-light text-ink-muted">
          <span>Z360 Take-Home Project</span>
          <span>{new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}
