import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

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
  wide = false,
}: {
  /** a string, or a breadcrumb node on nested pages */
  eyebrow: ReactNode;
  title: string;
  lede: string;
  children: ReactNode;
  /** max-w-6xl instead of 5xl, for pages with image grids */
  wide?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main
        className={`mx-auto w-full flex-1 px-5 pt-10 pb-20 sm:pt-16 sm:pb-24 ${wide ? "max-w-6xl" : "max-w-5xl"}`}
      >
        <p className="text-xs tracking-[0.24em] text-dim uppercase">{eyebrow}</p>
        <h1 className="mt-4 text-[2rem] leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-dim text-pretty sm:text-lg">
          {lede}
        </p>
        <div className="mt-10 sm:mt-14">{children}</div>
      </main>

      <SiteFooter />
    </div>
  );
}

/** A titled block of rows — used for docs sections, SDKs, downloads. */
export function Panel({
  title,
  note,
  id,
  children,
}: {
  title: string;
  note?: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mt-12 scroll-mt-24 first:mt-0">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="text-sm font-semibold tracking-[0.14em] uppercase">{title}</h2>
        <span className="hidden h-px flex-1 bg-line sm:block" />
        {note ? <span className="text-xs text-dim">{note}</span> : null}
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3">{children}</div>
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
  body: ReactNode;
  meta?: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="w-full min-w-0 sm:flex-1">
        <p className="font-semibold">{title}</p>
        <div className="mt-1 text-sm leading-relaxed text-dim">{body}</div>
      </div>
      {meta ? (
        <span className="order-first flex-none self-start rounded-full border border-line bg-ink px-2.5 py-1 text-xs tracking-wide text-dim uppercase sm:order-none">
          {meta}
        </span>
      ) : null}
    </>
  );
  const cls =
    "flex flex-col items-start gap-2 rounded-xl border border-line bg-elevated px-5 py-4 transition sm:flex-row sm:justify-between sm:gap-5";
  return href ? (
    <a href={href} className={`${cls} hover:border-signal/50`}>
      {inner}
    </a>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
