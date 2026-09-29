"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDown,
  AudioLines,
  Check,
  Clock,
  Cpu,
  Headphones,
  LayoutGrid,
  Mic,
  Monitor,
  RefreshCw,
  Sliders,
  Truck,
  Database,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AIRSUITE_CONSOLE, BROADCAST_COPY_MANAGER } from "@/lib/site";

/**
 * The Download page's module list, read from the release registry at RUNTIME.
 *
 * bc_releases is public metadata: anon may SELECT published rows and nothing else
 * (migration 112, the same read the Suite Manager's Updates window makes). So a
 * release the integrator publishes shows here with no site rebuild, and a row that
 * is not published is simply not returned - an unpublished module can never show a
 * download link. Until the read answers (or if it fails), the page shows the static
 * fallback below, which only ever holds builds that are already public.
 *
 * Nothing on this page states a price (owner rule): "pricing on request" and the
 * waitlist are the only commercial words.
 */

export type Release = {
  version: string;
  sizeBytes: number | null;
  sha256: string | null;
  url: string;
  minOs: string | null;
  /** Static fallback only: the size as site.ts states it. */
  sizeLabel?: string;
};

type Availability = "public" | "lan" | "review" | "onair";

export type ModuleDef = {
  pkg: string;
  name: string;
  icon: LucideIcon;
  body: string;
  /** What the machine needs before this module is useful. */
  needs: string;
  /** What the Broadcast Copy Manager does with it, in plain words. */
  manager: string;
  availability: Availability;
  /** Shown instead of a download when there is no published build. */
  unavailable?: string;
  /** Static fallback: ONLY a build that is already public. */
  fallback?: Release;
};

const fromSite = (s: { version: string; href: string; sha256: string; size: string }): Release => ({
  version: s.version,
  sizeBytes: null,
  sizeLabel: s.size,
  sha256: s.sha256,
  url: s.href.replace(/\?download=.*$/, ""),
  minOs: null,
});

const MANAGER_MODULE: ModuleDef = {
    pkg: "broadcast-copy-manager",
    name: "Broadcast Copy Manager",
    icon: LayoutGrid,
    body: "The one download that installs the rest. A native Windows dashboard for the whole studio: your station, live service status, every module one click away - and an Updates window that installs and updates the modules below from this same registry.",
    needs: "Windows 10 or 11, 64-bit. Nothing else - it carries its own runtime.",
    manager: "This is the Manager. Install it once, per user, with no administrator rights; it then updates itself from its own Updates window like any other module.",
    availability: "public",
    fallback: fromSite(BROADCAST_COPY_MANAGER),
};

