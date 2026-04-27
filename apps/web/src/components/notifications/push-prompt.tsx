"use client";

/**
 * PushPrompt — Phase A6.
 *
 * Web Push opt-in is the highest-ROI re-engagement channel we have. The
 * trick is when to ask. Asking on first load is begging; asking after the
 * user has invested attention is offering value. We wait 2 minutes of
 * cumulative listening before showing the prompt.
 *
 * Design rules:
 *  - One ask per user per 30 days.
 *  - Decline is sticky (no nag).
 *  - Accept hits /push/subscribe which awards +50 WP server-side.
 *  - All real Web Push (VAPID) — no third-party SDK, ~1 kB of code.
 *
 * Operator note: needs NEXT_PUBLIC_VAPID_PUBLIC_KEY to be set. Without it,
 * the prompt is a no-op (logs a warn).
 */

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAudioPlayer } from "@/hooks/use-audio-player";

const SHOW_AFTER_LISTENED_MS = 2 * 60 * 1000; // 2 minutes
const SUPPRESS_FOR_DAYS = 30;
const STORAGE_KEY = "wccg_push_prompt_state";

interface PromptState {
  /** Cumulative listened time across sessions. */
  listenedMs: number;
  /** Last sample tick timestamp. */
  lastTick: number;
  /** Set when the user accepted, declined, or auto-suppressed. */
  decidedAt: string | null;
  decision: "accepted" | "declined" | null;
}

function loadState(): PromptState {
  if (typeof window === "undefined")
    return { listenedMs: 0, lastTick: 0, decidedAt: null, decision: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { listenedMs: 0, lastTick: 0, decidedAt: null, decision: null };
}

function saveState(s: PromptState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

function shouldStillSuppress(s: PromptState): boolean {
  if (!s.decidedAt) return false;
  const ageMs = Date.now() - new Date(s.decidedAt).getTime();
  return ageMs < SUPPRESS_FOR_DAYS * 24 * 3600 * 1000;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushPrompt() {
  const { isPlaying } = useAudioPlayer();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tick listened time while the player reports playing.
  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => {
      const s = loadState();
      if (shouldStillSuppress(s) || s.decision === "accepted") return;
      const now = Date.now();
      const delta = s.lastTick > 0 ? Math.min(60_000, now - s.lastTick) : 5_000;
      const next: PromptState = {
        ...s,
        listenedMs: s.listenedMs + delta,
        lastTick: now,
      };
      saveState(next);
      if (next.listenedMs >= SHOW_AFTER_LISTENED_MS && !next.decidedAt) {
        // Only open if we've got the keys and the API exists.
        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          "serviceWorker" in navigator
        ) {
          setOpen(true);
        }
      }
    }, 5_000);
    return () => window.clearInterval(id);
  }, [isPlaying]);

  // Reset lastTick on pause so the delta math doesn't add a huge gap on resume.
  useEffect(() => {
    if (isPlaying) return;
    const s = loadState();
    saveState({ ...s, lastTick: 0 });
  }, [isPlaying]);

  const decline = () => {
    const s = loadState();
    saveState({ ...s, decidedAt: new Date().toISOString(), decision: "declined" });
    setOpen(false);
  };

  const accept = async () => {
    setError(null);
    setBusy(true);
    try {
      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapid) {
        throw new Error("Push not configured (missing VAPID key).");
      }
      const reg = await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        decline();
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // Cast through BufferSource — the Uint8Array<ArrayBufferLike> type
        // confuses lib.dom's stricter ArrayBufferView<ArrayBuffer> signature.
        applicationServerKey: urlBase64ToUint8Array(vapid) as unknown as BufferSource,
      });
      await apiClient("/push/subscribe", {
        method: "POST",
        body: JSON.stringify({
          subscription: sub.toJSON(),
          userAgent: navigator.userAgent,
        }),
      });
      const s = loadState();
      saveState({ ...s, decidedAt: new Date().toISOString(), decision: "accepted" });
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Enable notifications"
      className="fixed bottom-24 right-4 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/40"
    >
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#dc2626] to-[#7401df]">
          <Bell className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-foreground">Hear it first</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            We'll ping you when your favorite hosts go live, contests open, or your station drops something new.
          </p>
          <p className="mt-1.5 text-[11px] font-bold uppercase tracking-widest text-[#74ddc7]">
            +50 WP for opting in
          </p>
          {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={accept}
              disabled={busy}
              className="rounded-full bg-[#dc2626] px-4 py-2 text-xs font-bold text-white shadow hover:bg-[#b91c1c] disabled:opacity-60"
            >
              {busy ? "Subscribing…" : "Turn on notifications"}
            </button>
            <button
              type="button"
              onClick={decline}
              className="rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={decline}
          aria-label="Dismiss"
          className="rounded-full p-1 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
