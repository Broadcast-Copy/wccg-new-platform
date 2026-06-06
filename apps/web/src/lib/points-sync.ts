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
 * Consequently the outbox flush is now a SAFE NO-OP:
 *  - `enqueuePointEvent(...)` still records the optimistic award locally so the
 *    UI feels instant (the displayed balance lives in `wccg_listening_points*`,
 *    NOT in this outbox).
 *  - `flushPointsOutbox()` no longer calls any endpoint. It simply drains the
 *    eligible batch from the local outbox so it can't grow unbounded, and
 *    resolves successfully. No points are inserted — awarding stays locked
 *    behind the secure RPCs.
 *  - The auto-flusher / timer / listeners are kept intact so callers and the
 *    boot path are unchanged; they just no longer hit a dead URL.
 */

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
 * Drain the outbox once.
 *
 * SAFE NO-OP: points are awarded exclusively by secure server-side RPCs
 * (integrity — the client has no award path by design), so there is no
 * endpoint to POST to. This used to mirror awards to a now-removed NestJS
 * `/points/sync` route. We keep the signature and the auto-flusher wiring, but
 * the body simply removes the eligible batch from the local outbox so it can't
 * grow without bound, then resolves successfully. NOTHING is inserted and no
 * balance is written from here.
 *
 * Returns null (no server balance is fetched here — the badge reads
 * `user_points.balance` directly via Supabase). The inner gate prevents
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

    // Drop the batch we would historically have synced. The optimistic balance
    // the user sees is stored separately (wccg_listening_points*), so clearing
    // these queued events does not lose any displayed points — it only stops
    // the outbox from accumulating dead entries forever.
    const drained = events.slice(0, MAX_BATCH);
    const drainedKeys = new Set(drained.map((e) => e.idempotencyKey));
    const remaining = loadOutbox().filter((e) => !drainedKeys.has(e.idempotencyKey));
    saveOutbox(remaining);

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
