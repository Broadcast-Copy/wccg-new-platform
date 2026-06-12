"use client";

/**
 * Sermon Archive — the audio player section on a gospel program's show page.
 *
 * Reads public.sermons (public-read RLS) for one church code and plays files
 * straight from the PUBLIC `sermons` storage bucket (getPublicUrl, no
 * signing, no API server). Rows are indexed by the exact Sunday air date.
 *
 * Conventions: supabase-js never throws — check { error }; setState only in
 * async callbacks behind `let active = true` guards
 * (react-hooks/set-state-in-effect); renders nothing while a church has no
 * uploaded sermons yet.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Church, Play, Volume2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** show id → sermon church code (matches RadioSpider/file conventions). */
export const SERMON_CODES: Record<string, string> = {
  show_grace_plus_nothing: "gpn1",
  show_encouraging_moment: "thm1",
  show_family_fellowship: "dvp1",
  show_progressive_mbc: "pmb1",
  show_lewis_chapel: "lcc1",
};

interface SermonRow {
  id: string;
  church_code: string;
  air_date: string;
  storage_path: string;
  format: string;
  size_bytes: number | null;
}

function fmtSunday(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function fmtSize(bytes: number | null): string {
  if (!bytes) return "";
  return `${Math.round(bytes / 1048576)} MB`;
}

export function SermonArchive({ churchCode, showName }: { churchCode: string; showName: string }) {
  const [supabase] = useState(() => createClient());
  const [sermons, setSermons] = useState<SermonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error } = await supabase
        .from("sermons")
        .select("id,church_code,air_date,storage_path,format,size_bytes")
        .eq("church_code", churchCode)
        .order("air_date", { ascending: false })
        .limit(300);
      if (!active) return;
      if (error) {
        console.warn("sermons load failed:", error.message);
        setSermons([]);
      } else {
        setSermons((data ?? []) as SermonRow[]);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [supabase, churchCode]);

  const current = useMemo(
    () => sermons.find((s) => s.id === currentId) ?? null,
    [sermons, currentId],
  );

  const urlFor = (s: SermonRow) =>
    supabase.storage.from("sermons").getPublicUrl(s.storage_path).data.publicUrl;

  // Nothing uploaded for this church yet — keep the page clean.
  if (!loading && sermons.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 text-base font-black tracking-tight text-foreground">
          <Church className="h-5 w-5 text-[#74ddc7]" /> Sermon Archive
        </h2>
        {!loading && (
          <p className="text-xs text-muted-foreground">
            {sermons.length} Sunday {sermons.length === 1 ? "broadcast" : "broadcasts"}
          </p>
        )}
      </div>

      {loading ? (
        <div className="space-y-2" aria-hidden>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-foreground/[0.06]" />
          ))}
        </div>
      ) : (
        <>
          {/* Player — appears once a sermon is chosen, sticks above the list. */}
          {current && (
            <div className="rounded-2xl border border-[#74ddc7]/40 bg-[#74ddc7]/[0.05] p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
                <Volume2 className="h-4 w-4 text-[#74ddc7]" />
                {showName} — {fmtSunday(current.air_date)}
              </p>
              <audio
                ref={audioRef}
                key={current.id}
                controls
                autoPlay
                preload="metadata"
                src={urlFor(current)}
                className="w-full"
              >
                Your browser can&apos;t play this audio.
              </audio>
            </div>
          )}

          <div className="space-y-2 lg:max-h-[28rem] lg:overflow-y-auto lg:pr-1">
            {sermons.map((s, i) => {
              const playing = currentId === s.id;
              return (
                <article
                  key={s.id}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                    playing ? "border-[#74ddc7]/60 bg-[#74ddc7]/[0.05]" : "border-border bg-card hover:border-[#74ddc7]/30"
                  }`}
                >
                  <button
                    onClick={() => setCurrentId(s.id)}
                    aria-label={`Play the ${fmtSunday(s.air_date)} broadcast`}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                      playing ? "bg-[#74ddc7] text-[#0a0a0f]" : "bg-foreground/10 text-foreground hover:bg-[#74ddc7]/25"
                    }`}
                  >
                    {playing ? <Volume2 className="h-4 w-4" /> : <Play className="h-4 w-4" fill="currentColor" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`flex items-center gap-2 text-sm font-bold ${playing ? "text-[#74ddc7]" : "text-foreground"}`}>
                      <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#74ddc7]" />
                      <span className="truncate">{fmtSunday(s.air_date)}</span>
                      {i === 0 && (
                        <span className="shrink-0 rounded-full bg-[#74ddc7]/15 px-2 py-0.5 text-[10px] font-bold text-[#74ddc7]">
                          Latest
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Sunday broadcast{s.size_bytes ? ` · ${fmtSize(s.size_bytes)}` : ""} · {s.format.toUpperCase()}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
