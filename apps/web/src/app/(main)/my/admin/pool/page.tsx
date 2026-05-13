"use client";

/**
 * Admin: record-pool moderation queue.
 * Approve or reject pending uploads.
 */

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";

interface PendingTrack {
  id: string;
  title: string;
  artist: string;
  remix_artist: string | null;
  album: string | null;
  genre: string | null;
  bpm: number | null;
  musical_key: string | null;
  version: string | null;
  storage_path: string;
  size_bytes: number | null;
  format: string | null;
  duration_seconds: number | null;
  uploader_type: "dj" | "label" | "admin";
  label_name: string | null;
  uploaded_by: string;
  created_at: string;
}

export default function AdminPoolPage() {
  const [items, setItems] = useState<PendingTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    apiClient<PendingTrack[]>("/pool/admin/pending")
      .then((rs) => { setItems(rs); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const approve = async (id: string) => {
    setBusyId(id);
    try {
      await apiClient(`/pool/admin/${id}/approve`, { method: "POST" });
      setItems((xs) => xs.filter((x) => x.id !== id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    const reason = window.prompt("Reason for rejection?")?.trim();
    if (!reason || reason.length < 3) return;
    setBusyId(id);
    try {
      await apiClient(`/pool/admin/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      setItems((xs) => xs.filter((x) => x.id !== id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Operations
          </p>
          <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
            Record-pool moderation
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} pending — approve to publish, reject to remove.
          </p>
        </div>
        <Button onClick={load} variant="outline" size="sm" className="rounded-full">
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Refresh
        </Button>
      </header>

      {error && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-[#74ddc7]/40 bg-[#74ddc7]/10 px-6 py-8 text-center">
          <p className="font-bold text-foreground">Queue clear.</p>
          <p className="mt-1 text-sm text-muted-foreground">No pending tracks right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((t) => (
            <article key={t.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-foreground">{t.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {t.artist}
                    {t.remix_artist && ` (${t.remix_artist})`}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="rounded-full bg-muted px-1.5 py-0.5 font-bold uppercase tracking-widest">
                      {t.uploader_type}
                    </span>
                    {t.label_name && <span>🏷 {t.label_name}</span>}
                    {t.album && <span>{t.album}</span>}
                    {t.genre && <span>{t.genre}</span>}
                    {t.bpm && <span>{Number(t.bpm).toFixed(0)} BPM</span>}
                    {t.musical_key && <span className="font-mono">{t.musical_key}</span>}
                    {t.version && <span>v: {t.version}</span>}
                    {t.duration_seconds && <span>{fmtDuration(t.duration_seconds)}</span>}
                    {t.format && <span>{t.format.toUpperCase()}</span>}
                    {t.size_bytes && <span>{fmtBytes(t.size_bytes)}</span>}
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    {t.storage_path}
                  </p>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  <Button
                    size="sm"
                    className="rounded-full bg-[#74ddc7]/15 text-[#74ddc7] hover:bg-[#74ddc7]/25"
                    disabled={busyId === t.id}
                    onClick={() => approve(t.id)}
                  >
                    {busyId === t.id ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="mr-1 h-3.5 w-3.5" />
                    )}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    disabled={busyId === t.id}
                    onClick={() => reject(t.id)}
                  >
                    <X className="mr-1 h-3.5 w-3.5" />
                    Reject
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function fmtBytes(n: number): string {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
