"use client";

import { useEffect, useState, useCallback } from "react";
import { ESPN_SCOREBOARD_URL } from "@/data/sports";

export interface ESPNGameData {
  dukeScore: number;
  opponentScore: number;
  period: number;
  clock: string;
  status: "pre" | "in" | "post";
  statusText: string;
  lastPlay?: string;
}

const POLL_INTERVAL = 30_000; // 30 seconds

/**
 * Hook that polls ESPN's public API for real-time Duke game scores.
 * Only polls while the game is in progress. Falls back gracefully.
 */
export interface ESPNHighlight {
  id: string;
  title: string;
  description: string;
  mp4Url: string;
  hlsUrl?: string;
  thumbnail?: string;
}

export function useESPNScores(enabled: boolean) {
  const [data, setData] = useState<ESPNGameData | null>(null);
  const [highlights, setHighlights] = useState<ESPNHighlight[]>([]);
  const [error, setError] = useState(false);

  const fetchScores = useCallback(async () => {
    try {
      const res = await fetch(ESPN_SCOREBOARD_URL, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      // Parse the ESPN response
      const header = json.header?.competitions?.[0];
      if (!header) return;

      const status = header.status;
      const state = status?.type?.state as string; // "pre" | "in" | "post"
      const clock = status?.displayClock || "";
      const period = status?.period || 0;
      const statusText = status?.type?.shortDetail || status?.type?.detail || "";

      // Find Duke and opponent scores
      const competitors = header.competitors || [];
      let dukeScore = 0;
      let opponentScore = 0;

      for (const c of competitors) {
        const teamId = c.id || c.team?.id;
        const score = parseInt(c.score || "0", 10);
        if (teamId === "150") {
          dukeScore = score;
        } else {
          opponentScore = score;
        }
      }

      // Try to get last play text
      let lastPlay: string | undefined;
      try {
        const plays = json.plays || [];
        if (plays.length > 0) {
          lastPlay = plays[plays.length - 1]?.text;
        }
      } catch {
        // no plays data
      }

      // Extract video highlights
      try {
        const videos: ESPNHighlight[] = [];
        const videoSources = [
          ...(json.videos || []),
          ...(json.highlights?.videos || []),
          ...(json.news?.articles || []).flatMap((a: Record<string, unknown>) =>
            (a as { video?: unknown[] }).video || []
          ),
        ];
        for (const v of videoSources) {
          const vid = v as Record<string, unknown>;
          const id = String(vid.id || vid.guid || Math.random());
          const title = String(vid.headline || vid.title || vid.name || "");
          const description = String(vid.description || vid.caption || "");
          // Find mp4 link
          const links = (vid.links as Record<string, unknown>) || {};
          const source = (links.source as Record<string, unknown>) || {};
          const mezzanine = (links.mezzanine as Record<string, unknown>) || {};
          const mp4Url = String(
            source.href || mezzanine.href || vid.url || ""
          );
          const mobile = (links.mobile as Record<string, unknown>) || {};
          const hlsUrl = mobile.href ? String(mobile.href) : undefined;
          // thumbnail
          const images = (vid.images || vid.posterImages || []) as Array<
            Record<string, unknown>
          >;
          const thumbnail = images.length > 0 ? String(images[0].url || images[0].href || "") : undefined;

          if (mp4Url && title) {
            videos.push({ id, title, description, mp4Url, hlsUrl, thumbnail });
          }
        }
        if (videos.length > 0) {
          setHighlights(videos);
        }
      } catch {
        // no video data
      }

      setData({
        dukeScore,
        opponentScore,
        period,
        clock,
        status: state as "pre" | "in" | "post",
        statusText,
        lastPlay,
      });
      setError(false);
    } catch {
      setError(true);
      // Keep last known data
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    fetchScores();
    const timer = setInterval(fetchScores, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [enabled, fetchScores]);

  return { data, highlights, error, refetch: fetchScores };
}
