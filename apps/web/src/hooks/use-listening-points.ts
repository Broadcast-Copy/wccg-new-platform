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
    program?: string;
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
    if (raw) {
      const data = { ...defaultPointsData(), ...JSON.parse(raw) };

      // Merge orphaned default key into user key (points earned before login)
      if (_currentEmail) {
        const orphaned = localStorage.getItem(STORAGE_KEY_DEFAULT);
        if (orphaned) {
          const orphanedData: PointsData = {
            ...defaultPointsData(),
            ...JSON.parse(orphaned),
          };
          if (orphanedData.totalPoints > 0 || orphanedData.history.length > 0) {
            data.totalPoints += orphanedData.totalPoints;
            data.totalListeningMs += orphanedData.totalListeningMs;
            // Merge history entries, de-duplicate by timestamp+reason
            const existingKeys = new Set(
              data.history.map(
                (h: { timestamp: string; reason: string; points: number }) =>
                  `${h.timestamp}_${h.reason}_${h.points}`,
              ),
            );
            for (const h of orphanedData.history) {
              const key = `${h.timestamp}_${h.reason}_${h.points}`;
              if (!existingKeys.has(key)) {
                data.history.push(h);
              }
            }
            // Sort history newest first
            data.history.sort(
              (
                a: { timestamp: string },
                b: { timestamp: string },
              ) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime(),
            );
            if (data.history.length > 100) {
              data.history = data.history.slice(0, 100);
            }
            // Save merged data and clean up default key
            localStorage.setItem(storageKey(), JSON.stringify(data));
            localStorage.removeItem(STORAGE_KEY_DEFAULT);
            // Also merge accumulated time
            try {
              const accOrphaned = parseInt(
                localStorage.getItem(ACCUMULATED_KEY_DEFAULT) || "0",
                10,
              );
              if (accOrphaned > 0) {
                const accUser = parseInt(
                  localStorage.getItem(accumulatedKey()) || "0",
                  10,
                );
                localStorage.setItem(
                  accumulatedKey(),
                  String(accUser + accOrphaned),
                );
                localStorage.removeItem(ACCUMULATED_KEY_DEFAULT);
              }
            } catch {
              // ignore
            }
          }
        }
      }

      return data;
    }

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

/**
 * Award a batch of listening points and save to storage.
 * Consolidates multiple points into a single history entry to keep history lean.
 */
function awardListeningBatch(pointsToAward: number, listeningMs: number) {
  if (pointsToAward <= 0) return;
  const data = loadPointsData();
  data.totalPoints += pointsToAward;
  data.totalListeningMs += listeningMs;
  data.lastAwardedAt = new Date().toISOString();
  data.history.unshift({
    points: pointsToAward,
    reason: "LISTENING",
    timestamp: new Date().toISOString(),
    program: "WCCG 104.5 FM",
  });
  if (data.history.length > 100) {
    data.history = data.history.slice(0, 100);
  }
  savePointsData(data);
}

/**
 * Reconcile points with session duration — catches up points that were
 * missed while the browser tab was in the background (timer throttled).
 *
 * Compares expected points (from session start timestamp) with what was
 * actually awarded, and grants the difference.
 */
