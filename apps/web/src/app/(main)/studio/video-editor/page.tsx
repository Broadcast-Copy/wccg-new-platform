"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  Settings,
  HelpCircle,
  Film,
  Layers,
  Type,
  Sliders,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  PanelBottomClose,
  PanelBottomOpen,
  Plus,
  Scissors,
  ImagePlus,
  Trash2,
  ZoomIn,
  ZoomOut,
  ChevronDown,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LeftTab = "media" | "effects";
type RightTab = "properties" | "text";

interface MediaItem {
  id: string;
  name: string;
  type: "video" | "audio" | "image";
  duration?: string;
  thumbnail: string;
}

interface EffectItem {
  id: string;
  name: string;
  category: string;
}

interface TimelineClip {
  id: string;
  name: string;
  track: string;
  start: number; // percentage position on timeline
  width: number; // percentage width on timeline
  color: string;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_MEDIA: MediaItem[] = [
  { id: "m1", name: "Interview_Main.mp4", type: "video", duration: "12:34", thumbnail: "bg-[#7401df]/30" },
  { id: "m2", name: "B-Roll_Studio.mp4", type: "video", duration: "03:21", thumbnail: "bg-[#74ddc7]/30" },
  { id: "m3", name: "Intro_Animation.mp4", type: "video", duration: "00:08", thumbnail: "bg-blue-500/30" },
  { id: "m4", name: "Outro_Card.mp4", type: "video", duration: "00:12", thumbnail: "bg-orange-500/30" },
  { id: "m5", name: "Background_Beat.wav", type: "audio", duration: "04:15", thumbnail: "bg-pink-500/30" },
  { id: "m6", name: "Voiceover_Take3.wav", type: "audio", duration: "11:52", thumbnail: "bg-yellow-500/30" },
  { id: "m7", name: "Logo_Overlay.png", type: "image", thumbnail: "bg-emerald-500/30" },
  { id: "m8", name: "Lower_Third.png", type: "image", thumbnail: "bg-cyan-500/30" },
];

const MOCK_EFFECTS: EffectItem[] = [
  { id: "e1", name: "Cross Dissolve", category: "Transitions" },
  { id: "e2", name: "Dip to Black", category: "Transitions" },
  { id: "e3", name: "Wipe Left", category: "Transitions" },
  { id: "e4", name: "Color Correction", category: "Color" },
  { id: "e5", name: "LUT: Cinematic", category: "Color" },
  { id: "e6", name: "Brightness/Contrast", category: "Color" },
  { id: "e7", name: "Lower Third", category: "Text Overlays" },
  { id: "e8", name: "Title Card", category: "Text Overlays" },
  { id: "e9", name: "EQ (Parametric)", category: "Audio" },
  { id: "e10", name: "Compressor", category: "Audio" },
  { id: "e11", name: "Noise Reduction", category: "Audio" },
];

const MOCK_TIMELINE_CLIPS: TimelineClip[] = [
  { id: "tc1", name: "Intro_Animation", track: "V2", start: 0, width: 8, color: "bg-blue-500/60" },
  { id: "tc2", name: "Interview_Main", track: "V1", start: 8, width: 55, color: "bg-[#7401df]/50" },
  { id: "tc3", name: "B-Roll_Studio", track: "V2", start: 20, width: 15, color: "bg-[#74ddc7]/50" },
  { id: "tc4", name: "Outro_Card", track: "V1", start: 63, width: 10, color: "bg-orange-500/50" },
  { id: "tc5", name: "Lower_Third", track: "V2", start: 10, width: 6, color: "bg-cyan-500/50" },
  { id: "tc6", name: "Background_Beat", track: "A1", start: 0, width: 73, color: "bg-pink-500/40" },
  { id: "tc7", name: "Voiceover_Take3", track: "A2", start: 8, width: 55, color: "bg-yellow-500/40" },
];

const TRACKS = ["V2", "V1", "A1", "A2"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimecode(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const f = Math.floor((seconds % 1) * 30);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VideoEditorPage() {
  // Panel visibility
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showBottomPanel, setShowBottomPanel] = useState(true);

  // Active tabs
  const [leftTab, setLeftTab] = useState<LeftTab>("media");
  const [rightTab, setRightTab] = useState<RightTab>("properties");

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(220);

  // Volume
  const [volume, setVolume] = useState(75);

  // Real video state
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [importedMedia, setImportedMedia] = useState<MediaItem[]>(MOCK_MEDIA);

  // Timeline
  const [timelineZoom, setTimelineZoom] = useState(100);
  const [playheadPosition, setPlayheadPosition] = useState(28); // percentage
  const [selectedClipId, setSelectedClipId] = useState<string | null>("tc2");

  // Effects category expansion
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["Transitions", "Color", "Text Overlays", "Audio"])
  );

