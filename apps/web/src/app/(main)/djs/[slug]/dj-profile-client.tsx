"use client";

/**
 * Public DJ profile + mixshow player at /djs/[slug].
 *
 * Fetches the DJ + their PUBLISHED mixshow drops directly from Supabase
 * (no API server). Published drops are public-readable and the dj-drops
 * bucket is public, so the inline player works for everyone.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Headphones, Loader2, Pause, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Dj { id: string; slug: string; display_name: string; notes: string | null }
interface Slot { day_of_week: number; start_time: string; status: string }
interface Mix {
  id: string;
  fileCode: string;
  weekOf: string;
  format: string | null;
  sizeBytes: number | null;
  uploadedAt: string | null;
  url: string;
}

export default function DjProfileClient() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : Array.isArray(params?.slug) ? params.slug[0] : "";
  const [dj, setDj] = useState<Dj | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [mixes, setMixes] = useState<Mix[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  useEffect(() => {
    if (!slug || slug === "_placeholder") return;
    setLoading(true);
    (async () => {
      try {
        const supabase = createClient();
        const { data: d } = await supabase
          .from("djs")
          .select("id, slug, display_name, notes")
          .eq("slug", slug)
          .eq("is_active", true)
          .maybeSingle();
        if (!d) { setError("DJ not found."); return; }
        setDj(d as Dj);

        const [{ data: s }, { data: drops }] = await Promise.all([
          supabase.from("dj_slots").select("day_of_week, start_time, status").eq("dj_id", d.id).eq("status", "active").order("day_of_week"),
          supabase
            .from("dj_drops")
            .select("id, file_code, week_of, format, size_bytes, uploaded_at, storage_path")
            .eq("dj_id", d.id)
            .eq("status", "published")
            .order("uploaded_at", { ascending: false })
            .limit(60),
        ]);
        setSlots((s ?? []) as Slot[]);

        const built: Mix[] = (drops ?? [])
          .filter((dr: { storage_path: string | null }) => !!dr.storage_path)
          .map((dr: { id: string; file_code: string; week_of: string; format: string | null; size_bytes: number | null; uploaded_at: string | null; storage_path: string }) => ({
            id: dr.id,
            fileCode: dr.file_code,
            weekOf: dr.week_of,
            format: dr.format,
            sizeBytes: dr.size_bytes,
            uploadedAt: dr.uploaded_at,
            url: supabase.storage.from("dj-drops").getPublicUrl(dr.storage_path).data.publicUrl,
          }));
        setMixes(built);
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const sortedSlots = useMemo(
    () => [...slots].sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)),
    [slots],
  );

  const togglePlay = (id: string) => {
    const el = audioRefs.current[id];
    if (!el) return;
    // pause any other
    for (const [k, a] of Object.entries(audioRefs.current)) {
      if (k !== id && a && !a.paused) a.pause();
    }
    if (el.paused) { void el.play(); setNowPlaying(id); }
    else { el.pause(); setNowPlaying(null); }
  };

  if (!slug || slug === "_placeholder") return <div className="py-12 text-sm text-muted-foreground">No DJ.</div>;
  if (loading) {
    return <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }
  if (error || !dj) {
    return (
      <div className="space-y-3 py-12">
        <p className="text-sm text-red-300">{error ?? "Not found"}</p>
        <Link href="/djs" className="text-sm text-[#74ddc7] hover:underline">← All DJs</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-8">
      <Link href="/djs" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> All DJs
      </Link>

      <header>
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#74ddc7]">WCCG DJ</p>
        <h1 className="text-4xl font-black tracking-tight text-foreground md:text-5xl">{dj.display_name}</h1>
        {dj.notes && <p className="mt-1 text-base text-muted-foreground">{dj.notes}</p>}
      </header>

      {sortedSlots.length > 0 && (
        <section>
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">On air</h2>
          <div className="flex flex-wrap gap-2">
            {sortedSlots.map((s, i) => (
              <span key={`${s.day_of_week}-${s.start_time}-${i}`} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs">
                <Calendar className="h-3 w-3 text-[#74ddc7]" />
                <span className="font-bold">{DAYS[s.day_of_week]}</span>
                <span className="text-muted-foreground">{fmt12h(s.start_time)}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Mixshow player */}
      <section>
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Mixshow archive</h2>
          <p className="text-xs text-muted-foreground">{mixes.length} {mixes.length === 1 ? "mix" : "mixes"}</p>
        </header>

        {mixes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
            <Headphones className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No published mixshows yet. Check back soon.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {mixes.map((mix) => {
              const playing = nowPlaying === mix.id;
              return (
                <article key={mix.id} className={`rounded-2xl border bg-card p-4 transition-colors ${playing ? "border-[#74ddc7]/60 bg-[#74ddc7]/5" : "border-border"}`}>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => togglePlay(mix.id)}
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${playing ? "bg-[#74ddc7] text-[#0a0a0f]" : "bg-foreground/10 text-foreground hover:bg-[#74ddc7]/20"}`}
                      aria-label={playing ? "Pause" : "Play"}
                    >
                      {playing ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5" fill="currentColor" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-bold text-foreground">{mix.fileCode}</p>
                      <p className="text-xs text-muted-foreground">
                        Week of {mix.weekOf}
                        {mix.format && <> · {mix.format.toUpperCase()}</>}
                        {mix.sizeBytes && <> · {fmtBytes(mix.sizeBytes)}</>}
                      </p>
                    </div>
                  </div>
                  <audio
                    ref={(el) => { audioRefs.current[mix.id] = el; }}
                    src={mix.url}
                    preload="none"
                    onEnded={() => setNowPlaying((cur) => (cur === mix.id ? null : cur))}
                    onPlay={() => setNowPlaying(mix.id)}
                    onPause={() => setNowPlaying((cur) => (cur === mix.id ? null : cur))}
                    controls
                    className="mt-3 w-full"
                  />
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function fmt12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const ampm = h >= 12 ? "p" : "a";
  const display = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${display}${ampm}` : `${display}:${String(m).padStart(2, "0")}${ampm}`;
}
function fmtBytes(n: number): string {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
