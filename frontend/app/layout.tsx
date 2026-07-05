import type { Metadata } from "next";

import { helveticaNeue } from "@/lib/fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: "Clearpath — Release Readiness Agent",
  description:
    "Automated release readiness reviews for pull requests. Risk analysis, test coverage, incident history, and rollback planning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${helveticaNeue.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
