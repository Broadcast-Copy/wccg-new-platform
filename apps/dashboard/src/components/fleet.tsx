"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Cable,
  Check,
  Cpu,
  HardDrive,
  KeyRound,
  Loader2,
  Monitor,
  Network,
  Package,
  RadioTower,
  Server,
} from "lucide-react";
import {
  getFleet,
  getMyStations,
  getPairCodes,
  getReleases,
  issuePairCode,
} from "@/lib/data";
import type { FleetDevice, PairCode, Release, Station } from "@/lib/types";

/**
 * The command centre's fleet view.
 *
 * VISUAL LANGUAGE — borrowed from the broadcastcopy.ai dollhouse hero. That hero
 * draws a station as exploded isometric floor plates; a plant is genuinely
 * shaped that way (a production room, an on-air room, machines standing in
 * them), so the same geometry is used here rather than a flat table. Plates are
 * CSS transforms, not Three.js: this view has to stay readable at a glance on a
 * phone in a corridor, and a WebGL canvas is the wrong tool for that.
 *
 * HONESTY RULES, which the copy here exists to enforce:
 *  1. `last_seen` is when the CLOUD last heard. The hub is authoritative and
 *     keeps running without it, so a stale device is reported as "not reported"
 *     — never as "down". Saying "down" about a machine that is in fact playing
 *     to air is the single worst thing this screen could do.
 *  2. A watched process reading false is not automatically a fault. The agent
 *     reports whether a process runs, and cannot know whether it was meant to.
 *     Faults are only claimed where the device is marked critical.
 *  3. Phase 1 is read-only. Nothing here dispatches anything to a machine.
 */

const ROOM_ORDER = ["ON-AIR", "PRODUCTION", "STREAM", "OFFICE"];

/** Cloud silence past this is worth surfacing — not as "down", as "not heard". */
const STALE_MS = 5 * 60 * 1000;

function isStale(lastSeen: string | null): boolean {
  if (lastSeen === null) return true;
  return Date.now() - new Date(lastSeen).getTime() > STALE_MS;
}

