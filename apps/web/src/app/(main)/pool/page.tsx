"use client";

/**
 * /pool — WCCG record pool. DJs browse, search, and download tracks
 * uploaded by other DJs and verified labels.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download, Loader2, Music2, Search, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";

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

interface BrowseResponse {
  items: Track[];
  total: number;
  limit: number;
  offset: number;
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
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (q.trim()) qs.set("q", q.trim());
    qs.set("sort", sort);
    qs.set("limit", "60");
    apiClient<BrowseResponse>(`/pool/tracks?${qs.toString()}`)
      .then((r) => {
        setItems(r.items);
        setTotal(r.total);
      })
      .finally(() => setLoading(false));
  }, [q, sort]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const download = async (id: string) => {
    setDownloadingId(id);
    try {
      const { url } = await apiClient<{ url: string; expiresIn: number }>(
        `/pool/tracks/${id}/download`,
      );
      window.location.href = url;
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
