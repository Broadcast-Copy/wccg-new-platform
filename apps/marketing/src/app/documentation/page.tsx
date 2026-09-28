import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { PageShell, Panel, Row } from "@/components/page-shell";
import { DOC_TOPICS, MEMBER_DOCS_URL } from "@/content";
import { WAITLIST_HREF } from "@/lib/nav";
import { SITE_URL } from "@/lib/site";

const title = "Documentation — Broadcast Copy";
const description =
  "What Broadcast Copy's customer documentation covers: the daily log, traffic, production and installing the suite. The guides are for customers and open after you sign in.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/documentation` },
  openGraph: { title, description, type: "website", url: `${SITE_URL}/documentation` },
};

/**
 * PUBLIC overview only. The guides are members-only (bc_docs, RLS, read at
 * platform.broadcastcopy.ai/docs after sign-in), so this static page says what
 * they cover and where to sign in - never what they say. Owner, 2026-09-27:
 * nothing below "What the guides cover" (the guide teasers and the public
 * references list went; the changelog is in the footer).
 */
export default function DocumentationPage() {
  return (
    <PageShell
      eyebrow="Documentation"
      title="How the station runs itself."
      lede="Broadcast Copy's customer documentation walks each department through its day in the suite: the daily log, traffic, production and installing the software. The guides are for customers and open after you sign in."
    >
      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-8">
        <div className="flex items-center gap-3">
          <LockKeyhole className="h-5 w-5 flex-none text-signal-ink" aria-hidden />
          <h2 className="text-xl font-semibold tracking-tight">Customer documentation</h2>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-dim">
          Step-by-step guides, written against the real screens, live inside the Broadcast Copy
          control plane. Sign in with your account to read them.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href={MEMBER_DOCS_URL}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-signal px-6 text-sm font-semibold text-fg transition hover:bg-signal-soft"
          >
            Customer documentation — sign in
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
          <p className="text-sm text-dim">
            No account yet?{" "}
            <Link
              href={WAITLIST_HREF}
              className="inline-flex min-h-11 items-center font-semibold text-signal-ink underline-offset-2 hover:underline"
            >
              Join the waitlist
            </Link>
          </p>
        </div>
      </section>

      <Panel title="What the guides cover">
        {DOC_TOPICS.map((t) => (
          <Row key={t.title} title={t.title} body={t.body} />
        ))}
      </Panel>
    </PageShell>
  );
}
