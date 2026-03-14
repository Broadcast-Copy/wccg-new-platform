/**
 * Cross-device data sync — bridges localStorage ↔ Supabase.
 *
 * On login: pulls remote data, merges with local, pushes merged result back.
 * On local writes: debounced push to Supabase (via markDirty()).
 * On tab focus: pulls remote changes (debounced, max once per 30s).
 */

import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LocalPointsData {
  totalPoints: number;
  totalListeningMs: number;
  lastAwardedAt: string | null;
  lastShareDate?: string;
  lastBountyDate?: string;
  streak1hAwarded?: boolean;
  streak2hAwarded?: boolean;
  sessionPointsAwarded?: number;
  history: Array<{
    points: number;
    reason: string;
    timestamp: string;
    program?: string;
  }>;
}

interface RemotePointsRow {
  id: string;
  user_id: string;
  balance: number;
  total_listening_ms: number;
  last_share_date: string | null;
  last_bounty_date: string | null;
  updated_at: string;
}

interface RemoteHistoryRow {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  description: string | null;
  program: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let _userId: string | null = null;
let _email: string | null = null;
let _dirty = false;
let _flushTimer: ReturnType<typeof setTimeout> | null = null;
let _lastPullAt = 0;
const DEBOUNCE_MS = 2000;
const PULL_COOLDOWN_MS = 30_000;

// ---------------------------------------------------------------------------
// localStorage helpers (mirrors use-listening-points.ts conventions)
// ---------------------------------------------------------------------------

function storageKey(email: string): string {
  return `wccg_listening_points_${email}`;
}

function bountyTrackerKey(email: string): string {
  return `wccg_bounty_tracker_${email}`;
}

function milestonesKey(email: string): string {
  return `wccg_milestones_${email}`;
}

function loadLocal(email: string): LocalPointsData {
  try {
    const raw = localStorage.getItem(storageKey(email));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    totalPoints: 0,
    totalListeningMs: 0,
    lastAwardedAt: null,
    history: [],
  };
}

function saveLocal(email: string, data: LocalPointsData) {
  try {
    localStorage.setItem(storageKey(email), JSON.stringify(data));
  } catch { /* ignore */ }
}

function loadLocalMilestones(email: string): string[] {
  try {
    const raw = localStorage.getItem(milestonesKey(email));
    if (raw) return JSON.parse(raw) as string[];
  } catch { /* ignore */ }
  return [];
}

function saveLocalMilestones(email: string, ids: string[]) {
  try {
    localStorage.setItem(milestonesKey(email), JSON.stringify(ids));
  } catch { /* ignore */ }
}

function loadLocalBounties(email: string): string[] {
  try {
    const raw = localStorage.getItem(bountyTrackerKey(email));
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.claimed ?? [];
    }
  } catch { /* ignore */ }
  return [];
}

