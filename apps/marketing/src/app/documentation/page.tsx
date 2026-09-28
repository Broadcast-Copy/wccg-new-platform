import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { PageShell, Panel, Row } from "@/components/page-shell";
import { DOC_TOPICS, GUIDES, MEMBER_DOCS_URL } from "@/content";
import { SITE_URL } from "@/lib/site";

const title = "Documentation — Broadcast Copy";
const description =
  "What Broadcast Copy's documentation covers. The step-by-step guides for the daily log, traffic, production and installing the suite are for customers, behind sign-in; the developer reference and the changelog are public.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/documentation` },
  openGraph: { title, description, type: "website", url: `${SITE_URL}/documentation` },
};

/**
 * PUBLIC overview only. The detailed guides are members-only (bc_docs, RLS,
 * read at platform.broadcastcopy.ai/docs after sign-in), so this static page
 * says what they cover and where to sign in — never what they say.
 */
export default function DocumentationPage() {
  return (
    <PageShell
      eyebrow="Documentation"
      title="How the station runs itself."
      lede="Broadcast Copy's customer documentation walks each department through its day in the suite: the daily log, traffic, production and installing the software. The guides are for customers and open after you sign in."
    >
      <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
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
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-signal px-6 py-3 text-sm font-semibold text-fg transition hover:bg-signal-soft"
          >
            Customer documentation — sign in
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
          <p className="text-sm text-dim">
            No account yet?{" "}
            <Link
              href="/platform#early-access"
              className="font-semibold text-signal-ink underline-offset-2 hover:underline"
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

      <Panel title="Guides">
        {GUIDES.map((g) => (
          <Row key={g.slug} title={g.title} body={g.blurb} href={`/documentation/${g.slug}/`} />
        ))}
      </Panel>

      <Panel title="Public references">
        <Row
          title="API and webhooks"
          body="The same surface the product is built on, scoped per station."
          href="/developers"
        />
        <Row
          title="Changelog"
          body="Every release of Broadcast Copy, versioned and updated in real time — the flagship runs the same builds, so what ships to air shows up here."
          href="/changelog"
        />
        <Row
          title="The product sheet"
          body="The whole suite on one printable page, written for station GMs."
          href="/product-sheet/"
        />
        <Row
          title="Download"
          body="The Broadcast Copy Manager: one native Windows app that installs and updates the suite."
          href="/download"
        />
      </Panel>
    </PageShell>
  );
}
