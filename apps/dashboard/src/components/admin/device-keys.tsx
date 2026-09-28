"use client";

import { Cpu } from "lucide-react";
import { listStationKeys } from "@/lib/admin";
import { useLoad } from "@/hooks/use-load";
import {
  Chip,
  EmptyState,
  ErrorBox,
  Notice,
  Refreshing,
  SectionHeader,
  Spinner,
  fmtDate,
  fmtDateTime,
  statusTone,
} from "@/components/admin/ui";

/**
 * Which stations hold an AirSuite device key, and since when. The key is the
 * credential a station's engine uses for its live heartbeat, fleet report and
 * now-playing feed; the RPC behind this (bc_admin_station_keys, migration 118)
 * never selects it, so it cannot appear here. There is deliberately no rotate
 * button: a new key would cut the station off until its engine is re-keyed.
 */
export function DeviceKeysSection() {
  const { state, reload } = useLoad(listStationKeys);

  return (
    <section className="space-y-5" aria-labelledby="device-keys-heading">
      <SectionHeader
        id="device-keys-heading"
        icon={Cpu}
        title="Station device keys"
        description="The credential each station's AirSuite engine reports with. Presence and dates only."
        actions={<Refreshing on={state.status === "ready" && state.refreshing} />}
      />
      <Notice tone="warn">
        The key value is never shown and cannot be rotated from here: the station&rsquo;s engine uses it for its live
        heartbeat, so a new key would disconnect it until someone re-keys the engine on site.
      </Notice>
      {state.status === "loading" && <Spinner label="Loading device keys" />}
      {state.status === "error" && <ErrorBox title="Could not load device keys." message={state.message} onRetry={reload} />}
      {state.status === "ready" &&
        (state.value.length === 0 ? (
          <EmptyState>No stations yet.</EmptyState>
        ) : (
          <ul className="space-y-2" aria-label="Station device keys">
            {state.value.map((row) => (
              <li
                key={row.station_id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line bg-surface p-4 text-sm"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-fg">{row.call_sign ?? row.station_name}</span>
                    <Chip tone={statusTone(row.station_status)}>{row.station_status}</Chip>
                  </p>
                  <p className="mt-0.5 break-words text-dim">
                    {row.station_name} · {row.org_name}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-1">
                  <div>
                    <dt className="text-xs tracking-wide text-faint uppercase">Device key</dt>
                    <dd>{row.has_key ? <Chip tone="ok">since {fmtDate(row.key_created_at)}</Chip> : <Chip tone="muted">none</Chip>}</dd>
                  </div>
                  <div>
                    <dt className="text-xs tracking-wide text-faint uppercase">Engine last reported</dt>
                    <dd className="text-fg">
                      {row.engine_seen_at ? fmtDateTime(row.engine_seen_at) : "Never"}
                      {row.engine_version ? ` · v${row.engine_version}` : ""}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        ))}
    </section>
  );
}
