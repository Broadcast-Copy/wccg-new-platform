"use client";

import { useEffect, useRef } from "react";

/**
 * Hook that awards points for continuous listening.
 *
 * Awards 1 point per POINTS_INTERVAL_MS (15 minutes) of continuous listening.
 * Tracks accumulated listening time in localStorage so it persists across
 * page navigations (since AudioProvider already persists the stream).
 *
 * Usage: call this hook in GlobalPlayer with the `isPlaying` state.
 */

const POINTS_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const STORAGE_KEY = "wccg_listening_points";
const ACCUMULATED_KEY = "wccg_listening_accumulated_ms";

interface PointsData {
  totalPoints: number;
  totalListeningMs: number;
  lastAwardedAt: string | null;
  history: Array<{
    points: number;
    reason: string;
    timestamp: string;
  }>;
}

function loadPointsData(): PointsData {
  if (typeof window === "undefined") {
    return { totalPoints: 0, totalListeningMs: 0, lastAwardedAt: null, history: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { totalPoints: 0, totalListeningMs: 0, lastAwardedAt: null, history: [] };
}

function savePointsData(data: PointsData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function loadAccumulated(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(ACCUMULATED_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

function saveAccumulated(ms: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACCUMULATED_KEY, String(ms));
  } catch {
    // ignore
  }
}

export function useListeningPoints(isPlaying: boolean) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickRef = useRef<number>(0);

  useEffect(() => {
    if (isPlaying) {
      // Start tracking
      lastTickRef.current = Date.now();

      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = now - lastTickRef.current;
        lastTickRef.current = now;

        // Add elapsed time to accumulated
        let accumulated = loadAccumulated() + elapsed;

        // Check if we've crossed a points threshold
        if (accumulated >= POINTS_INTERVAL_MS) {
          const pointsToAward = Math.floor(accumulated / POINTS_INTERVAL_MS);
          accumulated = accumulated % POINTS_INTERVAL_MS;

          // Award points
          const data = loadPointsData();
          data.totalPoints += pointsToAward;
          data.totalListeningMs += pointsToAward * POINTS_INTERVAL_MS;
          data.lastAwardedAt = new Date().toISOString();
          data.history.unshift({
            points: pointsToAward,
            reason: "LISTENING",
            timestamp: new Date().toISOString(),
          });
          // Keep only last 100 history entries
          if (data.history.length > 100) {
            data.history = data.history.slice(0, 100);
          }
          savePointsData(data);
        }

        saveAccumulated(accumulated);
      }, 30_000); // Check every 30 seconds
    } else {
      // Paused — save any final accumulated time
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying]);
}

/** Get the current points balance (for display) */
export function getListeningPoints(): number {
  return loadPointsData().totalPoints;
}

/** Get accumulated listening time toward next point (as percentage 0-100) */
export function getListeningProgress(): number {
  const accumulated = loadAccumulated();
  return Math.min(100, Math.floor((accumulated / POINTS_INTERVAL_MS) * 100));
}
