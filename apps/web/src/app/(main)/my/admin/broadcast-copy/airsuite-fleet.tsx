"use client";

import { useCallback, useEffect, useState } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Badge } from "@/components/ui/badge";
import { Activity, Music2, Radio, ServerCog, ShieldAlert } from "lucide-react";

// ---------------------------------------------------------------------------
// AirSuite fleet panel — live engine telemetry pushed by each station's
// on-prem AirSuite supervisor (see airsuite_station_status, mig 099) plus the
// public real-air now-playing feed (station_now_playing, mig 100).
// airsuite_station_status SELECT is platform-admin gated by RLS, same as
// bc_leads — a denied read renders a hint instead of an empty panel.
// ---------------------------------------------------------------------------

type EngineAlert = { level?: string; text?: string };

type EngineStatus = {
  host?: string;
  mode?: string;
  muted?: boolean;
  rendererAlive?: boolean;
  current?: {
    cart?: number | null;
    title?: string | null;
    posSec?: number;
    durSec?: number;
  } | null;
  log?: { date?: string; count?: number } | null;
  cache?: { count?: number; bytes?: number } | null;
  alerts?: EngineAlert[];
  uptimeSec?: number;
};

type FleetRow = {
  station_id: string;
  updated_at: string;
  engine_version: string | null;
  status: EngineStatus | null;
};

type NowPlayingRow = {
  station_id: string;
  updated_at: string;
  artist: string | null;
  title: string | null;
  next_artist: string | null;
  next_title: string | null;
  source: string | null;
};

const STALE_MS = 2 * 60 * 1000;

function ago(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${(s / 3600).toFixed(1)}h ago`;
}

function mmss(sec: number | undefined): string {
  if (sec == null || Number.isNaN(sec)) return "—";
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function AirSuiteFleet() {
  const { supabase } = useSupabase();
  const [fleet, setFleet] = useState<FleetRow[]>([]);
  const [nowPlaying, setNowPlaying] = useState<NowPlayingRow[]>([]);
  const [statusDenied, setStatusDenied] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchFleet = useCallback(async () => {
    const [st, np] = await Promise.all([
      supabase.from("airsuite_station_status").select("*"),
      supabase.from("station_now_playing").select("*"),
    ]);
    if (st.error) setStatusDenied(true);
    else {
      setStatusDenied(false);
      setFleet((st.data ?? []) as FleetRow[]);
    }
    if (!np.error) setNowPlaying((np.data ?? []) as NowPlayingRow[]);
    setLoaded(true);
  }, [supabase]);

  useEffect(() => {
    void fetchFleet();
    const t = setInterval(() => void fetchFleet(), 30_000);
    return () => clearInterval(t);
  }, [fetchFleet]);

  if (!loaded) return null;

  const stations = new Set<string>([
    ...fleet.map((f) => f.station_id),
    ...nowPlaying.map((n) => n.station_id),
  ]);

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2">
        <ServerCog className="h-5 w-5 text-[#a855f7]" />
        <h2 className="text-lg font-semibold">AirSuite fleet</h2>
        <span className="text-xs text-muted-foreground">
          broadcast automation — live from each station&apos;s engine
        </span>
      </div>

      {stations.size === 0 && (
        <div className="mt-3 rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          {statusDenied ? (
            <span className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[#f59e0b]" />
              Fleet telemetry is visible to platform admins only.
            </span>
          ) : (
            "No engines reporting yet."
          )}
        </div>
      )}

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {[...stations].sort().map((id) => {
          const f = fleet.find((x) => x.station_id === id);
          const np = nowPlaying.find((x) => x.station_id === id);
          const s = f?.status ?? null;
          const fresh = f ? Date.now() - new Date(f.updated_at).getTime() < STALE_MS : false;
          return (
            <div key={id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-[#a855f7]" />
                  <span className="font-semibold">{id}</span>
                  {f?.engine_version && (
                    <span className="text-xs text-muted-foreground">v{f.engine_version}</span>
                  )}
                </div>
                {f ? (
                  <Badge
                    variant="outline"
                    className={
                      fresh
                        ? "border-[#10b981]/40 bg-[#10b981]/15 text-[#34d399]"
                        : "border-[#ef4444]/40 bg-[#ef4444]/15 text-[#f87171]"
                    }
                  >
                    {fresh ? "ENGINE ONLINE" : "ENGINE STALE"}
                  </Badge>
                ) : (
                  <Badge variant="outline">no engine telemetry</Badge>
                )}
              </div>

              {np && (np.artist || np.title) && (
                <div className="mt-3 flex items-start gap-2 text-sm">
                  <Music2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <span className="font-medium">
                      {np.artist} — {np.title}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      on air ({np.source ?? "live"}) · {ago(np.updated_at)}
                    </span>
                    {np.next_title && (
                      <p className="text-xs text-muted-foreground">
                        next: {np.next_artist ? `${np.next_artist} — ` : ""}
                        {np.next_title}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {s && (
                <>
                  <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                    <Badge variant="outline">{(s.mode ?? "?").toUpperCase()}</Badge>
                    <Badge variant="outline">
                      {s.muted ? "MUTED SHADOW" : "UNMUTED"}
                    </Badge>
                    <Badge variant="outline">
                      renderer {s.rendererAlive ? "live" : "down"}
                    </Badge>
                    {s.log?.date && (
                      <Badge variant="outline">
                        log {s.log.date} · {s.log.count ?? "?"} items
                      </Badge>
                    )}
                    {s.cache && (
                      <Badge variant="outline">
                        cache {s.cache.count ?? 0} files ·{" "}
                        {Math.round((s.cache.bytes ?? 0) / 1e6)} MB
                      </Badge>
                    )}
                  </div>
                  {s.current?.title != null && (
                    <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <Activity className="h-4 w-4 shrink-0" />
                      engine deck: {s.current.title} ({mmss(s.current.posSec)} /{" "}
                      {mmss(s.current.durSec)})
                    </p>
                  )}
                  {(s.alerts ?? []).slice(0, 3).map((a, i) => (
                    <p key={i} className="mt-1 text-xs text-[#fbbf24]">
                      ⚠ {a.text}
                    </p>
                  ))}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
