"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useAudioPlayer } from "@/hooks/use-audio-player";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Milliseconds of inactivity before warning toast appears (30 minutes). */
const INACTIVITY_WARNING_MS = 30 * 60 * 1000;

/** Milliseconds of inactivity before auto-logout (35 minutes total). */
const INACTIVITY_LOGOUT_MS = 35 * 60 * 1000;

/** How often to check inactivity timers (every 15 seconds). */
const CHECK_INTERVAL_MS = 15_000;

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
// Hook
// ---------------------------------------------------------------------------

/**
 * Tracks user activity via mouse/keyboard/touch/scroll events.
 *
 * - After 30 minutes of inactivity, shows a warning toast.
 * - After 35 minutes total, signs out and redirects to /login.
 * - The timer PAUSES while the audio player is actively playing.
 * - Any user interaction resets the timer.
 * - Clears listening-related localStorage keys on inactivity logout.
 */
export function useInactivityLogout() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isPlaying } = useAudioPlayer();

  // Track the timestamp of the last user activity
  const lastActivityRef = useRef<number>(Date.now());
  // Whether the warning toast has been shown for the current inactivity period
  const warningShownRef = useRef(false);
  // Reference to the check interval
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track whether we are currently logging out (prevent double-fire)
  const loggingOutRef = useRef(false);

  // Reset activity timestamp
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
  }, []);

  // Perform the inactivity logout
  const performLogout = useCallback(async () => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;

    // Clear listening-related localStorage keys
    for (const key of LISTENING_STORAGE_KEYS) {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    }

    // Sign out via Supabase
    try {
      await signOut();
    } catch {
      // Even if signOut fails, redirect to login
    }

    toast.error("You have been signed out due to inactivity.");
    router.push("/login");

    // Reset after a short delay so the ref doesn't block future use
    setTimeout(() => {
      loggingOutRef.current = false;
    }, 2000);
  }, [signOut, router]);

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
      // PAUSE the timer if the user is actively listening to audio
      if (isPlaying) {
        // Reset activity while playing so timer starts fresh when audio stops
        lastActivityRef.current = Date.now();
        warningShownRef.current = false;
        return;
      }

      const elapsed = Date.now() - lastActivityRef.current;

      // Check for logout threshold (35 minutes)
      if (elapsed >= INACTIVITY_LOGOUT_MS) {
        performLogout();
        return;
      }

      // Check for warning threshold (30 minutes)
      if (elapsed >= INACTIVITY_WARNING_MS && !warningShownRef.current) {
        warningShownRef.current = true;
        toast.warning(
          "Session expiring in 5 minutes due to inactivity.",
          { duration: 10_000 },
        );
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user, isPlaying, performLogout]);
}
