"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useAudioPlayer } from "@/hooks/use-audio-player";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Milliseconds of inactivity before "Are you still listening?" prompt (30 minutes). */
const INACTIVITY_WARNING_MS = 30 * 60 * 1000;

/** Milliseconds of inactivity before auto-pause (35 minutes total). */
const INACTIVITY_PAUSE_MS = 35 * 60 * 1000;

/** How often to check inactivity timers (every 15 seconds). */
const CHECK_INTERVAL_MS = 15_000;

/** localStorage key for the continuous play preference (set by GlobalPlayer). */
const CONTINUOUS_PLAY_KEY = "wccg_continuous_play";

/** localStorage keys to clear on inactivity logout. */
const LISTENING_STORAGE_KEYS = [
  "wccg_listening_history",
  "wccg_listening_points",
  "wccg_listening_accumulated_ms",
] as const;

/** Events that count as user activity. */
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read the continuous play flag from localStorage. */
function isContinuousPlayEnabled(): boolean {
  try {
    return localStorage.getItem(CONTINUOUS_PLAY_KEY) === "true";
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Tracks user activity via mouse/keyboard/touch/scroll events.
 *
 * - When **continuous play** is enabled (localStorage `wccg_continuous_play`),
 *   the inactivity timer is completely skipped so playback continues
 *   indefinitely without interruption.
 *
 * - When continuous play is OFF:
 *   - After 30 minutes of inactivity, shows a `window.confirm` dialog:
 *     "Are you still listening?"
 *     - **Yes**: resets the timer, playback continues.
 *     - **No**: pauses playback (does NOT sign the user out).
 *   - After 35 minutes total with no response, pauses playback automatically.
 *   - The timer PAUSES while the audio player is actively playing AND the user
 *     is interacting (to avoid false positives during passive listening).
 *   - Any user interaction resets the timer.
 */
export function useInactivityLogout() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isPlaying, pause: pausePlayback } = useAudioPlayer();

  // Track the timestamp of the last user activity
  const lastActivityRef = useRef<number>(Date.now());
  // Whether the warning prompt has been shown for the current inactivity period
  const warningShownRef = useRef(false);
  // Reference to the check interval
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track whether a prompt is currently open (prevent double-fire)
  const promptOpenRef = useRef(false);

  // Reset activity timestamp
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
  }, []);

  // Show the "Are you still listening?" confirmation
  const showStillListeningPrompt = useCallback(() => {
    if (promptOpenRef.current) return;
    promptOpenRef.current = true;

    // Using window.confirm for simplicity — blocks the thread but avoids
    // complex modal state management.
    const stillListening = window.confirm(
      "Are you still listening?\n\nClick OK to continue playback, or Cancel to pause."
    );

    promptOpenRef.current = false;

    if (stillListening) {
      // User is still here — reset timers
      resetActivity();
    } else {
      // User chose No — pause playback but do NOT sign out
      pausePlayback();
      resetActivity(); // Reset so we don't immediately re-prompt
      toast.info("Playback paused. Press play to resume.");
    }
  }, [resetActivity, pausePlayback]);

  // Fallback: pause playback after the full timeout expires with no response
  const autoPause = useCallback(() => {
    if (promptOpenRef.current) return; // Don't double-fire while prompt is open
    pausePlayback();
    resetActivity();
    toast.info("Playback paused due to inactivity.");
  }, [pausePlayback, resetActivity]);

  // Set up activity event listeners
  useEffect(() => {
    // Only track inactivity for authenticated users
    if (!user) return;

    const handleActivity = () => {
      resetActivity();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity);
      }
    };
  }, [user, resetActivity]);

  // Set up the periodic inactivity check
  useEffect(() => {
    // Only check inactivity for authenticated users
    if (!user) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      // -----------------------------------------------------------------
      // Skip entirely when continuous play is enabled
      // -----------------------------------------------------------------
      if (isContinuousPlayEnabled()) {
        // Keep resetting so timers stay fresh if the user later disables it
        lastActivityRef.current = Date.now();
        warningShownRef.current = false;
        return;
      }

      // PAUSE the timer if the user is actively listening to audio
      if (isPlaying) {
        // Reset activity while playing so timer starts fresh when audio stops
        lastActivityRef.current = Date.now();
        warningShownRef.current = false;
        return;
      }

      const elapsed = Date.now() - lastActivityRef.current;

      // Check for auto-pause threshold (35 minutes)
      if (elapsed >= INACTIVITY_PAUSE_MS) {
        autoPause();
        return;
      }

      // Check for warning threshold (30 minutes)
      if (elapsed >= INACTIVITY_WARNING_MS && !warningShownRef.current) {
        warningShownRef.current = true;
        showStillListeningPrompt();
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user, isPlaying, autoPause, showStillListeningPrompt]);
}
