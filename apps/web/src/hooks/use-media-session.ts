"use client";

import { useEffect, useRef } from "react";
import type { StreamMetadata } from "@/components/player/audio-provider";

/**
 * useMediaSession — Integrates with the browser Media Session API to display
 * "Now Playing" information on the device lock screen, notification shade,
 * Bluetooth device displays, and OS media controls (e.g. macOS Now Playing
 * widget, Windows media overlay, Android/iOS lock screen controls).
 *
 * Features:
 * - Displays song title, artist, album art on lock screen
 * - Provides play/pause/stop hardware button controls
 * - Updates live as now-playing metadata changes from Cirrus feed
 * - Works on mobile (iOS Safari, Android Chrome) and desktop
 *
 * Usage: Call in the GlobalPlayer component where metadata + controls exist.
 */
export function useMediaSession({
  metadata,
  isPlaying,
  onPlay,
  onPause,
  onStop,
}: {
  metadata: StreamMetadata;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
}) {
  // Track the previous metadata values to avoid unnecessary updates
  const prevMetaRef = useRef<string>("");

  // Set up action handlers once
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    const session = navigator.mediaSession;

    // Play/Pause handlers for hardware controls (lock screen, Bluetooth, etc.)
    session.setActionHandler("play", onPlay);
    session.setActionHandler("pause", onPause);
    session.setActionHandler("stop", onStop);

    // Seek handlers are not applicable for live radio streams
    session.setActionHandler("seekbackward", null);
    session.setActionHandler("seekforward", null);
    session.setActionHandler("seekto", null);
    session.setActionHandler("previoustrack", null);
    session.setActionHandler("nexttrack", null);

    return () => {
      // Clean up handlers on unmount
      session.setActionHandler("play", null);
      session.setActionHandler("pause", null);
      session.setActionHandler("stop", null);
    };
  }, [onPlay, onPause, onStop]);

  // Update playback state
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  // Update metadata when it changes
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    if (typeof MediaMetadata === "undefined") return;

    const title = metadata.title || metadata.streamName || "WCCG 104.5 FM";
    const artist = metadata.artist || "WCCG 104.5 FM";
    const albumArt = metadata.albumArt || null;

    // Build a key to detect actual changes
    const metaKey = `${title}|${artist}|${albumArt}`;
    if (metaKey === prevMetaRef.current) return;
    prevMetaRef.current = metaKey;

    // Build artwork array — include station logo as fallback
    const artwork: MediaImage[] = [];

    if (albumArt) {
      artwork.push(
        { src: albumArt, sizes: "256x256", type: "image/jpeg" },
        { src: albumArt, sizes: "512x512", type: "image/jpeg" },
      );
    }

    // Always include station logo as a fallback
    const stationLogo = "/images/logos/1045fm-logo.png";
    artwork.push(
      { src: stationLogo, sizes: "192x192", type: "image/png" },
      { src: stationLogo, sizes: "512x512", type: "image/png" },
    );

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album: "WCCG 104.5 FM — Durham, NC",
      artwork,
    });
  }, [metadata]);
}
