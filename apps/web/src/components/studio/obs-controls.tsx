"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Camera,
  Mic,
  Monitor,
  ImageIcon,
  Type,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Plus,
  Settings,
  GripVertical,
  Circle,
  Radio,
  ChevronDown,
  Video,
  Layers,
  LayoutGrid,
} from "lucide-react";

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

interface Source {
  id: string;
  name: string;
  type: "webcam" | "microphone" | "screen" | "image" | "text";
  visible: boolean;
  locked: boolean;
}

interface Scene {
  id: string;
  name: string;
  icon: React.ReactNode;
  sources: Source[];
}

/* ------------------------------------------------------------------
   Default data
   ------------------------------------------------------------------ */

const defaultScenes: Scene[] = [
  {
    id: "scene-1",
    name: "Full Screen Cam",
    icon: <Camera className="h-4 w-4" />,
    sources: [
      { id: "s1-1", name: "Webcam", type: "webcam", visible: true, locked: false },
      { id: "s1-2", name: "Microphone", type: "microphone", visible: true, locked: false },
      { id: "s1-3", name: "Lower Third", type: "text", visible: true, locked: true },
    ],
  },
  {
    id: "scene-2",
    name: "Screen Share + Cam",
    icon: <Monitor className="h-4 w-4" />,
    sources: [
      { id: "s2-1", name: "Screen Capture", type: "screen", visible: true, locked: false },
      { id: "s2-2", name: "Webcam (PiP)", type: "webcam", visible: true, locked: false },
      { id: "s2-3", name: "Microphone", type: "microphone", visible: true, locked: false },
      { id: "s2-4", name: "Logo Overlay", type: "image", visible: true, locked: true },
    ],
  },
  {
    id: "scene-3",
    name: "Interview Split",
    icon: <LayoutGrid className="h-4 w-4" />,
    sources: [
      { id: "s3-1", name: "Host Camera", type: "webcam", visible: true, locked: false },
      { id: "s3-2", name: "Guest Camera", type: "webcam", visible: true, locked: false },
      { id: "s3-3", name: "Host Mic", type: "microphone", visible: true, locked: false },
      { id: "s3-4", name: "Guest Mic", type: "microphone", visible: true, locked: false },
      { id: "s3-5", name: "Background", type: "image", visible: true, locked: true },
    ],
  },
];

/* ------------------------------------------------------------------
   Source type icon helper
   ------------------------------------------------------------------ */

function sourceIcon(type: Source["type"]) {
  switch (type) {
    case "webcam":
      return <Camera className="h-3.5 w-3.5" />;
    case "microphone":
      return <Mic className="h-3.5 w-3.5" />;
    case "screen":
      return <Monitor className="h-3.5 w-3.5" />;
    case "image":
      return <ImageIcon className="h-3.5 w-3.5" />;
    case "text":
      return <Type className="h-3.5 w-3.5" />;
  }
}

/* ------------------------------------------------------------------
   Component Props
   ------------------------------------------------------------------ */

interface OBSControlsProps {
  onRecordingChange?: (recording: boolean) => void;
  onStreamingChange?: (streaming: boolean) => void;
  className?: string;
}

/* ------------------------------------------------------------------
   OBSControls
   ------------------------------------------------------------------ */

