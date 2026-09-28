import { ProductVideo } from "@/components/product-video";
import { TourDialog } from "@/components/tour-dialog";
import { LOOPS } from "@/lib/product-videos";

/**
 * "See it work" — the six product loops, each beside the job it shows. Every
 * frame is a real screen from the Production app (private data blurred); the
 * loops start only when they scroll into view.
 */
export function SeeItWork() {
  return (
    <section id="see-it-work" className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-24">
      <div className="flex flex-col gap-4 border-t border-line pt-16 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            See it work.
          </h2>
          <p className="mt-4 text-lg text-dim text-pretty">
            Real screens from the production app, not mock-ups — a few seconds of each job,
            start to finish.
          </p>
        </div>
        <TourDialog className="text-sm" />
      </div>

      <div className="mt-12 grid gap-x-8 gap-y-12 md:grid-cols-2">
        {LOOPS.map((v) => (
          <figure key={v.name} className="min-w-0">
            <ProductVideo video={v} />
            <figcaption className="mt-4">
              <span className="block font-semibold">{v.title}</span>
              <span className="mt-1.5 block text-sm leading-relaxed text-dim">{v.blurb}</span>
              {"optionalNote" in v ? (
                <span className="mt-2 block text-xs font-semibold tracking-wide text-signal-ink">
                  {v.optionalNote}
                </span>
              ) : null}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
