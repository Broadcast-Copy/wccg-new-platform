"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  startSession,
  endSession,
  addTrackToSession,
  updateSession,
  getSessions,
} from "@/lib/listening-history";
import { useNowPlaying } from "@/hooks/use-now-playing";

/**
 * Hook that tracks listening sessions based on the stream overlay state.
 *
 * - When `isListening` becomes true → resumes existing session or starts new one
 * - While active → polls now-playing API and logs track changes
 * - When `isListening` becomes false → ends the session and saves it
 * - On refresh → resumes the existing active session instead of creating a new one
 *
 * All data is stored client-side in localStorage.
 */
export function useListeningTracker(isListening: boolean) {
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll now-playing only while the overlay is open
  const { data: nowPlaying } = useNowPlaying(isListening);

  // ── Start or resume session when overlay opens ────────────────────────
  useEffect(() => {
    if (isListening && !sessionIdRef.current) {
      // Check for an existing active session to resume (e.g. after refresh)
      const sessions = getSessions();
      const activeSession = sessions.find((s) => s.endedAt === null);

      if (activeSession) {
        // Resume existing session
        sessionIdRef.current = activeSession.id;
        startTimeRef.current = new Date(activeSession.startedAt).getTime();
      } else {
        // Start a fresh session
        const session = startSession();
        sessionIdRef.current = session.id;
        startTimeRef.current = Date.now();
      }

      // Periodically update the session's duration so if the browser
      // crashes/closes, we still have a rough record
      durationIntervalRef.current = setInterval(() => {
        if (!sessionIdRef.current || !startTimeRef.current) return;
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        updateSession(sessionIdRef.current, { durationSeconds: elapsed });
      }, 60_000); // every 60 seconds
    }

    if (!isListening && sessionIdRef.current) {
      // End the session
      endSession(sessionIdRef.current);
      sessionIdRef.current = null;
      startTimeRef.current = null;

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening]);

  // ── Track song changes from now-playing data ─────────────────────────
  useEffect(() => {
    if (!sessionIdRef.current || !nowPlaying) return;

    addTrackToSession(sessionIdRef.current, {
      title: nowPlaying.title || "Unknown Track",
      artist: nowPlaying.artist || "WCCG 104.5 FM",
      albumArt: nowPlaying.albumArt ?? null,
    });
  }, [nowPlaying?.title, nowPlaying?.artist]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup on unmount — do NOT end session on unmount (refresh case) ──
  // We intentionally do NOT end the session on unmount anymore.
  // Sessions are only ended when isListening becomes false (user stops).
  // On refresh, the session remains active and gets resumed above.
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      // Clear the ref without ending the session
      sessionIdRef.current = null;
    };
  }, []);
}
