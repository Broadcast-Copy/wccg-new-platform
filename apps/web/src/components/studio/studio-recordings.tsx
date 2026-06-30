"use client";

/**
 * StudioRecordings — the private "My Studio → Recordings" list. Shows the
 * signed-in user's whole-room Podcast Studio session recordings (LiveKit egress
 * → private studio-recordings bucket, tracked in public.studio_recordings).
 *
 * On load it asks the livekit-egress `status` action to refresh any
 * still-processing recordings, then lists them. Playback/download use short-
 * lived signed URLs (the bucket is private; RLS lets the owner read their own).
 */

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Circle,
  Download,
  Loader2,
  Play,
  Trash2,
  Video,
  RefreshCw,
} from "lucide-react";

interface Rec {
  id: string;
  title: string;
  status: string; // recording | processing | ready | failed
  storage_path: string | null;
  duration_seconds: number | null;
  size_bytes: number | null;
  created_at: string;
  error: string | null;
}

const BUCKET = "studio-recordings";

function fmtDur(s: number | null) {
  if (!s) return "";
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${ss.toString().padStart(2, "0")}`;
}
function fmtSize(b: number | null) {
  if (!b) return "";
  return b < 1048576 ? `${Math.round(b / 1024)} KB` : `${(b / 1048576).toFixed(0)} MB`;
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  recording: { label: "Recording", cls: "bg-red-500/15 text-red-400" },
  processing: { label: "Processing", cls: "bg-amber-500/15 text-amber-400" },
  ready: { label: "Ready", cls: "bg-emerald-500/15 text-emerald-400" },
  failed: { label: "Failed", cls: "bg-red-500/15 text-red-400" },
};

export function StudioRecordings() {
  const [recs, setRecs] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [signedAt, setSignedAt] = useState<string | null>(null); // id currently being signed

  const fetchRecs = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("studio_recordings")
      .select("id,title,status,storage_path,duration_seconds,size_bytes,created_at,error")
      .order("created_at", { ascending: false });
    return (data ?? []) as Rec[];
  }, []);

  useEffect(() => {
    let active = true;
    async function run() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (active) { setRecs([]); setLoading(false); }
        return;
      }
      // Refresh any still-processing egress, then list.
      try { await supabase.functions.invoke("livekit-egress", { body: { action: "status" } }); } catch { /* */ }
      const rows = await fetchRecs();
      if (active) { setRecs(rows); setLoading(false); }
    }
    run();
    return () => { active = false; };
  }, [fetchRecs]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const supabase = createClient();
    try { await supabase.functions.invoke("livekit-egress", { body: { action: "status" } }); } catch { /* */ }
    const rows = await fetchRecs();
    setRecs(rows);
    setRefreshing(false);
  }, [fetchRecs]);

  const signedUrl = useCallback(async (rec: Rec): Promise<string | null> => {
    if (!rec.storage_path) return null;
    const supabase = createClient();
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(rec.storage_path, 3600);
    return data?.signedUrl ?? null;
  }, []);

  const handlePlay = useCallback(async (rec: Rec) => {
    setSignedAt(rec.id);
    const url = await signedUrl(rec);
    setSignedAt(null);
    if (url) setPlayingUrl(url);
  }, [signedUrl]);

  const handleDownload = useCallback(async (rec: Rec) => {
    setSignedAt(rec.id);
    const url = await signedUrl(rec);
    setSignedAt(null);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${rec.title.replace(/\s+/g, "-")}.mp4`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [signedUrl]);

  const handleDelete = useCallback(async (rec: Rec) => {
    if (!window.confirm(`Delete "${rec.title}"? This can't be undone.`)) return;
    const supabase = createClient();
    if (rec.storage_path) {
      await supabase.storage.from(BUCKET).remove([rec.storage_path]).catch(() => {});
    }
    await supabase.from("studio_recordings").delete().eq("id", rec.id);
    setRecs((prev) => prev.filter((r) => r.id !== rec.id));
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <Video className="h-5 w-5 text-[#7401df]" />
          Recordings
        </h2>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Inline player */}
      {playingUrl && (
        <div className="rounded-xl border border-border bg-black overflow-hidden">
          <video src={playingUrl} controls autoPlay className="w-full max-h-[60vh]" />
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading recordings…
        </div>
      ) : recs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
          <Video className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">
            No recordings yet. Hit <span className="font-semibold">Record</span> in the Podcast Studio to capture a session.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {recs.map((rec) => {
            const badge = STATUS_BADGE[rec.status] ?? STATUS_BADGE.processing;
            const ready = rec.status === "ready";
            const busy = signedAt === rec.id;
            return (
              <div key={rec.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#7401df]/20 to-[#74ddc7]/20`}>
                  {rec.status === "recording" ? (
                    <Circle className="h-4 w-4 fill-red-500 text-red-500 animate-pulse" />
                  ) : (
                    <Video className="h-5 w-5 text-[#74ddc7]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{rec.title}</p>
                    <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {fmtDate(rec.created_at)}
                    {rec.duration_seconds ? ` · ${fmtDur(rec.duration_seconds)}` : ""}
                    {rec.size_bytes ? ` · ${fmtSize(rec.size_bytes)}` : ""}
                    {rec.status === "failed" && rec.error ? ` · ${rec.error}` : ""}
                    {rec.status === "processing" ? " · finalizing…" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {ready && (
                    <>
                      <button onClick={() => handlePlay(rec)} disabled={busy} title="Play" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/[0.08] hover:text-foreground disabled:opacity-50">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      </button>
                      <button onClick={() => handleDownload(rec)} disabled={busy} title="Download" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/[0.08] hover:text-foreground disabled:opacity-50">
                        <Download className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  <button onClick={() => handleDelete(rec)} title="Delete" className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400/70 hover:bg-red-500/10 hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
