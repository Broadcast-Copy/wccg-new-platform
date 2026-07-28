import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { Wordmark } from "@/components/wordmark";

/**
 * The frame every content page sits in: shared header, a titled lede, and the
 * footer. Pages supply only their own body, which is what keeps them from
 * drifting apart the way the hand-rolled ones did.
 */
export function PageShell({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-5 pt-16 pb-24">
        <p className="text-xs tracking-[0.24em] text-faint uppercase">{eyebrow}</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-dim text-pretty">
          {lede}
        </p>
        <div className="mt-14">{children}</div>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-5 py-10 text-sm text-faint sm:flex-row">
          <Wordmark px={2} className="text-dim" />
          <p>Broadcast Copy · $49.99/mo per licensed station</p>
        </div>
      </footer>
    </div>
  );
}

/** A titled block of rows — used for docs sections, SDKs, downloads. */
export function Panel({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-12 first:mt-0">
      <div className="flex items-baseline gap-4">
        <h2 className="text-sm font-semibold tracking-[0.14em] uppercase">{title}</h2>
        <span className="h-px flex-1 bg-line" />
        {note ? <span className="text-xs text-faint">{note}</span> : null}
      </div>
      <div className="mt-5 grid gap-3">{children}</div>
    </section>
  );
}

/** One row inside a Panel. `href` makes the whole row a link. */
export function Row({
  title,
  body,
  meta,
  href,
}: {
  title: string;
  body: string;
  meta?: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-dim">{body}</p>
      </div>
      {meta ? (
        <span className="flex-none self-start rounded-full border border-line bg-ink px-2.5 py-1 text-[11px] tracking-wide text-faint uppercase">
          {meta}
        </span>
      ) : null}
    </>
  );
  const cls =
    "flex items-start justify-between gap-5 rounded-xl border border-line bg-elevated px-5 py-4 transition";
  return href ? (
    <a href={href} className={`${cls} hover:border-signal/50`}>
      {inner}
    </a>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
