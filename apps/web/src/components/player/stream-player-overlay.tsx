"use client";

import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from "react";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { useListeningTracker } from "@/hooks/use-listening-tracker";
import { useWikiTrigger } from "@/hooks/use-wiki-trigger";

// ---------------------------------------------------------------------------
// WCCG Icecast stream URL — native HTML5 audio
// ---------------------------------------------------------------------------
const WCCG_STREAM_URL = "https://ice66.securenetsystems.net/WCCG";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
interface StreamPlayerContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const StreamPlayerContext = createContext<StreamPlayerContextValue | null>(null);

export function useStreamPlayer(): StreamPlayerContextValue {
  const ctx = useContext(StreamPlayerContext);
  if (!ctx) {
    throw new Error(
      "useStreamPlayer must be used within a StreamPlayerProvider.",
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider — thin wrapper that starts native audio via AudioProvider
// ---------------------------------------------------------------------------
export function StreamPlayerProvider({ children }: { children: ReactNode }) {
  const { play, pause, resume, stop, isPlaying, currentStream } = useAudioPlayer();

  // The player is "open" whenever a stream is loaded (playing or paused)
  const isOpen = currentStream !== null;

  const open = useCallback(() => {
    play(WCCG_STREAM_URL, { streamName: "WCCG 104.5 FM" });
  }, [play]);

  const close = useCallback(() => {
    stop(); // Fully stop + clear saved state so player goes away
  }, [stop]);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else if (currentStream) {
      resume();
    } else {
      play(WCCG_STREAM_URL, { streamName: "WCCG 104.5 FM" });
    }
  }, [isPlaying, currentStream, play, pause, resume]);

  // Track listening sessions for history
  useListeningTracker(isPlaying);

  // C4 — auto-research the artist on air. Fire-and-forget, server-deduped.
  useWikiTrigger();

  return (
    <StreamPlayerContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </StreamPlayerContext.Provider>
  );
}