function saveLocalBounties(email: string, claimed: string[]) {
  try {
    localStorage.setItem(bountyTrackerKey(email), JSON.stringify({ claimed }));
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Date comparison helper
// ---------------------------------------------------------------------------

function laterDate(a: string | undefined | null, b: string | undefined | null): string | undefined {
  if (!a && !b) return undefined;
  if (!a) return b ?? undefined;
  if (!b) return a ?? undefined;
  return a > b ? a : b;
}

// ---------------------------------------------------------------------------
// Core sync functions
// ---------------------------------------------------------------------------

/**
 * Initialize sync on login. Triggers an immediate pull + merge.
 */
export async function initSync(userId: string, email: string) {
  _userId = userId;
  _email = email;
  await pullAndMerge();
}

/**
 * Pull remote data from Supabase, merge with localStorage, push merged result back.
 * Safe to call frequently — has a 30s cooldown.
 */
export async function pullAndMerge() {
  if (!_userId || !_email) return;

  const now = Date.now();
  if (now - _lastPullAt < PULL_COOLDOWN_MS) return;
  _lastPullAt = now;

  const supabase = createClient();
  const userId = _userId;
  const email = _email;

  try {
    // Fetch remote data in parallel
    const [pointsRes, historyRes, milestonesRes, bountiesRes] = await Promise.all([
      supabase.from("user_points").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("points_history").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
      supabase.from("user_milestones").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_bounties_claimed").select("bounty_id").eq("user_id", userId),
    ]);

    const remotePoints = pointsRes.data as RemotePointsRow | null;
    const remoteHistory = (historyRes.data ?? []) as RemoteHistoryRow[];
    const remoteMilestones: string[] = (milestonesRes.data as { unlocked_ids: string[] } | null)?.unlocked_ids ?? [];
    const remoteBounties: string[] = (bountiesRes.data ?? []).map((r: { bounty_id: string }) => r.bounty_id);

    // Load local
    const local = loadLocal(email);
    const localMilestones = loadLocalMilestones(email);
    const localBounties = loadLocalBounties(email);

    // ── Merge points balance ──
    const remoteBalance = remotePoints?.balance ?? 0;
    const remoteListeningMs = Number(remotePoints?.total_listening_ms ?? 0);
    const mergedBalance = Math.max(local.totalPoints, remoteBalance);
    const mergedListeningMs = Math.max(local.totalListeningMs, remoteListeningMs);

    // ── Merge dates ──
    const mergedShareDate = laterDate(local.lastShareDate, remotePoints?.last_share_date);
    const mergedBountyDate = laterDate(local.lastBountyDate, remotePoints?.last_bounty_date);

    // ── Merge history (dedup by timestamp_reason_amount) ──
    const historyMap = new Map<string, LocalPointsData["history"][0]>();
    for (const h of local.history) {
      const key = `${h.timestamp}_${h.reason}_${h.points}`;
      historyMap.set(key, h);
    }
    for (const rh of remoteHistory) {
      const key = `${rh.created_at}_${rh.reason}_${rh.amount}`;
      if (!historyMap.has(key)) {
        historyMap.set(key, {
          points: rh.amount,
          reason: rh.reason,
          timestamp: rh.created_at,
          program: rh.program ?? undefined,
        });
      }
    }
    const mergedHistory = Array.from(historyMap.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 100);

    // ── Merge milestones (union) ──
    const mergedMilestones = Array.from(new Set([...localMilestones, ...remoteMilestones]));

    // ── Merge bounties (union) ──
    const mergedBounties = Array.from(new Set([...localBounties, ...remoteBounties]));

    // ── Save merged to localStorage ──
    const mergedLocal: LocalPointsData = {
      ...local,
      totalPoints: mergedBalance,
      totalListeningMs: mergedListeningMs,
      lastShareDate: mergedShareDate,
      lastBountyDate: mergedBountyDate,
      history: mergedHistory,
    };
    saveLocal(email, mergedLocal);
    saveLocalMilestones(email, mergedMilestones);
    saveLocalBounties(email, mergedBounties);

    // ── Push merged to Supabase ──
    await pushToRemote(userId, email, mergedLocal, mergedHistory, mergedMilestones, mergedBounties, remoteHistory);
  } catch (err) {
    console.warn("[user-sync] pull failed:", err);
  }
}

/**
 * Push current local state to Supabase.
 */
async function pushToRemote(
  userId: string,
  email: string,
  data: LocalPointsData,
  mergedHistory: LocalPointsData["history"],
  milestones: string[],
  bounties: string[],
  existingRemoteHistory: RemoteHistoryRow[],
) {
  const supabase = createClient();

  try {
    // Upsert user_points — try update first, insert if no rows affected
    const pointsPayload = {
      balance: data.totalPoints,
      total_listening_ms: data.totalListeningMs,
      last_share_date: data.lastShareDate || null,
      last_bounty_date: data.lastBountyDate || null,
      updated_at: new Date().toISOString(),
    };
    const { count } = await supabase
      .from("user_points")
      .update(pointsPayload)
      .eq("user_id", userId);
    if (count === 0) {
      await supabase.from("user_points").insert({ user_id: userId, ...pointsPayload });
    }

    // Insert new history rows (ones not already in remote)
    const existingKeys = new Set(
      existingRemoteHistory.map(rh => `${rh.created_at}_${rh.reason}_${rh.amount}`),
    );
    const newHistoryRows = mergedHistory
      .filter(h => !existingKeys.has(`${h.timestamp}_${h.reason}_${h.points}`))
      .map(h => ({
        user_id: userId,
        amount: h.points,
        reason: h.reason,
        description: h.reason,
        program: h.program || null,
        created_at: h.timestamp,
      }));

    if (newHistoryRows.length > 0) {
      await supabase.from("points_history").insert(newHistoryRows);
    }

    // Upsert milestones — try update first, insert if no rows affected
    const milestonesPayload = {
      unlocked_ids: milestones,
      updated_at: new Date().toISOString(),
    };
    const { count: mCount } = await supabase
      .from("user_milestones")
      .update(milestonesPayload)
      .eq("user_id", userId);
    if (mCount === 0) {
      await supabase.from("user_milestones").insert({ user_id: userId, ...milestonesPayload });
    }

    // Insert new bounties (ignore conflicts via individual inserts)
    for (const b of bounties) {
      await supabase.from("user_bounties_claimed").insert({
        user_id: userId,
        bounty_id: b,
      }).then(() => {}, () => {}); // ignore duplicate errors
    }
  } catch (err) {
    console.warn("[user-sync] push failed:", err);
  }
}

/**
 * Mark local data as dirty — triggers a debounced flush to Supabase.
 * Call this after any savePointsData() or saveMilestones().
 */
export function markDirty() {
  if (!_userId || !_email) return;
  _dirty = true;

  if (_flushTimer) clearTimeout(_flushTimer);
  _flushTimer = setTimeout(() => {
    flushSync();
  }, DEBOUNCE_MS);
}

/**
 * Immediately flush dirty local data to Supabase.
 * Called on debounce timer or on beforeunload.
 */
export async function flushSync() {
  if (!_dirty || !_userId || !_email) return;
  _dirty = false;

  if (_flushTimer) {
    clearTimeout(_flushTimer);
    _flushTimer = null;
  }

  const supabase = createClient();
  const userId = _userId;
  const email = _email;

  try {
    const local = loadLocal(email);
    const milestones = loadLocalMilestones(email);
    const bounties = loadLocalBounties(email);

    // Fetch existing remote history to avoid duplication
    const { data: existingHistory } = await supabase
      .from("points_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    await pushToRemote(
      userId,
      email,
      local,
      local.history,
      milestones,
      bounties,
      (existingHistory ?? []) as RemoteHistoryRow[],
    );
  } catch (err) {
    console.warn("[user-sync] flush failed:", err);
    // Re-mark as dirty so we retry
    _dirty = true;
  }
}

/**
 * Force a pull (bypasses cooldown). Use on tab focus.
 */
export async function forcePull() {
  _lastPullAt = 0;
  await pullAndMerge();
}

/**
 * Check if sync is initialized (user is logged in and sync was started).
 */
export function isSyncActive(): boolean {
  return !!_userId && !!_email;
}