function sinceLabel(iso: string | null): string {
  if (iso === null) return "never";
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.round(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.round(secs / 3600)}h ago`;
  return `${Math.round(secs / 86400)}d ago`;
}

const PERIPHERAL_ICON: Record<string, typeof Cable> = {
  audio: RadioTower,
  dante: Network,
  serial: Cable,
  storage: HardDrive,
  network: Network,
};

/* ------------------------------------------------------------ device card -- */

function DeviceCard({ device }: { device: FleetDevice }) {
  const stale = isStale(device.last_seen);
  const agent = device.agents[0];
  const watch = agent?.watch ?? {};
  const watched = Object.entries(watch);
  const down = watched.filter(([, running]) => !running);

  return (
    <div
      className={`rounded-xl border bg-elevated p-4 transition ${
        stale && device.is_critical
          ? "border-signal/50"
          : stale
            ? "border-line"
            : "border-line hover:border-dim/40"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-line bg-surface"
          aria-hidden
        >
          {device.is_critical ? (
            <RadioTower className="h-4.5 w-4.5 text-signal" />
          ) : (
            <Monitor className="h-4.5 w-4.5 text-dim" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className="truncate font-semibold">
              {device.display_name ?? device.hostname ?? device.device_key}
            </p>
            {device.is_critical && (
              <span className="rounded bg-signal/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-signal uppercase">
                On air
              </span>
            )}
          </div>
          {device.role !== null && (
            <p className="mt-0.5 truncate text-xs text-dim">{device.role}</p>
          )}
          <p className="mt-1 font-mono text-[11px] text-faint">
            {device.lan_ip ?? "—"}
            {device.aoip_ip !== null && ` · aoip ${device.aoip_ip}`}
          </p>
        </div>

        {/* Deliberately "reported", never "online" — see honesty rule 1. */}
        <span
          className={`flex-none rounded-full px-2 py-1 text-[10px] font-semibold tracking-wide uppercase ${
            stale
              ? "border border-line text-faint"
              : "bg-ok/10 text-ok"
          }`}
          title={
            stale
              ? "The cloud has not heard from this machine recently. It may still be running perfectly — the on-prem hub is authoritative."
              : "Reported recently"
          }
        >
          {stale ? "not reported" : sinceLabel(device.last_seen)}
        </span>
      </div>

      {watched.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
          {watched.map(([name, running]) => (
            <span
              key={name}
              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] ${
                running ? "bg-ok/10 text-ok" : "bg-surface text-faint"
              }`}
              title={
                running
                  ? `${name} is running`
                  : `${name} is not running. Whether that is a fault depends on whether it was meant to be.`
              }
            >
              {running ? (
                <Check className="h-3 w-3" aria-hidden />
              ) : (
                <span className="h-3 w-3 text-center leading-3" aria-hidden>
                  ·
                </span>
              )}
              {name.replace(/\.exe$/i, "")}
            </span>
          ))}
        </div>
      )}

      {/* Only claim a fault where it would actually matter. */}
      {device.is_critical && down.length > 0 && !stale && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-amber">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden />
          <span>
            {down.length} watched {down.length === 1 ? "process" : "processes"} not running on an
            on-air machine — confirm this is expected.
          </span>
        </p>
      )}

      {(device.peripherals.length > 0 || device.installs.length > 0) && (
        <div className="mt-3 grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
          {device.peripherals.length > 0 && (
            <div>
              <p className="text-[10px] tracking-[0.18em] text-faint uppercase">Peripherals</p>
              <ul className="mt-1.5 space-y-1">
                {device.peripherals.map((p) => {
                  const Icon = PERIPHERAL_ICON[p.kind] ?? Cpu;
                  return (
                    <li key={p.id} className="flex items-center gap-1.5 text-xs text-dim">
                      <Icon className="h-3.5 w-3.5 flex-none text-faint" aria-hidden />
                      <span className="truncate">{p.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {device.installs.length > 0 && (
            <div>
              <p className="text-[10px] tracking-[0.18em] text-faint uppercase">Installed</p>
              <ul className="mt-1.5 space-y-1">
                {device.installs.map((i) => (
                  <li key={i.id} className="flex items-center gap-1.5 text-xs text-dim">
                    <Package className="h-3.5 w-3.5 flex-none text-faint" aria-hidden />
                    <span className="truncate">{i.package}</span>
                    <span className="font-mono text-faint">{i.version ?? "?"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- room plate -- */

/**
 * One room as an isometric plate. The transform is the dollhouse's angle
 * (rotateX 54deg / rotateZ -45deg is the classic 2:1 isometric); the cards
 * themselves are counter-rotated back to flat so text stays readable — the
 * plate reads as a room, the content stays a list you can actually use.
 */
function RoomPlate({ room, devices }: { room: string; devices: FleetDevice[] }) {
  return (
    <section className="relative">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-px flex-1 bg-line" aria-hidden />
        <h2 className="text-[11px] font-semibold tracking-[0.18em] text-faint uppercase">
          {room}
        </h2>
        <span className="text-[11px] text-faint">
          {devices.length} {devices.length === 1 ? "machine" : "machines"}
        </span>
        <span className="h-px flex-1 bg-line" aria-hidden />
      </div>

      <div className="relative rounded-2xl border border-line bg-surface/60 p-4">
        {/* The plate: a hairline isometric floor under the cards. */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl opacity-[0.18]"
          aria-hidden
        >
          <div
            className="absolute -inset-x-1/4 top-1/2 h-[200%]"
            style={{
              transform: "rotateX(58deg) rotateZ(-45deg)",
              transformOrigin: "center top",
              backgroundImage:
                "linear-gradient(var(--color-line) 1px, transparent 1px), linear-gradient(90deg, var(--color-line) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        <div className="relative grid gap-3 sm:grid-cols-2">
          {devices.map((d) => (
            <DeviceCard key={d.device_id} device={d} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ pair codes --- */

function PairPanel({ station }: { station: Station | null }) {
  const [issued, setIssued] = useState<{ code: string; expires_at: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function issue() {
    if (station === null) return;
    setBusy(true);
    const result = await issuePairCode(station.id, "Fleet enrolment", 30);
    setIssued(result);
    setBusy(false);
  }

  return (
    <div className="rounded-2xl border border-line bg-elevated p-5">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4.5 w-4.5 text-signal" aria-hidden />
        <h2 className="font-semibold">Add a machine</h2>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-dim">
        Issue an authorisation code, then type it into the installer on the new machine. The code
        is single-use and expires in 30 minutes — it is a credential for joining your station, so
        it is deliberately short-lived.
      </p>

      {issued === null ? (
        <button
          type="button"
          onClick={issue}
          disabled={busy || station === null}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-signal px-4 py-2 text-sm font-semibold text-white transition hover:bg-signal-soft disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Issue authorisation code
        </button>
      ) : (
        <div className="mt-4">
          <p className="font-mono text-3xl font-semibold tracking-[0.2em] text-signal">
            {issued.code}
          </p>
          <p className="mt-2 text-xs text-faint">
            Expires {new Date(issued.expires_at).toLocaleTimeString()} · single use
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ page --- */

export function Fleet() {
  const [loading, setLoading] = useState(true);
  const [stations, setStations] = useState<Station[]>([]);
  const [stationId, setStationId] = useState<string | null>(null);
  const [devices, setDevices] = useState<FleetDevice[]>([]);
  const [codes, setCodes] = useState<PairCode[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [s, c, r] = await Promise.all([getMyStations(), getPairCodes(), getReleases()]);
      if (cancelled) return;
      setStations(s);
      setCodes(c);
      setReleases(r);
      setStationId((prev) => prev ?? s[0]?.id ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (stationId === null) return;
    let cancelled = false;
    void (async () => {
      const d = await getFleet(stationId);
      if (!cancelled) setDevices(d);
    })();
    return () => {
      cancelled = true;
    };
  }, [stationId]);

  const station = stations.find((s) => s.id === stationId) ?? null;
  const rooms = Array.from(new Set(devices.map((d) => d.room ?? "UNASSIGNED"))).sort(
    (a, b) => {
      const ai = ROOM_ORDER.indexOf(a);
      const bi = ROOM_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    },
  );
  const liveCodes = codes.filter(
    (c) =>
      c.claimed_at === null && c.revoked_at === null && new Date(c.expires_at) > new Date(),
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-16 text-dim">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading the plant…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Command centre</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-dim">
          Every machine in your plant, what is attached to it, and what is installed on it. Your
          studio hub stays in charge — this is a mirror of it, so nothing here can reach into a
          machine, and losing this page never costs you control of your own plant.
        </p>
      </header>

      {stations.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {stations.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStationId(s.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                s.id === stationId
                  ? "border-signal/40 bg-signal/10 font-semibold text-signal"
                  : "border-line text-dim hover:text-fg"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {devices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface/50 px-6 py-12 text-center">
          <Server className="mx-auto h-8 w-8 text-faint" aria-hidden />
          <p className="mt-3 font-semibold">No machines reported yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-dim">
            Your studio hub has not sent a fleet snapshot to the cloud yet. Machines appear here
            once it does — and they keep working whether it does or not.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {rooms.map((room) => (
            <RoomPlate
              key={room}
              room={room}
              devices={devices.filter((d) => (d.room ?? "UNASSIGNED") === room)}
            />
          ))}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <PairPanel station={station} />

        <div className="rounded-2xl border border-line bg-elevated p-5">
          <div className="flex items-center gap-2">
            <Package className="h-4.5 w-4.5 text-signal" aria-hidden />
            <h2 className="font-semibold">Downloads</h2>
          </div>
          {releases.length === 0 ? (
            <p className="mt-2 text-sm text-dim">No published releases yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {releases.map((r) => (
                <li key={r.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate">{r.title ?? r.package}</span>
                  <span className="flex-none font-mono text-xs text-faint">
                    {r.version}
                    {r.size_bytes !== null &&
                      ` · ${(r.size_bytes / 1024 / 1024).toFixed(1)} MB`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {liveCodes.length > 0 && (
        <p className="text-xs text-faint">
          {liveCodes.length} unclaimed authorisation{" "}
          {liveCodes.length === 1 ? "code" : "codes"} outstanding.
        </p>
      )}
    </div>
  );
}
