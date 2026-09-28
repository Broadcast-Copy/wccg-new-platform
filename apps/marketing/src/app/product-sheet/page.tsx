import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowRight, Check } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Wordmark } from "@/components/wordmark";
import { PrintButton } from "@/components/print-button";
import { BROADCAST_COPY_MANAGER, SITE_URL } from "@/lib/site";

const title = "Product sheet — Broadcast Copy";
const description =
  "Broadcast Copy on one page, for station GMs: what it runs in every department, how a station moves over without risking air, and what is coming next.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/product-sheet/` },
  openGraph: { title, description, type: "website", url: `${SITE_URL}/product-sheet/` },
};

/**
 * One printable page for a GM. Every line is a shipped capability, or is
 * labelled as optional or coming. Deliberately carries no pricing and no
 * station names — the platform page owns the former, and a sheet that gets
 * forwarded should not speak for anyone's station.
 */
const DEPARTMENTS = [
  {
    name: "On air",
    points: [
      "AirSuite On-Air: three decks, the program log, hotkeys and live copy in one window.",
      "A muted shadow mode that runs beside your current automation until you trust it.",
      "AirSuite Console: a software mixing console on your Dante network, shipped with its outputs off.",
    ],
  },
  {
    name: "Programming",
    points: [
      "Clocks and dayparts built by rule; one schedule drives the site, the player and the guide.",
      "Tomorrow's log built every evening and published only if it passes a validation gate.",
      "A log editor for the PD, with signed-in profiles and an append-only change record built in.",
    ],
  },
  {
    name: "Traffic & billing",
    points: [
      "Orders, rate cards, copy, make-goods, invoicing, payments and A/R, political requests and reports.",
      "As-run, spot affidavits and missed-spot reports from what actually aired.",
      "Runs beside your current traffic system until you switch it on to feed the log.",
    ],
  },
  {
    name: "Promotions & imaging",
    points: [
      "Promotions calendars checked against the year's dates and exported to Word in their own layout.",
      "Imaging by type and occasion, with a holiday calendar and an order-by date for each occasion.",
      "An optional AI writer that drafts imaging scripts — advisory, saved only by a person.",
    ],
  },
  {
    name: "Engineering",
    points: [
      "Studio Control: every machine and service in the plant on one native board.",
      "A scheduled air-check recorder, the station command table, and a library recycle bin.",
      "Studio Sync lands DJ mixes in their carts, checksum-verified and never over a cart on air.",
    ],
  },
  {
    name: "Audience & compliance",
    points: [
      "Streaming and channels, with live now-playing and a player on every channel.",
      "Listener loyalty, community and on-demand, as first-party data you own.",
      "Public inspection file, EEO, political file and deadline tracking.",
    ],
  },
] as const;

const MOVE_OVER = [
  {
    n: "01",
    t: "We provision your station",
    b: "Organization, licensed station record, your domain, and your team invited as GM, OM, staff and DJs. Your programming and hosts are imported for you.",
  },
  {
    n: "02",
    t: "It runs beside what you have",
    b: "Playout in muted shadow, traffic compared with your current system week by week. Nothing reaches air until you switch it on.",
  },
  {
    n: "03",
    t: "You cut over a piece at a time",
    b: "When the comparison says a piece is ready, you switch that piece on — and the rest keeps running as it did.",
  },
] as const;

const GUARDS = [
  "Writes that matter take two presses: the first shows exactly what will change.",
  "A day's log publishes only if it passes the gate, as a numbered, checksummed revision.",
  "A newly installed console writes silence until you turn its outputs on.",
  "AI drafts are advisory: nothing is saved or sent until a person does it.",
] as const;

const COMING = [
  "A Music section for the Music Director, with playlists sent to each DJ.",
  "A guided walkthrough on every page of the Production app.",
  "A guided Build a Day's Log flow, from traffic in to publish.",
] as const;

