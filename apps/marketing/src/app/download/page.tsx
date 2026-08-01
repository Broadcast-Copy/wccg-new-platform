import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDown,
  AudioLines,
  Check,
  Cpu,
  Headphones,
  Laptop,
  Mic,
  Monitor,
  Network,
  ShieldCheck,
  Sliders,
  Truck,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Wordmark } from "@/components/wordmark";
import { AIRSUITE_CONSOLE, FLAGSHIP_URL, SITE_URL } from "@/lib/site";

const title = "Download — Broadcast Copy";
const description =
  "Download AirSuite Console, the software mixing console for a Dante studio. Part of the Broadcast Copy Download Manager, which carries every studio module and keeps them current.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/download` },
  openGraph: { title, description, type: "website", url: `${SITE_URL}/download` },
};

type State = "download" | "installed" | "update" | "installing" | "get";

type Module = {
  icon: LucideIcon;
  name: string;
  body: string;
  version: string;
  size: string;
  state: State;
  /** only meaningful while installing */
  progress?: number;
  /** set on the modules you can actually download today */
  href?: string;
};

const MODULES: Module[] = [
  {
    icon: AudioLines,
    name: "AirSuite Console",
    body: "The software mixing console. Sixteen strips, PGM/AUD/UTILITY buses, cue, mic logic and mix-minus, metering to EBU R 128 — running on your Dante network with no surface to buy.",
    version: AIRSUITE_CONSOLE.version,
    size: AIRSUITE_CONSOLE.size,
    state: "download",
    href: AIRSUITE_CONSOLE.href,
  },
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
  download: "Download",
  installed: "Installed",
  update: "Update",
  installing: "Installing",
  get: "Install",
};

