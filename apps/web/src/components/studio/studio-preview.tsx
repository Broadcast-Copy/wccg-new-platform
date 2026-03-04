"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Camera,
  Monitor,
  LayoutGrid,
  Maximize,
  Minimize,
  Circle,
} from "lucide-react";

interface Scene {
  id: string;
  name: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const scenes: Scene[] = [
  {
    id: "scene-1",
    name: "Scene 1",
    label: "Full Screen Cam",
    icon: <Camera className="h-4 w-4" />,
    description: "Single camera, full frame",
  },
  {
    id: "scene-2",
    name: "Scene 2",
    label: "Screen Share + Cam",
    icon: <Monitor className="h-4 w-4" />,
    description: "Screen capture with picture-in-picture camera",
  },
  {
    id: "scene-3",
    name: "Scene 3",
    label: "Interview Split",
    icon: <LayoutGrid className="h-4 w-4" />,
    description: "Side-by-side dual camera layout",
  },
];

interface StudioPreviewProps {
  isRecording?: boolean;
  isStreaming?: boolean;
  className?: string;
}

export function StudioPreview({
  isRecording = false,
  isStreaming = false,
  className,
}: StudioPreviewProps) {
  const [activeScene, setActiveScene] = useState(scenes[0]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [fps, setFps] = useState(60);

  // Simulate FPS fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setFps(Math.floor(58 + Math.random() * 4));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Recording timer
  useEffect(() => {
    if (!isRecording) {
      setRecordingTime(0);
      return;
    }
    const interval = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = useCallback((totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds]
      .map((v) => v.toString().padStart(2, "0"))
      .join(":");
  }, []);

  return (
    <div className={cn("flex flex-col gap-0 rounded-xl border border-border bg-card overflow-hidden", className)}>
      {/* Preview Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">Preview</span>
          <span className="text-xs text-muted-foreground font-mono">
            1920x1080
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-mono">
            {fps} FPS
          </span>
          {isRecording && (
            <span className="text-xs font-mono text-red-500">
              {formatTime(recordingTime)}
            </span>
          )}
        </div>
      </div>

      {/* Preview Area — 16:9 */}
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        <div className="absolute inset-0 bg-zinc-950 flex items-center justify-center overflow-hidden">
          {/* Scene Content */}
          <SceneContent scene={activeScene} />

          {/* Overlay: Scene Name */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <span className="rounded bg-black/70 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
              {activeScene.label}
            </span>
          </div>

          {/* Overlay: Recording Indicator */}
          {isRecording && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded bg-black/70 px-2 py-1 backdrop-blur-sm">
              <Circle className="h-2.5 w-2.5 fill-red-500 text-red-500 animate-pulse" />
              <span className="text-xs font-bold text-red-400 tracking-wider">
                REC
              </span>
              <span className="text-xs font-mono text-red-300 ml-1">
                {formatTime(recordingTime)}
              </span>
            </div>
          )}

          {/* Overlay: LIVE Badge */}
          {isStreaming && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded bg-red-600 px-2.5 py-1 shadow-lg shadow-red-600/30">
              <Circle className="h-2 w-2 fill-white text-white animate-pulse" />
              <span className="text-xs font-bold text-white tracking-widest">
                LIVE
              </span>
            </div>
          )}

          {/* Overlay: Resolution */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <span className="rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 backdrop-blur-sm">
              1920x1080
            </span>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="absolute top-3 left-1/2 -translate-x-1/2 rounded bg-black/50 p-1.5 text-zinc-400 opacity-0 transition-opacity hover:bg-black/70 hover:text-white group-hover:opacity-100 focus:opacity-100"
            style={{ opacity: undefined }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Scene Tabs */}
      <div className="flex border-t border-border bg-muted/30">
        {scenes.map((scene) => (
          <button
            key={scene.id}
            onClick={() => setActiveScene(scene)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium transition-colors border-b-2",
              activeScene.id === scene.id
                ? "border-[#74ddc7] text-[#74ddc7] bg-[#74ddc7]/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {scene.icon}
            <span className="hidden sm:inline">{scene.name}:</span>
            <span>{scene.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Scene Content — renders a different mock preview per scene
   ------------------------------------------------------------------ */

function SceneContent({ scene }: { scene: Scene }) {
  switch (scene.id) {
    case "scene-1":
      return <FullScreenCam />;
    case "scene-2":
      return <ScreenShareCam />;
    case "scene-3":
      return <InterviewSplit />;
    default:
      return <NoScene />;
  }
}

function NoScene() {
  return (
    <div className="flex flex-col items-center gap-3 text-zinc-600">
      <Camera className="h-12 w-12" />
      <span className="text-sm font-medium">No Active Scene</span>
    </div>
  );
}

function FullScreenCam() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError("Camera not supported");
          return;
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasCamera(true);
        }
      } catch (err) {
        console.warn("[StudioPreview] Camera not available:", err);
        setCameraError(err instanceof Error ? err.message : "Camera not available");
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      {hasCamera ? (
        /* eslint-disable-next-line jsx-a11y/media-has-caption */
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="relative flex flex-col items-center gap-3">
          <div className="h-20 w-20 rounded-full bg-zinc-700 flex items-center justify-center ring-2 ring-zinc-600">
            <Camera className="h-8 w-8 text-zinc-400" />
          </div>
          <span className="text-sm text-zinc-500 font-medium">
            {cameraError || "Click to enable webcam"}
          </span>
        </div>
      )}
      {/* Corner brackets */}
      <CornerBrackets />
    </div>
  );
}

function ScreenShareCam() {
  return (
    <div className="absolute inset-0 flex bg-zinc-900">
      {/* Screen share area */}
      <div className="flex-1 flex items-center justify-center border-r border-zinc-800">
        <div className="flex flex-col items-center gap-2">
          <Monitor className="h-10 w-10 text-zinc-500" />
          <span className="text-xs text-zinc-500">Screen Share</span>
          {/* Mock window */}
          <div className="mt-2 w-40 rounded border border-zinc-700 bg-zinc-800 overflow-hidden">
            <div className="flex items-center gap-1 px-2 py-1 bg-zinc-700/50">
              <div className="h-1.5 w-1.5 rounded-full bg-red-500/50" />
              <div className="h-1.5 w-1.5 rounded-full bg-yellow-500/50" />
              <div className="h-1.5 w-1.5 rounded-full bg-green-500/50" />
              <span className="text-[8px] text-zinc-500 ml-1">Desktop</span>
            </div>
            <div className="h-16 bg-zinc-800/80 p-2 space-y-1">
              <div className="h-1 w-full rounded-full bg-zinc-700" />
              <div className="h-1 w-3/4 rounded-full bg-zinc-700" />
              <div className="h-1 w-1/2 rounded-full bg-zinc-700" />
            </div>
          </div>
        </div>
      </div>

      {/* PiP camera */}
      <div className="absolute bottom-4 right-4 w-28 h-20 rounded-lg bg-zinc-800 border border-zinc-600 flex items-center justify-center shadow-lg">
        <Camera className="h-5 w-5 text-zinc-500" />
      </div>
    </div>
  );
}

function InterviewSplit() {
  return (
    <div className="absolute inset-0 flex bg-zinc-900 gap-[2px]">
      {/* Host side */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-800 relative">
        <div className="h-14 w-14 rounded-full bg-zinc-700 flex items-center justify-center ring-2 ring-[#74ddc7]/30">
          <Camera className="h-6 w-6 text-zinc-400" />
        </div>
        <span className="mt-2 text-[10px] text-zinc-500 font-medium">Host</span>
        <div className="absolute bottom-2 left-2 rounded bg-[#74ddc7]/20 px-1.5 py-0.5 text-[8px] text-[#74ddc7] font-medium">
          CAM 1
        </div>
      </div>

      {/* Guest side */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 relative">
        <div className="h-14 w-14 rounded-full bg-zinc-700 flex items-center justify-center ring-2 ring-[#7401df]/30">
          <Camera className="h-6 w-6 text-zinc-400" />
        </div>
        <span className="mt-2 text-[10px] text-zinc-500 font-medium">
          Guest
        </span>
        <div className="absolute bottom-2 left-2 rounded bg-[#7401df]/20 px-1.5 py-0.5 text-[8px] text-[#7401df] font-medium">
          CAM 2
        </div>
      </div>
    </div>
  );
}

function CornerBrackets() {
  const bracketStyle =
    "absolute h-6 w-6 border-zinc-500/40 pointer-events-none";
  return (
    <>
      <div
        className={cn(bracketStyle, "top-4 left-4 border-t-2 border-l-2")}
      />
      <div
        className={cn(bracketStyle, "top-4 right-4 border-t-2 border-r-2")}
      />
      <div
        className={cn(bracketStyle, "bottom-4 left-4 border-b-2 border-l-2")}
      />
      <div
        className={cn(bracketStyle, "bottom-4 right-4 border-b-2 border-r-2")}
      />
    </>
  );
}