export const MODULES: ModuleDef[] = [
  MANAGER_MODULE,
  {
    pkg: "airsuite-console",
    name: "AirSuite Console",
    icon: AudioLines,
    body: "The software mixing console. Sixteen strips, programme, audition and utility buses, cue, mic logic and mix-minus, metered to EBU R 128 - on the Dante network you already have.",
    needs: "Dante Controller and Dante Virtual Soundcard set to ASIO at 48 kHz (or any Dante ASIO device).",
    manager: "Downloads it, checks its SHA-256 against the registry, runs its installer for the current user, and finds it again afterwards. It arrives with its outputs switched off.",
    availability: "public",
    fallback: fromSite(AIRSUITE_CONSOLE),
  },
  {
    pkg: "airsuite-sync",
    name: "AirSuite Sync",
    icon: RefreshCw,
    body: "Fetches the programmes a station receives - features on an FTP server, shows dropped in a folder, podcast episodes, programmes sent as e-mail attachments - and puts each one on its cart, on schedule, verified.",
    needs: "Node.js 18 or newer (22 or 24 recommended), and one free local port for its status API. Its window needs nothing else.",
    manager: "Downloads it, checks its SHA-256, and runs its installer: a read-only preflight first, then an install that starts in shadow mode with every example job switched off, so nothing reaches a cart until you say so.",
    availability: "public",
    unavailable: "Not yet published - it appears here the moment it is.",
  },
  {
    pkg: "airsuite-library",
    name: "AirSuite Library",
    icon: Database,
    body: "The Library & Programming service: the station's format database and all of its scheduling - categories, clocks, rules, the day's log and its validation. AirSuite Production is a client of it.",
    needs: "Node.js 22.13 or newer (22 LTS or 24 LTS). Runs on the studio PC or on another PC on your network.",
    manager: "Downloads it, checks its SHA-256 and installs it for the current user. On first start it creates a fresh, empty database, and every timed or outward-facing feature - the nightly log, e-mail, off-site backup, legacy imports - stays off until you set it up.",
    availability: "public",
    unavailable: "Not yet published - it appears here the moment it is.",
  },
  {
    pkg: "airsuite-production",
    name: "AirSuite Production",
    icon: Mic,
    body: "The station's native Windows application: music scheduling, production, and the surfaces an operator touches on shift - the running log, hot keys, liners, voice tracking and the multitrack editor, with a guide on every page.",
    needs: "An AirSuite Library service for it to talk to - on this PC or another.",
    manager: "Installs it per user, with no administrator rights. On a PC without the library, it offers to install the library first, each download verified on its own.",
    availability: "public",
    unavailable: "Not yet published - it appears here the moment it is.",
  },
  {
    pkg: "airsuite-onair",
    name: "AirSuite On-Air",
    icon: Sliders,
    body: "The on-air player - decks, the cart wall, mic logic and the log running against the clock. It carries air at our flagship station today.",
    needs: "A dedicated on-air PC and an audio device for programme output, and Node.js 22.15 or newer (24 LTS recommended).",
    manager: "Downloads it, checks its SHA-256 and installs it for the current user, with no administrator rights. It arrives silent - no engine is started and no audio device is opened until you name one - and it starts nothing by itself. Nothing the Manager offers installs by itself: an update waits for a person to press Update.",
    availability: "public",
    unavailable: "Not yet published - it appears here the moment it is.",
  },
  {
    pkg: "studio-agent",
    name: "Studio Agent",
    icon: Cpu,
    body: "Runs headless beside each studio machine and reports now-playing, telemetry and the builds installed there.",
    needs: "PowerShell 5.1, on the studio LAN.",
    manager: "Shows it as installed when it finds it, but never downloads it: it carries your station's fleet credentials, so it is set up on your LAN.",
    availability: "lan",
    unavailable: "Installed on your studio LAN, not downloaded - it carries your station's credentials.",
  },
];

const PLANNED: { icon: LucideIcon; name: string; body: string }[] = [
  { icon: Headphones, name: "AirSuite Podcast", body: "Multi-room recording and the publishing chain, wired to the same content library." },
  { icon: Truck, name: "AirSuite Remote", body: "The road kit - the same surface on a laptop, for remotes and live events." },
  { icon: Monitor, name: "Screens & Signage", body: "Lobby displays, studio clocks and in-store reels from the same campaign calendar." },
];

/* ------------------------------------------------------------------ the read -- */

type Catalog = { status: "static" | "live" | "unreachable"; releases: Record<string, Release> };

const CatalogContext = createContext<Catalog>({ status: "static", releases: {} });

export function ReleaseCatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog>({ status: "static", releases: {} });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("bc_releases")
        .select("package, version, url, sha256, size_bytes, min_os, published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false });
      if (cancelled) return;
      if (error || !data) {
        setCatalog({ status: "unreachable", releases: {} });
        return;
      }
      const releases: Record<string, Release> = {};
      for (const row of data as {
        package: string;
        version: string;
        url: string | null;
        sha256: string | null;
        size_bytes: number | null;
        min_os: string | null;
      }[]) {
        // Newest published row with an artifact wins; a row without a URL is not a download.
        if (releases[row.package] || !row.url) continue;
        releases[row.package] = {
          version: row.version,
          sizeBytes: row.size_bytes,
          sha256: row.sha256,
          url: row.url,
          minOs: row.min_os,
        };
      }
      setCatalog({ status: "live", releases });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <CatalogContext.Provider value={catalog}>{children}</CatalogContext.Provider>;
}

