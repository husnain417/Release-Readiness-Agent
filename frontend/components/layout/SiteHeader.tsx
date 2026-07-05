import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="group flex items-center gap-3 transition-opacity hover:opacity-80"
        >
          <span
            className="flex size-8 items-center justify-center rounded-full border border-brand/20 bg-brand/5"
            aria-hidden
          >
            <span className="size-2 rounded-full bg-brand" />
          </span>
          <span className="text-lg font-light tracking-tight">Clearpath</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          <a
            href="#how-it-works"
            className="link-underline text-sm font-light text-muted-foreground transition-colors hover:text-foreground"
          >
            How it works
          </a>
          <a
            href="#capabilities"
            className="link-underline text-sm font-light text-muted-foreground transition-colors hover:text-foreground"
          >
            Capabilities
          </a>
          <Link
            href="/review"
            className="link-underline text-sm font-light text-muted-foreground transition-colors hover:text-foreground"
          >
            Console
          </Link>
        </nav>

        <Link
          href="/review"
          className={cn(buttonVariants({ size: "sm" }), "font-light")}
        >
          Start review
        </Link>
      </div>
    </header>
  );
}
