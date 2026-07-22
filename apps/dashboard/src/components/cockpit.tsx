"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
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
} from "@/lib/data";
import type {
  Entitlement,
  Organization,
  Station,
  StationDomain,
} from "@/lib/types";

/**
 * Authenticated cockpit. Loads the four control-plane reads on mount and joins
 * entitlements + domains onto stations by station_id, in memory. RLS already
 * scopes every read to the logged-in member (see src/lib/data.ts).
 */

type CockpitData = {
  organizations: Organization[];
  stations: Station[];
  entitlements: Entitlement[];
  domains: StationDomain[];
};

/** Load state as a discriminated union — no isLoading/hasError boolean soup. */
type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: CockpitData };

/** Known feature-flag labels; anything else is title-cased at render time. */
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

/** "FM · 104.5" — drops either half if the station lacks it. */
function bandFrequency(station: Station): string | null {
  const parts = [station.band, station.frequency].filter(
    (part): part is string => part !== null && part.length > 0,
  );
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** is_primary wins; otherwise the first domain, if any. */
function pickPrimaryDomain(
  domains: StationDomain[],
): StationDomain | undefined {
  return domains.find((domain) => domain.is_primary) ?? domains[0];
}

/** Feature keys whose flag is true, in declared order. */
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

function OrgHeader({ org }: { org: Organization }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-elevated text-dim">
        <Building2 className="h-4 w-4" aria-hidden />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight text-fg">
        {org.name}
      </h1>
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
};

function StationCard({
  station,
  entitlement,
  primaryDomain,
  features,
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
            {hasCallSign && (
              <div className="text-sm text-dim">{station.name}</div>
            )}
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

      <div className="mt-auto pt-1">
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
      <p className="mt-3 text-sm text-dim">
        No stations yet — request your first station.
      </p>
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
        const [organizations, stations, entitlements, domains] =
          await Promise.all([
            getMyOrganizations(),
            getMyStations(),
            getMyEntitlements(),
            getStationDomains(),
          ]);
        if (cancelled) return;
        setState({
          status: "ready",
          data: { organizations, stations, entitlements, domains },
        });
      } catch (error: unknown) {
        if (cancelled) return;
        const message =
          error instanceof Error
            ? error.message
            : "Could not load your control plane.";
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

  const { organizations, stations, entitlements, domains } = state.data;

  // Join entitlements + domains onto stations in memory, keyed by station_id.
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

  return (
    <div className="space-y-10">
      {organizations.length > 0 && (
        <section className="space-y-4">
          {organizations.map((org) => (
            <OrgHeader key={org.id} org={org} />
          ))}
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium uppercase tracking-wider text-faint">
            Your stations
          </h2>
          {stations.length > 0 && (
            <RequestStationLink label="Request another station" />
          )}
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
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