/** The build a module offers right now: the registry's once it has answered, else the static fallback. */
function useRelease(m: ModuleDef): Release | null {
  const catalog = useContext(CatalogContext);
  if (catalog.status === "live") return catalog.releases[m.pkg] ?? null;
  return m.fallback ?? null;
}

/* --------------------------------------------------------------- formatting -- */

const fileName = (url: string) => decodeURIComponent(url.split("/").pop() ?? "");
// ?download= makes Storage answer Content-Disposition: attachment - the <a download>
// attribute is ignored on cross-origin links.
const downloadHref = (r: Release) => `${r.url}?download=${encodeURIComponent(fileName(r.url))}`;
const sha256Href = (r: Release) => r.url.replace(/\.zip$/i, ".sha256");
const size = (r: Release) =>
  r.sizeBytes ? `${(r.sizeBytes / 1048576).toFixed(1)} MB` : (r.sizeLabel ?? "");

const MANAGER = MANAGER_MODULE;

/* ------------------------------------------------------------------ pieces -- */

export function ManagerDownloadButton({ label }: { label: string }) {
  const r = useRelease(MANAGER);
  if (!r) return null;
  return (
    <a
      href={downloadHref(r)}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-signal px-6 py-3 text-sm font-semibold text-fg transition hover:bg-signal-soft sm:w-auto"
    >
      <ArrowDown className="h-4 w-4" aria-hidden />
      {label}
    </a>
  );
}

export function ManagerFacts() {
  const r = useRelease(MANAGER);
  if (!r) return null;
  return (
    <p className="mt-6 text-sm text-faint">
      v{r.version} · {size(r)} · Windows 10/11 64-bit · per-user
      install, no admin rights
    </p>
  );
}

function StatePill({ m, r }: { m: ModuleDef; r: Release | null }) {
  if (r)
    return (
      <a
        href={downloadHref(r)}
        className="inline-flex flex-none items-center gap-1.5 rounded-full bg-signal px-3.5 py-1.5 text-xs font-semibold text-fg transition hover:bg-signal-soft"
      >
        <ArrowDown className="h-3.5 w-3.5" aria-hidden />
        Download
        <span className="sr-only"> {m.name}</span>
      </a>
    );
  if (m.availability === "lan")
    return (
      <span className="inline-flex flex-none items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-faint">
        <Check className="h-3.5 w-3.5" aria-hidden />
        LAN install
      </span>
    );
  return (
    <span className="inline-flex flex-none items-center gap-1.5 rounded-full border border-signal/40 bg-signal/10 px-3 py-1.5 text-xs font-semibold text-signal-ink">
      <Clock className="h-3.5 w-3.5" aria-hidden />
      {m.availability === "public" ? "Coming" : m.availability === "review" ? "In review" : "Not yet"}
    </span>
  );
}

