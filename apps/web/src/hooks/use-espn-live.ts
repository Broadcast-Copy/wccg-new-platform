"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const DUKE_TEAM_ID = "150";
const POLL_INTERVAL_IDLE = 30_000;
const POLL_INTERVAL_LIVE = 10_000;

export interface LiveGameInfo {
  isLive: boolean;
  espnEventId: string | null;
  opponent: string | null;
  opponentLogo: string | null;
  dukeScore: number;
  opponentScore: number;
  period: number;
  clock: string;
  statusText: string;
}

const DEFAULT_GAME_INFO: LiveGameInfo = {
  isLive: false,
  espnEventId: null,
  opponent: null,
  opponentLogo: null,
  dukeScore: 0,
  opponentScore: 0,
  period: 0,
  clock: "",
  statusText: "",
};

interface ESPNCompetitor {
  id: string;
  team: {
    id: string;
    abbreviation: string;
    displayName?: string;
    logo?: string;
  };
  score?: {
    displayValue: string;
  };
}

interface ESPNEvent {
  id: string;
  shortName: string;
  competitions: Array<{
    competitors: ESPNCompetitor[];
    status: {
      type: {
        name: string;
        state: string;
        completed: boolean;
        shortDetail?: string;
      };
      displayClock: string;
      period: number;
    };
  }>;
}

interface ESPNScoreboardResponse {
  events: ESPNEvent[];
}

function buildStatusText(
  sport: "mens-college-basketball" | "college-football",
  period: number,
  state: string
): string {
  if (state === "pre") return "Pregame";
  if (state === "post") return "Final";

  if (sport === "mens-college-basketball") {
    if (period === 1) return "1st Half";
    if (period === 2) return "2nd Half";
    return `OT${period > 3 ? ` ${period - 2}` : ""}`;
  }

  // college-football
  const ordinals: Record<number, string> = {
    1: "1st Quarter",
    2: "2nd Quarter",
    3: "3rd Quarter",
    4: "4th Quarter",
  };
  return ordinals[period] ?? `OT${period > 4 ? ` ${period - 4}` : ""}`;
}

export function useESPNLive(
  sport: "mens-college-basketball" | "college-football"
): LiveGameInfo {
  const [gameInfo, setGameInfo] = useState<LiveGameInfo>(DEFAULT_GAME_INFO);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLiveRef = useRef(false);

  const fetchScoreboard = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return;

    const league =
      sport === "mens-college-basketball"
        ? "basketball/mens-college-basketball"
        : "football/college-football";

    const url = `https://site.api.espn.com/apis/site/v2/sports/${league}/scoreboard`;

    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;

      const data: ESPNScoreboardResponse = await res.json();

      for (const event of data.events) {
        const competition = event.competitions[0];
        if (!competition) continue;

        const dukeCompetitor = competition.competitors.find(
          (c) => c.id === DUKE_TEAM_ID || c.team?.id === DUKE_TEAM_ID
        );
        if (!dukeCompetitor) continue;

        const opponentCompetitor = competition.competitors.find(
          (c) => c.id !== DUKE_TEAM_ID && c.team?.id !== DUKE_TEAM_ID
        );

        const state = competition.status.type.state;
        const isLive = state === "in";
        const period = competition.status.period;
        const clock = competition.status.displayClock ?? "";

        const info: LiveGameInfo = {
          isLive,
          espnEventId: event.id,
          opponent: opponentCompetitor?.team?.displayName ?? opponentCompetitor?.team?.abbreviation ?? null,
          opponentLogo: opponentCompetitor?.team?.logo ?? null,
          dukeScore: parseInt(dukeCompetitor.score?.displayValue ?? "0", 10) || 0,
          opponentScore: parseInt(opponentCompetitor?.score?.displayValue ?? "0", 10) || 0,
          period,
          clock,
          statusText: buildStatusText(sport, period, state),
        };

        isLiveRef.current = isLive;
        setGameInfo(info);
        return;
      }

      // No Duke game found
      isLiveRef.current = false;
      setGameInfo(DEFAULT_GAME_INFO);
    } catch {
      // Silently fail, keep previous state or defaults
    }
  }, [sport]);

  useEffect(() => {
    // Fetch immediately on mount
    fetchScoreboard();

    function startPolling() {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const interval = isLiveRef.current
        ? POLL_INTERVAL_LIVE
        : POLL_INTERVAL_IDLE;
      intervalRef.current = setInterval(() => {
        fetchScoreboard().then(() => {
          // Re-evaluate polling interval when live status changes
          const currentInterval = isLiveRef.current
            ? POLL_INTERVAL_LIVE
            : POLL_INTERVAL_IDLE;
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = setInterval(fetchScoreboard, currentInterval);
          }
        });
      }, interval);
    }

    startPolling();

    // Pause/resume polling on visibility change
    function handleVisibility() {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        fetchScoreboard();
        startPolling();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchScoreboard]);

  return gameInfo;
}
