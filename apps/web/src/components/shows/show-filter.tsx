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
  youtube?: { channelUrl: string };
  podcastRss?: string;
}

type FilterTab = "all" | "weekday" | "saturday" | "sunday" | "gospel";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All Shows" },
  { key: "weekday", label: "Mon \u2013 Fri" },
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
  const activeStreamTab = STREAM_TABS.find((t) => t.key === activeStream) ?? STREAM_TABS[0];
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  return (
    <div className="space-y-6">
      {/* Station Filter — Dropdown on mobile, scrollable pills on desktop */}

      {/* Mobile: Dropdown */}
      <div className="sm:hidden" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 rounded-xl bg-foreground/[0.06] border border-border px-4 py-3 text-sm font-medium text-foreground transition-all"
        >
          <span className="flex items-center gap-2">
            {activeStreamTab.logo ? (
              <span className="relative h-5 w-5 rounded-md overflow-hidden flex-shrink-0">
                <AppImage src={activeStreamTab.logo} alt={activeStreamTab.label} fill className="object-cover" sizes="20px" />
              </span>
            ) : (
              <Radio className="h-4 w-4 text-[#74ddc7]" />
            )}
            <span>{activeStreamTab.label}</span>
          </span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
        </button>
        {dropdownOpen && (
          <div className="mt-1 rounded-xl border border-border bg-card shadow-xl overflow-hidden z-50 relative">
            {STREAM_TABS.map((tab) => {
              const isActive = activeStream === tab.key;
              const showCount = tab.key === "all"
                ? shows.filter((s) => s.isActive).length
                : shows.filter((s) => s.isActive && s.streamId === tab.key).length;
              return (
                <button
                  key={tab.key}
                  onClick={() => { handleStreamChange(tab.key); setDropdownOpen(false); }}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors ${
                    isActive
                      ? "bg-[#74ddc7]/10 text-[#74ddc7] font-semibold"
                      : "text-foreground hover:bg-foreground/[0.04]"
                  }`}
                >
                  {tab.logo ? (
                    <span className="relative h-6 w-6 rounded-md overflow-hidden flex-shrink-0">
                      <AppImage src={tab.logo} alt={tab.label} fill className="object-cover" sizes="24px" />
                    </span>
                  ) : (
                    <Radio className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="flex-1 text-left">{tab.label}</span>
                  {showCount > 0 && (
                    <span className="text-xs text-muted-foreground/60">{showCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop: Scrollable pills */}
      <div className="hidden sm:flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {STREAM_TABS.map((tab) => {
          const isActive = activeStream === tab.key;
          const showCount = tab.key === "all"
            ? shows.filter((s) => s.isActive).length
            : shows.filter((s) => s.isActive && s.streamId === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => handleStreamChange(tab.key)}
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all flex-shrink-0 ${
                isActive
                  ? "bg-[#74ddc7] text-[#0a0a0f] shadow-md shadow-[#74ddc7]/20"
                  : "bg-foreground/[0.06] text-muted-foreground hover:bg-foreground/[0.1] hover:text-foreground/80"
              }`}
            >
              {tab.logo && (
                <span className="relative h-5 w-5 rounded-md overflow-hidden flex-shrink-0">
                  <AppImage src={tab.logo} alt={tab.label} fill className="object-cover" sizes="20px" />
                </span>
              )}
              {tab.key === "all" && <Radio className="h-3.5 w-3.5" />}
              <span>{tab.label}</span>
              {showCount > 0 && (
                <span className={`text-xs ${isActive ? "text-[#0a0a0f]/60" : "text-muted-foreground/60"}`}>
                  {showCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search + Day Filter row */}
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

        {/* Day Filter Tabs */}
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

export function ShowFilter({ shows }: { shows: FilterableShow[] }) {
  return (
    <Suspense fallback={<div className="h-32 flex items-center justify-center text-muted-foreground text-sm">Loading shows...</div>}>
      <ShowFilterInner shows={shows} />
    </Suspense>
  );
}