export function OBSControls({
  onRecordingChange,
  onStreamingChange,
  className,
}: OBSControlsProps) {
  const [scenes, setScenes] = useState<Scene[]>(defaultScenes);
  const [activeSceneId, setActiveSceneId] = useState(scenes[0].id);
  const [isRecording, setIsRecording] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [streamingTime, setStreamingTime] = useState(0);
  const [showAddSource, setShowAddSource] = useState(false);
  const [outputFormat, setOutputFormat] = useState("MP4");
  const [qualityPreset, setQualityPreset] = useState("1080p60");

  // Simulated stats
  const [stats, setStats] = useState({ cpu: 12, droppedFrames: 0, bitrate: 6000 });

  const activeScene = scenes.find((s) => s.id === activeSceneId) ?? scenes[0];

  // Recording timer
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => setRecordingTime((p) => p + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  // Streaming timer
  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => setStreamingTime((p) => p + 1), 1000);
    return () => clearInterval(interval);
  }, [isStreaming]);

  // Simulate stat fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      setStats({
        cpu: Math.floor(8 + Math.random() * 15),
        droppedFrames: Math.floor(Math.random() * 3),
        bitrate: Math.floor(5500 + Math.random() * 1000),
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = useCallback((totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":");
  }, []);

  // Toggle recording
  const toggleRecording = () => {
    const next = !isRecording;
    setIsRecording(next);
    if (!next) setRecordingTime(0);
    onRecordingChange?.(next);
  };

  // Toggle streaming
  const toggleStreaming = () => {
    const next = !isStreaming;
    setIsStreaming(next);
    if (!next) setStreamingTime(0);
    onStreamingChange?.(next);
  };

  // Toggle source visibility
  const toggleSourceVisibility = (sourceId: string) => {
    setScenes((prev) =>
      prev.map((scene) =>
        scene.id === activeSceneId
          ? {
              ...scene,
              sources: scene.sources.map((src) =>
                src.id === sourceId ? { ...src, visible: !src.visible } : src
              ),
            }
          : scene
      )
    );
  };

  // Toggle source lock
  const toggleSourceLock = (sourceId: string) => {
    setScenes((prev) =>
      prev.map((scene) =>
        scene.id === activeSceneId
          ? {
              ...scene,
              sources: scene.sources.map((src) =>
                src.id === sourceId ? { ...src, locked: !src.locked } : src
              ),
            }
          : scene
      )
    );
  };

  // Add a new scene
  const addScene = () => {
    const num = scenes.length + 1;
    const newScene: Scene = {
      id: `scene-${Date.now()}`,
      name: `Scene ${num}`,
      icon: <Layers className="h-4 w-4" />,
      sources: [],
    };
    setScenes((prev) => [...prev, newScene]);
    setActiveSceneId(newScene.id);
  };

  // Add a new source to active scene
  const addSource = (type: Source["type"], name: string) => {
    const newSource: Source = {
      id: `src-${Date.now()}`,
      name,
      type,
      visible: true,
      locked: false,
    };
    setScenes((prev) =>
      prev.map((scene) =>
        scene.id === activeSceneId
          ? { ...scene, sources: [...scene.sources, newSource] }
          : scene
      )
    );
    setShowAddSource(false);
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-border bg-card p-3",
        className
      )}
    >
      {/* ============================================================
          Scenes Panel
          ============================================================ */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Video className="h-4 w-4 text-[#74ddc7]" />
            Scenes
          </h3>
          <button
            onClick={addScene}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Add Scene"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-1 rounded-lg border border-border bg-background p-1.5 min-h-[120px]">
          {scenes.map((scene) => (
            <button
              key={scene.id}
              onClick={() => setActiveSceneId(scene.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-all text-left",
                activeSceneId === scene.id
                  ? "bg-[#74ddc7]/10 text-foreground border border-[#74ddc7]/50 shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
              )}
            >
              <GripVertical className="h-3 w-3 text-muted-foreground/50 shrink-0 cursor-grab" />
              <span
                className={cn(
                  "shrink-0",
                  activeSceneId === scene.id
                    ? "text-[#74ddc7]"
                    : "text-muted-foreground"
                )}
              >
                {scene.icon}
              </span>
              <span className="truncate">{scene.name}</span>
              {activeSceneId === scene.id && (
                <span className="ml-auto text-[10px] font-medium text-[#74ddc7] uppercase tracking-wider">
                  Active
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================
          Sources Panel
          ============================================================ */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-[#7401df]" />
            Sources
          </h3>
          <div className="relative">
            <button
              onClick={() => setShowAddSource(!showAddSource)}
              className="flex items-center gap-1 rounded px-1.5 py-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-xs"
              title="Add Source"
            >
              <Plus className="h-3.5 w-3.5" />
              <ChevronDown className="h-3 w-3" />
            </button>

            {/* Add Source Dropdown */}
            {showAddSource && (
              <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-lg border border-border bg-card shadow-lg py-1">
                {[
                  { type: "webcam" as const, label: "Webcam" },
                  { type: "microphone" as const, label: "Microphone" },
                  { type: "screen" as const, label: "Screen Capture" },
                  { type: "image" as const, label: "Image" },
                  { type: "text" as const, label: "Text" },
                ].map((item) => (
                  <button
                    key={item.type}
                    onClick={() => addSource(item.type, item.label)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    {sourceIcon(item.type)}
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-background p-1.5 min-h-[120px]">
          {activeScene.sources.length === 0 && (
            <div className="flex flex-1 items-center justify-center py-6 text-xs text-muted-foreground">
              No sources in this scene
            </div>
          )}
          {activeScene.sources.map((source) => (
            <div
              key={source.id}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                source.visible
                  ? "text-foreground"
                  : "text-muted-foreground/50"
              )}
            >
              <GripVertical className="h-3 w-3 text-muted-foreground/40 shrink-0 cursor-grab" />

              {/* Source icon */}
              <span
                className={cn(
                  "shrink-0",
                  source.visible ? "text-muted-foreground" : "text-muted-foreground/30"
                )}
              >
                {sourceIcon(source.type)}
              </span>

              {/* Source name */}
              <span className="truncate text-xs flex-1">{source.name}</span>

              {/* Visibility toggle */}
              <button
                onClick={() => toggleSourceVisibility(source.id)}
                className={cn(
                  "rounded p-0.5 transition-colors",
                  source.visible
                    ? "text-muted-foreground hover:text-foreground"
                    : "text-muted-foreground/30 hover:text-muted-foreground"
                )}
                title={source.visible ? "Hide" : "Show"}
              >
                {source.visible ? (
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )}
              </button>

              {/* Lock toggle */}
              <button
                onClick={() => toggleSourceLock(source.id)}
                className={cn(
                  "rounded p-0.5 transition-colors",
                  source.locked
                    ? "text-yellow-500/70 hover:text-yellow-500"
                    : "text-muted-foreground/40 hover:text-muted-foreground"
                )}
                title={source.locked ? "Unlock" : "Lock"}
              >
                {source.locked ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : (
                  <Unlock className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================
          Controls Panel
          ============================================================ */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Settings className="h-4 w-4 text-muted-foreground" />
          Controls
        </h3>

        {/* Record + Stream Buttons */}
        <div className="flex flex-col gap-2">
          {/* Start/Stop Recording */}
          <button
            onClick={toggleRecording}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all",
              isRecording
                ? "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20"
                : "bg-red-600/10 text-red-500 border border-red-600/30 hover:bg-red-600/20"
            )}
          >
            <Circle
              className={cn(
                "h-3.5 w-3.5",
                isRecording ? "fill-white text-white animate-pulse" : "fill-red-500 text-red-500"
              )}
            />
            {isRecording ? (
              <>
                Stop Recording
                <span className="font-mono text-xs text-red-200 ml-1">
                  {formatTime(recordingTime)}
                </span>
              </>
            ) : (
              "Start Recording"
            )}
          </button>

          {/* Start/Stop Streaming */}
          <button
            onClick={toggleStreaming}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all",
              isStreaming
                ? "bg-[#74ddc7] text-zinc-900 hover:bg-[#74ddc7]/90 shadow-lg shadow-[#74ddc7]/20"
                : "bg-[#74ddc7]/10 text-[#74ddc7] border border-[#74ddc7]/30 hover:bg-[#74ddc7]/20"
            )}
          >
            <Radio
              className={cn(
                "h-4 w-4",
                isStreaming && "animate-pulse"
              )}
            />
            {isStreaming ? (
              <>
                <span className="font-bold tracking-wider text-xs">LIVE</span>
                Stop Streaming
                <span className="font-mono text-xs text-zinc-700 ml-1">
                  {formatTime(streamingTime)}
                </span>
              </>
            ) : (
              "Start Streaming"
            )}
          </button>
        </div>

        {/* Output & Quality Selectors */}
        <div className="grid grid-cols-2 gap-2">
          {/* Output Format */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Format
            </label>
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]"
            >
              <option value="MP4">MP4</option>
              <option value="MKV">MKV</option>
              <option value="FLV">FLV</option>
            </select>
          </div>

          {/* Quality Preset */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Quality
            </label>
            <select
              value={qualityPreset}
              onChange={(e) => setQualityPreset(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]"
            >
              <option value="1080p60">1080p 60fps</option>
              <option value="1080p30">1080p 30fps</option>
              <option value="720p60">720p 60fps</option>
              <option value="720p30">720p 30fps</option>
            </select>
          </div>
        </div>

        {/* Stats Display */}
        <div className="rounded-lg border border-border bg-background p-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Stats
            </span>
            <button className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors">
              <Settings className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {/* CPU */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[10px] text-muted-foreground">CPU</span>
              <span
                className={cn(
                  "text-sm font-mono font-semibold",
                  stats.cpu > 20 ? "text-yellow-500" : "text-green-500"
                )}
              >
                {stats.cpu}%
              </span>
            </div>

            {/* Dropped Frames */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[10px] text-muted-foreground">Dropped</span>
              <span
                className={cn(
                  "text-sm font-mono font-semibold",
                  stats.droppedFrames > 0 ? "text-yellow-500" : "text-green-500"
                )}
              >
                {stats.droppedFrames}
              </span>
            </div>

            {/* Bitrate */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[10px] text-muted-foreground">Bitrate</span>
              <span className="text-sm font-mono font-semibold text-foreground">
                {(stats.bitrate / 1000).toFixed(1)}
                <span className="text-[10px] text-muted-foreground ml-0.5">
                  Mbps
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Close add-source dropdown if clicking outside */}
      {showAddSource && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowAddSource(false)}
        />
      )}
    </div>
  );
}
