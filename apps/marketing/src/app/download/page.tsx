import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import { Cpu, Laptop, Network, ShieldCheck, Server, Terminal } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Wordmark } from "@/components/wordmark";
import { SITE_URL } from "@/lib/site";
import {
  ManagerDownloadButton,
  ManagerFacts,
  ModuleList,
  PlannedList,
  ReleaseCatalogProvider,
  ReleaseTable,
} from "./release-catalog";

const title = "Download — Broadcast Copy";
const description =
  "Download the Broadcast Copy Manager - one native Windows app that installs and updates every AirSuite module from the release registry, verifying each one against its published SHA-256.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/download` },
  openGraph: { title, description, type: "website", url: `${SITE_URL}/download` },
};

// Every sentence on this page is true of the software as shipped. Versions, sizes and
// checksums come from the release registry at runtime (release-catalog.tsx); nothing here
// claims a module is downloadable before its build is published.

const STEPS: { n: string; t: string; b: string }[] = [
  {
    n: "1",
    t: "Reads the registry",
    b: "The Updates window lists every published module and compares each with what this machine has - by the module's own install record, so it knows an install even if it predates the Manager.",
  },
  {
    n: "2",
    t: "Downloads and verifies",
    b: "The artifact is checked against the SHA-256 the registry publishes before a single file lands. A missing or different checksum is a refusal, and the download is discarded.",
  },
  {
    n: "3",
    t: "Runs the module's own installer",
    b: "No administrator rights. Each installer prints exactly what it touches, and ships an uninstaller that reverses it.",
  },
  {
    n: "4",
    t: "Finds it again",
    b: "Every module writes an install manifest. The Manager reads it back to show the installed version and offer Update when a newer build is published - and only when a person presses it.",
  },
];

type Prereq = { icon: LucideIcon; name: string; body: string; link?: { href: string; label: string } };

const PREREQS: Prereq[] = [
  {
    icon: Laptop,
    name: "Windows 10 or 11, 64-bit",
    body: "All the Manager needs. It ships with its own runtime and installs per user, without administrator rights. The modules carry their own runtimes the same way.",
  },
  {
    icon: Terminal,
    name: "Node.js, for AirSuite Sync",
    body: "Sync's service runs on Node.js 18 or newer (22 or 24 recommended), installed at its default location. Its installer checks and stops with a plain message if it is missing.",
    link: { href: "https://nodejs.org", label: "nodejs.org" },
  },
  {
    icon: Network,
    name: "Dante, for AirSuite Console",
    body: "Dante Controller, and Dante Virtual Soundcard set to ASIO at 48 kHz (or any Dante ASIO device). The console never changes routing itself - a person subscribes it in Dante Controller.",
    link: { href: "https://my.audinate.com/support/downloads", label: "Audinate downloads" },
  },
  {
    icon: Server,
    name: "The library service, for AirSuite Production",
    body: "Production is a client of the AirSuite Library & Programming service, which owns the format database. Point it at yours when you install it.",
  },
];

