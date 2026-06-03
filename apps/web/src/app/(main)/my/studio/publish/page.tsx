"use client";

/**
 * /my/studio/publish — publish a video to the WCCG video wall (/videos).
 *
 * Two sources:
 *   1. Upload a file → Supabase Storage (public `videos` bucket) → videos row
 *   2. Link a YouTube video → store youtube_id/url (thumbnail auto-derived)
 *
 * "Publish to YouTube" opens YouTube Studio upload in a new tab and lets you
 * paste the resulting URL back here to link it. (Full YouTube Data API upload
 * is a documented follow-up — it needs Google OAuth + a Cloud project.)
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Film, Loader2, Upload, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { parseYouTubeId, VIDEO_RATINGS, type VideoRating } from "@/lib/videos";

const CATEGORIES = ["Sports", "News", "Podcasts", "Music", "Shows", "Talk", "Comedy", "Gospel", "Community", "Studio", "Events", "Other"];

export default function PublishVideoPage() {
  const router = useRouter();
  const [source, setSource] = useState<"upload" | "youtube">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [meta, setMeta] = useState({
    title: "",
    description: "",
    program: "",
    category: "Studio",
    rating: "G" as VideoRating,
    visibility: "public" as "public" | "unlisted" | "private",
    youtubeUrl: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const thumbRef = useRef<HTMLInputElement | null>(null);
  const [creatorName, setCreatorName] = useState("WCCG 104.5 FM");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const name = (user.user_metadata?.display_name as string) || user.email?.split("@")[0];
        if (name) setCreatorName(name);
      }
    })();
  }, []);

  // Read duration from a chosen video file.
  const onPickFile = (f: File | null) => {
    setFile(f);
    setDuration(null);
    if (!f) return;
    if (!meta.title) setMeta((m) => ({ ...m, title: f.name.replace(/\.[^.]+$/, "") }));
    const url = URL.createObjectURL(f);
    const vid = document.createElement("video");
    vid.preload = "metadata";
    vid.onloadedmetadata = () => {
      setDuration(Math.round(vid.duration) || null);
      URL.revokeObjectURL(url);
    };
    vid.src = url;
  };

  const canPublish =
    meta.title.trim().length > 0 &&
    (source === "upload" ? !!file : !!parseYouTubeId(meta.youtubeUrl));

  const publish = async () => {
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in.");

      let storage_path: string | null = null;
      let video_url: string | null = null;
      let thumbnail_url: string | null = null;
      let thumbnail_path: string | null = null;
      let youtube_id: string | null = null;
      let youtube_url: string | null = null;

      if (source === "youtube") {
        youtube_id = parseYouTubeId(meta.youtubeUrl);
        if (!youtube_id) throw new Error("Couldn't read a YouTube video id from that URL.");
        youtube_url = `https://www.youtube.com/watch?v=${youtube_id}`;
        thumbnail_url = `https://i.ytimg.com/vi/${youtube_id}/hqdefault.jpg`;
      } else {
        if (!file) throw new Error("Pick a video file.");
        const ext = (file.name.match(/\.([a-z0-9]+)$/i)?.[1] ?? "mp4").toLowerCase();
        const base = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        storage_path = `${base}.${ext}`;
        const { error: upErr } = await supabase.storage.from("videos").upload(storage_path, file, {
          contentType: file.type || `video/${ext}`,
          upsert: false,
        });
        if (upErr) throw new Error(`Video upload failed: ${upErr.message}`);
        video_url = supabase.storage.from("videos").getPublicUrl(storage_path).data.publicUrl;
      }

      // Thumbnail (optional for uploads; YouTube auto-derives)
      if (thumb) {
        const text = thumb.name.match(/\.([a-z0-9]+)$/i)?.[1] ?? "jpg";
        thumbnail_path = `${user.id}/thumb-${Date.now()}.${text}`;
        const { error: tErr } = await supabase.storage.from("videos").upload(thumbnail_path, thumb, {
          contentType: thumb.type || "image/jpeg",
          upsert: false,
        });
        if (!tErr) thumbnail_url = supabase.storage.from("videos").getPublicUrl(thumbnail_path).data.publicUrl;
      }

      const { data: row, error: insErr } = await supabase
        .from("videos")
        .insert({
          user_id: user.id,
          creator_name: creatorName,
          program: meta.program.trim() || null,
          title: meta.title.trim(),
          description: meta.description.trim() || null,
          storage_path,
          video_url,
          youtube_id,
          youtube_url,
          thumbnail_url,
          thumbnail_path,
          duration_seconds: duration,
          category: meta.category,
          rating: meta.rating,
          visibility: meta.visibility,
          status: "published",
          published_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (insErr) throw new Error(insErr.message);

      setDone({ id: row.id });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="space-y-4 py-12 text-center">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#74ddc7]/15 text-[#74ddc7]">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-black tracking-tight">Published to the video wall</h1>
        <p className="text-sm text-muted-foreground">Your video is live at /videos.</p>
        <div className="flex justify-center gap-2 pt-2">
          <Button variant="outline" onClick={() => { setDone(null); setFile(null); setThumb(null); setMeta({ ...meta, title: "", description: "", program: "", youtubeUrl: "" }); }}>
            Publish another
          </Button>
          <Button onClick={() => router.push(`/videos/${done.id}`)}>Watch it</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6">
      <Link href="/my/studio" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Studio
      </Link>

      <header>
        <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">Publish a video</h1>
        <p className="mt-1 text-sm text-muted-foreground">Upload a file or link a YouTube video — it lands on the WCCG video wall.</p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {/* Source toggle */}
      <div className="inline-flex rounded-full border border-border bg-card p-0.5">
        <button onClick={() => setSource("upload")} className={`rounded-full px-4 py-1.5 text-sm font-bold ${source === "upload" ? "bg-[#74ddc7] text-[#0a0a0f]" : "text-muted-foreground"}`}>
          <Upload className="mr-1.5 inline h-4 w-4" /> Upload file
        </button>
        <button onClick={() => setSource("youtube")} className={`rounded-full px-4 py-1.5 text-sm font-bold ${source === "youtube" ? "bg-red-600 text-white" : "text-muted-foreground"}`}>
          <Youtube className="mr-1.5 inline h-4 w-4" /> Link YouTube
        </button>
      </div>

      {source === "upload" ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Video file</label>
            <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => onPickFile(e.target.files?.[0] ?? null)} />
            <button onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-4 py-10 text-sm hover:border-[#74ddc7]/50">
              <Film className="h-8 w-8 text-muted-foreground" />
              {file ? <span className="font-bold text-foreground">{file.name}</span> : <span className="text-muted-foreground">Choose a video (mp4/webm/mov)</span>}
              {duration ? <span className="text-xs text-muted-foreground">{Math.floor(duration / 60)}:{String(duration % 60).padStart(2, "0")}</span> : null}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">YouTube URL</label>
          <input
            value={meta.youtubeUrl}
            onChange={(e) => setMeta({ ...meta, youtubeUrl: e.target.value })}
            placeholder="https://www.youtube.com/watch?v=…"
            className="w-full rounded-full border border-border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40"
          />
          {meta.youtubeUrl && !parseYouTubeId(meta.youtubeUrl) && (
            <p className="mt-1 text-xs text-red-400">Not a valid YouTube URL.</p>
          )}
          <div className="mt-3 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
            <p className="font-bold text-foreground">Don&apos;t have it on YouTube yet?</p>
            <p className="mt-1">Upload it in YouTube Studio, then paste the link here to feature it on the wall.</p>
            <a href="https://studio.youtube.com/channel/UC/videos/upload" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-red-600/15 px-3 py-1.5 font-bold text-red-400 hover:bg-red-600/25">
              <Youtube className="h-3.5 w-3.5" /> Open YouTube Studio upload
            </a>
          </div>
        </div>
      )}

      {/* Thumbnail */}
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Thumbnail {source === "youtube" && <span className="text-muted-foreground/60">(optional — auto from YouTube)</span>}
        </label>
        <input ref={thumbRef} type="file" accept="image/*" className="hidden" onChange={(e) => setThumb(e.target.files?.[0] ?? null)} />
        <button onClick={() => thumbRef.current?.click()} className="rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground hover:border-[#74ddc7]/50">
          {thumb ? thumb.name : "Choose a thumbnail image"}
        </button>
      </div>

      {/* Metadata */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Title *</label>
          <input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} className="w-full rounded-full border border-border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Description</label>
          <textarea rows={3} value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} className="w-full rounded-xl border border-border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Program <span className="text-muted-foreground/60">(optional)</span>
          </label>
          <input
            value={meta.program}
            onChange={(e) => setMeta({ ...meta, program: e.target.value })}
            placeholder='e.g. "Angela Yee", "Incognito", "ABC News"'
            className="w-full rounded-full border border-border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">Groups this video into a row on the wall. Defaults to your creator name.</p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Category</label>
          <select value={meta.category} onChange={(e) => setMeta({ ...meta, category: e.target.value })} className="w-full rounded-full border border-border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Content rating</label>
          <select value={meta.rating} onChange={(e) => setMeta({ ...meta, rating: e.target.value as VideoRating })} className="w-full rounded-full border border-border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40">
            {VIDEO_RATINGS.map((r) => <option key={r} value={r}>{r === "NR" ? "NR — Not rated" : r}</option>)}
          </select>
          <p className="mt-1 text-[11px] text-muted-foreground">R and NR are hidden behind parental controls on the wall.</p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Visibility</label>
          <select value={meta.visibility} onChange={(e) => setMeta({ ...meta, visibility: e.target.value as typeof meta.visibility })} className="w-full rounded-full border border-border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40">
            <option value="public">Public — on the wall</option>
            <option value="unlisted">Unlisted — link only</option>
            <option value="private">Private — only me</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button onClick={publish} disabled={!canPublish || busy} className="rounded-full">
          {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
          Publish to video wall
        </Button>
      </div>
    </div>
  );
}
