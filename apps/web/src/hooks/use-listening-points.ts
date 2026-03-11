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
const ONE_HOUR_MS = 60 * 60 * 1000;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const STORAGE_KEY = "wccg_listening_points";
const ACCUMULATED_KEY = "wccg_listening_accumulated_ms";
const SESSION_START_KEY = "wccg_listening_session_start";

interface PointsData {
  totalPoints: number;
  totalListeningMs: number;
  lastAwardedAt: string | null;
  /** ISO date string (YYYY-MM-DD) of last share bonus */
  lastShareDate?: string;
  /** ISO date string (YYYY-MM-DD) of last daily bounty */
  lastBountyDate?: string;
  /** Whether the 1-hour streak bonus was awarded this session */
  streak1hAwarded?: boolean;
  /** Whether the 2-hour streak bonus was awarded this session */
  streak2hAwarded?: boolean;
  history: Array<{
    points: number;
    reason: string;
    timestamp: string;
  }>;
}

function defaultPointsData(): PointsData {
  return {
    totalPoints: 0,
    totalListeningMs: 0,
    lastAwardedAt: null,
    lastShareDate: undefined,
    lastBountyDate: undefined,
    streak1hAwarded: false,
    streak2hAwarded: false,
    history: [],
  };
}

function loadPointsData(): PointsData {
  if (typeof window === "undefined") {
    return defaultPointsData();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultPointsData(), ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return defaultPointsData();
}

/** Get today's date string in YYYY-MM-DD format (ET timezone) */
function todayET(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

/** Save listening session start timestamp */
function saveSessionStart(ts: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSION_START_KEY, String(ts));
  } catch {
    // ignore
  }
}

/** Load listening session start timestamp */
function loadSessionStart(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(SESSION_START_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

/** Clear listening session start (when playback stops) */
function clearSessionStart() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_START_KEY);
  } catch {
    // ignore
  }
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
      const now = Date.now();
      lastTickRef.current = now;

      // Start a new continuous session if one isn't active
      if (!loadSessionStart()) {
        saveSessionStart(now);
        // Reset streak flags for new session
        const data = loadPointsData();
        data.streak1hAwarded = false;
        data.streak2hAwarded = false;
        savePointsData(data);
      }

      // Daily bounty — award 3 points on first listen of the day
      {
        const data = loadPointsData();
        const today = todayET();
        if (data.lastBountyDate !== today) {
          data.lastBountyDate = today;
          data.totalPoints += 3;
          data.lastAwardedAt = new Date().toISOString();
          data.history.unshift({
            points: 3,
            reason: "DAILY_BOUNTY",
            timestamp: new Date().toISOString(),
          });
          if (data.history.length > 100) {
            data.history = data.history.slice(0, 100);
          }
          savePointsData(data);
        }
      }

      intervalRef.current = setInterval(() => {
        const tickNow = Date.now();
        const elapsed = tickNow - lastTickRef.current;
        lastTickRef.current = tickNow;

        // Add elapsed time to accumulated
        let accumulated = loadAccumulated() + elapsed;

        // Check if we've crossed a points threshold
        if (accumulated >= POINTS_INTERVAL_MS) {
          const pointsToAward = Math.floor(accumulated / POINTS_INTERVAL_MS);
          accumulated = accumulated % POINTS_INTERVAL_MS;

          // Award listening points
          const data = loadPointsData();
          data.totalPoints += pointsToAward;
          data.totalListeningMs += pointsToAward * POINTS_INTERVAL_MS;
          data.lastAwardedAt = new Date().toISOString();
          data.history.unshift({
            points: pointsToAward,
            reason: "LISTENING",
            timestamp: new Date().toISOString(),
          });
          if (data.history.length > 100) {
            data.history = data.history.slice(0, 100);
          }
          savePointsData(data);
        }

        saveAccumulated(accumulated);

        // --- Listening streak bonuses ---
        const sessionStart = loadSessionStart();
        if (sessionStart) {
          const sessionDuration = tickNow - sessionStart;
          const data = loadPointsData();

          // 2-hour streak: 10 bonus points (check first since it's larger)
          if (sessionDuration >= TWO_HOURS_MS && !data.streak2hAwarded) {
            data.streak2hAwarded = true;
            data.totalPoints += 10;
            data.lastAwardedAt = new Date().toISOString();
            data.history.unshift({
              points: 10,
              reason: "STREAK_BONUS",
              timestamp: new Date().toISOString(),
            });
            if (data.history.length > 100) {
              data.history = data.history.slice(0, 100);
            }
            savePointsData(data);
          }
          // 1-hour streak: 5 bonus points
          else if (sessionDuration >= ONE_HOUR_MS && !data.streak1hAwarded) {
            data.streak1hAwarded = true;
            data.totalPoints += 5;
            data.lastAwardedAt = new Date().toISOString();
            data.history.unshift({
              points: 5,
              reason: "STREAK_BONUS",
              timestamp: new Date().toISOString(),
            });
            if (data.history.length > 100) {
              data.history = data.history.slice(0, 100);
            }
            savePointsData(data);
          }
        }
      }, 30_000); // Check every 30 seconds
    } else {
      // Paused — save any final accumulated time and clear session
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      clearSessionStart();
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

/**
 * Award 2 points for sharing the player.
 * Can only be awarded once per day (based on ET timezone).
 * Returns true if points were awarded, false if already claimed today.
 */
export function awardSharePoints(): boolean {
  const data = loadPointsData();
  const today = todayET();

  if (data.lastShareDate === today) {
    return false; // Already awarded today
  }

  data.lastShareDate = today;
  data.totalPoints += 2;
  data.lastAwardedAt = new Date().toISOString();
  data.history.unshift({
    points: 2,
    reason: "SHARE",
    timestamp: new Date().toISOString(),
  });
  if (data.history.length > 100) {
    data.history = data.history.slice(0, 100);
  }
  savePointsData(data);
  return true;
}
