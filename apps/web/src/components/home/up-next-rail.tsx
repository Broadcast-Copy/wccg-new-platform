"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ShowCard } from "@/components/shows/show-card";
import { createClient } from "@/lib/supabase/client";
import { Clock } from "lucide-react";

const UPCOMING_LIMIT = 6;

// Shape of a schedule_blocks row with its embedded show parent.
// schedule_blocks.show_id → shows.id is many-to-one, so the embed resolves to
// a single object; we tolerate an array shape too since PostgREST result
// typings can surface either form.
interface EmbeddedShow {
  id: string;
  name: string | null;
  slug: string | null;
  image_url: string | null;
}

interface ScheduleBlockRow {
  id: string;
  stream_id: string | null;
  show_id: string | null;
  title: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  shows: EmbeddedShow | EmbeddedShow[] | null;
}

// View-model the card renders. Computed entirely client-side from the active
// schedule blocks (no API server).
interface UpcomingShow {
  id: string;
  streamId?: string;
  showId?: string;
  title: string;
  timeSlot: string;
  imageUrl?: string;
}

/** Normalize the embedded relationship to a single parent row (or null). */
function firstShow(
  embed: EmbeddedShow | EmbeddedShow[] | null,
): EmbeddedShow | null {
  if (!embed) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

/** Minutes since Sunday 00:00 for a (day_of_week, 'HH:mm') pair. */
function weekMinutes(dayOfWeek: number, startTime: string): number {
  const [h, m] = startTime.split(":");
  const hours = Number(h) || 0;
  const mins = Number(m) || 0;
  return dayOfWeek * 24 * 60 + hours * 60 + mins;
}

/** Format an 'HH:mm' string as a 12-hour clock label (e.g. "6:00 AM"). */
function formatTimeSlot(startTime: string): string {
  const [h, m] = startTime.split(":");
  const hours = Number(h);
  const mins = Number(m);
  if (Number.isNaN(hours) || Number.isNaN(mins)) return startTime;
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(mins).padStart(2, "0")} ${period}`;
}

/**
 * Order active blocks starting from "now" (current weekday + time), wrapping
 * around the week, and return the next `limit` of them. day_of_week is
 * 0=Sun..6=Sat; start_time is an 'HH:mm' string.
 */
function nextUpcoming(rows: ScheduleBlockRow[], limit: number): UpcomingShow[] {
  const now = new Date();
  const nowMinutes = weekMinutes(now.getDay(), `${now.getHours()}:${now.getMinutes()}`);
  const WEEK = 7 * 24 * 60;

  return [...rows]
    .map((row) => ({
      row,
      // Minutes from now until this block's next occurrence (wrap the week).
      delta: (weekMinutes(row.day_of_week, row.start_time) - nowMinutes + WEEK) % WEEK,
    }))
    .sort((a, b) => a.delta - b.delta)
    .slice(0, limit)
    .map(({ row }) => {
      const show = firstShow(row.shows);
      return {
        id: row.id,
        streamId: row.stream_id ?? undefined,
        showId: show?.id ?? row.show_id ?? undefined,
        title: show?.name ?? row.title ?? "Untitled",
        timeSlot: formatTimeSlot(row.start_time),
        imageUrl: show?.image_url ?? undefined,
      };
    });
}

export function UpNextRail() {
  const [shows, setShows] = useState<UpcomingShow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Compute upcoming shows directly from Supabase (browser → Supabase, no API
  // server). The effect body keeps setState out of the synchronous path: a
  // pure async fetch returns the computed view-models, and an `active` guard
  // drops stale results before any setState runs.
  useEffect(() => {
    let active = true;

    async function fetchUpcoming(): Promise<UpcomingShow[]> {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("schedule_blocks")
        .select(
          "id,stream_id,show_id,title,day_of_week,start_time,end_time, shows(id,name,slug,image_url)",
        )
        .eq("is_active", true);

      if (error) return [];

      return nextUpcoming((data as ScheduleBlockRow[] | null) ?? [], UPCOMING_LIMIT);
    }

    fetchUpcoming()
      .then((rows) => {
        if (!active) return;
        setShows(rows);
        setIsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        // Degrade gracefully — render the empty state instead of crashing.
        setShows([]);
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Up Next</h2>
        <Clock className="h-5 w-5 text-muted-foreground" />
      </div>
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-40 w-64 shrink-0 animate-pulse rounded-lg border bg-muted/50"
              />
            ))
          ) : shows.length > 0 ? (
            shows.map((show) => (
              <div key={show.id} className="w-64 shrink-0">
                <ShowCard
                  showId={show.showId ?? show.id}
                  title={show.title}
                  timeSlot={show.timeSlot}
                  streamId={show.streamId}
                  imageUrl={show.imageUrl}
                />
              </div>
            ))
          ) : (
            <div className="flex h-32 w-full items-center justify-center rounded-lg border bg-muted/50">
              <p className="text-sm text-muted-foreground">
                Check the{" "}
                <Link href="/shows" className="underline hover:text-foreground">
                  full schedule
                </Link>{" "}
                for upcoming shows.
              </p>
            </div>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
}
