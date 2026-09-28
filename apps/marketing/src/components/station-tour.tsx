import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { TourDialog } from "@/components/tour-dialog";
import { WHATS_NEW } from "@/content";

/**
 * The interactive station model, full-bleed under a thin bar.
 *
 * The model itself is a self-contained WebGL page under /public/dollhouse, so
 * it works with `output: 'export'` and needs no Three.js dependency in this
 * app's build. Shared by the home page and the older /tour URL.
 *
 * `whatsNew` adds one line between the bar and the model pointing at the
 * changelog. It is a single row so the model keeps nearly the whole viewport.
 * Both pages carry "Watch the tour" in that row: the product tour video opens
 * in a dialog over the model rather than competing with it on the page (the
 * model's canvas takes the wheel, so nothing below it would be reachable).
 */
export function StationTour({ whatsNew = false }: { whatsNew?: boolean }) {
  return (
    <div className="flex h-screen flex-col">
      <SiteHeader sticky={false} />

      {whatsNew ? <WhatsNew /> : <TourStrip />}

      <iframe
        src="/dollhouse/?embed=1"
        title="Interactive 3D model of a radio station, room by room"
        className="w-full flex-1 border-0"
      />
    </div>
  );
}

function WhatsNew() {
  return (
    <div className="flex-none border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2 text-sm sm:px-5">
        <Link href={WHATS_NEW.href} className="group flex min-w-0 flex-1 items-center gap-3">
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
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 text-sm sm:px-5">
        <span className="truncate text-dim">See the software itself — real screens, no mock-ups.</span>
        <TourDialog />
      </div>
    </div>
  );
}
