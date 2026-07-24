"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Loader2,
  RadioTower,
  Save,
} from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import {
  getMyEntitlements,
  getMyOrganizations,
  getMyStations,
} from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/use-session";
import type { Entitlement, Organization, Station } from "@/lib/types";
import { activeFeatures, cx } from "@/lib/format";

/**
 * Account settings: rename the organization (owner only, via bc_update_org,
 * migration 101) and review each station's plan + entitlements. Billing is
 * intentionally read-only for now — accounts are free during early access.
 */

type StationPlan = { station: Station; entitlement: Entitlement | undefined };
type OrgBlock = { org: Organization; isOwner: boolean; stations: StationPlan[] };

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; blocks: OrgBlock[] };

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "error"; message: string }
  | { status: "saved" };

const FIELD =
  "w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-fg placeholder:text-faint outline-none transition focus:border-signal/60 focus:ring-2 focus:ring-signal/20";
const LABEL = "block text-xs font-medium tracking-wide text-dim uppercase";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function OrgSettings({
  block,
  onRenamed,
}: {
  block: OrgBlock;
  onRenamed: (name: string) => void;
}) {
  const { org, isOwner, stations } = block;
  const [save, setSave] = useState<SaveState>({ status: "idle" });

  async function handleRename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (save.status === "saving") return;
    const form = event.currentTarget;
    const name = String(new FormData(form).get("name") ?? "").trim();
    if (name === "" || name === org.name) {
      setSave({ status: "idle" });
      return;
    }
    setSave({ status: "saving" });
    const { data, error } = await supabase.rpc("bc_update_org", {
      p_org_id: org.id,
      p_name: name,
    });
    if (error) {
      setSave({
        status: "error",
        message: error.code === "42501" ? "Only the owner can rename this organization." : error.message,
      });
      return;
    }
    if (data !== null) onRenamed((data as Organization).name);
    setSave({ status: "saved" });
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-line bg-surface p-5">
        <h2 className="flex items-center gap-2 text-sm font-medium tracking-wider text-faint uppercase">
          <Building2 className="h-4 w-4" aria-hidden />
          Organization
        </h2>

        {isOwner ? (
          <form onSubmit={handleRename} className="mt-4 flex flex-wrap items-end gap-2">
            <div className="min-w-[14rem] flex-1 space-y-1.5">
              <label className={LABEL} htmlFor={`name-${org.id}`}>
                Name
              </label>
              <input id={`name-${org.id}`} name="name" defaultValue={org.name} className={FIELD} />
            </div>
            <button
              type="submit"
              disabled={save.status === "saving"}
              className="inline-flex items-center gap-1.5 rounded-lg bg-signal px-3 py-2 text-sm font-medium text-fg transition-colors hover:bg-signal-soft disabled:opacity-60"
            >
              {save.status === "saving" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Save className="h-4 w-4" aria-hidden />
              )}
              Save
            </button>
          </form>
        ) : (
          <p className="mt-3 text-lg font-semibold">{org.name}</p>
        )}

        {save.status === "error" && (
          <p className="mt-2 flex items-start gap-2 text-sm text-signal-soft">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {save.message}
          </p>
        )}
        {save.status === "saved" && (
          <p className="mt-2 flex items-center gap-2 text-sm text-ok">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Saved.
          </p>
        )}

        <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs tracking-wide text-faint uppercase">Slug</dt>
            <dd className="mt-0.5 font-mono text-sm text-dim">{org.slug}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-faint uppercase">Status</dt>
            <dd className="mt-0.5 text-sm text-fg capitalize">{org.status}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-faint uppercase">Created</dt>
            <dd className="mt-0.5 text-sm text-fg">{fmtDate(org.created_at)}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-line bg-surface p-5">
        <h2 className="text-sm font-medium tracking-wider text-faint uppercase">
          Plans &amp; billing
        </h2>
        <p className="mt-2 text-sm text-dim">
          Accounts are free during early access — you&rsquo;re billed per licensed
          station once you go live. To change a plan, reach out and we&rsquo;ll
          set it up.
        </p>

        {stations.length === 0 ? (
          <p className="mt-4 text-sm text-faint">No stations on this organization yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {stations.map(({ station, entitlement }) => {
              const features = activeFeatures(entitlement?.features);
              return (
                <li
                  key={station.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-ink px-4 py-3"
                >
                  <div className="flex items-center gap-2.5">
                    <RadioTower className="h-4 w-4 text-signal" aria-hidden />
                    <span className="font-medium text-fg">
                      {station.call_sign !== null && station.call_sign.length > 0
                        ? station.call_sign
                        : station.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="rounded bg-elevated px-1.5 py-0.5 text-xs font-medium text-dim capitalize">
                      {entitlement !== undefined ? entitlement.plan : "no plan"}
                    </span>
                    <span className="text-faint">
                      {features.length} feature{features.length === 1 ? "" : "s"}
                    </span>
                    <span
                      className={cx(
                        "text-xs capitalize",
                        entitlement?.status === "active" ? "text-ok" : "text-faint",
                      )}
                    >
                      {entitlement?.status ?? "—"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function Settings() {
  const session = useSession();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const uid = session.status === "authed" ? session.session.user.id : null;
      const [orgs, stations, entitlements] = await Promise.all([
        getMyOrganizations(),
        getMyStations(),
        getMyEntitlements(),
      ]);

      const entByStation = new Map<string, Entitlement>();
      for (const entitlement of entitlements) {
        if (!entByStation.has(entitlement.station_id)) {
          entByStation.set(entitlement.station_id, entitlement);
        }
      }

      const blocks: OrgBlock[] = [];
      for (const org of orgs) {
        const roster = await supabase.rpc("bc_org_team", { p_org_id: org.id });
        if (roster.error) {
          if (!cancelled) setState({ status: "error", message: roster.error.message });
          return;
        }
        const members = (roster.data ?? []) as Array<{ user_id: string; role: string }>;
        const isOwner = members.some((m) => m.user_id === uid && m.role === "owner");
        const orgStations: StationPlan[] = stations
          .filter((s) => s.org_id === org.id)
          .map((station) => ({ station, entitlement: entByStation.get(station.id) }));
        blocks.push({ org, isOwner, stations: orgStations });
      }
      if (!cancelled) setState({ status: "ready", blocks });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status]);

  function renameOrg(orgId: string, name: string) {
    setState((prev) =>
      prev.status === "ready"
        ? {
            status: "ready",
            blocks: prev.blocks.map((b) =>
              b.org.id === orgId ? { ...b, org: { ...b.org, name } } : b,
            ),
          }
        : prev,
    );
  }

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
          <p className="font-medium">Could not load settings.</p>
          <p className="text-amber/80">{state.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      {state.blocks.length === 0 && (
        <p className="text-sm text-dim">You&rsquo;re not a member of any organization yet.</p>
      )}
      {state.blocks.map((block) => (
        <OrgSettings
          key={block.org.id}
          block={block}
          onRenamed={(name) => renameOrg(block.org.id, name)}
        />
      ))}
    </div>
  );
}

export default function Page() {
  return (
    <AuthGuard>
      <AppShell>
        <Settings />
      </AppShell>
    </AuthGuard>
  );
}
