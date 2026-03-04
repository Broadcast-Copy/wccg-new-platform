"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { cn } from "@/lib/utils";
import {
  Play,
  Pause,
  Rewind,
  FastForward,
  Repeat,
  Scissors,
  Magnet,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronDown,
  Minus,
  Plus,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Clip {
  id: string;
  trackId: string;
  name: string;
  startTime: number; // seconds
  duration: number; // seconds
  color: string; // tailwind-friendly hex
  type: "video" | "audio" | "music";
}

interface Track {
  id: string;
  label: string;
  type: "video" | "audio" | "music";
  color: string;
  muted: boolean;
  solo: boolean;
  locked: boolean;
  visible: boolean;
  height: number; // px
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TRACK_HEADER_WIDTH = 180;
const MIN_TRACK_HEIGHT = 48;
const MAX_TRACK_HEIGHT = 160;
const DEFAULT_TRACK_HEIGHT = 72;
const FRAME_RATE = 30;
const TOTAL_DURATION = 300; // 5 minutes
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const PIXELS_PER_SECOND_BASE = 40;

const PLAYBACK_SPEEDS = [0.5, 1, 1.5, 2] as const;

/* ------------------------------------------------------------------ */
/*  Initial Data                                                       */
/* ------------------------------------------------------------------ */

const initialTracks: Track[] = [
  {
    id: "v1",
    label: "V1",
    type: "video",
    color: "#3b82f6",
    muted: false,
    solo: false,
    locked: false,
    visible: true,
    height: DEFAULT_TRACK_HEIGHT,
  },
  {
    id: "v2",
    label: "V2",
    type: "video",
    color: "#60a5fa",
    muted: false,
    solo: false,
    locked: false,
    visible: true,
    height: DEFAULT_TRACK_HEIGHT,
  },
  {
    id: "a1",
    label: "A1",
    type: "audio",
    color: "#22c55e",
    muted: false,
    solo: false,
    locked: false,
    visible: true,
    height: DEFAULT_TRACK_HEIGHT,
  },
  {
    id: "a2",
    label: "A2",
    type: "audio",
    color: "#4ade80",
    muted: false,
    solo: false,
    locked: false,
    visible: true,
    height: DEFAULT_TRACK_HEIGHT,
  },
  {
    id: "a3",
    label: "A3",
    type: "music",
    color: "#a855f7",
    muted: false,
    solo: false,
    locked: false,
    visible: true,
    height: DEFAULT_TRACK_HEIGHT,
  },
];

const initialClips: Clip[] = [
  {
    id: "clip-1",
    trackId: "v1",
    name: "Main Camera",
    startTime: 2,
    duration: 260,
    color: "#0d9488",
    type: "video",
  },
  {
    id: "clip-2",
    trackId: "v2",
    name: "Overlay Graphic",
    startTime: 30,
    duration: 45,
    color: "#7401df",
    type: "video",
  },
  {
    id: "clip-3",
    trackId: "a1",
    name: "Host Mic",
    startTime: 0,
    duration: 275,
    color: "#22c55e",
    type: "audio",
  },
  {
    id: "clip-4",
    trackId: "a2",
    name: "Guest Mic",
    startTime: 15,
    duration: 230,
    color: "#16a34a",
    type: "audio",
  },
  {
    id: "clip-5",
    trackId: "a3",
    name: "Background Music",
    startTime: 0,
    duration: 180,
    color: "#a855f7",
    type: "music",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTimecode(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const f = Math.floor((seconds % 1) * FRAME_RATE);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
}

function formatTimecodeShort(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/*  Waveform SVG Component                                             */
/* ------------------------------------------------------------------ */

function WaveformPattern({
  width,
  height,
  color,
  type,
}: {
  width: number;
  height: number;
  color: string;
  type: "audio" | "music";
}) {
  const bars = useMemo(() => {
    const barWidth = type === "music" ? 3 : 2;
    const gap = type === "music" ? 2 : 1.5;
    const count = Math.floor(width / (barWidth + gap));
    const result: { x: number; h: number }[] = [];

    // Deterministic pseudo-random waveform
    let seed = type === "music" ? 42 : 17;
    for (let i = 0; i < count; i++) {
      seed = (seed * 16807 + 7) % 2147483647;
      const normalized = seed / 2147483647;

      // Create realistic waveform envelope
      const position = i / count;
      let envelope = 1;
      // Fade in/out at edges
      if (position < 0.02) envelope = position / 0.02;
      if (position > 0.98) envelope = (1 - position) / 0.02;

      // Music has more consistent levels, audio has more variation
      const variation = type === "music" ? 0.3 : 0.6;
      const baseLevel = type === "music" ? 0.4 : 0.5;
      const barH =
        Math.max(2, (baseLevel + normalized * variation) * height * 0.7) *
        envelope;

      result.push({ x: i * (barWidth + gap), h: barH });
    }
    return result;
  }, [width, height, color, type]);

  const barWidth = type === "music" ? 3 : 2;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="absolute inset-0"
    >
      {bars.map((bar, i) => (
        <rect
          key={i}
          x={bar.x}
          y={(height - bar.h) / 2}
          width={barWidth}
          height={bar.h}
          rx={barWidth / 2}
          fill={color}
          opacity={0.5}
        />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Transport Button                                                   */
/* ------------------------------------------------------------------ */

function TransportButton({
  children,
  active,
  onClick,
  title,
  className,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md transition-all duration-150",
        "text-muted-foreground hover:text-foreground hover:bg-muted/80",
        "active:scale-95",
        active && "bg-primary/20 text-primary",
        className
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Track Header                                                       */
/* ------------------------------------------------------------------ */

function TrackHeader({
  track,
  onToggleMute,
  onToggleSolo,
  onToggleLock,
  onToggleVisible,
  onResizeStart,
}: {
  track: Track;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onToggleLock: () => void;
  onToggleVisible: () => void;
  onResizeStart: (e: React.MouseEvent) => void;
}) {
  const typeLabel = track.type === "video" ? "Video" : track.type === "audio" ? "Audio" : "Music";

  return (
    <div
      className="relative flex flex-col border-b border-border bg-card"
      style={{ height: track.height }}
    >
      <div className="flex flex-1 items-center gap-2 px-3">
        {/* Color indicator */}
        <div
          className="h-full w-1 rounded-full"
          style={{ backgroundColor: track.color, minHeight: 24 }}
        />

        {/* Label */}
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-bold text-foreground tracking-wide">
            {track.label}
          </span>
          <span className="text-[10px] text-muted-foreground leading-tight">
            {typeLabel}
          </span>
        </div>

        {/* Controls */}
        <div className="ml-auto flex items-center gap-0.5">
          <button
            onClick={onToggleMute}
            title="Mute"
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold transition-colors",
              track.muted
                ? "bg-red-500/20 text-red-400"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            M
          </button>
          <button
            onClick={onToggleSolo}
            title="Solo"
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold transition-colors",
              track.solo
                ? "bg-yellow-500/20 text-yellow-400"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            S
          </button>
          <button
            onClick={onToggleLock}
            title="Lock"
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded transition-colors",
              track.locked
                ? "text-orange-400"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {track.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
          </button>
          <button
            onClick={onToggleVisible}
            title="Visibility"
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded transition-colors",
              !track.visible
                ? "text-muted-foreground/40"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {track.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={onResizeStart}
        className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize hover:bg-primary/30 transition-colors"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Clip Block                                                         */
/* ------------------------------------------------------------------ */

function ClipBlock({
  clip,
  track,
  pixelsPerSecond,
  selected,
  onSelect,
}: {
  clip: Clip;
  track: Track;
  pixelsPerSecond: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const left = clip.startTime * pixelsPerSecond;
  const width = clip.duration * pixelsPerSecond;
  const isAudioLike = clip.type === "audio" || clip.type === "music";

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={cn(
        "absolute top-1 bottom-1 rounded-md overflow-hidden cursor-pointer",
        "transition-shadow duration-150",
        "group",
        selected && "ring-2 ring-primary shadow-[0_0_12px_rgba(116,221,199,0.4)]"
      )}
      style={{
        left,
        width: Math.max(width, 20),
        backgroundColor: clip.color + "30",
        borderLeft: `3px solid ${clip.color}`,
      }}
    >
      {/* Top gradient bar */}
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, ${clip.color}, ${clip.color}88)`,
        }}
      />

      {/* Waveform for audio tracks */}
      {isAudioLike && width > 30 && (
        <WaveformPattern
          width={Math.max(width, 30)}
          height={track.height - 8}
          color={clip.color}
          type={clip.type as "audio" | "music"}
        />
      )}

      {/* Video track pattern — subtle grid */}
      {clip.type === "video" && width > 30 && (
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, ${clip.color} 0px, transparent 1px, transparent 20px)`,
          }}
        />
      )}

      {/* Clip name */}
      <div className="relative z-10 flex h-full items-center px-2">
        <span
          className="truncate text-[11px] font-semibold drop-shadow-sm"
          style={{ color: clip.color }}
        >
          {clip.name}
        </span>
      </div>

      {/* Trim handles */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize",
          "bg-white/0 hover:bg-white/30 transition-colors",
          "border-l-2 border-transparent hover:border-white/60"
        )}
      />
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize",
          "bg-white/0 hover:bg-white/30 transition-colors",
          "border-r-2 border-transparent hover:border-white/60"
        )}
      />

      {/* Duration badge on hover */}
      <div className="absolute right-2 bottom-1 hidden group-hover:block">
        <span className="text-[9px] text-muted-foreground bg-background/60 rounded px-1 py-px">
          {formatTimecodeShort(clip.duration)}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Timecode Ruler                                                     */
/* ------------------------------------------------------------------ */

function TimecodeRuler({
  pixelsPerSecond,
  totalDuration,
  currentTime,
  markIn,
  markOut,
  onSeek,
  zoom,
}: {
  pixelsPerSecond: number;
  totalDuration: number;
  currentTime: number;
  markIn: number | null;
  markOut: number | null;
  onSeek: (time: number) => void;
  zoom: number;
}) {
  const rulerRef = useRef<HTMLDivElement>(null);
  const totalWidth = totalDuration * pixelsPerSecond;

  // Determine tick interval based on zoom
  const getTickInterval = (): { major: number; minor: number } => {
    if (zoom >= 3) return { major: 5, minor: 1 };
    if (zoom >= 1.5) return { major: 10, minor: 5 };
    if (zoom >= 0.75) return { major: 30, minor: 10 };
    if (zoom >= 0.4) return { major: 60, minor: 30 };
    return { major: 120, minor: 60 };
  };

  const { major, minor } = getTickInterval();

  const ticks = useMemo(() => {
    const result: { time: number; isMajor: boolean }[] = [];
    for (let t = 0; t <= totalDuration; t += minor) {
      result.push({ time: t, isMajor: t % major === 0 });
    }
    return result;
  }, [totalDuration, major, minor]);

  const handleClick = (e: React.MouseEvent) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + rulerRef.current.scrollLeft;
    const time = Math.max(0, Math.min(x / pixelsPerSecond, totalDuration));
    onSeek(time);
  };

  return (
    <div
      ref={rulerRef}
      onClick={handleClick}
      className="relative h-7 cursor-pointer select-none border-b border-border bg-muted/50"
      style={{ width: totalWidth }}
    >
      {/* In/Out range */}
      {markIn !== null && markOut !== null && (
        <div
          className="absolute top-0 bottom-0 bg-blue-500/10 border-x-2 border-blue-500/50"
          style={{
            left: markIn * pixelsPerSecond,
            width: (markOut - markIn) * pixelsPerSecond,
          }}
        />
      )}

      {/* Ticks */}
      {ticks.map(({ time, isMajor }) => (
        <div
          key={time}
          className="absolute top-0"
          style={{ left: time * pixelsPerSecond }}
        >
          <div
            className={cn(
              "w-px",
              isMajor
                ? "h-7 bg-muted-foreground/40"
                : "h-3 bg-muted-foreground/20 mt-4"
            )}
          />
          {isMajor && (
            <span
              className="absolute top-0.5 left-1 text-[10px] text-muted-foreground font-mono whitespace-nowrap select-none"
            >
              {formatTimecodeShort(time)}
            </span>
          )}
        </div>
      ))}

      {/* Playhead triangle */}
      <div
        className="absolute top-0 z-30 pointer-events-none"
        style={{ left: currentTime * pixelsPerSecond }}
      >
        <svg
          width="12"
          height="10"
          viewBox="0 0 12 10"
          className="relative -left-1.5"
        >
          <polygon points="0,0 12,0 6,10" fill="#dc2626" />
        </svg>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Timeline Component                                            */
/* ------------------------------------------------------------------ */

export function StudioTimeline() {
  /* -- State -- */
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [selectedClip, setSelectedClip] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>(initialTracks);
  const [clips] = useState<Clip[]>(initialClips);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [razorActive, setRazorActive] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [markIn, setMarkIn] = useState<number | null>(null);
  const [markOut, setMarkOut] = useState<number | null>(null);

  /* -- Refs -- */
  const animationRef = useRef<number | null>(null);
  const lastFrameTime = useRef<number>(0);
  const trackAreaRef = useRef<HTMLDivElement>(null);
  const resizingTrack = useRef<{ id: string; startY: number; startHeight: number } | null>(null);

  const pixelsPerSecond = PIXELS_PER_SECOND_BASE * zoom;
  const totalWidth = TOTAL_DURATION * pixelsPerSecond;

  /* -- Playback loop -- */
  const animate = useCallback(
    (timestamp: number) => {
      if (lastFrameTime.current === 0) lastFrameTime.current = timestamp;
      const delta = (timestamp - lastFrameTime.current) / 1000;
      lastFrameTime.current = timestamp;

      setCurrentTime((prev) => {
        let next = prev + delta * playbackSpeed;
        if (loopEnabled && markIn !== null && markOut !== null) {
          if (next >= markOut) next = markIn;
        } else if (next >= TOTAL_DURATION) {
          next = TOTAL_DURATION;
          setIsPlaying(false);
          return next;
        }
        return next;
      });

      animationRef.current = requestAnimationFrame(animate);
    },
    [playbackSpeed, loopEnabled, markIn, markOut]
  );

  useEffect(() => {
    if (isPlaying) {
      lastFrameTime.current = 0;
      animationRef.current = requestAnimationFrame(animate);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, animate]);

  /* -- Track resize via mouse -- */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingTrack.current) return;
      const dy = e.clientY - resizingTrack.current.startY;
      const newHeight = Math.max(
        MIN_TRACK_HEIGHT,
        Math.min(MAX_TRACK_HEIGHT, resizingTrack.current.startHeight + dy)
      );
      setTracks((prev) =>
        prev.map((t) =>
          t.id === resizingTrack.current!.id ? { ...t, height: newHeight } : t
        )
      );
    };
    const handleMouseUp = () => {
      resizingTrack.current = null;
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  /* -- Transport handlers -- */
  const handlePlayPause = () => setIsPlaying((p) => !p);
  const handleSkipToStart = () => {
    setCurrentTime(0);
    setIsPlaying(false);
  };
  const handleSkipToEnd = () => {
    setCurrentTime(TOTAL_DURATION);
    setIsPlaying(false);
  };
  const handleRewind = () =>
    setCurrentTime((t) => Math.max(0, t - 5));
  const handleFastForward = () =>
    setCurrentTime((t) => Math.min(TOTAL_DURATION, t + 5));
  const handleSeek = (time: number) => setCurrentTime(time);

  const handleMarkIn = () => setMarkIn(currentTime);
  const handleMarkOut = () => setMarkOut(currentTime);

  const handleTrackToggle = (
    trackId: string,
    field: "muted" | "solo" | "locked" | "visible"
  ) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, [field]: !t[field] } : t))
    );
  };

  const handleTrackResizeStart = (trackId: string, e: React.MouseEvent) => {
    const track = tracks.find((t) => t.id === trackId);
    if (!track) return;
    resizingTrack.current = {
      id: trackId,
      startY: e.clientY,
      startHeight: track.height,
    };
  };

  /* -- Speed menu -- */
  const speedMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setShowSpeedMenu(false);
      }
    };
    if (showSpeedMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSpeedMenu]);

  /* -- Click on track lane area to deselect -- */
  const handleLaneAreaClick = () => setSelectedClip(null);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card shadow-xl overflow-hidden select-none">
      {/* ============================================================ */}
      {/*  Transport Controls Bar                                       */}
      {/* ============================================================ */}
      <div className="flex items-center gap-1 border-b border-border bg-background/80 px-3 py-1.5 backdrop-blur-sm">
        {/* -- Playback controls -- */}
        <div className="flex items-center gap-0.5">
          <TransportButton onClick={handleSkipToStart} title="Skip to Start">
            <ChevronsLeft className="h-3.5 w-3.5" />
          </TransportButton>
          <TransportButton onClick={handleRewind} title="Rewind 5s">
            <Rewind className="h-3.5 w-3.5" />
          </TransportButton>
          <button
            onClick={handlePlayPause}
            title={isPlaying ? "Pause" : "Play"}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150",
              "active:scale-90",
              isPlaying
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                : "bg-muted text-foreground hover:bg-muted/80"
            )}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </button>
          <TransportButton onClick={handleFastForward} title="Fast Forward 5s">
            <FastForward className="h-3.5 w-3.5" />
          </TransportButton>
          <TransportButton onClick={handleSkipToEnd} title="Skip to End">
            <ChevronsRight className="h-3.5 w-3.5" />
          </TransportButton>
        </div>

        {/* -- Separator -- */}
        <div className="mx-1.5 h-5 w-px bg-border" />

        {/* -- Timecode display -- */}
        <div className="flex items-center gap-2 rounded-md bg-muted/60 px-2.5 py-1 font-mono">
          <span className="text-xs font-semibold text-foreground tracking-wider">
            {formatTimecode(currentTime)}
          </span>
          <span className="text-[10px] text-muted-foreground">/</span>
          <span className="text-[10px] text-muted-foreground tracking-wider">
            {formatTimecode(TOTAL_DURATION)}
          </span>
        </div>

        {/* -- Separator -- */}
        <div className="mx-1.5 h-5 w-px bg-border" />

        {/* -- Loop -- */}
        <TransportButton
          onClick={() => setLoopEnabled(!loopEnabled)}
          active={loopEnabled}
          title="Loop"
        >
          <Repeat className="h-3.5 w-3.5" />
        </TransportButton>

        {/* -- Mark In / Out -- */}
        <TransportButton
          onClick={handleMarkIn}
          active={markIn !== null}
          title="Mark In"
          className="text-[10px] font-bold"
        >
          <span className="text-[10px] font-mono font-bold">I</span>
        </TransportButton>
        <TransportButton
          onClick={handleMarkOut}
          active={markOut !== null}
          title="Mark Out"
          className="text-[10px] font-bold"
        >
          <span className="text-[10px] font-mono font-bold">O</span>
        </TransportButton>

        {/* -- Separator -- */}
        <div className="mx-1.5 h-5 w-px bg-border" />

        {/* -- Razor tool -- */}
        <TransportButton
          onClick={() => setRazorActive(!razorActive)}
          active={razorActive}
          title="Razor Tool"
        >
          <Scissors className="h-3.5 w-3.5" />
        </TransportButton>

        {/* -- Snap -- */}
        <TransportButton
          onClick={() => setSnapEnabled(!snapEnabled)}
          active={snapEnabled}
          title="Snap to Grid"
        >
          <Magnet className="h-3.5 w-3.5" />
        </TransportButton>

        {/* -- Spacer -- */}
        <div className="flex-1" />

        {/* -- Playback speed -- */}
        <div className="relative" ref={speedMenuRef}>
          <button
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            className={cn(
              "flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors",
              "text-muted-foreground hover:text-foreground hover:bg-muted/80"
            )}
          >
            {playbackSpeed}x
            <ChevronDown className="h-3 w-3" />
          </button>
          {showSpeedMenu && (
            <div className="absolute right-0 top-full mt-1 z-50 rounded-lg border border-border bg-popover p-1 shadow-xl">
              {PLAYBACK_SPEEDS.map((speed) => (
                <button
                  key={speed}
                  onClick={() => {
                    setPlaybackSpeed(speed);
                    setShowSpeedMenu(false);
                  }}
                  className={cn(
                    "flex w-full items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    speed === playbackSpeed
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {speed}x
                </button>
              ))}
            </div>
          )}
        </div>

        {/* -- Separator -- */}
        <div className="mx-1 h-5 w-px bg-border" />

        {/* -- Zoom controls -- */}
        <div className="flex items-center gap-1.5">
          <TransportButton
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.3))}
            title="Zoom Out"
          >
            <Minus className="h-3 w-3" />
          </TransportButton>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-muted accent-primary
              [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-sm"
            title={`Zoom: ${Math.round(zoom * 100)}%`}
          />
          <TransportButton
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.3))}
            title="Zoom In"
          >
            <Plus className="h-3 w-3" />
          </TransportButton>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Timeline Body (ruler + tracks)                               */}
      {/* ============================================================ */}
      <div className="flex flex-1 overflow-hidden">
        {/* -- Track Headers Column -- */}
        <div
          className="flex flex-col border-r border-border bg-card shrink-0"
          style={{ width: TRACK_HEADER_WIDTH }}
        >
          {/* Ruler spacer */}
          <div className="h-7 border-b border-border bg-muted/30 flex items-center px-3">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">
              Tracks
            </span>
          </div>

          {/* Track headers */}
          {tracks.map((track) => (
            <TrackHeader
              key={track.id}
              track={track}
              onToggleMute={() => handleTrackToggle(track.id, "muted")}
              onToggleSolo={() => handleTrackToggle(track.id, "solo")}
              onToggleLock={() => handleTrackToggle(track.id, "locked")}
              onToggleVisible={() => handleTrackToggle(track.id, "visible")}
              onResizeStart={(e) => handleTrackResizeStart(track.id, e)}
            />
          ))}
        </div>

        {/* -- Scrollable Track Area -- */}
        <div ref={trackAreaRef} className="flex-1 overflow-x-auto overflow-y-hidden">
          <div style={{ width: totalWidth, minWidth: "100%" }}>
            {/* Timecode Ruler */}
            <TimecodeRuler
              pixelsPerSecond={pixelsPerSecond}
              totalDuration={TOTAL_DURATION}
              currentTime={currentTime}
              markIn={markIn}
              markOut={markOut}
              onSeek={handleSeek}
              zoom={zoom}
            />

            {/* Track Lanes */}
            <div className="relative" onClick={handleLaneAreaClick}>
              {tracks.map((track) => {
                const trackClips = clips.filter((c) => c.trackId === track.id);
                return (
                  <div
                    key={track.id}
                    className={cn(
                      "relative border-b border-border",
                      track.muted && "opacity-40",
                      !track.visible && "opacity-20"
                    )}
                    style={{
                      height: track.height,
                      background: `repeating-linear-gradient(
                        90deg,
                        transparent,
                        transparent ${pixelsPerSecond * 10 - 1}px,
                        var(--border) ${pixelsPerSecond * 10 - 1}px,
                        var(--border) ${pixelsPerSecond * 10}px
                      )`,
                    }}
                  >
                    {/* Alternating lane tint */}
                    <div
                      className="absolute inset-0"
                      style={{ backgroundColor: track.color + "06" }}
                    />

                    {/* Clips */}
                    {trackClips.map((clip) => (
                      <ClipBlock
                        key={clip.id}
                        clip={clip}
                        track={track}
                        pixelsPerSecond={pixelsPerSecond}
                        selected={selectedClip === clip.id}
                        onSelect={() => setSelectedClip(clip.id)}
                      />
                    ))}
                  </div>
                );
              })}

              {/* ---- Playhead line (spans all tracks) ---- */}
              <div
                className="absolute top-0 bottom-0 z-20 w-px pointer-events-none"
                style={{
                  left: currentTime * pixelsPerSecond,
                  background:
                    "linear-gradient(180deg, #dc2626 0%, #dc2626cc 60%, #dc262666 100%)",
                  boxShadow: "0 0 6px 1px rgba(220, 38, 38, 0.35)",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Bottom Status Bar                                            */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between border-t border-border bg-background/80 px-3 py-1 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>
            {clips.length} clip{clips.length !== 1 && "s"}
          </span>
          <span>
            {tracks.length} track{tracks.length !== 1 && "s"}
          </span>
          {selectedClip && (
            <span className="text-primary font-medium">
              Selected: {clips.find((c) => c.id === selectedClip)?.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {markIn !== null && (
            <span>
              In: {formatTimecodeShort(markIn)}
            </span>
          )}
          {markOut !== null && (
            <span>
              Out: {formatTimecodeShort(markOut)}
            </span>
          )}
          <span>Zoom: {Math.round(zoom * 100)}%</span>
          <span>{FRAME_RATE}fps</span>
        </div>
      </div>
    </div>
  );
}
