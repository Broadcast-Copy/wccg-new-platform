"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Building2,
  ExternalLink,
  Loader2,
  MapPin,
  Plus,
  RadioTower,
} from "lucide-react";
import {
  getMyEntitlements,
  getMyOrganizations,
  getMyStations,
  getStationDomains,
  getStationEngines,
} from "@/lib/data";
import type {
  EngineStatus,
  Entitlement,
  Organization,
  Station,
  StationDomain,
} from "@/lib/types";
import { isEngineOnline, summarizeEngine } from "@/lib/engine";

/**
 * Authenticated cockpit. Loads the control-plane reads on mount and joins
 * entitlements + domains + engine status onto stations by station_id, in
 * memory. RLS scopes every read to the logged-in member (see src/lib/data.ts);
 * engine status comes through the member-authorized bc_station_engines RPC.
 */

type CockpitData = {
  organizations: Organization[];
  stations: Station[];
  entitlements: Entitlement[];
  domains: StationDomain[];
  engines: EngineStatus[];
};

/** Load state as a discriminated union — no isLoading/hasError boolean soup. */
type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: CockpitData };

const FEATURE_LABELS = new Map<string, string>([
  ["record_pool", "Record pool"],
  ["eas", "EAS"],
  ["dsp", "DSP"],
  ["agentic_ai", "Agentic AI"],
]);

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part)).join(" ");
}

function prettyFeature(key: string): string {
  const known = FEATURE_LABELS.get(key);
  if (known !== undefined) return known;
  return key
    .split(/[_\s]+/)
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function bandFrequency(station: Station): string | null {
  const parts = [station.band, station.frequency].filter(
    (part): part is string => part !== null && part.length > 0,
  );
  return parts.length > 0 ? parts.join(" · ") : null;
}

function pickPrimaryDomain(domains: StationDomain[]): StationDomain | undefined {
  return domains.find((domain) => domain.is_primary) ?? domains[0];
}

function activeFeatures(entitlement: Entitlement | undefined): string[] {
  if (entitlement === undefined) return [];
  return Object.entries(entitlement.features)
    .filter(([, value]) => value === true)
    .map(([key]) => key);
}

function StatusBadge({ status }: { status: string }) {
  const active = status === "active";
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        active ? "bg-ok/15 text-ok" : "bg-amber/15 text-amber",
      )}
    >
      <span
        className={cx("h-1.5 w-1.5 rounded-full", active ? "bg-ok" : "bg-amber")}
        aria-hidden
      />
      {status}
    </span>
  );
}

/** Compact "is the engine live" line, from the AirSuite heartbeat. */
function EngineLine({ engine }: { engine: EngineStatus | undefined }) {
  if (engine === undefined) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-faint">
        <Activity className="h-3.5 w-3.5" aria-hidden />
        No engine paired
      </span>
    );
  }
  const online = isEngineOnline(engine.updated_at);
  const { currentTitle } = summarizeEngine(engine.status);
  return (
    <span className={cx("inline-flex items-center gap-1.5 text-xs", online ? "text-ok" : "text-faint")}>
      <span className={cx("h-1.5 w-1.5 rounded-full", online ? "bg-ok" : "bg-faint")} aria-hidden />
      {online ? "Engine live" : "Engine offline"}
      {engine.engine_version !== null && <span className="text-faint">· v{engine.engine_version}</span>}
      {online && currentTitle !== null && (
        <span className="truncate text-dim">· ♪ {currentTitle}</span>
      )}
    </span>
  );
}

function OrgHeader({ org }: { org: Organization }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-elevated text-dim">
        <Building2 className="h-4 w-4" aria-hidden />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight text-fg">{org.name}</h1>
      <StatusBadge status={org.status} />
      <span className="font-mono text-sm text-faint">{org.slug}</span>
    </div>
  );
}

type StationCardProps = {
  station: Station;
  entitlement: Entitlement | undefined;
  primaryDomain: StationDomain | undefined;
  features: string[];
  engine: EngineStatus | undefined;
};

