"use client";

import { useEffect, useRef } from "react";

/**
 * Hook that awards points for continuous listening.
 *
 * Awards 1 point per POINTS_INTERVAL_MS (1 minute 30 seconds) of continuous listening.
 * Tracks accumulated listening time in localStorage so it persists across
 * page navigations (since AudioProvider already persists the stream).
 * Points are persisted per-user when an email is provided via setPointsUserEmail().
 *
 * Usage: call this hook in GlobalPlayer with the `isPlaying` state.
 */

const POINTS_INTERVAL_MS = 90 * 1000; // 1 minute 30 seconds
const ONE_HOUR_MS = 60 * 60 * 1000;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const STORAGE_KEY_DEFAULT = "wccg_listening_points";
const ACCUMULATED_KEY_DEFAULT = "wccg_listening_accumulated_ms";
const SESSION_START_KEY = "wccg_listening_session_start";
const BOUNTY_TRACKER_KEY_DEFAULT = "wccg_bounty_tracker";

/** Currently resolved email — set via setPointsUserEmail */
let _currentEmail: string | null = null;

/** Set the logged-in user email so points persist per-user */
export function setPointsUserEmail(email: string | null) {
  _currentEmail = email;
}

function storageKey(): string {
  return _currentEmail
    ? `wccg_listening_points_${_currentEmail}`
    : STORAGE_KEY_DEFAULT;
}

function accumulatedKey(): string {
  return _currentEmail
    ? `wccg_listening_accumulated_${_currentEmail}`
    : ACCUMULATED_KEY_DEFAULT;
}

function bountyTrackerKey(): string {
  return _currentEmail
    ? `wccg_bounty_tracker_${_currentEmail}`
    : BOUNTY_TRACKER_KEY_DEFAULT;
}

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
    const raw = localStorage.getItem(storageKey());
    if (raw) return { ...defaultPointsData(), ...JSON.parse(raw) };

    // Fallback: if user-specific key has no data, migrate from default key
    if (_currentEmail) {
      const fallback = localStorage.getItem(STORAGE_KEY_DEFAULT);
      if (fallback) {
        const data = { ...defaultPointsData(), ...JSON.parse(fallback) };
        // Save to user-specific key and clear default
        localStorage.setItem(storageKey(), JSON.stringify(data));
        localStorage.removeItem(STORAGE_KEY_DEFAULT);
        return data;
      }
    }
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
    localStorage.setItem(storageKey(), JSON.stringify(data));
  } catch {
    // ignore
  }
}

function loadAccumulated(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(accumulatedKey());
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

function saveAccumulated(ms: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(accumulatedKey(), String(ms));
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

// ---------------------------------------------------------------------------
// Bounty tracker helpers (prevents abuse by tracking claimed bounty IDs)
// ---------------------------------------------------------------------------

interface BountyTracker {
  /** Set of bounty IDs that have already been claimed */
  claimed: string[];
}

function loadBountyTracker(): BountyTracker {
  if (typeof window === "undefined") return { claimed: [] };
  try {
    const raw = localStorage.getItem(bountyTrackerKey());
    if (raw) return JSON.parse(raw) as BountyTracker;
  } catch {
    // ignore
  }
  return { claimed: [] };
}

function saveBountyTracker(tracker: BountyTracker) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(bountyTrackerKey(), JSON.stringify(tracker));
  } catch {
    // ignore
  }
}

function isBountyClaimed(bountyId: string): boolean {
  const tracker = loadBountyTracker();
  return tracker.claimed.includes(bountyId);
}

function claimBounty(bountyId: string) {
  const tracker = loadBountyTracker();
  if (!tracker.claimed.includes(bountyId)) {
    tracker.claimed.push(bountyId);
    // Keep tracker from growing unbounded
    if (tracker.claimed.length > 500) {
      tracker.claimed = tracker.claimed.slice(-500);
    }
    saveBountyTracker(tracker);
  }
}

/**
 * Award 2 points for sharing the player.
 * Each share event should provide a unique bountyId (e.g., "share_<timestamp>").
 * The same bountyId cannot be claimed twice.
 * Returns true if points were awarded, false if this bounty was already claimed.
 */
export function awardShareBonus(bountyId?: string): boolean {
  const id = bountyId ?? `share_${todayET()}`;
  if (isBountyClaimed(id)) {
    return false;
  }

  const data = loadPointsData();
  data.totalPoints += 2;
  data.lastAwardedAt = new Date().toISOString();
  data.history.unshift({
    points: 2,
    reason: "SHARE_BONUS",
    timestamp: new Date().toISOString(),
  });
  if (data.history.length > 100) {
    data.history = data.history.slice(0, 100);
  }
  savePointsData(data);
  claimBounty(id);
  return true;
}

/**
 * Award 5 points when a referral code is used.
 * The referralCode is used as the bounty ID to prevent double-claiming.
 * Returns true if points were awarded, false if this referral was already claimed.
 */
export function awardReferralBonus(referralCode: string): boolean {
  const id = `referral_${referralCode}`;
  if (isBountyClaimed(id)) {
    return false;
  }

  const data = loadPointsData();
  data.totalPoints += 5;
  data.lastAwardedAt = new Date().toISOString();
  data.history.unshift({
    points: 5,
    reason: "REFERRAL_BONUS",
    timestamp: new Date().toISOString(),
  });
  if (data.history.length > 100) {
    data.history = data.history.slice(0, 100);
  }
  savePointsData(data);
  claimBounty(id);
  return true;
}
