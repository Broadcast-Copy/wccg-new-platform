"use client";

import { useEffect, useRef } from "react";
import {
  startSession,
  endSession,
  addTrackToSession,
  updateSession,
  getSessions,
} from "@/lib/listening-history";
import { useNowPlaying } from "@/hooks/use-now-playing";
import { createClient } from "@/lib/supabase/client";

/**
 * Hook that tracks listening sessions based on the stream overlay state.
 *
 * Local: keeps the localStorage session log (instant, works logged-out).
 * DB:   for signed-in users it also persists each listening period to
 *       public.listening_sessions (started/track/duration/ended) so the
 *       dashboard's "My Listening Sessions" shows real, cross-device,
 *       live-updating data.
 */
export function useListeningTracker(isListening: boolean) {
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dbSessionIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  // Poll now-playing only while the overlay is open
  const { data: nowPlaying } = useNowPlaying(isListening);

  // Resolve the signed-in user once (null = logged out → DB writes skipped)
  useEffect(() => {
    let cancelled = false;
    createClient().auth.getUser().then(({ data }) => {
      if (!cancelled) userIdRef.current = data.user?.id ?? null;
    }, () => {});
    return () => { cancelled = true; };
  }, []);

  // ── Start or resume session when overlay opens ────────────────────────
  useEffect(() => {
    if (isListening && !sessionIdRef.current) {
      const sessions = getSessions();
      const activeSession = sessions.find((s) => s.endedAt === null);
      if (activeSession) {
        sessionIdRef.current = activeSession.id;
        startTimeRef.current = new Date(activeSession.startedAt).getTime();
      } else {
        const session = startSession();
        sessionIdRef.current = session.id;
        startTimeRef.current = Date.now();
      }

      // DB session for signed-in users: close any stale open session, open fresh.
      const uid = userIdRef.current;
      if (uid) {
        const supabase = createClient();
        (async () => {
          try {
            await supabase
              .from("listening_sessions")
              .update({ ended_at: new Date().toISOString() })
              .eq("user_id", uid)
              .is("ended_at", null);
            const { data } = await supabase
              .from("listening_sessions")
              .insert({
                user_id: uid,
                stream_name: "WCCG 104.5 FM",
                title: nowPlaying?.title ?? null,
                artist: nowPlaying?.artist ?? null,
                started_at: new Date().toISOString(),
                duration_secs: 0,
              })
              .select("id")
              .single();
            dbSessionIdRef.current = (data?.id as string) ?? null;
          } catch { /* noop */ }
        })();
      }

      durationIntervalRef.current = setInterval(() => {
        if (!sessionIdRef.current || !startTimeRef.current) return;
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        updateSession(sessionIdRef.current, { durationSeconds: elapsed });
        if (dbSessionIdRef.current) {
          createClient()
            .from("listening_sessions")
            .update({ duration_secs: elapsed })
            .eq("id", dbSessionIdRef.current)
            .then(() => {}, () => {});
        }
      }, 60_000);
    }

    if (!isListening && sessionIdRef.current) {
      endSession(sessionIdRef.current);
      if (dbSessionIdRef.current) {
        const elapsed = startTimeRef.current
          ? Math.floor((Date.now() - startTimeRef.current) / 1000)
          : 0;
        createClient()
          .from("listening_sessions")
          .update({ ended_at: new Date().toISOString(), duration_secs: elapsed })
          .eq("id", dbSessionIdRef.current)
          .then(() => {}, () => {});
        dbSessionIdRef.current = null;
      }
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
    if (dbSessionIdRef.current) {
      createClient()
        .from("listening_sessions")
        .update({
          title: nowPlaying.title || "Unknown Track",
          artist: nowPlaying.artist || "WCCG 104.5 FM",
        })
        .eq("id", dbSessionIdRef.current)
        .then(() => {}, () => {});
    }
  }, [nowPlaying?.title, nowPlaying?.artist]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup on unmount — do NOT end session (refresh case) ────────────
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      sessionIdRef.current = null;
    };
  }, []);
}
