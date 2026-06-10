"use client";

import { Clock, MapPin, Sparkles, Star } from "lucide-react";
import type { Loadable, SpotlightListener } from "./arcade-data";

/**
 * Listener of the Week spotlight. Reads the latest row of
 * `listener_of_the_week` (public read); when the table is empty it shows a
 * tasteful "could be you" state instead of fake content.
 */
export function ListenerSpotlight({
  spotlight,
}: {
  spotlight: Loadable<SpotlightListener | null>;
}) {
  return (
    <section
      aria-label="Listener of the Week"
      className="relative overflow-hidden rounded-2xl border border-[#7401df]/30 bg-gradient-to-br from-[#7401df]/15 via-card to-[#74ddc7]/10"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#74ddc7]/15 blur-3xl" />

      <div className="relative p-5">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#f59e0b]" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#f59e0b]">
            Listener of the Week
          </h2>
        </div>

        {spotlight.status === "loading" && (
          <div className="space-y-3">
            <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="h-12 w-full animate-pulse rounded bg-muted" />
          </div>
        )}

        {spotlight.status === "error" && (
          <p className="py-4 text-sm text-muted-foreground">
            Couldn&apos;t load this week&apos;s spotlight. Check back soon.
          </p>
        )}

        {spotlight.status === "ready" && spotlight.data && (
          <div className="space-y-3">
            <div>
              <p className="text-2xl font-extrabold text-foreground">
                {spotlight.data.displayName}
              </p>
              {spotlight.data.city && (
                <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-[#74ddc7]" />
                  {spotlight.data.city}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              {spotlight.data.pointsEarned !== null && (
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Star className="h-4 w-4 text-[#f59e0b]" />
                  {spotlight.data.pointsEarned.toLocaleString()} WP
                </span>
              )}
              {spotlight.data.listeningHours !== null && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {spotlight.data.listeningHours.toLocaleString()}h listened
                </span>
              )}
            </div>

            {spotlight.data.quote && (
              <blockquote className="border-l-2 border-[#7401df]/50 pl-3 text-sm italic text-muted-foreground">
                &ldquo;{spotlight.data.quote}&rdquo;
              </blockquote>
            )}

            {spotlight.data.weekStartDate && (
              <p className="text-xs text-muted-foreground/70">
                Week of{" "}
                {new Date(spotlight.data.weekStartDate).toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric", year: "numeric" },
                )}
              </p>
            )}
          </div>
        )}

        {spotlight.status === "ready" && !spotlight.data && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-[#74ddc7]/40 bg-[#74ddc7]/5 text-2xl">
              🎙️
            </div>
            <div>
              <p className="font-bold text-foreground">
                This spotlight is empty… for now.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Could be you — keep listening! The week&apos;s top listener gets
                featured right here and on air.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
