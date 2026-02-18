"use client";

import { useContext } from "react";
import {
  AudioPlayerContext,
  type AudioPlayerContextValue,
} from "@/components/player/audio-provider";

/**
 * Hook to access the global audio player.
 *
 * Must be used within a component tree wrapped by `<AudioProvider>`.
 *
 * @returns The audio player context with play, pause, resume, setVolume, and state.
 */
export function useAudioPlayer(): AudioPlayerContextValue {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error(
      "useAudioPlayer must be used within an AudioProvider. " +
        "Ensure <AudioProvider> is rendered in the root layout.",
    );
  }
  return context;
}