function ModuleCard({ m }: { m: ModuleDef }) {
  const r = useRelease(m);
  const Icon = m.icon;
  return (
    <li className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-start sm:px-6">
      <span
        className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-line bg-ink"
        aria-hidden
      >
        <Icon className="h-5 w-5 text-signal-ink" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="font-semibold">{m.name}</h3>
          {r ? (
            <span className="font-mono text-xs text-faint">
              v{r.version}
              {size(r) ? ` · ${size(r)}` : ""}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-dim">{m.body}</p>
        <dl className="mt-3 grid gap-2 text-sm leading-relaxed">
          <div>
            <dt className="inline font-semibold text-fg">Needs: </dt>
            <dd className="inline text-dim">{m.needs}</dd>
          </div>
          <div>
            <dt className="inline font-semibold text-fg">The Manager: </dt>
            <dd className="inline text-dim">{m.manager}</dd>
          </div>
          {!r && m.unavailable ? (
            <div>
              <dt className="sr-only">Availability</dt>
              <dd className="text-faint">{m.unavailable}</dd>
            </div>
          ) : null}
        </dl>
        {r?.sha256 ? (
          <p className="mt-3 text-[11px] leading-relaxed text-faint">
            SHA-256{" "}
            <a
              className="font-mono break-all text-dim underline decoration-line underline-offset-2 hover:text-fg"
              href={sha256Href(r)}
            >
              {r.sha256.slice(0, 16)}…
            </a>
          </p>
        ) : null}
      </div>
      <div className="sm:pt-0.5">
        <StatePill m={m} r={r} />
      </div>
    </li>
  );
}

export function ModuleList() {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-elevated">
      {MODULES.map((m) => (
        <ModuleCard key={m.pkg} m={m} />
      ))}
    </ul>
  );
}

function ReleaseRow({ m }: { m: ModuleDef }) {
  const r = useRelease(m);
  return (
    <tr className="border-t border-line align-top">
      <th scope="row" className="py-3 pr-4 text-left font-semibold whitespace-nowrap">
        {m.name}
      </th>
      <td className="py-3 pr-4 font-mono text-xs whitespace-nowrap">{r ? r.version : "-"}</td>
      <td className="py-3 pr-4 font-mono text-xs whitespace-nowrap">
        {r ? size(r) || "-" : "-"}
      </td>
      <td className="py-3 pr-4 font-mono text-[11px] text-dim">
        {r?.sha256 ? (
          <a className="underline decoration-line underline-offset-2 hover:text-fg" href={sha256Href(r)}>
            {r.sha256}
          </a>
        ) : (
          "-"
        )}
      </td>
      <td className="py-3 text-xs text-dim">{r ? (r.minOs ?? "Windows 10/11 64-bit") : "not published"}</td>
    </tr>
  );
}

export function ReleaseTable() {
  const catalog = useContext(CatalogContext);
  return (
    <div>
      {/* The table scrolls inside its own box on a phone; the page never does. */}
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface px-4 sm:px-6" role="region" aria-label="Release details" tabIndex={0}>
        <table className="w-full min-w-[46rem] text-sm">
          <caption className="sr-only">Every published build, with its checksum</caption>
          <thead>
            <tr className="text-left text-[11px] tracking-[0.14em] text-faint uppercase">
              <th scope="col" className="py-3 pr-4 font-medium">Module</th>
              <th scope="col" className="py-3 pr-4 font-medium">Version</th>
              <th scope="col" className="py-3 pr-4 font-medium">Download</th>
              <th scope="col" className="py-3 pr-4 font-medium">SHA-256</th>
              <th scope="col" className="py-3 font-medium">Runs on</th>
            </tr>
          </thead>
          <tbody>
            {MODULES.map((m) => (
              <ReleaseRow key={m.pkg} m={m} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-faint">
        {catalog.status === "live"
          ? "Read from the Broadcast Copy release registry just now - the same list the Manager's Updates window reads."
          : catalog.status === "unreachable"
            ? "The release registry could not be reached, so this shows the last builds this page was published with."
            : "Checking the release registry…"}
      </p>
    </div>
  );
}

/** The roadmap: named, never downloadable, never versioned. */
export function PlannedList() {
  return (
    <ul className="mt-4 grid gap-5 sm:grid-cols-3">
      {PLANNED.map((p) => {
        const Icon = p.icon;
        return (
          <li key={p.name} className="flex gap-3">
            <Icon className="mt-0.5 h-4 w-4 flex-none text-signal-ink" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{p.name}</p>
              <p className="mt-1 text-sm leading-relaxed text-dim">{p.body}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
