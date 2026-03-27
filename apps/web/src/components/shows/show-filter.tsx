"use client";

import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Radio, ChevronDown } from "lucide-react";
import { AppImage } from "@/components/ui/app-image";
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
  youtube?: { channelUrl: string; latestVideoId?: string; latestVideoTitle?: string; latestThumbnailUrl?: string };
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

const STREAM_TABS: { key: string; label: string; logo: string }[] = [
  { key: "all", label: "All Stations", logo: "" },
  { key: "stream_wccg", label: "WCCG 104.5", logo: "/images/logos/wccg-logo.png" },
  { key: "stream_soul", label: "Soul 104.5", logo: "/images/logos/soul-1045-logo.png" },
  { key: "stream_hot", label: "Hot 104.5", logo: "/images/logos/hot-1045-logo.png" },
  { key: "stream_vibe", label: "The Vibe", logo: "/images/logos/the-vibe-logo.png" },
  { key: "stream_mixsquad", label: "MixxSquadd", logo: "/images/logos/mix-squad-logo.png" },
  { key: "stream_yard", label: "Yard & Riddim", logo: "/images/logos/yard-riddim-logo.png" },
];

function DropdownSelect({
  items,
  activeKey,
  onSelect,
  showCounts,
}: {
  items: { key: string; label: string; logo?: string }[];
  activeKey: string;
  onSelect: (key: string) => void;
  showCounts?: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeItem = items.find((i) => i.key === activeKey) ?? items[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl bg-foreground/[0.03] border border-border px-3 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-foreground/[0.06] whitespace-nowrap"
      >
        {activeItem.logo ? (
          <span className="relative h-4 w-4 rounded-sm overflow-hidden flex-shrink-0">
            <AppImage src={activeItem.logo} alt={activeItem.label} fill className="object-cover" sizes="16px" />
          </span>
        ) : items[0]?.logo !== undefined ? (
          <Radio className="h-3.5 w-3.5 text-[#74ddc7]" />
        ) : null}
        <span>{activeItem.label}</span>
        {showCounts && showCounts[activeKey] !== undefined && (
          <span className="text-xs text-muted-foreground/60">{showCounts[activeKey]}</span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 min-w-[200px] rounded-xl border border-border bg-card shadow-xl overflow-hidden z-50">
          {items.map((item) => {
            const isActive = activeKey === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { onSelect(item.key); setOpen(false); }}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-[#74ddc7]/10 text-[#74ddc7] font-semibold"
                    : "text-foreground hover:bg-foreground/[0.04]"
                }`}
              >
                {item.logo ? (
                  <span className="relative h-5 w-5 rounded-md overflow-hidden flex-shrink-0">
                    <AppImage src={item.logo} alt={item.label} fill className="object-cover" sizes="20px" />
                  </span>
                ) : items[0]?.logo !== undefined ? (
                  <Radio className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : null}
                <span className="flex-1 text-left">{item.label}</span>
                {showCounts && showCounts[item.key] !== undefined && showCounts[item.key] > 0 && (
                  <span className="text-xs text-muted-foreground/60">{showCounts[item.key]}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ShowFilterInner({ shows }: { shows: FilterableShow[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialStream = searchParams.get("stream") || "all";

  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [activeStream, setActiveStream] = useState(initialStream);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const stream = searchParams.get("stream") || "all";
    setActiveStream(stream);
  }, [searchParams]);

  function handleStreamChange(streamKey: string) {
    setActiveStream(streamKey);
    if (streamKey === "all") {
      router.replace("/shows", { scroll: false });
    } else {
      router.replace(`/shows?stream=${streamKey}`, { scroll: false });
    }
  }

  const filteredShows = useMemo(() => {
    let result = shows;

    // Stream/station filter
    if (activeStream !== "all") {
      result = result.filter((show) => show.streamId === activeStream);
    }

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
  }, [shows, activeFilter, activeStream, searchQuery]);

  const activeShows = filteredShows.filter((s) => s.isActive);
  const inactiveShows = filteredShows.filter((s) => !s.isActive);

  const activeStreamLabel = STREAM_TABS.find((t) => t.key === activeStream)?.label;

  // Compute show counts for station dropdown
  const streamCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tab of STREAM_TABS) {
      counts[tab.key] = tab.key === "all"
        ? shows.filter((s) => s.isActive).length
        : shows.filter((s) => s.isActive && s.streamId === tab.key).length;
    }
    return counts;
  }, [shows]);

  return (
    <div className="space-y-6">
      {/* Search + Dropdowns — all on one row */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* Search bar */}
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Search shows, hosts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-foreground/[0.03] border border-border pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
        </div>

        {/* Station dropdown */}
        <DropdownSelect
          items={STREAM_TABS}
          activeKey={activeStream}
          onSelect={handleStreamChange}
          showCounts={streamCounts}
        />

        {/* Day filter dropdown */}
        <DropdownSelect
          items={FILTER_TABS}
          activeKey={activeFilter}
          onSelect={(key) => setActiveFilter(key as FilterTab)}
        />
      </div>

      {/* Show count */}
      <p className="text-sm text-muted-foreground">
        Showing {activeShows.length} show{activeShows.length !== 1 ? "s" : ""}
        {activeStream !== "all" && (
          <span> on <span className="font-medium text-foreground">{activeStreamLabel}</span></span>
        )}
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
              youtubeUrl={show.youtube?.latestVideoId ? `https://www.youtube.com/watch?v=${show.youtube.latestVideoId}` : show.youtube?.channelUrl}
              youtubeThumbnailUrl={show.youtube?.latestThumbnailUrl}
              youtubeVideoTitle={show.youtube?.latestVideoTitle}
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
                youtubeUrl={show.youtube?.latestVideoId ? `https://www.youtube.com/watch?v=${show.youtube.latestVideoId}` : show.youtube?.channelUrl}
              youtubeThumbnailUrl={show.youtube?.latestThumbnailUrl}
              youtubeVideoTitle={show.youtube?.latestVideoTitle}
                podcastRss={show.podcastRss}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function ShowFilter({ shows }: { shows: FilterableShow[] }) {
  return (
    <Suspense fallback={<div className="h-32 flex items-center justify-center text-muted-foreground text-sm">Loading shows...</div>}>
      <ShowFilterInner shows={shows} />
    </Suspense>
  );
}
