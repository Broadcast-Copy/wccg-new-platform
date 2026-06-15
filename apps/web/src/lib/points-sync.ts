"use client";

/**
 * Points outbox — Phase A2.
 *
 * The client side of the listen-and-earn loop earns into localStorage for
 * instant UI feedback. Historically this module also POSTed every award to a
 * NestJS `/points/sync` endpoint that mirrored it into a server-side ledger.
 *
 * That API server is gone. In the current architecture the browser talks to
 * Supabase directly, and — by design, for integrity — there is NO client-side
 * award path: points/balance are written ONLY by secure server-side RPCs
 * (the `user_points` table is own-read RLS, and a DB trigger forces
 * `balance = sum(points_history)`, so a client cannot forge a balance even
 * with a session token). See migrations 006/007/039.
 *
 * PT1 update: the outbox now flushes to a secure server-side RPC.
 *  - `enqueuePointEvent(...)` records the optimistic award locally so the UI
 *    feels instant (the cache lives in `wccg_listening_points*`).
 *  - `flushPointsOutbox()` drains the eligible batch and calls the
 *    `award_points` SECURITY DEFINER RPC for each event (only when signed in;
 *    otherwise events stay queued for after login). The RPC caps each award at
 *    the matching `points_rules` value + cooldown (else a sane clamp), inserts
 *    `points_history`, and a DB trigger recomputes `user_points.balance`. So
 *    balances are server-authoritative and survive across devices, while a
 *    client still cannot forge an arbitrary balance.
 *  - Succeeded events are dropped; failed ones back off and retry. The
 *    auto-flusher / timer / listeners are unchanged.
 */

import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Outbox storage
// ---------------------------------------------------------------------------

const OUTBOX_KEY = "wccg_points_outbox";
const FLUSH_INTERVAL_MS = 30_000;
const MAX_BATCH = 50;
const MAX_OUTBOX_SIZE = 500; // Drop oldest if exceeded — a sanity rail.

export interface OutboxEvent {
  idempotencyKey: string;
  amount: number;
  reason: string;
  referenceType?: string;
  referenceId?: string;
  occurredAt: string;
  /** Number of failed flush attempts — used for backoff */
  attempts: number;
  /** Timestamp of next eligible attempt */
  nextAttemptAt: number;
}

function loadOutbox(): OutboxEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveOutbox(events: OutboxEvent[]) {
  if (typeof window === "undefined") return;
  try {
    // Sanity rail: drop oldest if outbox is huge (offline for weeks).
    const trimmed = events.length > MAX_OUTBOX_SIZE
      ? events.slice(events.length - MAX_OUTBOX_SIZE)
      : events;
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full / disabled — degrade gracefully.
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Enqueue a point award for server-side reconciliation.
 *
 * @param ev.idempotencyKey - REQUIRED. Stable string that identifies this
 *   exact award. Use a per-award unique key like `listening:<sessionId>:<n>`,
 *   `daily_bounty:2026-04-18`, `share:<bountyId>`, etc.
 *   Re-enqueueing the same key is safe — server returns the original row.
 */
export function enqueuePointEvent(ev: {
  idempotencyKey: string;
  amount: number;
  reason: string;
  referenceType?: string;
  referenceId?: string;
}): void {
  if (!ev.idempotencyKey || ev.amount <= 0 || !ev.reason) return;
  const events = loadOutbox();
  // De-dupe in-memory by idempotencyKey to keep the outbox lean.
  if (events.some((e) => e.idempotencyKey === ev.idempotencyKey)) return;
  events.push({
    idempotencyKey: ev.idempotencyKey,
    amount: ev.amount,
    reason: ev.reason,
    referenceType: ev.referenceType,
    referenceId: ev.referenceId,
    occurredAt: new Date().toISOString(),
    attempts: 0,
    nextAttemptAt: 0,
  });
  saveOutbox(events);
}

/**
 * Drain the outbox once, awarding each eligible event via the `award_points`
 * RPC (server-authoritative). Only runs when signed in; otherwise events stay
 * queued and sync after login. Succeeded events are removed; failed ones get an
 * exponential backoff and are retried on the next flush. Returns the latest
 * server balance reported by the RPC (or null). The inner gate prevents
 * concurrent drains.
 */
let flushInFlight = false;

export async function flushPointsOutbox(): Promise<number | null> {
  if (flushInFlight) return null;
  if (typeof window === "undefined") return null;

  flushInFlight = true;
  try {
    const events = loadOutbox();
    if (events.length === 0) return null;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    // Not signed in: keep events queued so they sync once the user logs in.
    if (!user) return null;

    const now = Date.now();
    const batch = events
      .filter((e) => (e.nextAttemptAt ?? 0) <= now)
      .slice(0, MAX_BATCH);
    if (batch.length === 0) return null;

    const succeeded = new Set<string>();
    const failedAttempts = new Map<string, number>();
    let latestBalance: number | null = null;

    for (const ev of batch) {
      const { data, error } = await supabase.rpc("award_points", {
        p_amount: Math.max(0, Math.round(ev.amount)),
        p_reason: ev.reason,
        p_description: ev.referenceId ?? ev.referenceType ?? null,
      });
      if (error) {
        failedAttempts.set(ev.idempotencyKey, (ev.attempts ?? 0) + 1);
      } else {
        succeeded.add(ev.idempotencyKey);
        if (typeof data === "number") latestBalance = data;
      }
    }

    // Rewrite the outbox: drop succeeded, back off failed, keep the rest.
    const current = loadOutbox();
    const next: OutboxEvent[] = [];
    for (const e of current) {
      if (succeeded.has(e.idempotencyKey)) continue;
      const attempts = failedAttempts.get(e.idempotencyKey);
      if (attempts !== undefined) {
        next.push({
          ...e,
          attempts,
          nextAttemptAt: now + Math.min(5 * 60_000, 1000 * 2 ** Math.min(attempts, 8)),
        });
      } else {
        next.push(e);
      }
    }
    saveOutbox(next);

    return latestBalance;
  } catch {
    // Network/transient failure — leave the outbox intact for the next flush.
    return null;
  } finally {
    flushInFlight = false;
  }
}

// ---------------------------------------------------------------------------
// Auto-flusher — call once at app boot.
// ---------------------------------------------------------------------------

let flusherStarted = false;

/**
 * Idempotent. Starts a timer + window listeners that drain the outbox.
 * Safe to call from a top-level provider's useEffect.
 */
export function startPointsAutoFlusher() {
  if (flusherStarted || typeof window === "undefined") return;
  flusherStarted = true;

  // Initial drain on boot.
  void flushPointsOutbox();

  // Periodic drain.
  window.setInterval(() => {
    void flushPointsOutbox();
  }, FLUSH_INTERVAL_MS);

  // Drain on online + focus + visibility.
  window.addEventListener("online", () => void flushPointsOutbox());
  window.addEventListener("focus", () => void flushPointsOutbox());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void flushPointsOutbox();
  });

  // Drain before unload — best-effort, fire-and-forget.
  window.addEventListener("beforeunload", () => {
    void flushPointsOutbox();
  });
}

/**
 * Inspect the outbox size for telemetry / debugging.
 */
export function getOutboxSize(): number {
  return loadOutbox().length;
}
