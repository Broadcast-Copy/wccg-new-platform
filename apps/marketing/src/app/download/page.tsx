import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDown,
  Check,
  Cpu,
  Headphones,
  Mic,
  Monitor,
  Sliders,
  Truck,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Wordmark } from "@/components/wordmark";
import { FLAGSHIP_URL, SITE_URL } from "@/lib/site";

const title = "Download — Broadcast Copy";
const description =
  "One installer. The Broadcast Copy Download Manager carries every studio module — AirSuite On-Air, Production, Podcast, Remote and the studio agent — and keeps them current.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/download` },
  openGraph: { title, description, type: "website", url: `${SITE_URL}/download` },
};

type State = "installed" | "update" | "installing" | "get";

type Module = {
  icon: LucideIcon;
  name: string;
  body: string;
  version: string;
  size: string;
  state: State;
  /** only meaningful while installing */
  progress?: number;
};

const MODULES: Module[] = [
  {
    icon: Sliders,
    name: "AirSuite On-Air",
    body: "The live console — deck control, cart wall, mic logic and the log running against the clock.",
    version: "2.4.1",
    size: "184 MB",
    state: "installed",
  },
  {
    icon: Mic,
    name: "AirSuite Production",
    body: "Multitrack production and voice tracking, with copy and spots pulled from the traffic log.",
    version: "2.4.0",
    size: "212 MB",
    state: "update",
  },
  {
    icon: Headphones,
    name: "AirSuite Podcast",
    body: "Multi-room recording and the publishing chain, wired to the same content library.",
    version: "1.9.3",
    size: "168 MB",
    state: "installing",
    progress: 62,
  },
  {
    icon: Truck,
    name: "AirSuite Remote",
    body: "The road kit — the same surface on a laptop, for remotes and live events.",
    version: "1.6.0",
    size: "96 MB",
    state: "get",
  },
  {
    icon: Cpu,
    name: "Studio Agent",
    body: "Runs headless beside the playout box: reports now-playing and telemetry, applies schedule changes.",
    version: "3.1.2",
    size: "42 MB",
    state: "installed",
  },
  {
    icon: Monitor,
    name: "Screens & Signage",
    body: "Drives lobby displays, studio clocks and in-store reels from the same campaign calendar.",
    version: "1.2.0",
    size: "74 MB",
    state: "get",
  },
];

const STATE_LABEL: Record<State, string> = {
  installed: "Installed",
  update: "Update",
  installing: "Installing",
  get: "Install",
};

function StatePill({ state }: { state: State }) {
  if (state === "installed")
    return (
      <span className="inline-flex flex-none items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-faint">
        <Check className="h-3.5 w-3.5" aria-hidden />
        Installed
      </span>
    );
  const solid = state === "update" || state === "get";
  return (
    <span
      className={
        solid
          ? "inline-flex flex-none items-center rounded-full bg-signal px-3.5 py-1.5 text-xs font-semibold text-white"
          : "inline-flex flex-none items-center rounded-full border border-signal/40 bg-signal/10 px-3.5 py-1.5 text-xs font-semibold text-signal"
      }
    >
      {STATE_LABEL[state]}
    </span>
  );
}

