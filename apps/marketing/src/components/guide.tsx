import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { GUIDES, memberDocUrl, type GuideSlug } from "@/content";
import { SITE_URL } from "@/lib/site";

/**
 * A PUBLIC teaser for a member guide under /documentation/<slug>/.
 *
 * The full guides are members-only: they live in the bc_docs table behind
 * row-level security and render at platform.broadcastcopy.ai/docs after
 * sign-in. This page therefore carries only the teaser copy from GUIDES in
 * content.ts — two or three sentences — and a sign-in link to the full guide.
 * Never put a guide's own text in this static build: anyone can fetch it.
 */

function guideFor(slug: GuideSlug) {
  const guide = GUIDES.find((g) => g.slug === slug);
  if (guide === undefined) throw new Error(`unknown guide ${slug}`);
  return guide;
}

export function guideMetadata(slug: GuideSlug): Metadata {
  const guide = guideFor(slug);
  const title = `${guide.title} — Broadcast Copy`;
  const url = `${SITE_URL}/documentation/${slug}/`;
  return {
    title,
    description: guide.teaser,
    alternates: { canonical: url },
    openGraph: { title, description: guide.teaser, type: "article", url },
  };
}

export function GuideTeaser({ slug }: { slug: GuideSlug }) {
  const guide = guideFor(slug);
  const related = GUIDES.filter((g) => g.slug !== slug);

  return (
    <PageShell
      eyebrow={
        <>
          <Link href="/documentation" className="transition hover:text-fg">
            Documentation
          </Link>
          <span className="px-2">/</span>Guide
        </>
      }
      title={guide.title}
      lede={guide.teaser}
    >
      <p className="-mt-8 mb-10 text-sm text-dim">
        <span className="font-semibold text-fg">For:</span> {guide.who}
      </p>

      <section className="max-w-3xl rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <LockKeyhole className="h-5 w-5 flex-none text-signal-ink" aria-hidden />
          <h2 className="text-lg font-semibold tracking-tight">The full guide is for customers</h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-dim">
          Step-by-step guides live in the customer documentation, inside the Broadcast Copy
          control plane. Sign in with your account to read this one.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href={memberDocUrl(slug)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-signal px-5 py-3 text-sm font-semibold text-fg transition hover:bg-signal-soft"
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

      <section className="mt-16 border-t border-line pt-8">
        <h2 className="text-sm font-semibold tracking-[0.14em] uppercase">Other guides</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {related.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/documentation/${g.slug}/`}
                className="flex h-full items-start justify-between gap-4 rounded-xl border border-line bg-elevated px-5 py-4 transition hover:border-signal/50"
              >
                <span>
                  <span className="block font-semibold">{g.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-dim">{g.blurb}</span>
                </span>
                <ArrowRight className="mt-1 h-4 w-4 flex-none text-signal-ink" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/documentation"
          className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-signal-ink hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          All documentation
        </Link>
      </section>
    </PageShell>
  );
}
