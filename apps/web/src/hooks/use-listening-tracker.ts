"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  startSession,
  endSession,
  addTrackToSession,
  updateSession,
} from "@/lib/listening-history";
import { useNowPlaying } from "@/hooks/use-now-playing";

/**
 * Hook that tracks listening sessions based on the stream overlay state.
 *
 * - When `isListening` becomes true → starts a new session
 * - While active → polls now-playing API and logs track changes
 * - When `isListening` becomes false → ends the session and saves it
 *
 * All data is stored client-side in localStorage.
 */
export function useListeningTracker(isListening: boolean) {
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll now-playing only while the overlay is open
  const { data: nowPlaying } = useNowPlaying(isListening);

  // ── Start session when overlay opens ──────────────────────────────────
  useEffect(() => {
    if (isListening && !sessionIdRef.current) {
      const session = startSession();
      sessionIdRef.current = session.id;
      startTimeRef.current = Date.now();

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

  // ── Cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (sessionIdRef.current) {
        endSession(sessionIdRef.current);
        sessionIdRef.current = null;
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    };
  }, []);
}
