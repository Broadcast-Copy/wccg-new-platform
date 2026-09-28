import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TourDialog } from "@/components/tour-dialog";
import { WHATS_NEW } from "@/content";
import { WAITLIST_HREF } from "@/lib/nav";

/**
 * The interactive station model, under a thin bar. Shared by the home page
 * and the older /tour URL.
 *
 * The model itself is a self-contained WebGL page under /public/dollhouse, so
 * it works with `output: 'export'` and needs no Three.js dependency in this
 * app's build. Its canvas takes every wheel and touch (drag turns it, pinch
 * zooms it), so:
 *  - from 1024 px up the model fills the viewport (100dvh) and nothing sits
 *    below it - the page does not scroll, exactly as before;
 *  - below 1024 px (phones, tablets) the frame is about two thirds of the
 *    screen and a short intro plus the footer sit under it, so part of the
 *    screen is always page, not model: the visitor can scroll and pinch-zoom
 *    the page there (Jev 0.95, 2026-09-27).
 *
 * `whatsNew` adds one line between the bar and the model pointing at the
 * changelog. Both pages carry "Watch the tour" in that row: the product tour
 * video opens in a dialog over the model rather than competing with it.
 */
export function StationTour({ whatsNew = false }: { whatsNew?: boolean }) {
  return (
    <div className="flex flex-col lg:h-dvh">
      <h1 className="sr-only">Broadcast Copy — the operating system for modern radio</h1>
      <SiteHeader sticky={false} />

      {whatsNew ? <WhatsNew /> : <TourStrip />}

      <iframe
        src="/dollhouse/?embed=1"
        title="Interactive 3D model of a radio station, room by room"
        className="block h-[max(300px,68svh)] w-full flex-none border-0 lg:h-auto lg:min-h-0 lg:flex-1"
      />

      <PhoneIntro />
      <SiteFooter className="lg:hidden" />
    </div>
  );
}

function WhatsNew() {
  return (
    <div className="flex-none border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 text-sm sm:px-5">
        <Link href={WHATS_NEW.href} className="group flex min-h-11 min-w-0 flex-1 items-center gap-3">
          {/* the orange is a fill here; the word beside it is the ink-safe shade */}
          <span className="inline-flex flex-none items-center gap-1.5 text-xs font-semibold tracking-[0.14em] text-signal-ink uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-signal" aria-hidden />
            New
          </span>
          <span className="min-w-0 flex-1 truncate text-dim">
            <b className="font-semibold text-fg sm:hidden">{WHATS_NEW.short}</b>
            <b className="hidden font-semibold text-fg sm:inline">{WHATS_NEW.headline}</b>
            <span className="hidden lg:inline"> — {WHATS_NEW.summary}</span>
          </span>
          <span className="hidden flex-none items-center gap-1 font-semibold text-signal-ink group-hover:underline sm:inline-flex">
            What&rsquo;s new
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        </Link>
        <span className="hidden h-4 w-px flex-none bg-line sm:block" aria-hidden />
        <TourDialog />
      </div>
    </div>
  );
}

/** the /tour page: no news line, just the way to the video */
function TourStrip() {
  return (
    <div className="flex-none border-b border-line bg-surface">
      <div className="mx-auto flex min-h-11 max-w-6xl items-center justify-between gap-4 px-4 text-sm sm:px-5">
        <span className="truncate text-dim">See the software itself — real screens, no mock-ups.</span>
        <TourDialog />
      </div>
    </div>
  );
}

/** under the model on phones and tablets only: what this is, and where next */
function PhoneIntro() {
  return (
    <section className="border-t border-line bg-surface px-5 py-9 lg:hidden">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl">
          The operating system for modern radio.
        </h2>
        <p className="mt-3 text-base leading-relaxed text-dim text-pretty">
          Broadcast Copy runs your FCC station end to end — streaming, programming, DJ operations,
          listener loyalty, compliance and ad sales. The model above is the station, room by room.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/platform/"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-line bg-elevated px-6 text-sm font-semibold transition hover:border-dim/40"
          >
            Explore the platform
          </Link>
          <Link
            href={WAITLIST_HREF}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-signal px-6 text-sm font-semibold text-fg transition hover:bg-signal-soft"
          >
            Join the waitlist <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