export function reconcileSessionPoints() {
  const sessionStart = loadSessionStart();
  if (!sessionStart) return;

  const sessionDurationMs = Date.now() - sessionStart;
  const expectedListeningPoints = Math.floor(sessionDurationMs / POINTS_INTERVAL_MS);

  const data = loadPointsData();

  // Count only LISTENING points earned since session start
  const sessionStartISO = new Date(sessionStart).toISOString();
  let listeningPointsSinceSession = 0;
  for (const h of data.history) {
    if (h.reason === "LISTENING" && h.timestamp >= sessionStartISO) {
      listeningPointsSinceSession += h.points;
    }
  }

  const missed = expectedListeningPoints - listeningPointsSinceSession;
  if (missed > 0) {
    awardListeningBatch(missed, missed * POINTS_INTERVAL_MS);
    // Reset accumulated since we've reconciled
    saveAccumulated(
      sessionDurationMs % POINTS_INTERVAL_MS,
    );
  }

  // Also check streak bonuses
  {
    const fresh = loadPointsData();
    if (sessionDurationMs >= TWO_HOURS_MS && !fresh.streak2hAwarded) {
      fresh.streak2hAwarded = true;
      fresh.totalPoints += 10;
      fresh.lastAwardedAt = new Date().toISOString();
      fresh.history.unshift({
        points: 10,
        reason: "STREAK_BONUS",
        timestamp: new Date().toISOString(),
        program: "Streak Bonus",
      });
      if (fresh.history.length > 100) fresh.history = fresh.history.slice(0, 100);
      savePointsData(fresh);
    } else if (sessionDurationMs >= ONE_HOUR_MS && !fresh.streak1hAwarded) {
      fresh.streak1hAwarded = true;
      fresh.totalPoints += 5;
      fresh.lastAwardedAt = new Date().toISOString();
      fresh.history.unshift({
        points: 5,
        reason: "STREAK_BONUS",
        timestamp: new Date().toISOString(),
        program: "Streak Bonus",
      });
      if (fresh.history.length > 100) fresh.history = fresh.history.slice(0, 100);
      savePointsData(fresh);
    }
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
      } else {
        // Session already active — reconcile any missed points
        // (browser may have throttled timers while tab was in background)
        reconcileSessionPoints();
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
            program: "Daily Bonus",
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

        // If elapsed is much larger than 30s, the tab was likely backgrounded.
        // Use reconcileSessionPoints for accurate catch-up instead of
        // just the elapsed delta (which would under-count).
        if (elapsed > 60_000) {
          reconcileSessionPoints();
          return;
        }

        // Add elapsed time to accumulated
        let accumulated = loadAccumulated() + elapsed;

        // Check if we've crossed a points threshold
        if (accumulated >= POINTS_INTERVAL_MS) {
          const pointsToAward = Math.floor(accumulated / POINTS_INTERVAL_MS);
          accumulated = accumulated % POINTS_INTERVAL_MS;
          awardListeningBatch(pointsToAward, pointsToAward * POINTS_INTERVAL_MS);
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
              program: "Streak Bonus",
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
              program: "Streak Bonus",
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

/** Get the current points balance (for display).
 *  Checks both user-specific and default keys to avoid timing issues
 *  where _currentEmail may not yet be set.
 */
export function getListeningPoints(): number {
  const data = loadPointsData();
  if (data.totalPoints > 0) return data.totalPoints;
  // Fallback: if _currentEmail is set but returned 0, also check default key
  if (_currentEmail) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DEFAULT);
      if (raw) {
        const fallback = JSON.parse(raw);
        if (fallback.totalPoints > 0) return fallback.totalPoints;
      }
    } catch { /* ignore */ }
  }
  // Fallback: if _currentEmail is null, check all wccg_listening_points_* keys
  if (!_currentEmail) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("wccg_listening_points_") && key !== "wccg_listening_points") {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.totalPoints > 0) return parsed.totalPoints;
          }
        }
      }
    } catch { /* ignore */ }
  }
  return data.totalPoints;
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
    program: "Share",
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
    program: "Share",
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
/**
 * Award 3 points for watching a YouTube video (15+ seconds).
 * Each videoId can only be claimed once.
 * Returns true if points were awarded, false if already claimed.
 */
export function awardVideoWatchPoints(videoId: string): boolean {
  const id = `video_${videoId}`;
  if (isBountyClaimed(id)) {
    return false;
  }

  const data = loadPointsData();
  data.totalPoints += 3;
  data.lastAwardedAt = new Date().toISOString();
  data.history.unshift({
    points: 3,
    reason: "VIDEO_WATCH",
    timestamp: new Date().toISOString(),
    program: "YouTube",
  });
  if (data.history.length > 100) {
    data.history = data.history.slice(0, 100);
  }
  savePointsData(data);
  claimBounty(id);
  return true;
}

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
    program: "Referral",
  });
  if (data.history.length > 100) {
    data.history = data.history.slice(0, 100);
  }
  savePointsData(data);
  claimBounty(id);
  return true;
}