function StatePill({ state, href, name }: { state: State; href?: string; name: string }) {
  // The one module you can really have is a real link, not a picture of a button.
  if (state === "download" && href)
    return (
      <a
        href={href}
        download
        className="inline-flex flex-none items-center gap-1.5 rounded-full bg-signal px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-signal-soft"
      >
        <ArrowDown className="h-3.5 w-3.5" aria-hidden />
        Download
        <span className="sr-only"> {name}</span>
      </a>
    );
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

type Prereq = {
  icon: LucideIcon;
  name: string;
  body: string;
  link?: { href: string; label: string };
};

const PREREQS: Prereq[] = [
  {
    icon: Laptop,
    name: "Windows 10 or 11, 64-bit",
    body: "Nothing else to install first. The engine ships with its own runtime, and it serves the console surface itself — there is no separate web server, database or framework to set up.",
  },
  {
    icon: Network,
    name: "Dante Controller",
    body: "Free from Audinate. The console reads and writes audio over Dante, and every subscription — what this machine hears, and what hears it — is made by a person in Dante Controller. The console never writes routing itself: an audio network should only be repatched by somebody who meant to.",
    link: {
      href: "https://my.audinate.com/support/downloads",
      label: "Audinate downloads",
    },
  },
  {
    icon: Cpu,
    name: "Dante Virtual Soundcard, set to ASIO",
    body: "This is the audio device the engine opens. Set its interface mode to ASIO rather than WDM, at 48 kHz. A Dante hardware interface works just as well — anything presenting a Dante ASIO device will do; name it in the config and the console uses it.",
  },
];

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
              href="#console"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-signal px-6 py-3 text-sm font-semibold text-white transition hover:bg-signal-soft sm:w-auto"
            >
              <ArrowDown className="h-4 w-4" aria-hidden />
              Download AirSuite Console
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

          {/* Describes the button above it, which downloads the Console — not the manager. */}
          <p className="mt-6 text-sm text-faint">
            AirSuite Console v{AIRSUITE_CONSOLE.version} · {AIRSUITE_CONSOLE.size} · Windows
            10/11 64-bit · needs Dante Controller
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
                    <StatePill state={m.state} href={m.href} name={m.name} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-faint">
          AirSuite Console is a live download. The other module states are shown for
          illustration.
        </p>
      </section>

      {/* --------------------------------------------------- console download */}
      <section id="console" className="mx-auto max-w-5xl px-5 pt-16">
        <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <span className="text-[11px] tracking-[0.18em] text-faint uppercase">
                Available now
              </span>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                AirSuite Console
              </h2>
              <p className="mt-4 leading-relaxed text-dim">
                A full mixing console in software, on the Dante network you already have.
                Sixteen strips with PGM, audition and utility buses, cue, fader taper that
                behaves like a broadcast surface, mic logic that ducks playout when a mic
                opens, mix-minus for the phone, and programme loudness metered to EBU R 128.
              </p>
              <p className="mt-4 leading-relaxed text-dim">
                It is one process. It owns the audio device, does the mixing and serves its
                own surface, so you open a browser on the studio machine and the console is
                there.
              </p>
            </div>

            <div className="w-full sm:w-auto">
              <a
                href={AIRSUITE_CONSOLE.href}
                download
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-signal px-6 py-3 text-sm font-semibold text-white transition hover:bg-signal-soft sm:w-auto"
              >
                <ArrowDown className="h-4 w-4" aria-hidden />
                Download for Windows
              </a>
              <dl className="mt-4 space-y-1 font-mono text-xs text-faint">
                <div className="flex gap-2">
                  <dt className="text-dim">version</dt>
                  <dd>{AIRSUITE_CONSOLE.version}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-dim">download</dt>
                  <dd>{AIRSUITE_CONSOLE.size}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-dim">installed</dt>
                  <dd>{AIRSUITE_CONSOLE.installedSize}</dd>
                </div>
              </dl>
              {/* Published so an engineer can check what they downloaded is what we built. */}
              <p className="mt-3 max-w-[15rem] text-[11px] leading-relaxed text-faint">
                SHA-256{" "}
                <a
                  className="font-mono break-all text-dim underline decoration-line underline-offset-2 hover:text-fg"
                  href={AIRSUITE_CONSOLE.sha256Href}
                >
                  {AIRSUITE_CONSOLE.sha256.slice(0, 16)}…
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- prerequisites */}
      <section className="mx-auto max-w-5xl px-5 pt-14">
        <h2 className="text-xl font-semibold tracking-tight">Before you install</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-dim">
          Three things, and the installer checks for the last two and tells you plainly if
          they are missing.
        </p>

        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {PREREQS.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.name} className="border-t border-line pt-6">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-ink"
                  aria-hidden
                >
                  <Icon className="h-5 w-5 text-signal" />
                </span>
                <h3 className="mt-4 font-semibold">{p.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-dim">{p.body}</p>
                {p.link ? (
                  <a
                    href={p.link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-sm font-semibold text-signal hover:text-signal-soft"
                  >
                    {p.link.label} →
                  </a>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------- install / uninstall */}
      <section className="mx-auto max-w-5xl px-5 pt-14">
        <div className="rounded-2xl border border-line bg-elevated p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 flex-none text-signal" aria-hidden />
            <h2 className="text-xl font-semibold tracking-tight">
              What it does to the machine
            </h2>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-dim">
            A studio PC is not a place for surprises, so the whole of it is listed here.
            Unzip, run <span className="font-mono text-fg">Install-AirSuiteConsole.ps1</span>,
            and it installs for the current user without ever asking for administrator rights.
          </p>

          <div className="mt-7 grid gap-8 md:grid-cols-2">
            <div>
              <p className="text-[11px] tracking-[0.18em] text-faint uppercase">
                Everything it touches
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-dim">
                <li>
                  <span className="font-mono text-xs text-fg">
                    %LOCALAPPDATA%\Programs\AirSuite Console
                  </span>{" "}
                  — the program files
                </li>
                <li>
                  <span className="font-mono text-xs text-fg">
                    %LOCALAPPDATA%\AirSuite Console
                  </span>{" "}
                  — your channel map and logs
                </li>
                <li>A Start Menu shortcut, and a desktop one unless you decline it</li>
                <li>One per-user registry entry, so it appears in Settings &rsaquo; Apps</li>
              </ul>
              <p className="mt-4 text-sm leading-relaxed text-dim">
                No services, no scheduled tasks, no autostart, no firewall rules, nothing in
                Program Files, and no change to any audio device or Dante setting.
              </p>
            </div>

            <div>
              <p className="text-[11px] tracking-[0.18em] text-faint uppercase">
                It arrives switched off
              </p>
              <p className="mt-3 text-sm leading-relaxed text-dim">
                Outputs ship disabled, so a console that has just been installed writes
                silence to every transmit channel. It meters, mixes and drives the surface —
                it cannot put audio on your network until you say so. The surface answers on
                the local machine only until you widen it.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-dim">
                Turn the outputs on once you have looked in Dante Controller and know exactly
                what is subscribed to that machine. The first thing a new console should not
                do is reach air by itself.
              </p>

              <p className="mt-6 text-[11px] tracking-[0.18em] text-faint uppercase">
                Removing it
              </p>
              <p className="mt-3 text-sm leading-relaxed text-dim">
                Settings &rsaquo; Apps &rsaquo; AirSuite Console, or run the uninstaller in the
                install folder. It removes only what its own install manifest says it created,
                and it stops only the engine running from that folder. Your channel map is
                kept so a reinstall picks up where you left off; add{" "}
                <span className="font-mono text-xs text-fg">-Purge</span> to take that too.
              </p>
            </div>
          </div>
        </div>
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
