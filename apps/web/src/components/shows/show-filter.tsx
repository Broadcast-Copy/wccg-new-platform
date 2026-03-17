"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { ShowCard } from "@/components/shows/show-card";

interface FilterableShow {
  id: string;
  name: string;
  slug: string;
  description?: string;
  tagline?: string;
  imageUrl?: string;
  isActive: boolean;
  hosts: { name: string; avatarUrl?: string; isPrimary?: boolean }[];
  timeSlot?: string;
  days?: string;
  dayPart?: string;
  category?: "weekday" | "saturday" | "sunday" | "gospel" | "mixsquad";
  streamId?: string;
  isSyndicated?: boolean;
  youtube?: { channelUrl: string };
  podcastRss?: string;
}

type FilterTab = "all" | "weekday" | "saturday" | "sunday" | "gospel";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All Shows" },
  { key: "weekday", label: "Mon – Fri" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
  { key: "gospel", label: "Gospel" },
];

export function ShowFilter({ shows }: { shows: FilterableShow[] }) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredShows = useMemo(() => {
    let result = shows;

    // Category filter
    if (activeFilter !== "all") {
      result = result.filter((show) => {
        if (activeFilter === "weekday")
          return show.category === "weekday" || show.category === "mixsquad";
        if (activeFilter === "saturday") return show.category === "saturday";
        if (activeFilter === "sunday")
          return show.category === "sunday" || show.category === "gospel";
        if (activeFilter === "gospel") return show.category === "gospel";
        return true;
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (show) =>
          show.name.toLowerCase().includes(q) ||
          show.hosts?.some((h) => h.name.toLowerCase().includes(q)) ||
          show.description?.toLowerCase().includes(q) ||
          show.tagline?.toLowerCase().includes(q) ||
          show.dayPart?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [shows, activeFilter, searchQuery]);

  const activeShows = filteredShows.filter((s) => s.isActive);
  const inactiveShows = filteredShows.filter((s) => !s.isActive);

  return (
    <div className="space-y-6">
      {/* Search + Filter row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search bar */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Search shows, hosts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-foreground/[0.03] border border-border pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 rounded-xl bg-foreground/[0.03] border border-border p-1 flex-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                activeFilter === tab.key
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Show count */}
      <p className="text-sm text-muted-foreground">
        Showing {activeShows.length} show{activeShows.length !== 1 ? "s" : ""}
        {activeFilter !== "all" && (
          <span>
            {" "}
            for{" "}
            {FILTER_TABS.find((t) => t.key === activeFilter)?.label}
          </span>
        )}
        {searchQuery.trim() && (
          <span> matching &ldquo;{searchQuery.trim()}&rdquo;</span>
        )}
      </p>

      {/* Active Shows */}
      {activeShows.length > 0 ? (
        <div className="flex flex-col gap-4">
          {activeShows.map((show) => (
            <ShowCard
              key={show.id}
              showId={show.id}
              title={show.name}
              description={show.tagline || show.description}
              hostName={
                show.hosts?.find((h) => h.isPrimary)?.name ??
                show.hosts?.[0]?.name
              }
              imageUrl={show.imageUrl}
              hosts={show.hosts?.map((h) => ({
                name: h.name,
                avatarUrl: h.avatarUrl,
              }))}
              timeSlot={show.timeSlot}
              days={show.days}
              dayPart={show.dayPart}
              category={show.category}
              streamId={show.streamId}
              isSyndicated={show.isSyndicated}
              youtubeUrl={show.youtube?.channelUrl}
              podcastRss={show.podcastRss}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col h-32 items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/20">
          <p className="text-sm text-muted-foreground">
            {searchQuery.trim()
              ? "No shows match your search."
              : "No shows found for this filter."}
          </p>
        </div>
      )}

      {/* Past Shows */}
      {inactiveShows.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-muted-foreground">
            Past Shows
          </h2>
          <div className="flex flex-col gap-4 opacity-60">
            {inactiveShows.map((show) => (
              <ShowCard
                key={show.id}
                showId={show.id}
                title={show.name}
                description={show.tagline || show.description}
                hostName={
                  show.hosts?.find((h) => h.isPrimary)?.name ??
                  show.hosts?.[0]?.name
                }
                imageUrl={show.imageUrl}
                hosts={show.hosts?.map((h) => ({
                  name: h.name,
                  avatarUrl: h.avatarUrl,
                }))}
                timeSlot={show.timeSlot}
                days={show.days}
                dayPart={show.dayPart}
                category={show.category}
                streamId={show.streamId}
                isSyndicated={show.isSyndicated}
                youtubeUrl={show.youtube?.channelUrl}
                podcastRss={show.podcastRss}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
