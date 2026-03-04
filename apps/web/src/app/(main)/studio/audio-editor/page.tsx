"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  Settings,
  HelpCircle,
  Keyboard,
  Mic,
  CircleDot,
  Square,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  PanelLeftClose,
  PanelLeftOpen,
  PanelBottomClose,
  PanelBottomOpen,
  Music,
  Sliders,
  Scissors,
  Trash2,
  ZoomIn,
  ZoomOut,
  Download,
  FileAudio,
  Clock,
  Upload,
  GripVertical,
  Undo2,
  Redo2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LeftPanel = "library" | "effects";
type BottomPanel = "timeline" | "mixer";

interface AudioFile {
  id: string;
  name: string;
  duration: string;
  size: string;
}

interface Effect {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Waveform Visualization (canvas-drawn placeholder)
// ---------------------------------------------------------------------------

function WaveformDisplay({
  currentTime,
  duration,
  isPlaying,
  isRecording,
  onSeek,
  waveformData,
}: {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isRecording: boolean;
  onSeek: (time: number) => void;
  waveformData: number[] | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(2, 2);
    const w = rect.width;
    const h = rect.height;

    // Background
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    const gridSpacing = 60;
    for (let x = 0; x < w; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    // Horizontal center
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Draw waveform bars
    const barWidth = 2;
    const gap = 1;
    const bars = Math.floor(w / (barWidth + gap));
    const playheadPos = duration > 0 ? (currentTime / duration) * w : 0;

    for (let i = 0; i < bars; i++) {
      const x = i * (barWidth + gap);
      let amplitude: number;

      if (waveformData && waveformData.length > 0) {
        // Use real waveform data
        const dataIndex = Math.floor((i / bars) * waveformData.length);
        amplitude = waveformData[Math.min(dataIndex, waveformData.length - 1)];
      } else {
        // Procedural waveform shape as fallback
        const t = i / bars;
        amplitude =
          0.3 +
          0.2 * Math.sin(t * Math.PI * 8) +
          0.15 * Math.sin(t * Math.PI * 23) +
          0.1 * Math.sin(t * Math.PI * 47) +
          0.08 * Math.cos(t * Math.PI * 13);
      }
      const barH = Math.max(2, amplitude * h * 0.8);

      if (x < playheadPos) {
        ctx.fillStyle = isRecording ? "rgba(220,38,38,0.7)" : "rgba(116,221,199,0.7)";
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.15)";
      }
      ctx.fillRect(x, (h - barH) / 2, barWidth, barH);
    }

    // Playhead
    if (duration > 0) {
      ctx.strokeStyle = isRecording ? "#dc2626" : "#74ddc7";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(playheadPos, 0);
      ctx.lineTo(playheadPos, h);
      ctx.stroke();

      // Playhead handle
      ctx.fillStyle = isRecording ? "#dc2626" : "#74ddc7";
      ctx.beginPath();
      ctx.moveTo(playheadPos - 5, 0);
      ctx.lineTo(playheadPos + 5, 0);
      ctx.lineTo(playheadPos, 8);
      ctx.closePath();
      ctx.fill();
    }

    // Time markers
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "9px monospace";
    const markerInterval = Math.max(1, Math.floor(duration / 10)) || 1;
    for (let t = 0; t <= duration; t += markerInterval) {
      const x = (t / duration) * w;
      if (x > 0 && x < w - 30) {
        ctx.fillText(formatTime(t).split(".")[0], x + 2, 12);
      }
    }
  }, [currentTime, duration, isPlaying, isRecording, waveformData]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    onSeek(ratio * duration);
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full cursor-crosshair relative"
      onClick={handleClick}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// VU Meter
// ---------------------------------------------------------------------------

function VUMeter({ level, isActive }: { level: number; isActive: boolean }) {
  const segments = 20;
  return (
    <div className="flex gap-px items-end h-full">
      {Array.from({ length: segments }).map((_, i) => {
        const threshold = (i / segments) * 100;
        const active = isActive && level > threshold;
        let color = "bg-green-500/80";
        if (i >= segments * 0.7) color = "bg-yellow-500/80";
        if (i >= segments * 0.9) color = "bg-red-500/80";
        return (
          <div
            key={i}
            className={`w-1.5 rounded-sm transition-all duration-75 ${
              active ? color : "bg-foreground/[0.06]"
            }`}
            style={{ height: `${30 + (i / segments) * 70}%` }}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stereo VU Meter
// ---------------------------------------------------------------------------

function StereoVUMeter({ isActive }: { isActive: boolean }) {
  const [levels, setLevels] = useState({ left: 0, right: 0 });

  useEffect(() => {
    if (!isActive) {
      setLevels({ left: 0, right: 0 });
      return;
    }
    const interval = setInterval(() => {
      setLevels({
        left: 40 + Math.random() * 45,
        right: 38 + Math.random() * 47,
      });
    }, 80);
    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="flex items-center gap-2 h-full">
      <div className="flex flex-col items-center gap-1 h-full">
        <span className="text-[8px] text-muted-foreground uppercase">L</span>
        <div className="flex-1">
          <VUMeter level={levels.left} isActive={isActive} />
        </div>
      </div>
      <div className="flex flex-col items-center gap-1 h-full">
        <span className="text-[8px] text-muted-foreground uppercase">R</span>
        <div className="flex-1">
          <VUMeter level={levels.right} isActive={isActive} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Audio Editor Page
// ---------------------------------------------------------------------------

export default function AudioEditorPage() {
  // Panel visibility
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showBottomPanel, setShowBottomPanel] = useState(true);
  const [leftPanel, setLeftPanel] = useState<LeftPanel>("library");
  const [bottomPanel, setBottomPanel] = useState<BottomPanel>("timeline");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Transport / recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(180); // 3 min placeholder
  const [recordingTime, setRecordingTime] = useState(0);

  // Audio settings
  const [inputSource, setInputSource] = useState("default");
  const [outputFormat, setOutputFormat] = useState<"WAV" | "MP3" | "FLAC">("WAV");
  const [isMuted, setIsMuted] = useState(false);

  // Real audio state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [waveformData, setWaveformData] = useState<number[] | null>(null);
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);

  // Real recording state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);

  // Load audio file and decode waveform
  const loadAudioFile = useCallback(async (file: File) => {
    try {
      // Revoke previous URL
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);

      const url = URL.createObjectURL(file);
      audioUrlRef.current = url;

      // Create audio element for playback
      const audio = new Audio(url);
      audio.preload = "auto";
      audioRef.current = audio;

      // Wait for metadata
      await new Promise<void>((resolve, reject) => {
        audio.onloadedmetadata = () => resolve();
        audio.onerror = () => reject(new Error("Failed to load audio"));
        setTimeout(() => resolve(), 3000); // fallback
      });

      setDuration(audio.duration || 0);
      setCurrentTime(0);

      // Add to file list
      const sizeStr = file.size > 1048576
        ? `${(file.size / 1048576).toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(0)} KB`;
      const durStr = audio.duration
        ? `${Math.floor(audio.duration / 60)}:${String(Math.floor(audio.duration % 60)).padStart(2, "0")}`
        : "0:00";

      setAudioFiles((prev) => [
        ...prev,
        { id: `file-${Date.now()}`, name: file.name, duration: durStr, size: sizeStr },
      ]);

      // Decode for waveform
      const arrayBuffer = await file.arrayBuffer();
      const audioCtx = new AudioContext();
      const decoded = await audioCtx.decodeAudioData(arrayBuffer);
      const channelData = decoded.getChannelData(0);

      // Downsample to ~2000 points for waveform
      const samples = 2000;
      const blockSize = Math.floor(channelData.length / samples);
      const peaks: number[] = [];
      for (let i = 0; i < samples; i++) {
        let max = 0;
        for (let j = 0; j < blockSize; j++) {
          const abs = Math.abs(channelData[i * blockSize + j] || 0);
          if (abs > max) max = abs;
        }
        peaks.push(max);
      }
      setWaveformData(peaks);
      audioCtx.close();

      console.log("[AudioEditor] Loaded:", file.name, "duration:", audio.duration);
    } catch (err) {
      console.error("[AudioEditor] Failed to load audio:", err);
    }
  }, []);

  // Handle file input change
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadAudioFile(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [loadAudioFile]
  );

  // Handle drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("audio/")) loadAudioFile(file);
    },
    [loadAudioFile]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const [effects, setEffects] = useState<Effect[]>([
    { id: "eq", name: "Equalizer", description: "3-band parametric EQ", enabled: false },
    { id: "comp", name: "Compressor", description: "Dynamic range compression", enabled: true },
    { id: "reverb", name: "Reverb", description: "Room / hall reverb", enabled: false },
    { id: "gate", name: "Noise Gate", description: "Remove background noise", enabled: true },
    { id: "deesser", name: "De-esser", description: "Reduce sibilance", enabled: false },
    { id: "limiter", name: "Limiter", description: "Brick-wall output limiter", enabled: false },
  ]);

  // Real audio playback sync
  useEffect(() => {
    if (!isPlaying) return;
    const audio = audioRef.current;
    if (audio && audio.src) {
      audio.currentTime = currentTime;
      audio.play().catch(() => {});
    }
    const interval = setInterval(() => {
      if (audio && audio.src && !audio.paused) {
        setCurrentTime(audio.currentTime);
        if (audio.currentTime >= audio.duration) {
          setIsPlaying(false);
          setCurrentTime(0);
        }
      } else if (!audio?.src) {
        // No audio loaded — simulate for recording
        setCurrentTime((t) => {
          if (t >= duration && duration > 0) {
            setIsPlaying(false);
            return 0;
          }
          return t + 0.1;
        });
      }
    }, 100);
    return () => {
      clearInterval(interval);
      if (audio && !audio.paused) audio.pause();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // Recording timer
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      setRecordingTime((t) => t + 0.1);
    }, 100);
    return () => clearInterval(interval);
  }, [isRecording]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  const handleRecord = useCallback(async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.requestData();
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      // Start recording
      try {
        setIsPlaying(false);
        if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();

        if (!navigator.mediaDevices?.getUserMedia) {
          console.error("[AudioEditor] getUserMedia not supported");
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        const mimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
        let mimeType = "";
        for (const mt of mimeTypes) {
          if (MediaRecorder.isTypeSupported(mt)) { mimeType = mt; break; }
        }

        const opts: MediaRecorderOptions = {};
        if (mimeType) opts.mimeType = mimeType;

        const recorder = new MediaRecorder(stream, opts);
        mediaRecorderRef.current = recorder;
        recordChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordChunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
          if (recordChunksRef.current.length === 0) return;

          const blob = new Blob(recordChunksRef.current, { type: mimeType || "audio/webm" });
          const file = new File([blob], `recording-${Date.now()}.webm`, { type: blob.type });
          loadAudioFile(file);
          console.log("[AudioEditor] Recording captured, size:", blob.size);
        };

        recorder.start(1000);
        setIsRecording(true);
        setRecordingTime(0);
        console.log("[AudioEditor] Recording started");
      } catch (err) {
        console.error("[AudioEditor] Record failed:", err);
      }
    }
  }, [isRecording, isPlaying, loadAudioFile]);

  const handlePlayPause = useCallback(() => {
    if (isRecording) return;
    if (isPlaying) {
      if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
    }
  }, [isRecording, isPlaying]);

  const handleStop = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();
    if (isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsPlaying(false);
    setIsRecording(false);
    setCurrentTime(0);
    if (audioRef.current) audioRef.current.currentTime = 0;
  }, [isRecording]);

  const handleSeek = useCallback((time: number) => {
    const t = Math.max(0, time);
    setCurrentTime(t);
    if (audioRef.current) audioRef.current.currentTime = t;
  }, []);

  const toggleEffect = useCallback((id: string) => {
    setEffects((prev) =>
      prev.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e))
    );
  }, []);

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
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#74ddc7]/20">
              <Music className="h-3.5 w-3.5 text-[#74ddc7]" />
            </div>
            <span className="text-sm font-semibold text-foreground">
              Audio Editor
            </span>
            <span className="hidden sm:inline text-[10px] text-muted-foreground bg-foreground/[0.06] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">
              Beta
            </span>
          </div>
          {/* Recording indicator */}
          {isRecording && (
            <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-medium text-red-400 uppercase tracking-wider">
                REC {formatTime(recordingTime).split(".")[0]}
              </span>
            </div>
          )}
        </div>

        {/* Center: Layout & Edit Controls */}
        <div className="hidden md:flex items-center gap-1">
          <button
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
            title="Undo"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
            title="Redo"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
          <div className="h-4 w-px bg-border mx-1" />
          <button
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
            title="Split at playhead"
          >
            <Scissors className="h-3.5 w-3.5" />
          </button>
          <button
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
            title="Delete selection"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <div className="h-4 w-px bg-border mx-1" />
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
            onClick={() => setShowBottomPanel(!showBottomPanel)}
            className={`p-1.5 rounded-md text-xs transition-colors ${
              showBottomPanel
                ? "text-foreground bg-foreground/[0.08]"
                : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
            }`}
            title="Toggle bottom panel"
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
            title="Export audio"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <div className="h-4 w-px bg-border mx-0.5" />
          <button
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
            title="Keyboard shortcuts"
          >
            <Keyboard className="h-3.5 w-3.5" />
          </button>
          <button
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
            title="Help"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
          <button
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
            title="Settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
          <div className="h-4 w-px bg-border mx-0.5" />
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
        {/* ── Left Panel: Library / Effects ── */}
        {showLeftPanel && (
          <div className="w-64 xl:w-72 border-r border-border bg-card/50 flex flex-col shrink-0 overflow-hidden">
            {/* Panel Tabs */}
            <div className="flex border-b border-border shrink-0">
              <button
                onClick={() => setLeftPanel("library")}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  leftPanel === "library"
                    ? "text-foreground border-b-2 border-[#74ddc7] bg-foreground/[0.04]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <FileAudio className="h-3 w-3" />
                  Library
                </span>
              </button>
              <button
                onClick={() => setLeftPanel("effects")}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  leftPanel === "effects"
                    ? "text-foreground border-b-2 border-[#74ddc7] bg-foreground/[0.04]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Sliders className="h-3 w-3" />
                  Effects
                </span>
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto">
              {leftPanel === "library" ? (
                <div className="p-2 space-y-2">
                  {/* Import area */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <div
                    className="border-2 border-dashed border-border/60 rounded-lg p-4 text-center hover:border-[#74ddc7]/40 hover:bg-[#74ddc7]/[0.02] transition-colors cursor-pointer group"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                  >
                    <Upload className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground group-hover:text-[#74ddc7] transition-colors" />
                    <p className="text-[10px] text-muted-foreground group-hover:text-foreground/70 transition-colors">
                      Drop audio files here or click to import
                    </p>
                    <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                      WAV, MP3, FLAC, OGG, AAC
                    </p>
                  </div>

                  {/* File list */}
                  <div className="space-y-0.5">
                    {audioFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-foreground/[0.04] cursor-pointer group transition-colors"
                      >
                        <GripVertical className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
                        {/* Mini waveform thumbnail */}
                        <div className="w-10 h-5 bg-foreground/[0.06] rounded overflow-hidden flex items-center gap-px px-0.5 shrink-0">
                          {Array.from({ length: 12 }).map((_, i) => (
                            <div
                              key={i}
                              className="w-0.5 bg-[#74ddc7]/50 rounded-full"
                              style={{
                                height: `${20 + Math.sin(i * 0.8) * 40 + Math.random() * 30}%`,
                              }}
                            />
                          ))}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground truncate">{file.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {file.duration} &middot; {file.size}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {effects.map((effect) => (
                    <div
                      key={effect.id}
                      className={`flex items-center justify-between px-2.5 py-2 rounded-md transition-colors ${
                        effect.enabled
                          ? "bg-[#74ddc7]/[0.06] border border-[#74ddc7]/20"
                          : "hover:bg-foreground/[0.04] border border-transparent"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{effect.name}</p>
                        <p className="text-[10px] text-muted-foreground">{effect.description}</p>
                      </div>
                      <button
                        onClick={() => toggleEffect(effect.id)}
                        className={`ml-2 relative w-8 h-4 rounded-full transition-colors shrink-0 ${
                          effect.enabled ? "bg-[#74ddc7]" : "bg-foreground/[0.12]"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${
                            effect.enabled ? "translate-x-4" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Center: Waveform + Recording Controls ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Waveform display */}
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Waveform toolbar */}
            <div className="flex items-center justify-between px-3 py-1 border-b border-border bg-card/30 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground font-mono">
                  {formatTime(currentTime)}
                </span>
                <span className="text-[10px] text-muted-foreground/40">/</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {formatTime(duration)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
                  title="Zoom in"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
                  title="Zoom out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <div className="h-3 w-px bg-border mx-0.5" />
                <button
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
                  title="Zoom to fit"
                >
                  <Maximize2 className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Waveform canvas */}
            <div className="flex-1 min-h-0 bg-black/20 relative">
              <WaveformDisplay
                currentTime={currentTime}
                duration={duration}
                isPlaying={isPlaying}
                isRecording={isRecording}
                onSeek={handleSeek}
                waveformData={waveformData}
              />
              {/* Empty state */}
              {duration === 0 && !isRecording && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Music className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground/50">
                      Record audio or import a file to get started
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recording Controls */}
          <div className="border-t border-border bg-card/60 px-4 py-3 shrink-0">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Input controls */}
              <div className="flex items-center gap-3 min-w-0">
                {/* Input source */}
                <div className="flex items-center gap-1.5">
                  <Mic className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <select
                    value={inputSource}
                    onChange={(e) => setInputSource(e.target.value)}
                    className="text-xs bg-foreground/[0.06] border border-border rounded-md px-2 py-1 text-foreground appearance-none cursor-pointer pr-6 focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
                  >
                    <option value="default">Default Microphone</option>
                    <option value="usb">USB Audio Interface</option>
                    <option value="built-in">Built-in Microphone</option>
                    <option value="virtual">Virtual Audio Cable</option>
                  </select>
                </div>
                {/* Format selector */}
                <div className="hidden sm:flex items-center gap-1 shrink-0">
                  {(["WAV", "MP3", "FLAC"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setOutputFormat(fmt)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                        outputFormat === fmt
                          ? "bg-[#74ddc7]/20 text-[#74ddc7] border border-[#74ddc7]/30"
                          : "text-muted-foreground hover:text-foreground bg-foreground/[0.04] border border-transparent"
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Center: Transport controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSeek(Math.max(0, currentTime - 5))}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
                  title="Skip back 5s"
                >
                  <SkipBack className="h-4 w-4" />
                </button>
                <button
                  onClick={handleStop}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
                  title="Stop"
                >
                  <Square className="h-4 w-4" />
                </button>
                <button
                  onClick={handlePlayPause}
                  disabled={isRecording}
                  className={`p-2 rounded-lg transition-colors ${
                    isPlaying
                      ? "bg-[#74ddc7]/20 text-[#74ddc7] hover:bg-[#74ddc7]/30"
                      : "text-foreground hover:bg-foreground/[0.08]"
                  } disabled:opacity-30 disabled:cursor-not-allowed`}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </button>
                {/* Record button - big red circle */}
                <button
                  onClick={handleRecord}
                  className={`p-2.5 rounded-full transition-all ${
                    isRecording
                      ? "bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse"
                      : "bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300"
                  }`}
                  title={isRecording ? "Stop recording" : "Record"}
                >
                  <CircleDot className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleSeek(Math.min(duration, currentTime + 5))}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
                  title="Skip forward 5s"
                >
                  <SkipForward className="h-4 w-4" />
                </button>
              </div>

              {/* Right: Levels + Timer */}
              <div className="flex items-center gap-3 min-w-0">
                {/* Recording timer */}
                {isRecording && (
                  <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20">
                    <Clock className="h-3 w-3 text-red-400" />
                    <span className="text-xs font-mono text-red-400">
                      {formatTime(recordingTime)}
                    </span>
                  </div>
                )}

                {/* VU Meter */}
                <div className="h-8 hidden lg:block">
                  <StereoVUMeter isActive={isPlaying || isRecording} />
                </div>

                {/* Mute toggle */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-1.5 rounded-md transition-colors ${
                    isMuted
                      ? "text-red-400 bg-red-500/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
                  }`}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* ── Bottom Panel: Timeline / Mixer ── */}
          {showBottomPanel && (
            <div
              className="border-t border-border bg-card/50 shrink-0"
              style={{ height: bottomPanel === "timeline" ? "220px" : "240px" }}
            >
              {/* Panel Tabs */}
              <div className="flex border-b border-border shrink-0">
                <button
                  onClick={() => setBottomPanel("timeline")}
                  className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                    bottomPanel === "timeline"
                      ? "text-foreground border-b-2 border-[#74ddc7] bg-foreground/[0.04]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Timeline
                </button>
                <button
                  onClick={() => setBottomPanel("mixer")}
                  className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                    bottomPanel === "mixer"
                      ? "text-foreground border-b-2 border-[#74ddc7] bg-foreground/[0.04]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Mixer
                </button>
              </div>

              {/* Panel Content */}
              <div className="h-[calc(100%-29px)] overflow-hidden">
                {bottomPanel === "timeline" ? (
                  <TimelinePanel currentTime={currentTime} duration={duration} />
                ) : (
                  <MixerPanel isMuted={isMuted} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* Status Bar                                                        */}
      {/* ================================================================= */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-border bg-card/80 text-[10px] text-muted-foreground shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isRecording ? "bg-red-500 animate-pulse" : "bg-green-500"
              }`}
            />
            {isRecording ? "Recording" : "Ready"}
          </span>
          <span>48kHz / 24-bit</span>
          <span>{outputFormat}</span>
        </div>
        <div className="flex items-center gap-3">
          {isRecording && (
            <span className="text-red-400">
              REC {formatTime(recordingTime).split(".")[0]}
            </span>
          )}
          <span>Disk: 45.2 GB free</span>
          <span className="text-muted-foreground/60">v1.0.0-beta</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline Panel (inline)
// ---------------------------------------------------------------------------

function TimelinePanel({
  currentTime,
  duration,
}: {
  currentTime: number;
  duration: number;
}) {
  const tracks = [
    { id: 1, name: "Track 1", color: "#74ddc7", hasClip: true, clipStart: 0, clipEnd: 0.6 },
    { id: 2, name: "Track 2", color: "#7401df", hasClip: true, clipStart: 0.15, clipEnd: 0.45 },
    { id: 3, name: "Track 3", color: "#ec4899", hasClip: false, clipStart: 0, clipEnd: 0 },
    { id: 4, name: "Track 4", color: "#f59e0b", hasClip: false, clipStart: 0, clipEnd: 0 },
  ];

  const playheadPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex h-full">
      {/* Track headers */}
      <div className="w-32 border-r border-border shrink-0 bg-card/30">
        {/* Ruler header */}
        <div className="h-6 border-b border-border px-2 flex items-center">
          <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider">Tracks</span>
        </div>
        {tracks.map((track) => (
          <div
            key={track.id}
            className="h-12 border-b border-border px-2 flex items-center gap-2 group hover:bg-foreground/[0.02]"
          >
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: track.color }}
            />
            <span className="text-[10px] text-foreground truncate">{track.name}</span>
            <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="text-[8px] px-1 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]">
                M
              </button>
              <button className="text-[8px] px-1 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]">
                S
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Timeline area */}
      <div className="flex-1 relative overflow-x-auto">
        {/* Time ruler */}
        <div className="h-6 border-b border-border bg-card/20 relative">
          {Array.from({ length: 11 }).map((_, i) => {
            const t = (i / 10) * duration;
            return (
              <div
                key={i}
                className="absolute top-0 h-full flex flex-col items-start"
                style={{ left: `${(i / 10) * 100}%` }}
              >
                <div className="w-px h-2 bg-foreground/10" />
                <span className="text-[8px] text-muted-foreground/50 pl-1 font-mono">
                  {formatTime(t).split(".")[0]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Track lanes */}
        {tracks.map((track) => (
          <div key={track.id} className="h-12 border-b border-border relative">
            {track.hasClip && (
              <div
                className="absolute top-1 bottom-1 rounded-md border overflow-hidden"
                style={{
                  left: `${track.clipStart * 100}%`,
                  width: `${(track.clipEnd - track.clipStart) * 100}%`,
                  backgroundColor: `${track.color}15`,
                  borderColor: `${track.color}30`,
                }}
              >
                {/* Mini waveform in clip */}
                <div className="flex items-center h-full px-1 gap-px">
                  {Array.from({ length: 40 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-0.5 rounded-full shrink-0"
                      style={{
                        height: `${15 + Math.sin(i * 0.5) * 25 + Math.random() * 25}%`,
                        backgroundColor: `${track.color}60`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-px bg-[#74ddc7] z-10 pointer-events-none"
          style={{ left: `${playheadPercent}%` }}
        >
          <div className="w-2.5 h-2.5 bg-[#74ddc7] -ml-[4.5px] rotate-45 rounded-sm" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mixer Panel (inline)
// ---------------------------------------------------------------------------

function MixerPanel({ isMuted }: { isMuted: boolean }) {
  const channels = [
    { id: 1, name: "Track 1", color: "#74ddc7", volume: 75, pan: 0, muted: false, solo: false },
    { id: 2, name: "Track 2", color: "#7401df", volume: 60, pan: -20, muted: false, solo: false },
    { id: 3, name: "Track 3", color: "#ec4899", volume: 0, pan: 0, muted: true, solo: false },
    { id: 4, name: "Track 4", color: "#f59e0b", volume: 0, pan: 0, muted: true, solo: false },
  ];

  return (
    <div className="flex h-full">
      {/* Channel strips */}
      {channels.map((ch) => (
        <div
          key={ch.id}
          className="flex-1 border-r border-border flex flex-col items-center px-2 py-2 max-w-[120px]"
        >
          {/* Channel name */}
          <div className="flex items-center gap-1 mb-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ch.color }} />
            <span className="text-[10px] text-foreground font-medium">{ch.name}</span>
          </div>

          {/* Pan knob (visual) */}
          <div className="relative w-6 h-6 rounded-full border border-border bg-foreground/[0.04] mb-1.5">
            <div
              className="absolute w-0.5 h-2 bg-foreground/40 rounded-full left-1/2 -translate-x-1/2 origin-bottom"
              style={{
                transform: `translateX(-50%) rotate(${ch.pan * 1.35}deg)`,
                top: "2px",
              }}
            />
          </div>
          <span className="text-[8px] text-muted-foreground mb-1">
            {ch.pan === 0 ? "C" : ch.pan < 0 ? `L${Math.abs(ch.pan)}` : `R${ch.pan}`}
          </span>

          {/* Volume fader */}
          <div className="flex-1 w-full flex items-center justify-center mb-1.5">
            <div className="relative w-1.5 h-full bg-foreground/[0.06] rounded-full overflow-hidden">
              <div
                className="absolute bottom-0 w-full rounded-full transition-all"
                style={{
                  height: `${ch.volume}%`,
                  backgroundColor: ch.muted ? "rgba(255,255,255,0.1)" : ch.color,
                  opacity: ch.muted ? 0.3 : 0.6,
                }}
              />
            </div>
          </div>
          <span className="text-[9px] text-muted-foreground font-mono mb-1.5">
            {ch.volume > 0 ? `${Math.round((ch.volume / 100) * -60 + 60 - 60)}dB` : "-inf"}
          </span>

          {/* Mute / Solo */}
          <div className="flex items-center gap-1">
            <button
              className={`text-[8px] px-1.5 py-0.5 rounded font-medium transition-colors ${
                ch.muted
                  ? "bg-red-500/20 text-red-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]"
              }`}
            >
              M
            </button>
            <button
              className={`text-[8px] px-1.5 py-0.5 rounded font-medium transition-colors ${
                ch.solo
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]"
              }`}
            >
              S
            </button>
          </div>
        </div>
      ))}

      {/* Master channel */}
      <div className="w-24 flex flex-col items-center px-2 py-2 bg-foreground/[0.02] border-l border-border">
        <span className="text-[10px] text-foreground font-semibold mb-2">Master</span>
        {/* Master meter */}
        <div className="flex-1 w-full flex items-center justify-center gap-1 mb-1.5">
          <div className="relative w-1.5 h-full bg-foreground/[0.06] rounded-full overflow-hidden">
            <div
              className="absolute bottom-0 w-full rounded-full bg-[#74ddc7]/60"
              style={{ height: isMuted ? "0%" : "70%" }}
            />
          </div>
          <div className="relative w-1.5 h-full bg-foreground/[0.06] rounded-full overflow-hidden">
            <div
              className="absolute bottom-0 w-full rounded-full bg-[#74ddc7]/60"
              style={{ height: isMuted ? "0%" : "68%" }}
            />
          </div>
        </div>
        <span className="text-[9px] text-muted-foreground font-mono mb-1.5">
          {isMuted ? "-inf" : "0.0dB"}
        </span>
        <button
          className={`text-[8px] px-2 py-0.5 rounded font-medium transition-colors ${
            isMuted
              ? "bg-red-500/20 text-red-400"
              : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]"
          }`}
        >
          M
        </button>
      </div>
    </div>
  );
}
