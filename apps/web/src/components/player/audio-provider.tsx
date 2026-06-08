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
  /** Stop the stream entirely and clear saved state (player disappears). */
  stop: () => void;
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
  /** Whether the audio is currently buffering / waiting for data. */
  isBuffering: boolean;
  /** Connection error message, or null if connected fine. */
  connectionError: string | null;
  /** Access the underlying HTMLAudioElement (for audio capture/analysis). */
  getAudioElement: () => HTMLAudioElement | null;
}

export const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(
  null,
);

// ---------------------------------------------------------------------------
// localStorage persistence helpers
// ---------------------------------------------------------------------------

const STREAM_STORAGE_KEY = "wccg_active_stream";
const VOLUME_STORAGE_KEY = "wccg_player_volume";

interface SavedStreamState {
  url: string;
  metadata: StreamMetadata;
}

function loadSavedStream(): SavedStreamState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STREAM_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

function saveStreamState(url: string, meta: StreamMetadata): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STREAM_STORAGE_KEY,
      JSON.stringify({ url, metadata: meta }),
    );
  } catch {
    // ignore
  }
}

function clearSavedStream(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STREAM_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function loadSavedVolume(): number {
  if (typeof window === "undefined") return 0.8;
  try {
    const raw = localStorage.getItem(VOLUME_STORAGE_KEY);
    if (raw !== null) {
      const v = parseFloat(raw);
      if (!isNaN(v)) return Math.max(0, Math.min(1, v));
    }
  } catch {
    // ignore
  }
  return 0.8;
}

function saveSavedVolume(v: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VOLUME_STORAGE_KEY, String(v));
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * AudioProvider - CRITICAL component for persistent audio playback.
 *
 * This provider holds a ref to a single HTMLAudioElement created via `new Audio()`.
 * It NEVER renders an <audio> element in JSX. The Audio instance is created once
 * and persists for the lifetime of the provider, surviving route transitions.
 *
 * Stream state is persisted to localStorage so the player survives page refreshes.
 * The player will auto-resume on page load if a stream was previously active.
 *
 * This component must be mounted in the root layout so it never unmounts.
 */
export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentStreamRef = useRef<string | null>(null);
  const [currentStream, setCurrentStream] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  // Initialize volume synchronously from localStorage (guarded for static export).
  const [volume, setVolumeState] = useState(() => loadSavedVolume());
  const [metadata, setMetadata] = useState<StreamMetadata>({});
  const [isBuffering, setIsBuffering] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const restoredRef = useRef(false);

  // Initialize the Audio instance once on mount + restore saved stream
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      // `volume` is initialized from the same localStorage value above.
      audioRef.current.volume = volume;
    }

    const audio = audioRef.current;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => {
      setIsPlaying(false);
      setIsBuffering(false);
      setConnectionError("Connection lost — retrying...");
    };
    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => {
      setIsBuffering(false);
      setConnectionError(null);
    };
    const handlePlaying = () => {
      setIsBuffering(false);
      setConnectionError(null);
    };
    const handleStalled = () => setIsBuffering(true);

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("stalled", handleStalled);

    // Restore saved stream on mount (only once)
    if (!restoredRef.current) {
      restoredRef.current = true;
      const saved = loadSavedStream();
      if (saved) {
        // Generate a fresh session ID for the restored stream
        const sessionId = crypto
          .randomUUID()
          .replace(/-/g, "")
          .substring(0, 32)
          .toUpperCase();
        const separator = saved.url.includes("?") ? "&" : "?";
        const srcWithSession = `${saved.url}${separator}playSessionID=${sessionId}`;

        // Restore the last stream into the player UI but DO NOT auto-play on
        // mount. (Previously this called load() + play(), which started the live
        // stream the instant any page loaded — users asked for autoplay off.)
        // The src is set so the bar shows what was playing; the user taps play.
        audio.src = srcWithSession;
        currentStreamRef.current = saved.url;
        setCurrentStream(saved.url);
        setMetadata(saved.metadata);
      }
    }

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("stalled", handleStalled);
    };
    // Mount-only: initializes the Audio element and restores saved stream once.
    // `volume` is read only for the initial element volume (same localStorage source).
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const sessionId = crypto
        .randomUUID()
        .replace(/-/g, "")
        .substring(0, 32)
        .toUpperCase();
      const separator = streamUrl.includes("?") ? "&" : "?";
      const srcWithSession = `${streamUrl}${separator}playSessionID=${sessionId}`;

      // Load a new stream
      audio.src = srcWithSession;
      audio.load();
      audio.play().catch(console.error);
      currentStreamRef.current = streamUrl;
      setCurrentStream(streamUrl);
      const meta = newMetadata || {};
      setMetadata(meta);

      // Persist to localStorage so stream survives page refresh
      saveStreamState(streamUrl, meta);
    },
    [],
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    audioRef.current?.play().catch(console.error);
  }, []);

  /** Stop the stream entirely — clears audio, state, and localStorage. */
  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load(); // Reset the audio element
    }
    currentStreamRef.current = null;
    setCurrentStream(null);
    setIsPlaying(false);
    setMetadata({});
    clearSavedStream();
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    const clamped = Math.max(0, Math.min(1, newVolume));
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    setVolumeState(clamped);
    saveSavedVolume(clamped);
  }, []);

  const getAudioElement = useCallback(() => audioRef.current, []);

  const updateMetadata = useCallback((partial: Partial<StreamMetadata>) => {
    setMetadata((prev) => {
      const updated = { ...prev, ...partial };
      // Also update localStorage with latest metadata
      if (currentStreamRef.current) {
        saveStreamState(currentStreamRef.current, updated);
      }
      return updated;
    });
  }, []);

  return (
    <AudioPlayerContext.Provider
      value={{
        play,
        pause,
        resume,
        stop,
        setVolume,
        updateMetadata,
        getAudioElement,
        currentStream,
        isPlaying,
        isBuffering,
        connectionError,
        volume,
        metadata,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}