function StationCard({
  station,
  entitlement,
  primaryDomain,
  features,
  engine,
}: StationCardProps) {
  const freq = bandFrequency(station);
  const hasCallSign = station.call_sign !== null && station.call_sign.length > 0;

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5 transition-colors hover:bg-elevated">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-elevated text-signal">
            <RadioTower className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <div className="font-semibold leading-tight text-fg">
              {hasCallSign ? station.call_sign : station.name}
            </div>
            {hasCallSign && <div className="text-sm text-dim">{station.name}</div>}
          </div>
        </div>
        <StatusBadge status={station.status} />
      </div>

      {(freq !== null || station.market !== null) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-dim">
          {freq !== null && <span className="font-mono text-fg">{freq}</span>}
          {freq !== null && station.market !== null && (
            <span className="text-faint" aria-hidden>
              ·
            </span>
          )}
          {station.market !== null && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-faint" aria-hidden />
              {station.market}
            </span>
          )}
        </div>
      )}

      <EngineLine engine={engine} />

      <div className="flex items-center gap-2 text-sm">
        <span className="text-faint">Plan</span>
        <span className="rounded bg-elevated px-1.5 py-0.5 text-xs font-medium capitalize text-dim">
          {entitlement !== undefined ? entitlement.plan : "None"}
        </span>
      </div>

      {features.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {features.map((feature) => (
            <span
              key={feature}
              className="rounded-md border border-line bg-elevated px-2 py-0.5 text-[11px] text-dim"
            >
              {prettyFeature(feature)}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        {primaryDomain !== undefined ? (
          <a
            href={`https://${primaryDomain.hostname}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-signal-soft transition-colors hover:text-signal"
          >
            {primaryDomain.hostname}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        ) : (
          <span className="text-sm text-faint">No domain yet</span>
        )}
        <Link
          href={`/station?id=${station.id}`}
          className="shrink-0 text-sm text-dim transition-colors hover:text-fg"
        >
          Settings →
        </Link>
      </div>
    </article>
  );
}

function RequestStationLink({ label }: { label: string }) {
  return (
    <Link
      href="/request"
      className="inline-flex items-center gap-1.5 rounded-lg bg-signal px-3 py-1.5 text-sm font-medium text-fg transition-colors hover:bg-signal-soft"
    >
      <Plus className="h-4 w-4" aria-hidden />
      {label}
    </Link>
  );
}

function EmptyStations() {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface/50 px-6 py-14 text-center">
      <RadioTower className="mx-auto h-8 w-8 text-faint" aria-hidden />
      <p className="mt-3 text-sm text-dim">No stations yet — request your first station.</p>
      <div className="mt-4 flex justify-center">
        <RequestStationLink label="Request a station" />
      </div>
    </div>
  );
}

export function Cockpit() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [organizations, stations, entitlements, domains, engines] =
          await Promise.all([
            getMyOrganizations(),
            getMyStations(),
            getMyEntitlements(),
            getStationDomains(),
            getStationEngines(),
          ]);
        if (cancelled) return;
        setState({
          status: "ready",
          data: { organizations, stations, entitlements, domains, engines },
        });
      } catch (error: unknown) {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Could not load your control plane.";
        setState({ status: "error", message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-faint" aria-hidden />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div>
          <p className="font-medium">Could not load your control plane.</p>
          <p className="text-amber/80">{state.message}</p>
        </div>
      </div>
    );
  }

  const { organizations, stations, entitlements, domains, engines } = state.data;

  // Join entitlements + domains + engines onto stations in memory by station_id.
  const entitlementByStation = new Map<string, Entitlement>();
  for (const entitlement of entitlements) {
    if (!entitlementByStation.has(entitlement.station_id)) {
      entitlementByStation.set(entitlement.station_id, entitlement);
    }
  }

  const domainsByStation = new Map<string, StationDomain[]>();
  for (const domain of domains) {
    const existing = domainsByStation.get(domain.station_id);
    if (existing !== undefined) existing.push(domain);
    else domainsByStation.set(domain.station_id, [domain]);
  }

  const engineByStation = new Map<string, EngineStatus>();
  for (const engine of engines) {
    if (!engineByStation.has(engine.station_id)) {
      engineByStation.set(engine.station_id, engine);
    }
  }

  return (
    <div className="space-y-10">
      {organizations.length > 0 ? (
        <section className="space-y-4">
          {organizations.map((org) => (
            <OrgHeader key={org.id} org={org} />
          ))}
        </section>
      ) : (
        <div className="rounded-xl border border-dashed border-line bg-surface/50 px-6 py-10 text-center">
          <Building2 className="mx-auto h-8 w-8 text-faint" aria-hidden />
          <p className="mt-3 text-sm text-dim">Finish setting up your account.</p>
          <div className="mt-4 flex justify-center">
            <Link
              href="/welcome"
              className="inline-flex items-center gap-1.5 rounded-lg bg-signal px-3 py-1.5 text-sm font-medium text-fg transition-colors hover:bg-signal-soft"
            >
              Create your organization
            </Link>
          </div>
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium uppercase tracking-wider text-faint">
            Your stations
          </h2>
          {stations.length > 0 && <RequestStationLink label="Request another station" />}
        </div>

        {stations.length === 0 ? (
          <EmptyStations />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {stations.map((station) => {
              const entitlement = entitlementByStation.get(station.id);
              const stationDomains = domainsByStation.get(station.id) ?? [];
              return (
                <StationCard
                  key={station.id}
                  station={station}
                  entitlement={entitlement}
                  primaryDomain={pickPrimaryDomain(stationDomains)}
                  features={activeFeatures(entitlement)}
                  engine={engineByStation.get(station.id)}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
