import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { GUIDES, type GuideSlug } from "@/content";

/**
 * The frame for a task guide under /documentation. Title, audience and the
 * related-guide links all come from GUIDES in content.ts, so the index and
 * the guides cannot disagree about what a guide is called.
 */
export function GuidePage({
  slug,
  lede,
  children,
}: {
  slug: GuideSlug;
  lede: string;
  children: ReactNode;
}) {
  const guide = GUIDES.find((g) => g.slug === slug)!;
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
      lede={lede}
    >
      <p className="-mt-8 mb-12 text-sm text-dim">
        <span className="font-semibold text-fg">For:</span> {guide.who}
      </p>

      <div className="max-w-3xl">{children}</div>

      <section className="mt-16 border-t border-line pt-8">
        <h2 className="text-sm font-semibold tracking-[0.14em] uppercase">Related guides</h2>
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

/** One titled step of a guide. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12 first:mt-0">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-4 space-y-4 leading-relaxed text-dim">{children}</div>
    </section>
  );
}

/** Numbered steps — the numbers carry the accent, in its ink-safe shade. */
export function Steps({ items }: { items: readonly ReactNode[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-4">
          <span className="mt-0.5 w-6 flex-none font-mono text-sm font-semibold text-signal-ink">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ol>
  );
}

/** A term and what it means — the gate's checks, the traffic areas. */
export function Terms({ items }: { items: readonly (readonly [string, ReactNode])[] }) {
  return (
    <dl className="divide-y divide-line rounded-xl border border-line bg-elevated">
      {items.map(([term, body]) => (
        <div key={term} className="grid gap-1 px-5 py-3.5 sm:grid-cols-[11rem_1fr] sm:gap-5">
          <dt className="font-semibold text-fg">{term}</dt>
          <dd className="text-sm leading-relaxed">{body}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A boxed aside: a rule the product enforces, or what is not live yet. */
export function Note({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="rounded-xl border border-signal/30 bg-signal/10 px-5 py-4">
      <p className="text-xs font-semibold tracking-[0.14em] text-signal-ink uppercase">{title}</p>
      <div className="mt-2 text-sm leading-relaxed text-fg">{children}</div>
    </aside>
  );
}

/** A button or menu name as it reads in the app. */
export function Ui({ children }: { children: ReactNode }) {
  return <span className="font-semibold text-fg">{children}</span>;
}
