"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export interface StreamMetadata {
  title?: string;
  artist?: string;
  albumArt?: string;
  streamName?: string;
}

export interface AudioPlayerContextValue {
  /** Start playing a stream URL. Replaces any currently playing stream. */
  play: (streamUrl: string, metadata?: StreamMetadata) => void;
  /** Pause the current stream. */
  pause: () => void;
  /** Resume the paused stream. */
  resume: () => void;
  /** Set the volume (0 to 1). */
  setVolume: (volume: number) => void;
  /** Update metadata for the currently playing stream (e.g., from now-playing polling). */
  updateMetadata: (metadata: Partial<StreamMetadata>) => void;
  /** The URL of the currently loaded stream, or null if none. */
  currentStream: string | null;
  /** Whether audio is currently playing. */
  isPlaying: boolean;
  /** Current volume (0 to 1). */
  volume: number;
  /** Current stream metadata. */
  metadata: StreamMetadata;
}

export const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(
  null,
);

/**
 * AudioProvider - CRITICAL component for persistent audio playback.
 *
 * This provider holds a ref to a single HTMLAudioElement created via `new Audio()`.
 * It NEVER renders an <audio> element in JSX. The Audio instance is created once
 * and persists for the lifetime of the provider, surviving route transitions.
 *
 * This component must be mounted in the root layout so it never unmounts.
 */
export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentStreamRef = useRef<string | null>(null);
  const [currentStream, setCurrentStream] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.8);
  const [metadata, setMetadata] = useState<StreamMetadata>({});

  // Initialize the Audio instance once on mount
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = 0.8;
    }

    const audio = audioRef.current;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => setIsPlaying(false);

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, []);

  const play = useCallback(
    (streamUrl: string, newMetadata?: StreamMetadata) => {
      const audio = audioRef.current;
      if (!audio) return;

      // If the same base stream is requested and it's paused, just resume
      if (currentStreamRef.current === streamUrl && audio.paused) {
        audio.play().catch(console.error);
        return;
      }

      // Generate a unique play session ID for SecureNet Icecast streams
      const sessionId = crypto.randomUUID().replace(/-/g, "").substring(0, 32).toUpperCase();
      const separator = streamUrl.includes("?") ? "&" : "?";
      const srcWithSession = `${streamUrl}${separator}playSessionID=${sessionId}`;

      // Load a new stream
      audio.src = srcWithSession;
      audio.load();
      audio.play().catch(console.error);
      currentStreamRef.current = streamUrl;
      setCurrentStream(streamUrl);
      if (newMetadata) {
        setMetadata(newMetadata);
      }
    },
    [],
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    audioRef.current?.play().catch(console.error);
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    const clamped = Math.max(0, Math.min(1, newVolume));
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    setVolumeState(clamped);
  }, []);

  const updateMetadata = useCallback((partial: Partial<StreamMetadata>) => {
    setMetadata((prev) => ({ ...prev, ...partial }));
  }, []);

  return (
    <AudioPlayerContext.Provider
      value={{
        play,
        pause,
        resume,
        setVolume,
        updateMetadata,
        currentStream,
        isPlaying,
        volume,
        metadata,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}
