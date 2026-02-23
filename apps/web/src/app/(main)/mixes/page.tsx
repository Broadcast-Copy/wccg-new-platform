"use client";

import { useCallback, useEffect, useState } from "react";
import { Music, Disc3 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MixCard } from "@/components/mixes/mix-card";
import { apiClient } from "@/lib/api-client";

const GENRES = [
  "All",
  "Hip Hop",
  "R&B",
  "Gospel",
  "Reggae",
  "Afrobeats",
  "Club",
  "Soca",
  "Other",
];

interface Mix {
  id: string;
  title: string;
  hostName: string;
  genre?: string;
  duration?: number;
  playCount?: number;
  coverImageUrl?: string;
  audioUrl?: string;
  status?: "PUBLISHED" | "PROCESSING" | "HIDDEN";
}

export default function MixesPage() {
  const [mixes, setMixes] = useState<Mix[]>([]);
  const [loading, setLoading] = useState(true);
  const [genreFilter, setGenreFilter] = useState("All");
  const [hostFilter, setHostFilter] = useState("All");

  const fetchMixes = useCallback(async () => {
    try {
      const data = await apiClient<Mix[]>("/mixes");
      setMixes(Array.isArray(data) ? data : []);
    } catch {
      // API not available yet, show empty state
      setMixes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMixes();
  }, [fetchMixes]);

  // Derive unique hosts for the filter
  const uniqueHosts = Array.from(
    new Set(mixes.map((m) => m.hostName).filter(Boolean))
  );

  // Apply filters
  const filteredMixes = mixes.filter((mix) => {
    if (genreFilter !== "All" && mix.genre !== genreFilter) return false;
    if (hostFilter !== "All" && mix.hostName !== hostFilter) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-purple-950/60 to-gray-900 border border-border/30">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 30% 40%, rgba(116,1,223,0.3) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(116,221,199,0.2) 0%, transparent 50%)`,
            }}
          />
        </div>
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7401df] to-[#74ddc7] shadow-xl shadow-[#7401df]/20">
              <Music className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
                DJ Mixes
              </h1>
              <p className="text-base text-gray-400 max-w-2xl">
                Browse the latest mixes from WCCG DJs. From Hip Hop to Gospel,
                find your next favorite set.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Disc3 className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">Filters:</span>
        </div>

        <Select value={genreFilter} onValueChange={setGenreFilter}>
          <SelectTrigger className="w-[160px] border-white/15 bg-white/5 text-white">
            <SelectValue placeholder="Genre" />
          </SelectTrigger>
          <SelectContent>
            {GENRES.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {uniqueHosts.length > 0 && (
          <Select value={hostFilter} onValueChange={setHostFilter}>
            <SelectTrigger className="w-[180px] border-white/15 bg-white/5 text-white">
              <SelectValue placeholder="Host" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Hosts</SelectItem>
              {uniqueHosts.map((host) => (
                <SelectItem key={host} value={host}>
                  {host}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Content */}
      {loading ? (
        /* Loading skeleton */
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]"
            >
              <div className="aspect-square animate-pulse bg-white/10" />
              <div className="space-y-3 p-4">
                <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-white/5" />
                <div className="flex items-center justify-between">
                  <div className="h-5 w-16 animate-pulse rounded-full bg-white/5" />
                  <div className="h-3 w-12 animate-pulse rounded bg-white/5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredMixes.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredMixes.map((mix) => (
            <MixCard
              key={mix.id}
              id={mix.id}
              title={mix.title}
              hostName={mix.hostName}
              genre={mix.genre}
              duration={mix.duration}
              playCount={mix.playCount}
              coverImageUrl={mix.coverImageUrl}
              audioUrl={mix.audioUrl}
              status={mix.status}
            />
          ))}
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col h-48 items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/20">
          <Music className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            No mixes available yet. Check back soon!
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Our DJs are cooking up something fresh
          </p>
        </div>
      )}
    </div>
  );
}
