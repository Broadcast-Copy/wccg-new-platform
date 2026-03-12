"use client";

import { useState } from "react";
import { ShowCard } from "@/components/shows/show-card";

interface FilterableShow {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  hosts: { name: string; avatarUrl?: string; isPrimary?: boolean }[];
  timeSlot?: string;
  days?: string;
  dayPart?: string;
  category?: "weekday" | "saturday" | "sunday" | "gospel" | "mixsquad";
  streamId?: string;
  isSyndicated?: boolean;
}

type FilterTab = "all" | "weekday" | "saturday" | "sunday";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All Shows" },
  { key: "weekday", label: "Mon – Fri" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

export function ShowFilter({ shows }: { shows: FilterableShow[] }) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  const filteredShows = shows.filter((show) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "weekday")
      return show.category === "weekday" || show.category === "mixsquad";
    if (activeFilter === "saturday") return show.category === "saturday";
    if (activeFilter === "sunday")
      return show.category === "sunday" || show.category === "gospel";
    return true;
  });

  const activeShows = filteredShows.filter((s) => s.isActive);
  const inactiveShows = filteredShows.filter((s) => !s.isActive);

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex items-center gap-1 rounded-xl bg-foreground/[0.03] border border-border p-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeFilter === tab.key
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05]"
            }`}
          >
            {tab.label}
          </button>
        ))}
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
      </p>

      {/* Active Shows */}
      {activeShows.length > 0 ? (
        <div className="flex flex-col gap-4">
          {activeShows.map((show) => (
            <ShowCard
              key={show.id}
              showId={show.id}
              title={show.name}
              description={show.description}
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
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col h-32 items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/20">
          <p className="text-sm text-muted-foreground">
            No shows found for this filter.
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
                description={show.description}
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
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
