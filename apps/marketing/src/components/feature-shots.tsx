/**
 * The Developers page's feature images: REAL screens of the software on warm
 * paper, a vermilion ring on the part that matters. Made 2026-09-27 from the
 * product animations' sanitized renders (dev/bc-product-animations,
 * public/renders - offline self-test data, private details blurred) and the
 * top of the Manager's Updates window; every final file was OCR-checked
 * against the same privacy rules (paths, addresses, machine names, people,
 * vendor names) and looked at by eye. Each ships as a full-size WebP and an
 * 800 px one; the full size opens on tap, for zooming in.
 *
 * Plain <img>: this is a static export (images.unoptimized), and the two
 * sizes are made ahead of time, so next/image would add nothing but markup.
 */

type Shot = {
  readonly name: string;
  readonly title: string;
  readonly caption: string;
  readonly alt: string;
  /** the full-size file's pixels (the 800 px one is 800 x 450) */
  readonly w: number;
  readonly h: number;
};

const SHOTS = [
  {
    name: "log-validation-gate",
    title: "A gate before the log publishes",
    caption:
      "Tomorrow's log is generated, checked and published as a numbered revision with its SHA-256. A day that fails a check is not published.",
    alt: "Tomorrow's log screen in the Production app: the day shows PUBLISHED, with Generated, Validated and Published cards (revision r1, 1,154 rows, a SHA-256), and below them the checks, hour by hour, and the warnings the day still carries.",
    w: 1481,
    h: 833,
  },
  {
    name: "log-change-record",
    title: "Every edit, on the record",
    caption:
      "The Log Editor records each change against the signed-in profile with its reason, in an append-only change record — including edits made with no profile.",
    alt: "The Log Editor with a day's log in a grid; the side panel shows the reason field and the append-only list of who changed what, including one change flagged as made with no profile signed in.",
    w: 1340,
    h: 754,
  },
  {
    name: "traffic-staged-week",
    title: "Traffic staged beside your system",
    caption:
      "The week's traffic files are staged and compared line by line with your current traffic system. Publishing stays off until the station switches it on.",
    alt: "Build Traffic: seven day cards for the week, then a table of each day's file with its spot counts, the comparison result, staged, and publish_disabled on every day.",
    w: 1226,
    h: 690,
  },
  {
    name: "ai-drafts-advisory",
    title: "AI drafts, flagged and never saved alone",
    caption:
      "The optional imaging writer offers drafts, marks anything that may be invented with a CHECK flag, and saves nothing until a person does.",
    alt: "Imaging, Create and schedule: a Halloween sweeper with three AI drafts; the third is outlined and carries a CHECK flag because it names a day that was not in the notes.",
    w: 1600,
    h: 900,
  },
  {
    name: "guide-panel",
    title: "A guide on every page",
    caption:
      "The Guide button or F1 opens the page's own walkthrough: what it does to air, the steps in order, and Show me for each one.",
    alt: "The Log Editor with the Guide panel open on the right: it says the page affects air later and nothing plays now, then lists numbered steps, each with a Show me link.",
    w: 1600,
    h: 900,
  },
  {
    name: "manager-updates",
    title: "Updates checked against a checksum",
    caption:
      "The Manager lists what is installed and what is available, and verifies every artifact against its published SHA-256 before installing it.",
    alt: "The Broadcast Copy Manager's Updates window listing two installed modules with their versions and sizes; the Manager's own entry says every artifact is verified against its published sha256, installs per user without admin rights, and also runs headless.",
    w: 1108,
    h: 623,
  },
] as const satisfies readonly Shot[];

const BASE = "/images/developers/";

export function FeatureShots() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2">
      {SHOTS.map((s) => (
        <figure key={s.name} className="min-w-0">
          <a
            href={`${BASE}${s.name}.webp`}
            className="block overflow-hidden rounded-xl border border-line bg-surface transition hover:border-signal/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-ink"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static export, pre-sized WebPs */}
            <img
              src={`${BASE}${s.name}-800.webp`}
              srcSet={`${BASE}${s.name}-800.webp 800w, ${BASE}${s.name}.webp ${s.w}w`}
              sizes="(min-width: 768px) 560px, calc(100vw - 40px)"
              width={800}
              height={450}
              alt={s.alt}
              loading="lazy"
              decoding="async"
              className="block h-auto w-full"
            />
            <span className="sr-only"> (opens the full-size image)</span>
          </a>
          <figcaption className="mt-4">
            <span className="block font-semibold">{s.title}</span>
            <span className="mt-1.5 block text-sm leading-relaxed text-dim">{s.caption}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
