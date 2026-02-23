"use client";

import { useState } from "react";
import { AppImage as Image } from "@/components/ui/app-image";
import { ChannelCard } from "./channel-card";
import { Radio, Sparkles } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StreamMetadata {
  currentTitle?: string;
  currentArtist?: string;
  currentTrack?: string;
  albumArt?: string;
  listenerCount?: number;
  isLive?: boolean;
  lastUpdated?: string;
}

interface Stream {
  id: string;
  name: string;
  slug: string;
  description?: string;
  streamUrl?: string;
  category?: string;
  status?: string;
  sortOrder?: number;
  imageUrl?: string;
  metadata?: StreamMetadata;
  createdAt?: string;
  updatedAt?: string;
}

interface ChannelGuideGridProps {
  streams: Stream[];
}

// ---------------------------------------------------------------------------
// Channel logos for the featured rail
// ---------------------------------------------------------------------------

const CHANNEL_LOGOS: Record<string, string> = {
  stream_wccg: "/images/logos/wccg-logo.png",
  stream_soul: "/images/logos/soul-1045-logo.png",
  stream_hot: "/images/logos/hot-1045-logo.png",
  stream_vibe: "/images/logos/the-vibe-logo.png",
  stream_yard: "/images/logos/yard-riddim-logo.png",
  stream_mixsquad: "/images/logos/mix-squad-logo.png",
};

// ---------------------------------------------------------------------------
// Category config
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { key: "All", label: "All Channels", icon: Sparkles },
  { key: "MAIN", label: "Main" },
  { key: "GOSPEL", label: "Gospel" },
  { key: "HIP_HOP", label: "Hip Hop" },
  { key: "RNB", label: "R&B" },
  { key: "JAZZ", label: "Jazz" },
  { key: "TALK", label: "Talk" },
  { key: "SPORTS", label: "Sports" },
  { key: "COMMUNITY", label: "Community" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChannelGuideGrid({ streams }: ChannelGuideGridProps) {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredStreams =
    selectedCategory === "All"
      ? streams
      : streams.filter(
          (s) => s.category?.toUpperCase() === selectedCategory.toUpperCase(),
        );

  // Only show categories that have at least one stream
  const categoriesWithStreams = CATEGORIES.filter(
    (cat) =>
      cat.key === "All" ||
      streams.some((s) => s.category?.toUpperCase() === cat.key.toUpperCase()),
  );

  return (
    <div className="space-y-8">
      {/* Featured Channels — Logo Carousel */}
      <div className="relative">
        <div className="flex items-center gap-6 overflow-x-auto pb-2 scrollbar-hide">
          {streams.map((stream) => {
            const logo = CHANNEL_LOGOS[stream.id];
            return (
              <button
                key={stream.id}
                onClick={() => {
                  // Scroll the card into view
                  const el = document.getElementById(`channel-${stream.id}`);
                  el?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                className="group flex flex-col items-center gap-2 flex-shrink-0"
              >
                <div className="relative h-20 w-20 rounded-2xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 ring-2 ring-border/50 group-hover:ring-primary/50 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-primary/10">
                  {logo ? (
                    <Image
                      src={logo}
                      alt={stream.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Radio className="h-8 w-8 text-white/50" />
                    </div>
                  )}
                  {stream.metadata?.isLive && (
                    <div className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-card shadow-lg shadow-green-400/50" />
                  )}
                </div>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors max-w-[80px] truncate text-center">
                  {stream.name.replace("104.5", "").replace("FM", "").trim() || stream.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {categoriesWithStreams.map((cat) => {
          const isActive = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {cat.icon && <cat.icon className="h-3.5 w-3.5" />}
              {cat.label}
              {cat.key === "All" && (
                <span className={`ml-0.5 text-xs ${isActive ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}>
                  {streams.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Channels Grid */}
      {filteredStreams.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredStreams.map((stream) => (
            <div key={stream.id} id={`channel-${stream.id}`}>
              <ChannelCard
                streamId={stream.id}
                name={stream.name}
                description={stream.description}
                streamUrl={stream.streamUrl}
                category={stream.category}
                isLive={stream.metadata?.isLive}
                currentTrack={stream.metadata?.currentTrack}
                currentArtist={stream.metadata?.currentArtist}
                albumArt={stream.metadata?.albumArt}
                listenerCount={stream.metadata?.listenerCount}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col h-48 items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/20">
          <Radio className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {selectedCategory === "All"
              ? "No channels available at the moment."
              : `No ${CATEGORIES.find((c) => c.key === selectedCategory)?.label ?? selectedCategory} channels available.`}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">Check back soon for new content</p>
        </div>
      )}
    </div>
  );
}