  // Drag state (visual only)
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Load a video/audio file
  const loadMediaFile = useCallback((file: File) => {
    try {
      if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
      const url = URL.createObjectURL(file);
      videoUrlRef.current = url;

      if (videoRef.current) {
        videoRef.current.src = url;
        videoRef.current.load();
        videoRef.current.onloadedmetadata = () => {
          const dur = videoRef.current?.duration || 0;
          setTotalDuration(dur);
          setCurrentTime(0);
          setHasVideo(true);
          setPlayheadPosition(0);
          console.log("[VideoEditor] Loaded:", file.name, "duration:", dur);
        };
      }

      // Add to media list
      const isVideo = file.type.startsWith("video/");
      const isAudio = file.type.startsWith("audio/");
      const isImage = file.type.startsWith("image/");
      const type: "video" | "audio" | "image" = isVideo ? "video" : isAudio ? "audio" : isImage ? "image" : "video";
      const newItem: MediaItem = {
        id: `imported-${Date.now()}`,
        name: file.name,
        type,
        duration: "loading...",
        thumbnail: type === "video" ? "bg-[#74ddc7]/30" : type === "audio" ? "bg-pink-500/30" : "bg-emerald-500/30",
      };
      setImportedMedia((prev) => [...prev, newItem]);
    } catch (err) {
      console.error("[VideoEditor] Failed to load file:", err);
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadMediaFile(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [loadMediaFile]
  );

  // Sync video playback (with simulation fallback when no video loaded)
  useEffect(() => {
    if (!isPlaying) return;

    // If a real video is loaded, sync to it
    if (hasVideo && videoRef.current) {
      videoRef.current.currentTime = currentTime;
      videoRef.current.play().catch(() => {});
    }

    const interval = setInterval(() => {
      if (hasVideo && videoRef.current && !videoRef.current.paused) {
        // Real video playback sync
        const t = videoRef.current.currentTime;
        setCurrentTime(t);
        setPlayheadPosition((t / totalDuration) * 100);
        if (t >= totalDuration) {
          setIsPlaying(false);
          setCurrentTime(0);
          setPlayheadPosition(0);
        }
      } else {
        // Simulated playback — playhead scrubs across the timeline
        setCurrentTime((prev) => {
          const next = prev + 0.05;
          if (next >= totalDuration) {
            setIsPlaying(false);
            setPlayheadPosition(0);
            return 0;
          }
          setPlayheadPosition((next / totalDuration) * 100);
          return next;
        });
      }
    }, 50);

    return () => {
      clearInterval(interval);
      if (videoRef.current && !videoRef.current.paused) videoRef.current.pause();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, hasVideo, totalDuration]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  const toggleCategory = useCallback((cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const selectedClip = MOCK_TIMELINE_CLIPS.find((c) => c.id === selectedClipId);

  // Group effects by category
  const effectsByCategory = MOCK_EFFECTS.reduce<Record<string, EffectItem[]>>((acc, e) => {
    if (!acc[e.category]) acc[e.category] = [];
    acc[e.category].push(e);
    return acc;
  }, {});

  // Time ruler labels
  const timeRulerMarks = Array.from({ length: 11 }, (_, i) => {
    const secs = (totalDuration / 10) * i;
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -mx-4 sm:-mx-6 lg:-mx-8 -mt-6 overflow-hidden">
      {/* ================================================================= */}
      {/* Top Toolbar                                                       */}
      {/* ================================================================= */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-card/80 backdrop-blur-sm shrink-0">
        {/* Left: Back + Title */}
        <div className="flex items-center gap-3">
          <Link
            href="/studio"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Studio
          </Link>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#7401df]/20">
              <Film className="h-3.5 w-3.5 text-[#7401df]" />
            </div>
            <span className="text-sm font-semibold text-foreground">
              Video Editor
            </span>
            <span className="hidden sm:inline text-[10px] text-muted-foreground bg-foreground/[0.06] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">
              Beta
            </span>
          </div>
        </div>

        {/* Center: Layout Controls */}
        <div className="hidden md:flex items-center gap-1">
          <button
            onClick={() => setShowLeftPanel(!showLeftPanel)}
            className={`p-1.5 rounded-md text-xs transition-colors ${
              showLeftPanel
                ? "text-foreground bg-foreground/[0.08]"
                : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
            }`}
            title="Toggle left panel"
          >
            {showLeftPanel ? (
              <PanelLeftClose className="h-3.5 w-3.5" />
            ) : (
              <PanelLeftOpen className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={() => setShowRightPanel(!showRightPanel)}
            className={`p-1.5 rounded-md text-xs transition-colors ${
              showRightPanel
                ? "text-foreground bg-foreground/[0.08]"
                : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
            }`}
            title="Toggle right panel"
          >
            {showRightPanel ? (
              <PanelRightClose className="h-3.5 w-3.5" />
            ) : (
              <PanelRightOpen className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={() => setShowBottomPanel(!showBottomPanel)}
            className={`p-1.5 rounded-md text-xs transition-colors ${
              showBottomPanel
                ? "text-foreground bg-foreground/[0.08]"
                : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
            }`}
            title="Toggle timeline"
          >
            {showBottomPanel ? (
              <PanelBottomClose className="h-3.5 w-3.5" />
            ) : (
              <PanelBottomOpen className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <button
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
            title="Settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
          <button
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
            title="Help"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
          <div className="h-4 w-px bg-border mx-1" />
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* Main Content Area                                                 */}
      {/* ================================================================= */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ============================================================= */}
        {/* Left Panel: Media Bin / Effects                                */}
        {/* ============================================================= */}
        {showLeftPanel && (
          <div className="w-64 xl:w-72 border-r border-border bg-card/50 flex flex-col shrink-0 overflow-hidden">
            {/* Panel Tabs */}
            <div className="flex border-b border-border shrink-0">
              <button
                onClick={() => setLeftTab("media")}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  leftTab === "media"
                    ? "text-foreground border-b-2 border-[#74ddc7] bg-foreground/[0.04]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Film className="h-3 w-3" />
                Media
              </button>
              <button
                onClick={() => setLeftTab("effects")}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  leftTab === "effects"
                    ? "text-foreground border-b-2 border-[#74ddc7] bg-foreground/[0.04]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Layers className="h-3 w-3" />
                Effects
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto">
              {leftTab === "media" ? (
                <div className="p-2 space-y-2">
                  {/* Import Drop Zone */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*,audio/*,image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <div
                    className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
                      isDraggingOver
                        ? "border-[#74ddc7] bg-[#74ddc7]/10"
                        : "border-border hover:border-muted-foreground/40"
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingOver(true);
                    }}
                    onDragLeave={() => setIsDraggingOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) loadMediaFile(file);
                    }}
                  >
                    <ImagePlus className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground" />
                    <p className="text-[10px] text-muted-foreground">
                      Drag & drop media files
                    </p>
                    <button className="mt-1.5 text-[10px] text-[#74ddc7] hover:underline">
                      or browse files
                    </button>
                  </div>

                  {/* Media Items */}
                  <div className="space-y-1">
                    {importedMedia.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-1.5 rounded-md hover:bg-foreground/[0.04] cursor-grab transition-colors group"
                        draggable
                      >
                        <div
                          className={`h-8 w-12 rounded ${item.thumbnail} flex items-center justify-center shrink-0`}
                        >
                          {item.type === "video" && <Film className="h-3 w-3 text-foreground/60" />}
                          {item.type === "audio" && <Volume2 className="h-3 w-3 text-foreground/60" />}
                          {item.type === "image" && <ImagePlus className="h-3 w-3 text-foreground/60" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] text-foreground truncate">
                            {item.name}
                          </p>
                          {item.duration && (
                            <p className="text-[10px] text-muted-foreground">
                              {item.duration}
                            </p>
                          )}
                        </div>
                        <button className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-red-400 transition-all">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {Object.entries(effectsByCategory).map(([category, effects]) => (
                    <div key={category}>
                      <button
                        onClick={() => toggleCategory(category)}
                        className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ChevronDown
                          className={`h-3 w-3 transition-transform ${
                            expandedCategories.has(category) ? "" : "-rotate-90"
                          }`}
                        />
                        {category}
                        <span className="ml-auto text-[10px] text-muted-foreground/60">
                          {effects.length}
                        </span>
                      </button>
                      {expandedCategories.has(category) && (
                        <div className="ml-4 space-y-0.5">
                          {effects.map((effect) => (
                            <div
                              key={effect.id}
                              className="flex items-center gap-2 px-2 py-1 rounded text-[11px] text-foreground/80 hover:bg-foreground/[0.04] cursor-pointer transition-colors"
                            >
                              <Layers className="h-3 w-3 text-muted-foreground shrink-0" />
                              {effect.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* Center: Preview + Timeline                                     */}
        {/* ============================================================= */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Preview Monitor */}
          <div className="flex-1 min-h-0 flex flex-col bg-black/40">
            {/* Video Preview Area */}
            <div className="flex-1 flex items-center justify-center relative">
              <div className="relative w-full max-w-3xl aspect-video bg-black/80 rounded-sm mx-4 flex items-center justify-center overflow-hidden">
                {hasVideo ? (
                  /* eslint-disable-next-line jsx-a11y/media-has-caption */
                  <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-contain"
                    playsInline
                    onClick={() => setIsPlaying(!isPlaying)}
                  />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-[#7401df]/20 via-black/60 to-[#74ddc7]/10" />
                    <div className="relative text-center">
                      <Film className="h-10 w-10 text-foreground/20 mx-auto mb-2" />
                      <p className="text-xs text-foreground/30">Import a video to preview</p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2 text-xs text-[#74ddc7] hover:underline"
                      >
                        Browse Files
                      </button>
                    </div>
                  </>
                )}

                {/* Timecode Overlay */}
                <div className="absolute top-2 right-2 bg-black/70 px-2 py-0.5 rounded text-[10px] font-mono text-[#74ddc7]">
                  {formatTimecode(currentTime)}
                </div>

                {/* Safe area guides */}
                <div className="absolute inset-[5%] border border-foreground/[0.06] rounded-sm pointer-events-none" />
              </div>
            </div>

            {/* Transport Controls */}
            <div className="flex items-center justify-center gap-3 py-2 border-t border-border/50 bg-card/30 shrink-0">
              <div className="flex items-center gap-1">
                <button
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
                  title="Previous frame"
                  onClick={() => {
                    const t = Math.max(0, currentTime - 1 / 30);
                    setCurrentTime(t);
                    if (videoRef.current) videoRef.current.currentTime = t;
                    setPlayheadPosition((t / totalDuration) * 100);
                  }}
                >
                  <SkipBack className="h-3.5 w-3.5" />
                </button>
                <button
                  className="p-2 rounded-lg bg-foreground/[0.08] text-foreground hover:bg-foreground/[0.12] transition-colors"
                  title={isPlaying ? "Pause" : "Play"}
                  onClick={() => {
                    if (isPlaying) {
                      if (videoRef.current && !videoRef.current.paused) videoRef.current.pause();
                      setIsPlaying(false);
                    } else {
                      setIsPlaying(true);
                    }
                  }}
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </button>
                <button
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
                  title="Next frame"
                  onClick={() => {
                    const t = Math.min(totalDuration, currentTime + 1 / 30);
                    setCurrentTime(t);
                    if (videoRef.current) videoRef.current.currentTime = t;
                    setPlayheadPosition((t / totalDuration) * 100);
                  }}
                >
                  <SkipForward className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="h-4 w-px bg-border" />

              {/* Timecode display */}
              <span className="text-xs font-mono text-muted-foreground tabular-nums">
                {formatTimecode(currentTime)}
                <span className="text-muted-foreground/40 mx-1">/</span>
                {formatTimecode(totalDuration)}
              </span>

              <div className="h-4 w-px bg-border" />

              {/* Volume */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const newVol = volume > 0 ? 0 : 75;
                    setVolume(newVol);
                    if (videoRef.current) videoRef.current.volume = newVol / 100;
                  }}
                  className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  title={volume === 0 ? "Unmute" : "Mute"}
                >
                  <Volume2 className="h-3 w-3" />
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setVolume(v);
                    if (videoRef.current) videoRef.current.volume = v / 100;
                  }}
                  className="w-16 h-1 accent-[#74ddc7] cursor-pointer"
                  title={`Volume: ${volume}%`}
                />
              </div>
            </div>
          </div>

          {/* ============================================================= */}
          {/* Bottom Panel: Timeline                                        */}
          {/* ============================================================= */}
          {showBottomPanel && (
            <div
              className="border-t border-border bg-card/50 shrink-0 flex flex-col"
              style={{ height: "240px" }}
            >
              {/* Timeline Toolbar */}
              <div className="flex items-center justify-between px-2 py-1 border-b border-border shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
                    title="Add marker"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
                    title="Split clip"
                  >
                    <Scissors className="h-3 w-3" />
                  </button>
                  <button
                    className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-foreground/[0.04] transition-colors"
                    title="Delete selected"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
                    title="Zoom out"
                    onClick={() =>
                      setTimelineZoom(Math.max(25, timelineZoom - 25))
                    }
                  >
                    <ZoomOut className="h-3 w-3" />
                  </button>
                  <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-center">
                    {timelineZoom}%
                  </span>
                  <button
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
                    title="Zoom in"
                    onClick={() =>
                      setTimelineZoom(Math.min(400, timelineZoom + 25))
                    }
                  >
                    <ZoomIn className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Timeline Body */}
              <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Track Headers */}
                <div className="w-14 shrink-0 border-r border-border bg-card/30 flex flex-col">
                  {/* Ruler header spacer */}
                  <div className="h-5 border-b border-border shrink-0" />
                  {TRACKS.map((track) => (
                    <div
                      key={track}
                      className="flex-1 flex items-center justify-center border-b border-border/50 text-[10px] font-mono text-muted-foreground"
                    >
                      <span
                        className={
                          track.startsWith("V")
                            ? "text-[#7401df]/70"
                            : "text-[#74ddc7]/70"
                        }
                      >
                        {track}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Timeline Tracks Area */}
                <div
                  className="flex-1 overflow-x-auto overflow-y-hidden relative"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct =
                      ((e.clientX - rect.left) / rect.width) * 100;
                    setPlayheadPosition(Math.max(0, Math.min(100, pct)));
                    const t = (pct / 100) * totalDuration;
                    setCurrentTime(t);
                    if (videoRef.current) videoRef.current.currentTime = t;
                  }}
                >
                  {/* Time Ruler */}
                  <div className="h-5 border-b border-border flex items-end relative shrink-0">
                    {timeRulerMarks.map((label, i) => (
                      <div
                        key={i}
                        className="absolute bottom-0 flex flex-col items-center"
                        style={{ left: `${i * 10}%` }}
                      >
                        <span className="text-[9px] text-muted-foreground/60 font-mono mb-0.5">
                          {label}
                        </span>
                        <div className="w-px h-1.5 bg-border" />
                      </div>
                    ))}
                  </div>

                  {/* Track Lanes */}
                  <div className="flex flex-col flex-1 relative" style={{ height: "calc(100% - 20px)" }}>
                    {TRACKS.map((track) => {
                      const trackClips = MOCK_TIMELINE_CLIPS.filter(
                        (c) => c.track === track
                      );
                      return (
                        <div
                          key={track}
                          className="flex-1 border-b border-border/50 relative"
                        >
                          {trackClips.map((clip) => (
                            <div
                              key={clip.id}
                              className={`absolute top-1 bottom-1 rounded-sm cursor-pointer transition-all ${
                                clip.color
                              } ${
                                selectedClipId === clip.id
                                  ? "ring-1 ring-[#74ddc7] ring-offset-1 ring-offset-transparent"
                                  : "hover:brightness-125"
                              }`}
                              style={{
                                left: `${clip.start}%`,
                                width: `${clip.width}%`,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedClipId(clip.id);
                              }}
                            >
                              <span className="absolute inset-x-1 top-0.5 text-[9px] text-foreground/70 truncate">
                                {clip.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })}

                    {/* Playhead */}
                    <div
                      className="absolute top-0 bottom-0 w-px bg-red-500 z-10 pointer-events-none"
                      style={{ left: `${playheadPosition}%` }}
                    >
                      <div className="absolute -top-[20px] left-1/2 -translate-x-1/2 w-2.5 h-3 bg-red-500 clip-path-triangle" style={{
                        clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                      }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================= */}
        {/* Right Panel: Properties / Text                                 */}
        {/* ============================================================= */}
        {showRightPanel && (
          <div className="w-60 xl:w-64 border-l border-border bg-card/50 flex flex-col shrink-0 overflow-hidden">
            {/* Panel Tabs */}
            <div className="flex border-b border-border shrink-0">
              <button
                onClick={() => setRightTab("properties")}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  rightTab === "properties"
                    ? "text-foreground border-b-2 border-[#74ddc7] bg-foreground/[0.04]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sliders className="h-3 w-3" />
                Properties
              </button>
              <button
                onClick={() => setRightTab("text")}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  rightTab === "text"
                    ? "text-foreground border-b-2 border-[#74ddc7] bg-foreground/[0.04]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Type className="h-3 w-3" />
                Text
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-3">
              {rightTab === "properties" ? (
                selectedClip ? (
                  <div className="space-y-4">
                    {/* Clip Info */}
                    <div>
                      <h4 className="text-xs font-medium text-foreground mb-2">
                        {selectedClip.name}
                      </h4>
                      <p className="text-[10px] text-muted-foreground">
                        Track: {selectedClip.track}
                      </p>
                    </div>

                    {/* Transform */}
                    <div>
                      <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Transform
                      </h4>
                      <div className="space-y-1.5">
                        {[
                          { label: "Position X", value: "960" },
                          { label: "Position Y", value: "540" },
                          { label: "Scale", value: "100%" },
                          { label: "Rotation", value: "0.0" },
                        ].map((prop) => (
                          <div
                            key={prop.label}
                            className="flex items-center justify-between"
                          >
                            <span className="text-[11px] text-muted-foreground">
                              {prop.label}
                            </span>
                            <input
                              type="text"
                              value={prop.value}
                              readOnly
                              className="w-16 text-right text-[11px] bg-foreground/[0.04] border border-border rounded px-1.5 py-0.5 text-foreground tabular-nums"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Opacity */}
                    <div>
                      <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Opacity
                      </h4>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-foreground/[0.08] rounded-full relative">
                          <div className="h-full w-full bg-[#74ddc7] rounded-full" />
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-[#74ddc7] border-2 border-card" />
                        </div>
                        <span className="text-[11px] text-muted-foreground tabular-nums w-8 text-right">
                          100%
                        </span>
                      </div>
                    </div>

                    {/* Volume (for audio/video tracks) */}
                    <div>
                      <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Volume
                      </h4>
                      <div className="flex items-center gap-2">
                        <Volume2 className="h-3 w-3 text-muted-foreground shrink-0" />
                        <div className="flex-1 h-1.5 bg-foreground/[0.08] rounded-full relative">
                          <div className="h-full w-3/4 bg-[#7401df] rounded-full" />
                          <div
                            className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-[#7401df] border-2 border-card"
                            style={{ left: "75%" }}
                          />
                        </div>
                        <span className="text-[11px] text-muted-foreground tabular-nums w-8 text-right">
                          -6 dB
                        </span>
                      </div>
                    </div>

                    {/* Speed */}
                    <div>
                      <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Speed
                      </h4>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">
                          Playback Rate
                        </span>
                        <input
                          type="text"
                          value="1.0x"
                          readOnly
                          className="w-12 text-right text-[11px] bg-foreground/[0.04] border border-border rounded px-1.5 py-0.5 text-foreground tabular-nums"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Sliders className="h-8 w-8 text-muted-foreground/20 mb-2" />
                    <p className="text-xs text-muted-foreground">
                      Select a clip to view properties
                    </p>
                  </div>
                )
              ) : (
                /* Text Tab */
                <div className="space-y-4">
                  {/* Add Text */}
                  <button className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 transition-colors">
                    <Plus className="h-3 w-3" />
                    Add Text Layer
                  </button>

                  {/* Font */}
                  <div>
                    <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Font
                    </h4>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <select className="flex-1 text-[11px] bg-foreground/[0.04] border border-border rounded px-1.5 py-1 text-foreground appearance-none">
                          <option>Inter</option>
                          <option>Roboto</option>
                          <option>Montserrat</option>
                          <option>Open Sans</option>
                        </select>
                        <input
                          type="text"
                          value="48"
                          readOnly
                          className="w-10 text-center text-[11px] bg-foreground/[0.04] border border-border rounded px-1 py-1 text-foreground tabular-nums"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <select className="flex-1 text-[11px] bg-foreground/[0.04] border border-border rounded px-1.5 py-1 text-foreground appearance-none">
                          <option>Bold</option>
                          <option>Regular</option>
                          <option>Light</option>
                          <option>Semibold</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Color */}
                  <div>
                    <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Color
                    </h4>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded border border-border bg-white" />
                      <input
                        type="text"
                        value="#FFFFFF"
                        readOnly
                        className="flex-1 text-[11px] bg-foreground/[0.04] border border-border rounded px-1.5 py-1 text-foreground font-mono"
                      />
                    </div>
                    <div className="flex gap-1 mt-1.5">
                      {["#FFFFFF", "#74ddc7", "#7401df", "#FF6B6B", "#FFD93D", "#000000"].map(
                        (color) => (
                          <button
                            key={color}
                            className="h-5 w-5 rounded border border-border hover:ring-1 hover:ring-[#74ddc7] transition-all"
                            style={{ backgroundColor: color }}
                          />
                        )
                      )}
                    </div>
                  </div>

                  {/* Alignment */}
                  <div>
                    <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Alignment
                    </h4>
                    <div className="flex gap-1">
                      {["Left", "Center", "Right"].map((align) => (
                        <button
                          key={align}
                          className={`flex-1 px-2 py-1 rounded text-[10px] transition-colors ${
                            align === "Center"
                              ? "bg-foreground/[0.08] text-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
                          }`}
                        >
                          {align}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Background */}
                  <div>
                    <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Background
                    </h4>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        Enable Background
                      </span>
                      <div className="h-4 w-7 rounded-full bg-foreground/[0.08] relative cursor-pointer">
                        <div className="absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-muted-foreground transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* Status Bar                                                        */}
      {/* ================================================================= */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-border bg-card/80 text-[10px] text-muted-foreground shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Ready
          </span>
          <span>1920 x 1080</span>
          <span>30 fps</span>
          <span>H.264 / AAC</span>
        </div>
        <div className="flex items-center gap-3">
          <span>
            Duration: {Math.floor(totalDuration / 60)}:{String(Math.floor(totalDuration % 60)).padStart(2, "0")}
          </span>
          <span>Export: MP4</span>
          <span className="text-muted-foreground/60">v1.0.0-beta</span>
        </div>
      </div>
    </div>
  );
}
