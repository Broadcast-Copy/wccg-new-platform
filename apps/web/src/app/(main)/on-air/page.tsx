"use client";

/**
 * /on-air — public full-screen now-playing ticker.
 *
 * Designed to be projected on a TV in the lobby or studio. Auto-refreshes
 * every 8s. No auth required.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Disc3, Radio, Signal, Users } from "lucide-react";

interface OnAirResponse {
  nowPlaying: {
    title: string | null;
    artist: string | null;
    album: string | null;
    artUrl: string | null;
    source: string | null;
    startedAt: string | null;
  } | null;
  currentShow: { title: string | null; djSlug: string | null } | null;
  signalStatus: "on_air" | "silent" | "off_air" | "unknown";
  listeners: number | null;
  lastMetadataAt: string | null;
  updatedAt: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export default function OnAirPage() {
  const [data, setData] = useState<OnAirResponse | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(`${API_URL}/mcr/on-air`);
        if (r.ok) setData(await r.json());
      } catch {
        /* ignore */
      }
    };
    load();
    const t = setInterval(load, 8_000);
    return () => clearInterval(t);
  }, []);

  const sig = data?.signalStatus ?? "unknown";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/30">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Radio className="h-6 w-6 text-[#74ddc7]" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                WCCG 104.5 FM
              </p>
              <h1 className="text-xl font-black tracking-tight">On Air</h1>
            </div>
          </div>
          <SignalChip status={sig} />
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl px-6 py-16">
        <div className="grid items-center gap-12 md:grid-cols-[280px,1fr]">
          {/* Art / placeholder */}
          <div className="aspect-square overflow-hidden rounded-3xl border border-border bg-card shadow-lg">
            {data?.nowPlaying?.artUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.nowPlaying.artUrl}
                alt={data.nowPlaying.title ?? ""}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#74ddc7]/30 via-card to-card">
                <Disc3 className="h-24 w-24 text-[#74ddc7]/60 animate-[spin_8s_linear_infinite]" />
              </div>
            )}
          </div>

          {/* Track meta */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
              Now playing
            </p>
            <h2 className="text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
              {data?.nowPlaying?.title ?? <span className="text-muted-foreground">—</span>}
            </h2>
            <p className="text-2xl text-muted-foreground md:text-3xl">
              {data?.nowPlaying?.artist ?? ""}
            </p>
            {data?.nowPlaying?.album && (
              <p className="text-base text-muted-foreground">{data.nowPlaying.album}</p>
            )}
            {data?.currentShow?.title && (
              <p className="pt-4 text-sm">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                  on
                </span>{" "}
                <span className="font-bold text-foreground">{data.currentShow.title}</span>
                {data.currentShow.djSlug && (
                  <Link href={`/djs/${data.currentShow.djSlug}`} className="ml-2 text-[#74ddc7] hover:underline">
                    /djs/{data.currentShow.djSlug}
                  </Link>
                )}
              </p>
            )}
          </div>
        </div>

        <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {data?.listeners != null && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {data.listeners.toLocaleString()} listeners
              </span>
            )}
            {data?.lastMetadataAt && (
              <span>updated {fmtRelative(data.lastMetadataAt)}</span>
            )}
          </div>
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
            ← WCCG home
          </Link>
        </footer>
      </main>
    </div>
  );
}

function SignalChip({ status }: { status: "on_air" | "silent" | "off_air" | "unknown" }) {
  const cls =
    status === "on_air" ? "bg-[#74ddc7]/15 text-[#74ddc7] border-[#74ddc7]/40" :
    status === "silent" ? "bg-amber-500/15 text-amber-400 border-amber-500/40" :
    status === "off_air" ? "bg-red-500/15 text-red-400 border-red-500/40" :
    "bg-muted text-muted-foreground border-border";
  const label =
    status === "on_air" ? "Live" : status === "silent" ? "Silent" : status === "off_air" ? "Off air" : "Unknown";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${cls}`}>
      <Signal className="h-3 w-3" />
      {label}
      {status === "on_air" && (
        <span className="ml-1 h-1.5 w-1.5 rounded-full bg-[#74ddc7] animate-pulse" />
      )}
    </span>
  );
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}
