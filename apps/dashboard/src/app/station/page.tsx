"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RadioTower,
  Save,
} from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import {
  getMyEntitlements,
  getMyStations,
  getStationDomains,
} from "@/lib/data";
import { supabase } from "@/lib/supabase";
import type { Entitlement, Station, StationDomain } from "@/lib/types";
import { activeFeatures, bandFrequency, cx, prettyFeature } from "@/lib/format";

const FIELD =
  "w-full rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-fg placeholder:text-faint outline-none transition focus:border-signal/60 focus:ring-2 focus:ring-signal/20";
const LABEL = "block text-xs font-medium tracking-wide text-dim uppercase";

type Detail = {
  station: Station;
  entitlement: Entitlement | undefined;
  domains: StationDomain[];
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "notfound" }
  | { status: "ready"; detail: Detail };

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

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs tracking-wide text-faint uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm text-fg">
        {value !== null && value.length > 0 ? value : "—"}
      </dd>
    </div>
  );
}

type SettingsState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string }
  | { status: "saved" };

function SettingsForm({
  station,
  onSaved,
}: {
  station: Station;
  onSaved: (updated: Station) => void;
}) {
  const [state, setState] = useState<SettingsState>({ status: "idle" });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status === "submitting") return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const market = String(data.get("market") ?? "").trim();
    const timezone = String(data.get("timezone") ?? "").trim();

    setState({ status: "submitting" });
    const { data: updated, error } = await supabase.rpc("bc_update_station", {
      p_station_id: station.id,
      p_name: name,
      p_market: market === "" ? null : market,
      p_timezone: timezone === "" ? null : timezone,
    });

    if (error) {
      const denied = error.code === "42501";
      setState({
        status: "error",
        message: denied
          ? "Only owners and managers can edit station settings."
          : error.message,
      });
      return;
    }
    if (updated !== null) onSaved(updated as Station);
    setState({ status: "saved" });
  }

  const submitting = state.status === "submitting";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-line bg-surface p-5"
    >
      <h2 className="text-sm font-medium tracking-wider text-faint uppercase">
        Settings
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-3">
          <label className={LABEL} htmlFor="name">
            Station name
          </label>
          <input
            id="name"
            name="name"
            className={FIELD}
            defaultValue={station.name}
          />
        </div>
        <div className="space-y-1.5">
          <label className={LABEL} htmlFor="market">
            Market
          </label>
          <input
            id="market"
            name="market"
            className={FIELD}
            defaultValue={station.market ?? ""}
            placeholder="Fayetteville, NC"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className={LABEL} htmlFor="timezone">
            Timezone
          </label>
          <input
            id="timezone"
            name="timezone"
            className={FIELD}
            defaultValue={station.timezone ?? ""}
            placeholder="America/New_York"
          />
        </div>
      </div>

      {state.status === "error" && (
        <p className="mt-3 flex items-start gap-2 text-sm text-signal-soft">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {state.message}
        </p>
      )}
      {state.status === "saved" && (
        <p className="mt-3 flex items-center gap-2 text-sm text-ok">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
          Saved.
        </p>
      )}

      <div className="mt-4">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-signal px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-signal-soft disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Save className="h-4 w-4" aria-hidden />
          )}
          {submitting ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function StationDetail() {
  const params = useSearchParams();
  const id = params.get("id");
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (id === null || id === "") {
        if (!cancelled) setState({ status: "notfound" });
        return;
      }
      const [stations, entitlements, domains] = await Promise.all([
        getMyStations(),
        getMyEntitlements(),
        getStationDomains(),
      ]);
      if (cancelled) return;
      const station = stations.find((candidate) => candidate.id === id);
      if (station === undefined) {
        setState({ status: "notfound" });
        return;
      }
      setState({
        status: "ready",
        detail: {
          station,
          entitlement: entitlements.find((e) => e.station_id === id),
          domains: domains.filter((d) => d.station_id === id),
        },
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

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
        <p>{state.message}</p>
      </div>
    );
  }

  if (state.status === "notfound") {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface/50 px-6 py-14 text-center">
        <RadioTower className="mx-auto h-8 w-8 text-faint" aria-hidden />
        <p className="mt-3 text-sm text-dim">
          Station not found in your account.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-signal-soft hover:text-signal"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to your stations
        </Link>
      </div>
    );
  }

  const { station, entitlement, domains } = state.detail;
  const features = activeFeatures(entitlement?.features);
  const freq = bandFrequency(station.band, station.frequency);

  return (
    <div className="space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-dim transition-colors hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to your stations
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-elevated text-signal">
          <RadioTower className="h-5 w-5" aria-hidden />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">
          {station.call_sign !== null && station.call_sign.length > 0
            ? station.call_sign
            : station.name}
        </h1>
        <StatusBadge status={station.status} />
      </div>

      <div className="rounded-xl border border-line bg-surface p-5">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Name" value={station.name} />
          <Field label="Band / freq" value={freq} />
          <Field label="Market" value={station.market} />
          <Field label="Timezone" value={station.timezone} />
          <Field label="Status" value={station.status} />
          <Field label="Public" value={station.is_public ? "Yes" : "No"} />
        </dl>

        <div className="mt-5 flex items-center gap-2 text-sm">
          <span className="text-faint">Plan</span>
          <span className="rounded bg-elevated px-1.5 py-0.5 text-xs font-medium text-dim capitalize">
            {entitlement !== undefined ? entitlement.plan : "None"}
          </span>
        </div>

        {features.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
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

        <div className="mt-5">
          <div className="text-xs tracking-wide text-faint uppercase">
            Domains
          </div>
          {domains.length === 0 ? (
            <p className="mt-1 text-sm text-faint">No domain yet.</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {domains
                .slice()
                .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
                .map((domain) => (
                  <li key={domain.id}>
                    <a
                      href={`https://${domain.hostname}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-signal-soft transition-colors hover:text-signal"
                    >
                      {domain.hostname}
                      {domain.is_primary && (
                        <span className="text-[10px] text-faint">(primary)</span>
                      )}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>

      <SettingsForm
        station={station}
        onSaved={(updated) =>
          setState({ status: "ready", detail: { ...state.detail, station: updated } })
        }
      />
    </div>
  );
}

export default function Page() {
  return (
    <AuthGuard>
      <AppShell>
        <Suspense
          fallback={
            <div className="grid place-items-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-faint" aria-hidden />
            </div>
          }
        >
          <StationDetail />
        </Suspense>
      </AppShell>
    </AuthGuard>
  );
}
