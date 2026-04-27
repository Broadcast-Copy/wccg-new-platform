"use client";

/**
 * Points outbox sync — Phase A2.
 *
 * The client side of the listen-and-earn loop earns into localStorage for
 * instant UI feedback. This module mirrors every award into a server-side
 * ledger via /points/sync, with idempotency keys + retry, so the wallet is:
 *
 *  - Cross-device (the API is the source of truth long-term)
 *  - Survivable (clearing the browser doesn't wipe earnings)
 *  - Capped (server enforces daily limits, can't be cheated by JS)
 *  - Spendable (the marketplace reads from the ledger, not localStorage)
 *
 * Design:
 *  - Every award (listening tick, daily bounty, streak, share, etc.) calls
 *    `enqueuePointEvent(...)` which appends to a localStorage outbox.
 *  - A background flusher drains the outbox every 30s when online, plus on
 *    `online` and on tab-focus.
 *  - The server returns per-event results so we can prune precisely; events
 *    that come back `awarded` or `duplicate` are removed, `capped`/`rejected`
 *    are also removed (server made a decision), only network errors retain
 *    them with backoff.
 *  - We never block the UI — failures are silent except for telemetry.
 */

import { apiClient } from "@/lib/api-client";

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

interface SyncResult {
  results: Array<{
    idempotencyKey: string;
    status: "awarded" | "duplicate" | "capped" | "rejected";
    amount: number;
    reason?: string;
  }>;
  balance: number;
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
 * Drain the outbox once. Returns the new server-side balance, or null on
 * failure / no events. Safe to call as often as you like; the inner gate
 * prevents concurrent flushes.
 */
let flushInFlight = false;

export async function flushPointsOutbox(): Promise<number | null> {
  if (flushInFlight) return null;
  if (typeof window === "undefined") return null;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return null;

  flushInFlight = true;
  try {
    const events = loadOutbox();
    if (events.length === 0) return null;

    const now = Date.now();
    const eligible = events
      .filter((e) => e.nextAttemptAt <= now)
      .slice(0, MAX_BATCH);
    if (eligible.length === 0) return null;

    let result: SyncResult | null = null;
    try {
      result = await apiClient<SyncResult>("/points/sync", {
        method: "POST",
        body: JSON.stringify({
          events: eligible.map((e) => ({
            idempotencyKey: e.idempotencyKey,
            amount: e.amount,
            reason: e.reason,
            referenceType: e.referenceType,
            referenceId: e.referenceId,
            occurredAt: e.occurredAt,
          })),
        }),
      });
    } catch (err) {
      // Network / 5xx — retry with backoff.
      const refreshed = loadOutbox();
      const eligibleKeys = new Set(eligible.map((e) => e.idempotencyKey));
      for (const e of refreshed) {
        if (eligibleKeys.has(e.idempotencyKey)) {
          e.attempts = (e.attempts ?? 0) + 1;
          // Exponential backoff capped at 5 min.
          const backoffMs = Math.min(5 * 60_000, 1000 * 2 ** Math.min(e.attempts, 8));
          e.nextAttemptAt = Date.now() + backoffMs;
        }
      }
      saveOutbox(refreshed);
      return null;
    }

    // Server gave a decision per-event. Remove every event the server
    // acknowledged in any way (awarded / duplicate / capped / rejected) —
    // we don't want to retry rejections forever, and capped is the server's
    // call to drop until tomorrow.
    const acknowledged = new Set(result.results.map((r) => r.idempotencyKey));
    const remaining = loadOutbox().filter((e) => !acknowledged.has(e.idempotencyKey));
    saveOutbox(remaining);

    return result.balance;
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