export default function DownloadPage() {
  return (
    <div className="min-h-screen overflow-x-clip">
      <SiteHeader />
      <ReleaseCatalogProvider>
        {/* ------------------------------------------------------------ hero */}
        <section className="relative overflow-hidden bc-glow">
          <div className="pointer-events-none absolute inset-0 bc-grid" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-12 text-center sm:px-5 sm:pt-20 sm:pb-14">
            <span className="inline-flex items-center gap-2 rounded-full border border-signal/30 bg-signal/10 px-3.5 py-1.5 text-xs font-medium tracking-wide text-signal-ink uppercase">
              <span className="bc-pulse h-1.5 w-1.5 rounded-full bg-signal" aria-hidden />
              One download
            </span>

            <h1 className="mx-auto mt-7 max-w-3xl text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-6xl">
              One download installs the rest.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-dim text-pretty">
              Install the Broadcast Copy Manager once. Its Updates window installs and updates every
              AirSuite module from the release registry, and checks each one against its published
              SHA-256 before a single file lands.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ManagerDownloadButton label="Download Broadcast Copy Manager" />
              <a
                href="#modules"
                className="inline-flex w-full items-center justify-center rounded-lg border border-line bg-elevated px-6 py-3 text-sm font-semibold transition hover:border-dim/40 sm:w-auto"
              >
                See every module
              </a>
            </div>
            <ManagerFacts />
          </div>
        </section>

        {/* --------------------------------------------------------- modules */}
        <section id="modules" className="mx-auto max-w-5xl px-4 pt-6 sm:px-5">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Every module</h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-dim">
            The Manager comes first; everything below it installs through its Updates window. A module
            shows a download here only once its build is published - the same moment the Manager
            starts offering it.
          </p>
          <div className="mt-8">
            <ModuleList />
          </div>

          <h3 className="mt-12 text-lg font-semibold tracking-tight">Release details</h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-dim">
            Published so an engineer can check that what was downloaded is what was built: compare the
            SHA-256 of the zip with the one here, or let the Manager do it.
          </p>
          <div className="mt-5">
            <ReleaseTable />
          </div>

          <div className="mt-10 rounded-2xl border border-line bg-surface px-4 py-5 sm:px-6">
            <p className="text-[11px] tracking-[0.18em] text-faint uppercase">On the roadmap</p>
            <PlannedList />
          </div>
        </section>

        {/* ------------------------------------------- what the Manager does */}
        <section className="mx-auto max-w-5xl px-4 pt-16 sm:px-5">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            What the Manager does with a module
          </h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-2xl border border-line bg-elevated p-5">
                <span className="font-mono text-xs text-signal-ink">{s.n}</span>
                <p className="mt-2 font-semibold">{s.t}</p>
                <p className="mt-2 text-sm leading-relaxed text-dim">{s.b}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 max-w-3xl text-sm leading-relaxed text-dim">
            It also runs unattended for a scripted update:{" "}
            <span className="font-mono text-xs break-all text-fg">
              BroadcastCopySuiteManager.exe --install &lt;module&gt; --log update.log
            </span>{" "}
            runs the same download, check and installer, reads the install back, and exits 0 or 1.
          </p>
        </section>

        {/* ---------------------------------------------------- prerequisites */}
        <section className="mx-auto max-w-5xl px-4 pt-16 sm:px-5">
          <h2 className="text-xl font-semibold tracking-tight">Before you install</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-dim">
            The Manager needs only the first. The others belong to the module named on each, and each
            module&apos;s installer checks for its own and says plainly if one is missing.
          </p>
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            {PREREQS.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.name} className="border-t border-line pt-6">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-ink"
                    aria-hidden
                  >
                    <Icon className="h-5 w-5 text-signal-ink" />
                  </span>
                  <h3 className="mt-4 font-semibold">{p.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-dim">{p.body}</p>
                  {p.link ? (
                    <a
                      href={p.link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-block text-sm font-semibold text-signal-ink hover:underline"
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
        <section className="mx-auto max-w-5xl px-4 pt-16 sm:px-5">
          <div className="rounded-2xl border border-line bg-elevated p-5 sm:p-8">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 flex-none text-signal-ink" aria-hidden />
              <h2 className="text-xl font-semibold tracking-tight">What it does to the machine</h2>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-dim">
              A studio PC is not a place for surprises, so all of it is listed here. Unzip the Manager,
              run{" "}
              <span className="font-mono text-xs break-all text-fg">Install-BroadcastCopyManager.ps1</span>,
              and it installs for the current user without asking for administrator rights.
            </p>

            <div className="mt-7 grid gap-8 md:grid-cols-2">
              <div>
                <p className="text-[11px] tracking-[0.18em] text-faint uppercase">The Manager touches</p>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-dim">
                  <li>
                    <span className="font-mono text-xs break-all text-fg">
                      %LOCALAPPDATA%\Programs\Broadcast Copy Manager
                    </span>{" "}
                    - the program files and its install manifest
                  </li>
                  <li>
                    <span className="font-mono text-xs break-all text-fg">
                      %LOCALAPPDATA%\Broadcast Copy Manager
                    </span>{" "}
                    - your configuration, seeded once and never overwritten
                  </li>
                  <li>A Start Menu shortcut, and a desktop one unless you decline it</li>
                  <li>One per-user entry, so it appears in Settings &rsaquo; Apps</li>
                  <li>Your Startup folder only if you ask for it (-Autostart)</li>
                </ul>
                <p className="mt-4 text-sm leading-relaxed text-dim">
                  No services, no scheduled tasks, no firewall rules, nothing in Program Files, and no
                  change to any audio device or Dante setting.
                </p>
              </div>
              <div>
                <p className="text-[11px] tracking-[0.18em] text-faint uppercase">The modules</p>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-dim">
                  <li>
                    <span className="font-semibold text-fg">Console</span> arrives with its outputs
                    switched off: it cannot put audio on your network until you turn them on.
                  </li>
                  <li>
                    <span className="font-semibold text-fg">Sync</span> installs to{" "}
                    <span className="font-mono text-xs break-all text-fg">C:\AirSuiteSync</span> (or your
                    per-user folder), starts in shadow mode, and every example job is off.
                  </li>
                  <li>
                    Each uninstaller removes only what its install manifest says it created, and keeps
                    your configuration unless you add{" "}
                    <span className="font-mono text-xs text-fg">-Purge</span>.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </ReleaseCatalogProvider>

      {/* ----------------------------------------------------------- notes */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-5 sm:py-20">
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              t: "Nothing installs itself",
              b: "The Manager tells you an update exists. It installs one when a person presses Update, or when a script you wrote asks - never on its own.",
            },
            {
              t: "Every artifact verified",
              b: "Each download is checked against the SHA-256 in the registry before anything is written. No checksum means no install.",
            },
            {
              t: "No administrator rights",
              b: "The Manager and every module install without administrator rights - the Manager, Console and Production per user - and uninstall the same way.",
            },
          ].map((c) => (
            <div key={c.t} className="border-t border-line pt-6">
              <h3 className="text-lg font-semibold">{c.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-dim">{c.b}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-line bg-surface px-5 py-6 text-sm text-dim sm:px-8">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-signal-ink" aria-hidden />
            <p className="text-[11px] tracking-[0.18em] text-faint uppercase">Also available</p>
          </div>
          <p className="mt-3 leading-relaxed">
            Listener apps for iOS and Android, plus Roku, Fire TV and Apple TV channels and the Alexa and
            Google actions, are built per station from your brand kit and published under your own
            developer accounts - ask us and we will set them up with you.
          </p>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-10 text-sm text-faint sm:flex-row sm:px-5">
          <Wordmark px={2} className="text-dim" />
          <p className="text-center">
            Broadcast Copy · pricing on request ·{" "}
            <a href="/platform#early-access" className="underline underline-offset-2 hover:text-dim">
              join the waitlist
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
