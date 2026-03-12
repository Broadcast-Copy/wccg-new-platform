"use client";

import { useState } from "react";
import Image from "next/image";
import { ExternalLink, Play, Youtube } from "lucide-react";
import type { YouTubeVideo } from "@/lib/youtube-rss";
import { YouTubeVideoModal } from "./youtube-video-modal";

interface YouTubeGridProps {
  channelUrl?: string;
  searchQuery?: string;
  maxVideos?: number;
  title?: string;
  videos?: YouTubeVideo[];
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

export function YouTubeGrid({
  channelUrl,
  searchQuery,
  maxVideos = 6,
  title,
  videos,
}: YouTubeGridProps) {
  const [activeVideo, setActiveVideo] = useState<YouTubeVideo | null>(null);

  if (!channelUrl && !searchQuery) return null;

  const videosUrl = channelUrl
    ? `${channelUrl.replace(/\/$/, "")}/videos`
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery ?? "")}`;

  const displayVideos = videos?.slice(0, maxVideos) ?? [];
  const hasRealVideos = displayVideos.length > 0;

  return (
    <section className="space-y-6">
      {/* Section header */}
      {title && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/20">
              <Youtube className="h-5 w-5 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h2>
          </div>
          {channelUrl && (
            <a
              href={videosUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
            >
              View on YouTube
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}

      {hasRealVideos ? (
        /* Real video thumbnails grid */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayVideos.map((video) => (
            <button
              key={video.videoId}
              onClick={() => setActiveVideo(video)}
              className="group relative overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:border-red-500/30 hover:shadow-lg hover:shadow-red-500/5"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video overflow-hidden bg-gray-900">
                <Image
                  src={video.thumbnailUrl}
                  alt={video.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform group-hover:scale-105"
                  unoptimized
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600/90 opacity-0 shadow-xl backdrop-blur-sm transition-all group-hover:scale-110 group-hover:opacity-100">
                    <Play className="ml-0.5 h-6 w-6 text-white" fill="white" />
                  </div>
                </div>
              </div>
              {/* Card info */}
              <div className="space-y-1 p-3">
                <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                  {video.title}
                </p>
                {video.publishedAt && (
                  <p className="text-xs text-muted-foreground">
                    {timeAgo(video.publishedAt)}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* Fallback: channel banner when no videos are available */
        <a
          href={videosUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-gray-900 via-red-950/30 to-gray-900 transition-all hover:border-red-500/40 hover:shadow-lg hover:shadow-red-500/10"
        >
          <div className="relative flex aspect-[21/9] w-full items-center justify-center">
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-600 shadow-xl shadow-red-600/30 transition-transform group-hover:scale-110">
                <Play className="ml-1 h-9 w-9 text-white" fill="white" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-white">Watch on YouTube</p>
                <p className="mt-1 text-sm text-white/50">
                  {searchQuery ?? title ?? "View latest videos"}
                </p>
              </div>
            </div>
          </div>
        </a>
      )}

      {/* Video player modal */}
      <YouTubeVideoModal
        videoId={activeVideo?.videoId ?? null}
        title={activeVideo?.title ?? ""}
        onClose={() => setActiveVideo(null)}
      />
    </section>
  );
}