export default function DownloadPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* ------------------------------------------------------------ hero */}
      <section className="relative overflow-hidden bc-glow">
        <div className="pointer-events-none absolute inset-0 bc-grid" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-5 pt-20 pb-14 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-signal/30 bg-signal/10 px-3.5 py-1.5 text-xs font-medium tracking-wide text-signal-soft uppercase">
            <span className="bc-pulse h-1.5 w-1.5 rounded-full bg-signal" aria-hidden />
            One installer
          </span>

          <h1 className="mx-auto mt-7 max-w-3xl text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-6xl">
            The Download Manager carries the whole studio.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-dim text-pretty">
            You install one thing. Every AirSuite console, the studio agent and
            the signage driver live inside it — installed, updated and rolled
            back from one window, so a studio machine is never half a version
            behind the platform.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#modules"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-signal px-6 py-3 text-sm font-semibold text-white transition hover:bg-signal-soft sm:w-auto"
            >
              <ArrowDown className="h-4 w-4" aria-hidden />
              Download for Windows
            </a>
            <a
              href={FLAGSHIP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center rounded-lg border border-line bg-elevated px-6 py-3 text-sm font-semibold transition hover:border-dim/40 sm:w-auto"
            >
              See it running
            </a>
          </div>

          <p className="mt-6 text-sm text-faint">
            v3.2.0 · 38 MB · Windows 10/11 64-bit · macOS build in beta
          </p>
        </div>
      </section>

      {/* -------------------------------------------------- manager mockup */}
      <section id="modules" className="mx-auto max-w-5xl px-5 pb-6">
        <div className="overflow-hidden rounded-2xl border border-line bg-elevated">
          <div className="flex items-center gap-3 border-b border-line bg-ink px-4 py-3">
            <span className="flex gap-1.5" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-line" />
              <span className="h-2.5 w-2.5 rounded-full bg-line" />
              <span className="h-2.5 w-2.5 rounded-full bg-line" />
            </span>
            <Wordmark px={2} className="ml-1 text-fg" />
            <span className="text-xs tracking-[0.18em] text-faint uppercase">
              Download Manager
            </span>
            <span className="ml-auto text-xs text-faint">WBCC 104.5 · Studio A</span>
          </div>

          <div className="grid md:grid-cols-[190px_1fr]">
            <aside className="border-b border-line p-4 text-sm md:border-r md:border-b-0">
              <p className="text-[11px] tracking-[0.18em] text-faint uppercase">
                Library
              </p>
              <ul className="mt-3 space-y-1">
                {["All modules", "Installed", "Updates", "Beta channel"].map(
                  (item, i) => (
                    <li
                      key={item}
                      className={`rounded-lg px-3 py-2 ${
                        i === 0 ? "bg-signal/10 font-semibold text-signal" : "text-dim"
                      }`}
                    >
                      {item}
                    </li>
                  ),
                )}
              </ul>
              <p className="mt-6 text-[11px] tracking-[0.18em] text-faint uppercase">
                Machine
              </p>
              <p className="mt-2 text-xs leading-relaxed text-dim">
                Licensed to your station. Modules follow the station licence, not
                the seat.
              </p>
            </aside>

            <div className="divide-y divide-line">
              {MODULES.map((m) => {
                const Icon = m.icon;
                return (
                  <div key={m.name} className="flex items-start gap-4 px-5 py-4">
                    <span
                      className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-line bg-ink"
                      aria-hidden
                    >
                      <Icon className="h-5 w-5 text-signal" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <p className="font-semibold">{m.name}</p>
                        <span className="font-mono text-xs text-faint">
                          {m.version} · {m.size}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-dim">{m.body}</p>
                      {m.state === "installing" ? (
                        <div className="mt-3 flex items-center gap-3">
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                            <span
                              className="block h-full rounded-full bg-signal"
                              style={{ width: `${m.progress ?? 0}%` }}
                            />
                          </span>
                          <span className="font-mono text-xs text-faint">
                            {m.progress ?? 0}%
                          </span>
                        </div>
                      ) : null}
                    </div>
                    <StatePill state={m.state} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-faint">
          The manager window — module states shown for illustration.
        </p>
      </section>

      {/* ----------------------------------------------------------- notes */}
      <section className="mx-auto max-w-5xl px-5 py-20">
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              t: "One version, everywhere",
              b: "The manager pins every studio machine to the build your station is licensed for, so On-Air and Production are never arguing about a log format.",
            },
            {
              t: "Updates on your schedule",
              b: "Nothing installs mid-show. Updates stage in the background and apply when the machine is off air, or when you say so.",
            },
            {
              t: "Roll back in one click",
              b: "The last two builds of every module stay on disk. If a release misbehaves at 6am, you are not waiting on us.",
            },
          ].map((c) => (
            <div key={c.t} className="border-t border-line pt-6">
              <h3 className="text-lg font-semibold">{c.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-dim">{c.b}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-line bg-surface px-6 py-6 text-sm text-dim sm:px-8">
          <p className="text-[11px] tracking-[0.18em] text-faint uppercase">
            Also available
          </p>
          <p className="mt-3 leading-relaxed">
            Listener apps for iOS and Android, plus Roku, Fire TV and Apple TV
            channels and the Alexa and Google actions, are built per station from
            your brand kit and published under your own developer accounts — ask
            us and we will set them up with you.
          </p>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-5 py-10 text-sm text-faint sm:flex-row">
          <Wordmark px={2} className="text-dim" />
          <p>Broadcast Copy · $49.99/mo per licensed station</p>
        </div>
      </footer>
    </div>
  );
}
