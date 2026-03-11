"use client";

import { ExternalLink, Play, Youtube } from "lucide-react";

interface YouTubeGridProps {
  channelUrl?: string;
  searchQuery?: string;
  maxVideos?: number;
  title?: string;
}

export function YouTubeGrid({
  channelUrl,
  searchQuery,
  maxVideos = 6,
  title,
}: YouTubeGridProps) {
  if (!channelUrl && !searchQuery) return null;

  const embedSrc = searchQuery
    ? `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(searchQuery)}`
    : undefined;

  // Generate placeholder cards (2-3 depending on maxVideos)
  const placeholderCount = Math.min(Math.max(2, Math.floor(maxVideos / 2)), 3);

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
              href={channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-[#74ddc7]/30 bg-[#74ddc7]/10 px-4 py-2 text-sm font-medium text-[#74ddc7] transition-colors hover:bg-[#74ddc7]/20"
            >
              View on YouTube
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}

      {/* Main embedded player */}
      {embedSrc && (
        <div className="overflow-hidden rounded-2xl border border-border bg-black/40">
          <div className="relative aspect-video w-full">
            <iframe
              src={embedSrc}
              title={searchQuery ? `Search: ${searchQuery}` : "YouTube Player"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          </div>
        </div>
      )}

      {/* Placeholder video cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: placeholderCount }).map((_, i) => (
          <div
            key={i}
            className="group relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-muted/50 to-muted/20 transition-all hover:border-[#74ddc7]/30 hover:shadow-lg hover:shadow-[#74ddc7]/5"
          >
            {/* Thumbnail placeholder */}
            <div className="relative aspect-video bg-gradient-to-br from-gray-800 to-gray-900">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 shadow-xl backdrop-blur-sm transition-transform group-hover:scale-110">
                  <Play className="h-6 w-6 text-white" fill="white" />
                </div>
              </div>
              {/* Duration badge */}
              <div className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
                --:--
              </div>
            </div>
            {/* Card info */}
            <div className="space-y-1.5 p-3">
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted/60" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
