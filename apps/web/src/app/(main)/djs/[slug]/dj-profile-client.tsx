"use client";

/**
 * Public DJ profile + archive player at /djs/[slug].
 *
 * Phase 2B minimum viable surface:
 *   - DJ display name + real name (from djs.notes)
 *   - This DJ's weekly slot schedule
 *   - List of every uploaded mix (newest first) with an inline <audio> player
 *
 * Styling is intentionally restrained; the user said they want to customize
 * the player later.
 */

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Calendar, Headphones, Loader2 } from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface ProfileResponse {
  dj: { id: string; slug: string; display_name: string; notes: string | null };
  slots: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
    status: string;
    file_codes: string[];
  }>;
}

interface ArchiveItem {
  id: string;
  fileCode: string;
  weekOf: string;
  status: string;
  format: string | null;
  sizeBytes: number | null;
  uploadedAt: string | null;
  playbackUrl: string | null;
}

interface ArchiveResponse {
  dj: { id: string; slug: string; display_name: string };
  archive: ArchiveItem[];
}

export default function DjProfileClient() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : Array.isArray(params?.slug) ? params.slug[0] : "";
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [archive, setArchive] = useState<ArchiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || slug === "_placeholder") return;
    setLoading(true);
    Promise.all([
      apiClient<ProfileResponse>(`/djs/${slug}`),
      apiClient<ArchiveResponse>(`/djs/${slug}/archive`),
    ])
      .then(([prof, arch]) => {
        setProfile(prof);
        setArchive(arch.archive);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const sortedSlots = useMemo(
    () => [...(profile?.slots ?? [])].sort(
      (a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time),
    ),
    [profile?.slots],
  );

  if (!slug || slug === "_placeholder") {
    return (
      <div className="py-12">
        <p className="text-sm text-muted-foreground">No DJ slug.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 py-12">
        <p className="text-sm text-red-300">{error}</p>
        <Link href="/djs" className="text-sm text-[#74ddc7] hover:underline">
          ← All DJs
        </Link>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-8 py-8">
      <Link
        href="/djs"
        className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        All DJs
      </Link>

      <header>
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#74ddc7]">
          WCCG DJ
        </p>
        <h1 className="text-4xl font-black tracking-tight text-foreground md:text-5xl">
          {profile.dj.display_name}
        </h1>
        {profile.dj.notes && (
          <p className="mt-1 text-base text-muted-foreground">{profile.dj.notes}</p>
        )}
      </header>

      {sortedSlots.length > 0 && (
        <section>
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Weekly slots
          </h2>
          <div className="flex flex-wrap gap-2">
            {sortedSlots.map((s, i) => (
              <span
                key={`${s.day_of_week}-${s.start_time}-${i}`}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs"
              >
                <Calendar className="h-3 w-3 text-[#74ddc7]" />
                <span className="font-bold">{DAYS[s.day_of_week]}</span>
                <span className="text-muted-foreground">{fmt12h(s.start_time)}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      <section>
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Mix archive
          </h2>
          <p className="text-xs text-muted-foreground">
            {archive.length} {archive.length === 1 ? "mix" : "mixes"}
          </p>
        </header>

        {archive.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-10 text-center">
            <Headphones className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No mixes uploaded yet. Check back soon.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {archive.map((mix) => (
              <article
                key={mix.id}
                className={`rounded-2xl border bg-card px-5 py-4 transition-colors ${
                  nowPlaying === mix.id ? "border-[#74ddc7]/60 bg-[#74ddc7]/5" : "border-border"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-bold">{mix.fileCode}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Week of {mix.weekOf}
                      {mix.format && <> • {mix.format.toUpperCase()}</>}
                      {mix.sizeBytes && <> • {fmtBytes(mix.sizeBytes)}</>}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                      mix.status === "published"
                        ? "bg-[#74ddc7]/15 text-[#74ddc7]"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {mix.status}
                  </span>
                </div>
                {mix.playbackUrl ? (
                  <audio
                    controls
                    preload="none"
                    src={mix.playbackUrl}
                    onPlay={() => setNowPlaying(mix.id)}
                    onPause={() => setNowPlaying((cur) => (cur === mix.id ? null : cur))}
                    className="mt-3 w-full"
                  />
                ) : (
                  <p className="mt-3 text-xs italic text-muted-foreground">Playback unavailable</p>
                )}
              </article>
            ))}
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
