"use client";

/**
 * /videos/[id] — YouTube-style watch page. Plays an uploaded video file or a
 * linked YouTube video, shows title/views/description/creator, and an
 * "Up next" rail of related videos.
 */

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, Loader2, ThumbsUp, Youtube } from "lucide-react";
import {
  getVideo,
  relatedVideos,
  incrementViews,
  videoThumb,
  fmtDuration,
  fmtViews,
  timeAgo,
  type VideoRecord,
} from "@/lib/videos";

export default function WatchClient() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";
  const [video, setVideo] = useState<VideoRecord | null>(null);
  const [related, setRelated] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const viewedRef = useRef(false);

  useEffect(() => {
    if (!id || id === "_placeholder") return;
    setLoading(true);
    getVideo(id)
      .then((v) => {
        if (!v) { setNotFound(true); return; }
        setVideo(v);
        if (!viewedRef.current) {
          viewedRef.current = true;
          void incrementViews(v.id);
        }
        return relatedVideos(v.id, v.category, 12).then(setRelated);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (!id || id === "_placeholder") {
    return <div className="py-12 text-sm text-muted-foreground">No video.</div>;
  }
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (notFound || !video) {
    return (
      <div className="space-y-3 py-12">
        <p className="text-sm text-red-300">Video not found or not published.</p>
        <Link href="/videos" className="text-sm text-[#74ddc7] hover:underline">← All videos</Link>
      </div>
    );
  }

  return (
    <div className="py-6">
      <Link href="/videos" className="mb-4 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> All videos
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Player + meta */}
        <div className="space-y-4">
          <div className="aspect-video overflow-hidden rounded-2xl border border-border bg-black">
            {video.youtube_id ? (
              <iframe
                className="h-full w-full"
                src={`https://www.youtube.com/embed/${video.youtube_id}`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : video.video_url ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video className="h-full w-full" controls poster={videoThumb(video)} src={video.video_url} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No playable source</div>
            )}
          </div>

          <div>
            <h1 className="text-xl font-black tracking-tight text-foreground md:text-2xl">{video.title}</h1>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#74ddc7]/30 to-[#7401df]/30 text-sm font-black text-foreground">
                  {(video.creator_name ?? "W").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{video.creator_name ?? "WCCG 104.5 FM"}</p>
                  <p className="text-xs text-muted-foreground">{timeAgo(video.published_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Eye className="h-4 w-4" /> {fmtViews(video.views)}</span>
                <span className="inline-flex items-center gap-1"><ThumbsUp className="h-4 w-4" /> {video.likes}</span>
                {video.youtube_url && (
                  <a href={video.youtube_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-red-600/15 px-2.5 py-1 text-red-400 hover:bg-red-600/25">
                    <Youtube className="h-4 w-4" /> YouTube
                  </a>
                )}
              </div>
            </div>
            {video.description && (
              <div className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                {video.description}
              </div>
            )}
          </div>
        </div>

        {/* Up next */}
        <aside className="space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Up next</h2>
          {related.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing else yet.</p>
          ) : (
            related.map((r) => (
              <Link key={r.id} href={`/videos/${r.id}`} className="group flex gap-3">
                <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={videoThumb(r)} alt={r.title} className="h-full w-full object-cover" loading="lazy" />
                  {r.duration_seconds ? (
                    <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-bold text-white">
                      {fmtDuration(r.duration_seconds)}
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0">
                  <h3 className="line-clamp-2 text-xs font-bold leading-snug text-foreground group-hover:text-[#74ddc7]">{r.title}</h3>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{r.creator_name ?? "WCCG"}</p>
                  <p className="text-[11px] text-muted-foreground">{fmtViews(r.views)} · {timeAgo(r.published_at)}</p>
                </div>
              </Link>
            ))
          )}
        </aside>
      </div>
    </div>
  );
}
