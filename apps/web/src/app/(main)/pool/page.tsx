"use client";

/**
 * /pool — WCCG record pool. DJs browse, search, and download tracks
 * uploaded by other DJs and verified labels.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download, Loader2, Music2, Search, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface Track {
  id: string;
  title: string;
  artist: string;
  remix_artist: string | null;
  album: string | null;
  genre: string | null;
  subgenre: string | null;
  bpm: number | null;
  musical_key: string | null;
  release_year: number | null;
  version: string | null;
  duration_seconds: number | null;
  artwork_url: string | null;
  download_count: number;
  play_count: number;
  created_at: string;
  uploader_type: "dj" | "label" | "admin";
  label_name: string | null;
}

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most downloaded" },
  { value: "title", label: "Title A→Z" },
  { value: "artist", label: "Artist A→Z" },
] as const;

export default function RecordPoolPage() {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<(typeof SORTS)[number]["value"]>("newest");
  const [items, setItems] = useState<Track[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const orderBy =
      sort === "popular"
        ? { column: "download_count", ascending: false }
        : sort === "title"
          ? { column: "title", ascending: true }
          : sort === "artist"
            ? { column: "artist", ascending: true }
            : { column: "created_at", ascending: false };

    let query = supabase
      .from("record_pool_tracks")
      .select("*", { count: "exact" })
      .eq("status", "approved")
      .order(orderBy.column, { ascending: orderBy.ascending })
      .limit(60);

    const term = q.trim();
    if (term) {
      // Match the FTS columns: title, artist, remix credit, label, album.
      const like = `%${term.replace(/[%_(),]/g, " ")}%`;
      query = query.or(
        [
          `title.ilike.${like}`,
          `artist.ilike.${like}`,
          `remix_artist.ilike.${like}`,
          `label_name.ilike.${like}`,
          `album.ilike.${like}`,
        ].join(","),
      );
    }

    const { data, error: err, count } = await query;
    if (err) {
      setError(err.message);
      setItems([]);
      setTotal(0);
    } else {
      setError(null);
      setItems((data ?? []) as Track[]);
      setTotal(count ?? data?.length ?? 0);
    }
    setLoading(false);
  }, [q, sort]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const download = async (id: string) => {
    setDownloadingId(id);
    setError(null);
    try {
      const supabase = createClient();
      // Look up the track's storage path (RLS lets DJs read approved rows).
      const { data: track, error: tErr } = await supabase
        .from("record_pool_tracks")
        .select("storage_path")
        .eq("id", id)
        .single();
      if (tErr) throw new Error(tErr.message);
      if (!track?.storage_path) throw new Error("This track has no file to download.");

      // Private bucket — mint a short-lived signed URL.
      const { data: signed, error: sErr } = await supabase.storage
        .from("record-pool")
        .createSignedUrl(track.storage_path, 3600);
      if (sErr || !signed?.signedUrl) {
        throw new Error(sErr?.message || "Could not generate a download link.");
      }

      // Best-effort: log the download for history / counters. RLS may reject
      // this for non-service-role clients; never block the download on it.
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("record_pool_downloads")
          .insert({ track_id: id, user_id: user.id })
          .then(() => undefined, () => undefined);
      }

      window.location.href = signed.signedUrl;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#74ddc7]">
            DJ tools
          </p>
          <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
            Record pool
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tracks uploaded by WCCG DJs and verified record labels.
          </p>
        </div>
        <Link href="/pool/upload">
          <Button size="sm" className="rounded-full">
            <UploadCloud className="mr-1.5 h-4 w-4" />
            Upload track
          </Button>
        </Link>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, artist, label…"
            className="w-full rounded-full border border-border bg-card pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="rounded-full border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Searching…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
          <Music2 className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            {q ? "No tracks match that search." : "The pool is empty. Be the first to upload."}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {total} {total === 1 ? "track" : "tracks"}
          </p>
          <div className="space-y-2">
            {items.map((t) => (
              <article
                key={t.id}
                className="grid grid-cols-[1fr,auto] gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:bg-card/80"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold text-foreground">
                    {t.title}
                    {t.remix_artist && (
                      <span className="text-muted-foreground"> ({t.remix_artist})</span>
                    )}
                    {t.version && (
                      <span className="ml-2 rounded-full bg-[#74ddc7]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#74ddc7]">
                        {t.version}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{t.artist}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    {t.label_name && <span>🏷 {t.label_name}</span>}
                    {t.genre && <span>{t.genre}</span>}
                    {t.bpm && <span>{Number(t.bpm).toFixed(0)} BPM</span>}
                    {t.musical_key && <span className="font-mono">{t.musical_key}</span>}
                    {t.release_year && <span>{t.release_year}</span>}
                    {t.duration_seconds && <span>{fmtDuration(t.duration_seconds)}</span>}
                  </div>
                </div>
                <div className="flex items-center">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    disabled={downloadingId === t.id}
                    onClick={() => download(t.id)}
                  >
                    {downloadingId === t.id ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {t.download_count > 0 ? t.download_count : "Get"}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