export default function ProductSheetPage() {
  return (
    <div className="min-h-screen print:bg-white">
      <div className="print:hidden">
        <SiteHeader />
      </div>

      <main className="mx-auto max-w-5xl px-5 pt-14 pb-20 print:max-w-none print:px-0 print:pt-0 print:pb-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs tracking-[0.24em] text-dim uppercase">
            Product sheet · for station GMs
          </p>
          <PrintButton />
        </div>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl print:text-3xl">
          Broadcast Copy, on one page.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-dim text-pretty print:text-base">
          One system for the air product, the back office and the compliance file. Studio
          machines run native Windows apps from a single download; the platform behind them
          runs your streams, your site, your listeners and your paperwork.
        </p>

        {/* ------------------------------------------------ departments */}
        <section className="mt-12 print:mt-6">
          <h2 className="text-sm font-semibold tracking-[0.14em] uppercase">What it runs</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 print:gap-3">
            {DEPARTMENTS.map((d) => (
              <div
                key={d.name}
                className="rounded-2xl border border-line bg-surface p-5 print:break-inside-avoid print:rounded-lg print:p-3"
              >
                <h3 className="font-semibold">{d.name}</h3>
                <ul className="mt-3 space-y-2">
                  {d.points.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm leading-relaxed text-dim print:text-xs">
                      <Check className="mt-1 h-3.5 w-3.5 flex-none text-signal-ink" aria-hidden />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------- the download */}
        <section className="mt-10 rounded-2xl border border-line bg-elevated p-5 sm:p-6 print:mt-5 print:p-3">
          <h2 className="text-sm font-semibold tracking-[0.14em] uppercase">One download</h2>
          <p className="mt-3 text-sm leading-relaxed text-dim">
            The Broadcast Copy Manager (v{BROADCAST_COPY_MANAGER.version}, Windows 10/11) is a
            native dashboard for the whole suite. It launches every module, installs and updates
            them on request with each artifact checked against its published SHA-256, and
            installs per user with no administrator rights.
          </p>
        </section>

        {/* ------------------------------------------------ moving over */}
        <section className="mt-10 print:mt-5">
          <h2 className="text-sm font-semibold tracking-[0.14em] uppercase">
            How a station moves over
          </h2>
          <ol className="mt-5 grid gap-6 md:grid-cols-3 print:grid-cols-3 print:gap-3">
            {MOVE_OVER.map((s) => (
              <li key={s.n} className="border-t border-line pt-4 print:break-inside-avoid">
                <span className="font-mono text-sm font-semibold text-signal-ink">{s.n}</span>
                <h3 className="mt-2 font-semibold">{s.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-dim print:text-xs">{s.b}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ------------------------------------------- guards + coming */}
        <section className="mt-10 grid gap-6 md:grid-cols-2 print:mt-5 print:grid-cols-2 print:gap-3">
          <div className="rounded-2xl border border-line bg-surface p-5 print:p-3">
            <h2 className="text-sm font-semibold tracking-[0.14em] uppercase">
              Nothing reaches air by accident
            </h2>
            <ul className="mt-4 space-y-2">
              {GUARDS.map((g) => (
                <li key={g} className="flex items-start gap-2 text-sm leading-relaxed text-dim print:text-xs">
                  <Check className="mt-1 h-3.5 w-3.5 flex-none text-signal-ink" aria-hidden />
                  <span>{g}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5 print:p-3">
            <h2 className="text-sm font-semibold tracking-[0.14em] uppercase">Coming next</h2>
            <ul className="mt-4 space-y-2">
              {COMING.map((c) => (
                <li key={c} className="flex items-start gap-2 text-sm leading-relaxed text-dim print:text-xs">
                  <ArrowRight className="mt-1 h-3.5 w-3.5 flex-none text-signal-ink" aria-hidden />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------------------------------ CTAs */}
        <div className="mt-12 flex flex-col gap-3 sm:flex-row print:hidden">
          <Link
            href="/platform#early-access"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-signal px-6 py-3 text-sm font-semibold text-fg transition hover:bg-signal-soft"
          >
            Get early access <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/download/"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-elevated px-6 py-3 text-sm font-semibold transition hover:border-dim/40"
          >
            <ArrowDown className="h-4 w-4" aria-hidden />
            Download the Manager
          </Link>
          <Link
            href="/documentation/"
            className="inline-flex items-center justify-center rounded-lg border border-line bg-elevated px-6 py-3 text-sm font-semibold transition hover:border-dim/40"
          >
            Read the guides
          </Link>
        </div>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-dim sm:flex-row print:px-0 print:py-3 print:text-xs">
          <Wordmark px={2} className="text-dim" />
          <p>broadcastcopy.ai · as of 27 September 2026</p>
        </div>
      </footer>
    </div>
  );
}
