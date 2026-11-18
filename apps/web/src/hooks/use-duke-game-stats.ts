"use client";

import { useEffect, useState } from "react";
import { parseDukeGameStats, selectDukeEvent, type DukeGameStats } from "@/lib/duke-game-stats";

export type DukeSport = "college-football" | "mens-college-basketball";
export interface DukeGameStatsState {
  game: DukeGameStats | null;
  loading: boolean;
  error: boolean;
  fetchedAt: number | null;
}

export function useDukeGameStats(sport: DukeSport): DukeGameStatsState {
  const [state, setState] = useState<DukeGameStatsState>({ game: null, loading: true, error: false, fetchedAt: null });
  useEffect(() => {
    let active = true;
    let running = false;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController | null = null;
    let live = false;
    const league = sport === "college-football" ? "football/college-football" : "basketball/mens-college-basketball";
    const base = `https://site.api.espn.com/apis/site/v2/sports/${league}`;
    async function read(url: string) {
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.any([controller!.signal, AbortSignal.timeout(8000)]) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    }
    async function poll() {
      if (!active || running) return;
      clearTimeout(timer);
      if (document.hidden) { timer = setTimeout(poll, 60_000); return; }
      running = true;
      controller = new AbortController();
      try {
        const dateParts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
        const date = ["year", "month", "day"].map(key => dateParts.find(part => part.type === key)?.value).join("");
        const eventId = selectDukeEvent(await read(`${base}/scoreboard?groups=50&limit=1000&dates=${date}`));
        // Drop the prior event before fetching a new summary, so a failed request
        // cannot put yesterday's score or player rows under today's matchup.
        if (active) setState(previous => previous.game?.eventId === eventId ? previous : { game: null, loading: !!eventId, error: false, fetchedAt: null });
        const game = eventId ? parseDukeGameStats(await read(`${base}/summary?event=${eventId}`), eventId) : null;
        if (eventId && !game) throw new Error("Game summary did not match Duke event");
        live = game?.state === "in";
        if (active) setState({ game, loading: false, error: false, fetchedAt: Date.now() });
      } catch {
        if (active) setState(previous => ({ ...previous, loading: false, error: true }));
      } finally {
        running = false;
        if (active) timer = setTimeout(poll, live ? 10_000 : 60_000);
      }
    }
    void poll();
    const onVisible = () => { if (!document.hidden) void poll(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      controller?.abort();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [sport]);
  return state;
}
