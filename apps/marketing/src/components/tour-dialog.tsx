"use client";

import { useRef, useState } from "react";
import { Play, X } from "lucide-react";
import { ProductVideo } from "@/components/product-video";
import { TOUR_VIDEO } from "@/lib/product-videos";

/**
 * "Watch the tour" — the product tour cut in a dialog over the page, so the
 * home page's 3D model keeps the whole viewport. The video exists only while
 * the dialog is open; closing it stops playback.
 */
export function TourDialog({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          ref.current?.showModal();
        }}
        className={`inline-flex min-h-11 flex-none items-center gap-1.5 font-semibold text-signal-ink hover:underline ${className}`}
      >
        <Play className="h-3.5 w-3.5" aria-hidden />
        <span className="sm:hidden">Tour</span>
        <span className="hidden sm:inline">Watch the {TOUR_VIDEO.seconds}-second tour</span>
      </button>

      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // a click on the backdrop (the dialog element itself) closes it
          if (e.target === e.currentTarget) ref.current?.close();
        }}
        aria-label={TOUR_VIDEO.title}
        className="m-auto w-[min(94vw,1120px)] max-w-none rounded-2xl border border-line bg-ink p-0 text-fg shadow-2xl backdrop:bg-fg/60"
      >
        <div className="flex items-center justify-between gap-4 py-2 pr-2 pl-4 sm:pl-5">
          <p className="text-sm font-semibold">
            {TOUR_VIDEO.title}
            <span className="ml-2 hidden font-normal text-dim sm:inline">real screens from the production app</span>
          </p>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-line bg-elevated transition hover:border-dim/40"
            aria-label="Close the tour"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="px-2 pb-2 sm:px-3 sm:pb-3">
          {open ? <ProductVideo video={TOUR_VIDEO} startNow rounded="rounded-xl" /> : null}
        </div>
      </dialog>
    </>
  );
}
