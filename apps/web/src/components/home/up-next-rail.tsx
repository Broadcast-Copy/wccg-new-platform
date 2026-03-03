"use client";

import { useEffect, useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ShowCard } from "@/components/shows/show-card";
import { apiClient } from "@/lib/api-client";
import { Clock } from "lucide-react";

interface ScheduleHost {
  id: string;
  name: string;
  slug: string;
  avatarUrl?: string;
  isPrimary?: boolean;
}

interface ScheduleShow {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  hosts: ScheduleHost[];
}

interface ScheduleStream {
  id: string;
  name: string;
  slug: string;
}

interface UpcomingShow {
  id: string;
  streamId: string;
  showId: string;
  title: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  stream?: ScheduleStream;
  show?: ScheduleShow;
}

export function UpNextRail() {
  const [shows, setShows] = useState<UpcomingShow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchUpcoming() {
      try {
        const data = await apiClient<UpcomingShow[]>(
          "/schedule/upcoming?limit=6",
        );
        setShows(data);
      } catch {
        setShows([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUpcoming();
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
                  showId={show.showId ?? show.show?.id ?? show.id}
                  title={show.title ?? show.show?.name ?? "Untitled"}
                  hostName={show.show?.hosts?.find((h) => h.isPrimary)?.name ?? show.show?.hosts?.[0]?.name}
                  timeSlot={new Date(show.startTime).toLocaleTimeString(
                    "en-US",
                    {
                      hour: "numeric",
                      minute: "2-digit",
                    },
                  )}
                  imageUrl={show.show?.imageUrl}
                />
              </div>
            ))
          ) : (
            <div className="flex h-32 w-full items-center justify-center rounded-lg border bg-muted/50">
              <p className="text-sm text-muted-foreground">
                Check the{" "}
                <a href="/schedule" className="underline hover:text-foreground">
                  full schedule
                </a>{" "}
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
