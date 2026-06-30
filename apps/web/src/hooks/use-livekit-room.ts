"use client";

/**
 * useLiveKitRoom — connect the Podcast Studio to a shared LiveKit room so
 * multiple signed-in users can see/hear each other.
 *
 * The page owns this hook (not the grid) so the existing studio controls
 * (mic/cam buttons, recorder, audio meter) can drive and read the real LiveKit
 * local media. The token is minted by the `livekit-token` edge function.
 *
 * Inert unless NEXT_PUBLIC_LIVEKIT_URL is set AND a roomId is provided, so with
 * no LiveKit configured the studio behaves exactly as before (solo recorder).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  Track,
  type Participant,
} from "livekit-client";
import { createClient } from "@/lib/supabase/client";

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "";

export type StudioConnState =
  | "idle"
  | "connecting"
  | "connected"
  | "error"
  | "disconnected";

export interface LiveKitRoomState {
  /** Local participant first, then remotes. Empty until connected. */
  participants: Participant[];
  state: StudioConnState;
  error: string | null;
  /** MediaStream of the local camera+mic LiveKit tracks (for the recorder). */
  localStream: MediaStream | null;
  setMicrophoneEnabled: (on: boolean) => void;
  setCameraEnabled: (on: boolean) => void;
}

export function useLiveKitRoom(
  roomId: string | null,
  enabled: boolean,
  displayName?: string | null,
): LiveKitRoomState {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [state, setState] = useState<StudioConnState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    if (!enabled || !roomId || !LIVEKIT_URL) return;

    let cancelled = false;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    const snapshot = () => {
      if (cancelled) return;
      setParticipants([
        room.localParticipant,
        ...Array.from(room.remoteParticipants.values()),
      ]);
    };

    const refreshLocalStream = () => {
      if (cancelled) return;
      const lp = room.localParticipant;
      const v = lp.getTrackPublication(Track.Source.Camera)?.track?.mediaStreamTrack;
      const a = lp.getTrackPublication(Track.Source.Microphone)?.track?.mediaStreamTrack;
      const tracks = [v, a].filter(Boolean) as MediaStreamTrack[];
      setLocalStream(tracks.length ? new MediaStream(tracks) : null);
    };

    room
      .on(RoomEvent.ParticipantConnected, snapshot)
      .on(RoomEvent.ParticipantDisconnected, snapshot)
      .on(RoomEvent.TrackSubscribed, snapshot)
      .on(RoomEvent.TrackUnsubscribed, snapshot)
      .on(RoomEvent.TrackMuted, snapshot)
      .on(RoomEvent.TrackUnmuted, snapshot)
      .on(RoomEvent.ActiveSpeakersChanged, snapshot)
      .on(RoomEvent.LocalTrackPublished, () => { refreshLocalStream(); snapshot(); })
      .on(RoomEvent.LocalTrackUnpublished, () => { refreshLocalStream(); snapshot(); })
      .on(RoomEvent.Disconnected, () => { if (!cancelled) setState("disconnected"); });

    async function connect() {
      try {
        setState("connecting");
        const supabase = createClient();
        const { data, error: fnErr } = await supabase.functions.invoke(
          "livekit-token",
          { body: { room: roomId, name: displayName ?? undefined } },
        );
        if (fnErr) throw new Error(fnErr.message);
        const token = (data as { token?: string } | null)?.token;
        const url = (data as { url?: string } | null)?.url || LIVEKIT_URL;
        if (!token) throw new Error("No LiveKit token returned");

        await room.connect(url, token);
        if (cancelled) { await room.disconnect(); return; }

        await room.localParticipant.enableCameraAndMicrophone();
        refreshLocalStream();
        snapshot();
        if (!cancelled) setState("connected");
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          setState("error");
        }
      }
    }
    void connect();

    return () => {
      cancelled = true;
      room.removeAllListeners();
      void room.disconnect();
      roomRef.current = null;
      setParticipants([]);
      setLocalStream(null);
      setState("idle");
    };
  }, [enabled, roomId, displayName]);

  const setMicrophoneEnabled = useCallback((on: boolean) => {
    void roomRef.current?.localParticipant.setMicrophoneEnabled(on).catch(() => {});
  }, []);

  const setCameraEnabled = useCallback((on: boolean) => {
    void roomRef.current?.localParticipant.setCameraEnabled(on).catch(() => {});
  }, []);

  return { participants, state, error, localStream, setMicrophoneEnabled, setCameraEnabled };
}
