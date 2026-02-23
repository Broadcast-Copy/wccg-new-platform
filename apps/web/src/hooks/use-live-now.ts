"use client";

import { useEffect, useState } from "react";

export interface LiveMetadata {
  streamId: string;
  title?: string;
  artist?: string;
  albumArt?: string;
  listeners?: number;
}

/**
 * Hook that subscribes to live stream metadata via Server-Sent Events (SSE).
 *
 * Connects to the NestJS API's SSE endpoint for real-time metadata updates
 * (track changes, listener counts, etc.).
 *
 * @param streamId - The stream ID to subscribe to, or undefined to skip.
 * @returns The current live metadata and connection state.
 */
export function useLiveNow(streamId?: string) {
  const [metadata, setMetadata] = useState<LiveMetadata | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!streamId) return;

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
    const url = `${apiBaseUrl}/streams/${streamId}/live`;

    let eventSource: EventSource;

    try {
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as LiveMetadata;
          setMetadata(data);
        } catch {
          console.error("Failed to parse SSE message");
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        setError("Connection lost. Reconnecting...");
      };
    } catch (err) {
      // Defer setState to avoid synchronous call in effect body
      queueMicrotask(() => setError("Failed to connect to live stream"));
      console.error("SSE connection error:", err);
    }

    return () => {
      eventSource?.close();
      setIsConnected(false);
    };
  }, [streamId]);

  return { metadata, isConnected, error };
}
