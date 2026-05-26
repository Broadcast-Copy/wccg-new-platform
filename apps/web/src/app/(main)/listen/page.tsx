"use client";

/**
 * /listen — the audio-first listener experience.
 *
 * Owns the live-now hero, daily-streak loop, leaderboard, artist-rail
 * discovery, and the push-prompt opt-in. Previously these all lived
 * at the top of /, but the home page is now a cleaner landing surface
 * and listeners come here to actually tune in + earn.
 */

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LiveNowHero } from "@/components/home/live-now-hero";
import { DailyStreakCard } from "@/components/home/daily-streak-card";
import { LeaderboardCard } from "@/components/home/leaderboard-card";
import { ArtistRail } from "@/components/home/artist-rail";
import { PushPrompt } from "@/components/notifications/push-prompt";
import { track } from "@/lib/analytics";

export default function ListenPage() {
  // One visit_listen event per page load — mirrors the existing
  // visit_home funnel so we can compare visit→play conversion between
  // the home landing surface and this dedicated /listen surface.
  const trackedRef = useRef(false);
  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    void track("visit_listen");
  }, []);

  return (
    <div className="space-y-10">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Home
        </Link>
      </div>

      {/* A1 — audio-first hero. Single biggest lever for visit→play. */}
      <LiveNowHero />

      {/* A4 + A5 — engagement loops, side by side under the hero. */}
      <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <DailyStreakCard />
        <LeaderboardCard />
      </section>

      {/* A3 — discovery bridge for the artist on air right now. */}
      <ArtistRail />

      {/* A6 — non-blocking opt-in nudge after 2 minutes of listening. */}
      <PushPrompt />
    </div>
  );
}
