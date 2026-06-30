"use client";

/**
 * LiveKitGrid — renders real LiveKit participant tiles (local + remotes) for the
 * Podcast Studio. Presentational: the page owns the connection via
 * useLiveKitRoom and passes the participant list down here.
 *
 * Each tile attaches the participant's camera track to a <video> and (for
 * remotes only — never the local user, to avoid echo) the mic track to an
 * <audio>. Track attach/detach is driven by refs in an effect.
 */

import { useEffect, useRef } from "react";
import { Track, type Participant } from "livekit-client";
import { MicOff, Loader2, UserPlus, Copy, Check } from "lucide-react";

function ParticipantTile({
  participant,
  isLocal,
}: {
  participant: Participant;
  isLocal: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const camPub = participant.getTrackPublication(Track.Source.Camera);
  const micPub = participant.getTrackPublication(Track.Source.Microphone);
  const camTrack = camPub?.track;
  const micTrack = micPub?.track;
  const camOn = !!camTrack && !camPub?.isMuted;
  const micOn = !!micTrack && !micPub?.isMuted;

  // Attach/detach camera video.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !camTrack) return;
    camTrack.attach(el);
    return () => { camTrack.detach(el); };
  }, [camTrack]);

  // Attach/detach remote audio (never the local participant — that would echo).
  useEffect(() => {
    if (isLocal) return;
    const el = audioRef.current;
    if (!el || !micTrack) return;
    micTrack.attach(el);
    return () => { micTrack.detach(el); };
  }, [micTrack, isLocal]);

  const name = participant.name || participant.identity || "Guest";
  const initial = name.charAt(0).toUpperCase();
  const speaking = participant.isSpeaking;

  return (
    <div
      className={`relative w-full h-full rounded-xl overflow-hidden bg-gradient-to-br from-muted via-card to-muted transition-shadow ${
        speaking ? "ring-2 ring-[#74ddc7]" : ""
      }`}
    >
      {camOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-gradient-to-br from-[#7401df]/30 to-[#74ddc7]/30 flex items-center justify-center h-20 w-20 text-3xl">
            <span className="font-bold text-white/80">{initial}</span>
          </div>
        </div>
      )}

      {/* Remote audio sink (hidden) */}
      {!isLocal && <audio ref={audioRef} autoPlay />}

      {/* Name label */}
      <div className="absolute bottom-3 left-3">
        <span className="bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-lg">
          {name}
          {isLocal ? " (You)" : ""}
        </span>
      </div>

      {/* Muted indicator */}
      {!micOn && (
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm p-1.5 rounded-lg">
          <MicOff className="h-3.5 w-3.5 text-red-400" />
        </div>
      )}
    </div>
  );
}

function gridColsClass(n: number): string {
  if (n <= 1) return "grid-cols-1";
  if (n === 2) return "grid-cols-2";
  if (n <= 4) return "grid-cols-2";
  if (n <= 6) return "grid-cols-3";
  return "grid-cols-4";
}

export function LiveKitGrid({
  participants,
  connecting,
  error,
  inviteUrl,
}: {
  participants: Participant[];
  connecting: boolean;
  error: string | null;
  inviteUrl: string;
}) {
  if (error) {
    return (
      <div className="h-full p-3">
        <div className="h-full rounded-xl border border-red-500/30 bg-red-500/5 flex flex-col items-center justify-center gap-2 text-center p-6">
          <p className="text-sm font-semibold text-red-300">Couldn&apos;t connect to the studio room</p>
          <p className="text-xs text-muted-foreground max-w-md">{error}</p>
        </div>
      </div>
    );
  }

  if (connecting && participants.length === 0) {
    return (
      <div className="h-full p-3">
        <div className="h-full rounded-xl border border-border bg-card flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#74ddc7]" />
          <p className="text-sm text-muted-foreground">Connecting to the studio…</p>
        </div>
      </div>
    );
  }

  const local = participants.find((p) => p.isLocal);
  const remotes = participants.filter((p) => !p.isLocal);
  const tiles = [local, ...remotes].filter(Boolean) as Participant[];

  return (
    <div className="h-full p-3">
      <div className={`grid ${gridColsClass(tiles.length || 1)} gap-3 h-full auto-rows-fr`}>
        {tiles.map((p) => (
          <ParticipantTile key={p.identity} participant={p} isLocal={!!p.isLocal} />
        ))}

        {/* Invite tile while you're the only one here */}
        {remotes.length === 0 && (
          <InviteTile inviteUrl={inviteUrl} />
        )}
      </div>
    </div>
  );
}

function InviteTile({ inviteUrl }: { inviteUrl: string }) {
  const copiedRef = useRef<HTMLSpanElement | null>(null);
  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-card border-2 border-dashed border-border flex flex-col items-center justify-center gap-4 p-6">
      <div className="h-14 w-14 rounded-full bg-[#7401df]/10 flex items-center justify-center">
        <UserPlus className="h-6 w-6 text-[#7401df]" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">Invite a Guest</p>
        <p className="text-xs text-muted-foreground mt-1">Share this link — they join the same room</p>
      </div>
      {inviteUrl && (
        <div className="bg-white rounded-lg p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(inviteUrl)}`}
            alt="QR code to join studio"
            className="h-[140px] w-[140px]"
            width={140}
            height={140}
          />
        </div>
      )}
      <button
        onClick={() => {
          navigator.clipboard.writeText(inviteUrl).catch(() => {});
          if (copiedRef.current) copiedRef.current.textContent = "Copied!";
        }}
        className="text-xs bg-[#7401df]/20 text-[#7401df] px-4 py-2 rounded-lg hover:bg-[#7401df]/30 transition-colors font-medium flex items-center gap-1.5"
      >
        <Copy className="h-3 w-3" />
        <span ref={copiedRef}>Copy Invite Link</span>
        <Check className="h-3 w-3 opacity-0" />
      </button>
    </div>
  );
}
