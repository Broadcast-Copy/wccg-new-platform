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
  Download,
  FileAudio,
  Clock,
  Upload,
  GripVertical,
  Undo2,
  Redo2,
} from "lucide-react";
import { LoginRequired } from "@/components/auth/login-required";
import {
  saveAudioFile as dbSave,
  loadAllAudioFiles as dbLoadAll,
  deleteAudioFileFromDB as dbDelete,
} from "@/lib/audio-store";

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
  blobUrl?: string;
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

/** Write an ASCII string into a DataView */
function wavWriteString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/** Encode an AudioBuffer to a WAV ArrayBuffer (PCM 16-bit) */
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numCh = buffer.numberOfChannels;
  const sr = buffer.sampleRate;
  const bps = 16;
  const bytesPerSample = bps / 8;
  const blockAlign = numCh * bytesPerSample;
  const dataSize = buffer.length * blockAlign;
  const buf = new ArrayBuffer(44 + dataSize);
  const v = new DataView(buf);

  wavWriteString(v, 0, "RIFF");
  v.setUint32(4, 36 + dataSize, true);
  wavWriteString(v, 8, "WAVE");
  wavWriteString(v, 12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, numCh, true);
  v.setUint32(24, sr, true);
  v.setUint32(28, sr * blockAlign, true);
  v.setUint16(32, blockAlign, true);
  v.setUint16(34, bps, true);
  wavWriteString(v, 36, "data");
  v.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numCh; c++) channels.push(buffer.getChannelData(c));

  let off = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      off += 2;
    }
  }
  return buf;
}

/** Snapshot AudioBuffer channel data for undo/redo stack */
interface BufferSnapshot {
  data: Float32Array[];
  sampleRate: number;
  channels: number;
}

function snapshotBuffer(buf: AudioBuffer): BufferSnapshot {
  const data: Float32Array[] = [];
  for (let c = 0; c < buf.numberOfChannels; c++) {
    data.push(new Float32Array(buf.getChannelData(c)));
  }
  return { data, sampleRate: buf.sampleRate, channels: buf.numberOfChannels };
}

function bufferFromSnapshot(snap: BufferSnapshot): AudioBuffer {
  const buf = new AudioBuffer({
    length: snap.data[0].length,
    numberOfChannels: snap.channels,
    sampleRate: snap.sampleRate,
  });
  for (let c = 0; c < snap.channels; c++) {
    buf.getChannelData(c).set(snap.data[c]);
  }
  return buf;
}

/** Downsample an AudioBuffer channel 0 to peak array for waveform display */
function computeWaveformPeaks(buf: AudioBuffer, numSamples = 2000): number[] {
  const channelData = buf.getChannelData(0);
  const blockSize = Math.max(1, Math.floor(channelData.length / numSamples));
  const peaks: number[] = [];
  for (let i = 0; i < numSamples; i++) {
    let max = 0;
    for (let j = 0; j < blockSize; j++) {
      const abs = Math.abs(channelData[i * blockSize + j] || 0);
      if (abs > max) max = abs;
    }
    peaks.push(max);
  }
  return peaks;
}

// ---------------------------------------------------------------------------
// Waveform Visualization (canvas-drawn, supports selection)
// ---------------------------------------------------------------------------

function WaveformDisplay({
  currentTime,
  duration,
  isPlaying,
  isRecording,
  onSeek,
  waveformData,
  selectionStart,
  selectionEnd,
  onSelectionChange,
}: {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isRecording: boolean;
  onSeek: (time: number) => void;
  waveformData: number[] | null;
  selectionStart: number | null;
  selectionEnd: number | null;
  onSelectionChange: (start: number | null, end: number | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartTimeRef = useRef(0);

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

    // Compute selection pixel range
    let selX1 = -1, selX2 = -1;
    if (selectionStart != null && selectionEnd != null && duration > 0) {
      const s0 = Math.min(selectionStart, selectionEnd);
      const s1 = Math.max(selectionStart, selectionEnd);
      if (s1 - s0 > 0.001) {
        selX1 = (s0 / duration) * w;
        selX2 = (s1 / duration) * w;
      }
    }

    for (let i = 0; i < bars; i++) {
      const x = i * (barWidth + gap);
      let amplitude: number;

      if (waveformData && waveformData.length > 0) {
        const dataIndex = Math.floor((i / bars) * waveformData.length);
        amplitude = waveformData[Math.min(dataIndex, waveformData.length - 1)];
      } else {
        const t = i / bars;
        amplitude =
          0.3 +
          0.2 * Math.sin(t * Math.PI * 8) +
          0.15 * Math.sin(t * Math.PI * 23) +
          0.1 * Math.sin(t * Math.PI * 47) +
          0.08 * Math.cos(t * Math.PI * 13);
      }
      const barH = Math.max(2, amplitude * h * 0.8);

      // Color: selected region, played region, or unplayed
      const inSelection = selX1 >= 0 && x >= selX1 && x <= selX2;
      if (inSelection) {
        ctx.fillStyle = isRecording ? "rgba(220,38,38,0.85)" : "rgba(116,221,199,0.9)";
      } else if (x < playheadPos) {
        ctx.fillStyle = isRecording ? "rgba(220,38,38,0.5)" : "rgba(116,221,199,0.5)";
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.15)";
      }
      ctx.fillRect(x, (h - barH) / 2, barWidth, barH);
    }

    // Selection overlay background
    if (selX1 >= 0 && selX2 > selX1) {
      ctx.fillStyle = "rgba(116, 221, 199, 0.08)";
      ctx.fillRect(selX1, 0, selX2 - selX1, h);
      // Selection edge lines
      ctx.strokeStyle = "rgba(116, 221, 199, 0.6)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(selX1, 0); ctx.lineTo(selX1, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(selX2, 0); ctx.lineTo(selX2, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // Selection time labels
      if (selectionStart != null && selectionEnd != null) {
        const s0 = Math.min(selectionStart, selectionEnd);
        const s1 = Math.max(selectionStart, selectionEnd);
        ctx.fillStyle = "rgba(116, 221, 199, 0.8)";
        ctx.font = "9px monospace";
        ctx.fillText(formatTime(s0).split(".")[0], selX1 + 2, h - 4);
        ctx.fillText(formatTime(s1).split(".")[0], selX2 - 28, h - 4);
        // Duration label centered
        const selDur = s1 - s0;
        if (selX2 - selX1 > 60) {
          const label = `${selDur.toFixed(1)}s`;
          ctx.fillStyle = "rgba(116, 221, 199, 0.6)";
          ctx.font = "bold 10px monospace";
          ctx.fillText(label, (selX1 + selX2) / 2 - 12, 22);
        }
      }
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
  }, [currentTime, duration, isPlaying, isRecording, waveformData, selectionStart, selectionEnd]);

  // Convert clientX pixel to time using the container's rect
  const getTimeFromX = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container || duration <= 0) return 0;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    return Math.max(0, Math.min(duration, (x / rect.width) * duration));
  }, [duration]);

  // Pointer events with setPointerCapture — drag continues even outside element
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (duration <= 0 || isRecording) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    const t = getTimeFromX(e.clientX);
    dragStartTimeRef.current = t;
    onSelectionChange(t, t);
  }, [duration, isRecording, getTimeFromX, onSelectionChange]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || duration <= 0) return;
    const t = getTimeFromX(e.clientX);
    onSelectionChange(dragStartTimeRef.current, t);
  }, [duration, getTimeFromX, onSelectionChange]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    const distance = Math.abs(e.clientX - dragStartXRef.current);
    if (distance < 5) {
      // Click, not drag — seek and clear selection
      onSelectionChange(null, null);
      const t = getTimeFromX(e.clientX);
      onSeek(t);
    }
  }, [getTimeFromX, onSelectionChange, onSeek]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full cursor-crosshair relative select-none"
      style={{ touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <canvas ref={canvasRef} className="w-full h-full pointer-events-none" />
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

function StereoVUMeter({ isActive, level }: { isActive: boolean; level: number }) {
  // level: 0–1 from actual audio analysis
  const displayLevel = isActive ? level * 90 : 0;

  return (
    <div className="flex items-center gap-2 h-full">
      <div className="flex flex-col items-center gap-1 h-full">
        <span className="text-[8px] text-muted-foreground uppercase">L</span>
        <div className="flex-1">
          <VUMeter level={displayLevel} isActive={isActive} />
        </div>
      </div>
      <div className="flex flex-col items-center gap-1 h-full">
        <span className="text-[8px] text-muted-foreground uppercase">R</span>
        <div className="flex-1">
          <VUMeter level={displayLevel * 0.95} isActive={isActive} />
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

  // Auto-collapse panels on small screens
  useEffect(() => {
    if (window.innerWidth < 768) {
      setShowLeftPanel(false);
      setShowBottomPanel(false);
    }
  }, []);

  // Transport / recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);

  // Status message
  const [statusMessage, setStatusMessage] = useState("");
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showStatus = useCallback((msg: string) => {
    setStatusMessage(msg);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => setStatusMessage(""), 5000);
  }, []);

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
  const recordingTimeRef = useRef(0);

  // Live audio analysis (for recording visualization)
  const analyserRef = useRef<AnalyserNode | null>(null);
  const liveAudioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);
  const liveWaveformRef = useRef<number[]>([]);
  const durationRef = useRef(0);

  // ── Editing engine state ──
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const undoStackRef = useRef<BufferSnapshot[]>([]);
  const redoStackRef = useRef<BufferSnapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [vuLevel, setVuLevel] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);

  // ── Enumerate real audio input devices on mount ──
  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    navigator.mediaDevices.enumerateDevices()
      .then((devices) => {
        const inputs = devices.filter((d) => d.kind === "audioinput");
        setAudioDevices(inputs);
      })
      .catch(() => {});
  }, []);

  // ── Update VU level from waveform data at playhead ──
  useEffect(() => {
    if (!waveformData || waveformData.length === 0 || duration <= 0) {
      if (!isRecording) setVuLevel(0);
      return;
    }
    if (isPlaying) {
      const idx = Math.floor((currentTime / duration) * waveformData.length);
      const val = waveformData[Math.min(idx, waveformData.length - 1)] || 0;
      setVuLevel(val);
    } else if (!isRecording) {
      setVuLevel(0);
    }
  }, [currentTime, duration, waveformData, isPlaying, isRecording]);

  // ── Restore persisted files from IndexedDB on mount ──
  useEffect(() => {
    let cancelled = false;
    dbLoadAll()
      .then((stored) => {
        if (cancelled || stored.length === 0) return;
        const restored: AudioFile[] = stored.map((s) => ({
          id: s.id,
          name: s.name,
          duration: s.duration,
          size: s.size,
          blobUrl: URL.createObjectURL(s.blob),
        }));
        setAudioFiles(restored);
        console.log("[AudioEditor] Restored", restored.length, "files from IndexedDB");
      })
      .catch((err) => console.warn("[AudioEditor] Failed to load persisted files:", err));
    return () => { cancelled = true; };
  }, []);

  // Load audio file and decode waveform
  const loadAudioFile = useCallback(async (file: File) => {
    const fileId = `file-${Date.now()}`;
    const url = URL.createObjectURL(file);
    const sizeStr = file.size > 1048576
      ? `${(file.size / 1048576).toFixed(1)} MB`
      : `${(file.size / 1024).toFixed(0)} KB`;

    console.log("[AudioEditor] Loading file:", file.name, "size:", file.size, "type:", file.type);

    // Phase 1: Add file to library immediately so it always appears
    setAudioFiles((prev) => [
      ...prev,
      { id: fileId, name: file.name, duration: "...", size: sizeStr, blobUrl: url },
    ]);
    // Auto-show library panel so user can see the new file
    setShowLeftPanel(true);
    setLeftPanel("library");

    // Persist to IndexedDB so file survives page refresh
    dbSave({ id: fileId, name: file.name, duration: "...", size: sizeStr, blob: file, createdAt: Date.now() })
      .then(() => console.log("[AudioEditor] Persisted to IndexedDB:", file.name))
      .catch((err) => console.warn("[AudioEditor] IndexedDB save failed:", err));

    // Phase 2: Create audio element for playback
    try {
      audioUrlRef.current = url;
      const audio = new Audio(url);
      audio.preload = "auto";
      audioRef.current = audio;

      // Wait for metadata — resolve on timeout for webm blobs with no duration header
      let audioDuration = 0;
      try {
        await new Promise<void>((resolve, reject) => {
          audio.onloadedmetadata = () => resolve();
          audio.onerror = () => reject(new Error("Audio element failed to load"));
          setTimeout(() => resolve(), 3000);
        });
        audioDuration = audio.duration;
      } catch {
        console.warn("[AudioEditor] Audio element couldn't load metadata, using fallback");
      }

      // Handle Infinity/NaN (common with webm recorded by MediaRecorder)
      if (!isFinite(audioDuration) || isNaN(audioDuration) || audioDuration <= 0) {
        audioDuration = 0;
      }

      // Only update duration if we got a real value (don't overwrite recording timer duration with 0)
      if (audioDuration > 0) setDuration(audioDuration);
      setCurrentTime(0);

      // Update file entry with duration from audio element
      const durStr = audioDuration > 0
        ? `${Math.floor(audioDuration / 60)}:${String(Math.floor(audioDuration % 60)).padStart(2, "0")}`
        : "0:00";
      setAudioFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, duration: durStr } : f));
      // Update duration in IndexedDB
      if (durStr !== "0:00") {
        dbSave({ id: fileId, name: file.name, duration: durStr, size: sizeStr, blob: file, createdAt: Date.now() }).catch(() => {});
      }

      showStatus(`Loaded: ${file.name} (${durStr}, ${sizeStr})`);
      console.log("[AudioEditor] Audio element ready:", file.name, "duration:", audioDuration);
    } catch (err) {
      console.error("[AudioEditor] Audio element setup failed:", err);
      showStatus(`Loaded: ${file.name} (playback may be limited)`);
    }

    // Phase 3: Decode waveform (separate so failure never loses the recording)
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioCtx = new AudioContext();
      const decoded = await audioCtx.decodeAudioData(arrayBuffer);

      // Store decoded buffer for editing
      audioBufferRef.current = decoded;
      // Clear undo/redo stacks for new file
      undoStackRef.current = [];
      redoStackRef.current = [];
      setCanUndo(false);
      setCanRedo(false);
      setSelectionStart(null);
      setSelectionEnd(null);

      // Use decoded duration as fallback (more reliable than Audio element for webm)
      if (decoded.duration > 0 && isFinite(decoded.duration)) {
        setDuration((prev) => (prev <= 0 ? decoded.duration : prev));
        const decodedDur = `${Math.floor(decoded.duration / 60)}:${String(Math.floor(decoded.duration % 60)).padStart(2, "0")}`;
        setAudioFiles((prev) => prev.map((f) => f.id === fileId && f.duration === "0:00" ? { ...f, duration: decodedDur } : f));
      }

      // Compute waveform peaks
      setWaveformData(computeWaveformPeaks(decoded));
      audioCtx.close();
      console.log("[AudioEditor] Waveform decoded:", file.name, "decoded duration:", decoded.duration);
    } catch (waveErr) {
      console.warn("[AudioEditor] Waveform decode failed (recording still usable):", waveErr);
      // Generate placeholder waveform so UI isn't empty
      setWaveformData(Array.from({ length: 200 }, () => 0.15));
    }
  }, [showStatus]);

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

  // Keep durationRef in sync with state (for use in closures)
  useEffect(() => { durationRef.current = duration; }, [duration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (liveAudioCtxRef.current) liveAudioCtxRef.current.close().catch(() => {});
    };
  }, []);

  // Download an audio file from the library
  const downloadAudioFile = useCallback((file: AudioFile) => {
    if (!file.blobUrl) {
      showStatus("No downloadable audio for this file");
      return;
    }
    const a = document.createElement("a");
    a.href = file.blobUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showStatus(`Downloading: ${file.name}`);
  }, [showStatus]);

  // Delete an audio file from the library
  const deleteAudioFile = useCallback((fileId: string) => {
    setAudioFiles((prev) => {
      const file = prev.find((f) => f.id === fileId);
      if (file?.blobUrl) {
        // If this is the currently active audio, clear playback state
        if (audioUrlRef.current === file.blobUrl) {
          if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();
          audioUrlRef.current = null;
          audioRef.current = null;
          setWaveformData(null);
          setDuration(0);
          setCurrentTime(0);
          setIsPlaying(false);
        }
        URL.revokeObjectURL(file.blobUrl);
      }
      return prev.filter((f) => f.id !== fileId);
    });
    // Remove from IndexedDB
    dbDelete(fileId).catch((err) => console.warn("[AudioEditor] IndexedDB delete failed:", err));
    showStatus("File removed from library");
  }, [showStatus]);

  const [effects, setEffects] = useState<Effect[]>([
    { id: "eq", name: "Equalizer", description: "3-band parametric EQ", enabled: false },
    { id: "comp", name: "Compressor", description: "Dynamic range compression", enabled: false },
    { id: "reverb", name: "Reverb", description: "Room / hall reverb", enabled: false },
    { id: "gate", name: "Noise Gate", description: "Remove background noise", enabled: false },
    { id: "deesser", name: "De-esser", description: "Reduce sibilance", enabled: false },
    { id: "limiter", name: "Limiter", description: "Brick-wall output limiter", enabled: false },
  ]);

  // Real audio playback sync
  useEffect(() => {
    if (!isPlaying) return;
    const audio = audioRef.current;
    if (!audio || !audio.src) {
      // No audio loaded — can't play
      setIsPlaying(false);
      return;
    }
    audio.play().catch((err) => {
      console.error("[AudioEditor] Playback failed:", err);
      setIsPlaying(false);
    });
    const interval = setInterval(() => {
      if (audio && !audio.paused) {
        setCurrentTime(audio.currentTime);
        // Use our stored duration if audio.duration is Infinity (common webm issue)
        const effectiveDur = isFinite(audio.duration) ? audio.duration : durationRef.current;
        if (effectiveDur > 0 && audio.currentTime >= effectiveDur) {
          audio.pause();
          setIsPlaying(false);
          setCurrentTime(0);
        }
      }
    }, 50); // 50ms for smoother playhead movement
    return () => {
      clearInterval(interval);
      if (audio && !audio.paused) audio.pause();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // Recording timer — advances playhead + duration + timer in sync
  useEffect(() => {
    if (!isRecording) return;
    recordingTimeRef.current = 0;
    const interval = setInterval(() => {
      recordingTimeRef.current += 0.1;
      const t = recordingTimeRef.current;
      setRecordingTime(t);
      setCurrentTime(t);   // playhead advances with recording
      setDuration(t);      // duration grows as we record
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

  // Helper: clean up live audio analysis
  const cleanupAnalyser = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (liveAudioCtxRef.current) {
      liveAudioCtxRef.current.close().catch(() => {});
      liveAudioCtxRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const handleRecord = useCallback(async () => {
    if (isRecording) {
      // ── Stop recording ──
      console.log("[AudioEditor] Stopping recording...");

      // Stop live visualization first
      cleanupAnalyser();

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try { mediaRecorderRef.current.requestData(); } catch { /* ignore */ }
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      setCurrentTime(0); // reset playhead to start for playback
      showStatus("Recording stopped — processing audio...");
    } else {
      // ── Start recording ──
      try {
        setIsPlaying(false);
        if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();

        if (!navigator.mediaDevices?.getUserMedia) {
          showStatus("Recording not supported in this browser — requires HTTPS");
          return;
        }

        showStatus("Requesting microphone access...");
        console.log("[AudioEditor] Requesting mic access...");

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        mediaStreamRef.current = stream;
        console.log("[AudioEditor] Mic access granted, tracks:", stream.getAudioTracks().length);

        // ── Set up live audio visualization via AnalyserNode ──
        try {
          const liveCtx = new AudioContext();
          const source = liveCtx.createMediaStreamSource(stream);
          const analyser = liveCtx.createAnalyser();
          analyser.fftSize = 2048;
          analyser.smoothingTimeConstant = 0.3;
          source.connect(analyser);
          liveAudioCtxRef.current = liveCtx;
          analyserRef.current = analyser;

          // Start live waveform sampling loop
          liveWaveformRef.current = [];
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const sampleLiveLevel = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteTimeDomainData(dataArray);
            // Compute RMS level from time-domain data
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              const v = (dataArray[i] - 128) / 128;
              sum += v * v;
            }
            const rms = Math.sqrt(sum / dataArray.length);
            const level = Math.min(1, rms * 4); // amplify for visibility
            setVuLevel(level); // drive VU meter from real mic input
            liveWaveformRef.current.push(level);
            // Push to React state every ~3 frames to avoid thrashing
            if (liveWaveformRef.current.length % 3 === 0) {
              setWaveformData([...liveWaveformRef.current]);
            }
            animFrameRef.current = requestAnimationFrame(sampleLiveLevel);
          };
          animFrameRef.current = requestAnimationFrame(sampleLiveLevel);
          console.log("[AudioEditor] Live audio analyser connected");
        } catch (err) {
          console.warn("[AudioEditor] Live visualization setup failed:", err);
        }

        // Find best supported mime type
        const mimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
        let mimeType = "";
        for (const mt of mimeTypes) {
          if (MediaRecorder.isTypeSupported(mt)) { mimeType = mt; break; }
        }
        console.log("[AudioEditor] Using mime type:", mimeType || "(browser default)");

        const opts: MediaRecorderOptions = { audioBitsPerSecond: 128_000 };
        if (mimeType) opts.mimeType = mimeType;

        const recorder = new MediaRecorder(stream, opts);
        mediaRecorderRef.current = recorder;
        recordChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            recordChunksRef.current.push(e.data);
          }
        };

        recorder.onerror = (event) => {
          console.error("[AudioEditor] MediaRecorder error:", event);
          cleanupAnalyser();
          showStatus("Recording error — microphone may have disconnected");
          stream.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
          setIsRecording(false);
        };

        recorder.onstop = () => {
          console.log("[AudioEditor] recorder.onstop fired, chunks:", recordChunksRef.current.length);
          stream.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;

          if (recordChunksRef.current.length === 0) {
            showStatus("Recording was empty — no audio captured");
            return;
          }

          // Snapshot the final recording duration and live waveform
          const chunks = [...recordChunksRef.current];
          const recDuration = recordingTimeRef.current;
          const liveWaveform = [...liveWaveformRef.current];
          recordChunksRef.current = [];

          // Defer blob creation to prevent UI freeze
          setTimeout(() => {
            try {
              const blob = new Blob(chunks, { type: mimeType || "audio/webm" });
              const sizeMB = (blob.size / (1024 * 1024)).toFixed(1);
              const ext = mimeType.includes("mp4") ? "m4a" : "webm";
              const file = new File([blob], `recording-${Date.now()}.${ext}`, { type: blob.type });
              console.log("[AudioEditor] Recording blob created:", blob.size, "bytes, duration ~", recDuration.toFixed(1), "s");

              // Keep the live waveform visible while file loads
              if (liveWaveform.length > 0) setWaveformData(liveWaveform);
              // Set duration from recording timer (more reliable than webm metadata)
              if (recDuration > 0) setDuration(recDuration);

              loadAudioFile(file);
              showStatus(`Recording captured (${sizeMB} MB, ${Math.ceil(recDuration)}s) — loaded into editor`);
            } catch (blobErr) {
              console.error("[AudioEditor] Failed to create recording blob:", blobErr);
              showStatus("Failed to process recording — please try again");
            }
          }, 50);
        };

        // Reset state for new recording
        setWaveformData(null);
        setDuration(0);
        setCurrentTime(0);

        recorder.start(1000);
        setIsRecording(true);
        setRecordingTime(0);
        recordingTimeRef.current = 0;
        showStatus("Recording... click the red button to stop");
        console.log("[AudioEditor] Recording started, state:", recorder.state);
      } catch (err: unknown) {
        console.error("[AudioEditor] Record failed:", err);
        cleanupAnalyser();
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        }
        const msg = err instanceof DOMException ? err.message : String(err);
        if (msg.includes("Permission denied") || msg.includes("NotAllowed")) {
          showStatus("Microphone access denied — please allow microphone in your browser settings and try again");
        } else if (msg.includes("NotFound") || msg.includes("Requested device not found")) {
          showStatus("No microphone found — please connect a microphone and try again");
        } else if (msg.includes("NotReadableError") || msg.includes("Could not start")) {
          showStatus("Microphone is in use by another app — close other apps using the mic and try again");
        } else {
          showStatus(`Recording failed: ${msg}`);
        }
      }
    }
  }, [isRecording, isPlaying, loadAudioFile, showStatus, cleanupAnalyser]);

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
      cleanupAnalyser();
      try { mediaRecorderRef.current.requestData(); } catch { /* ignore */ }
      mediaRecorderRef.current.stop();
    }
    setIsPlaying(false);
    setIsRecording(false);
    setCurrentTime(0);
    if (audioRef.current) audioRef.current.currentTime = 0;
  }, [isRecording, cleanupAnalyser]);

  const handleSeek = useCallback((time: number) => {
    const t = Math.max(0, time);
    setCurrentTime(t);
    if (audioRef.current) audioRef.current.currentTime = t;
  }, []);

  // Load a file from the library into the editor for playback
  const loadFileFromLibrary = useCallback((file: AudioFile) => {
    if (!file.blobUrl) return;
    // Stop any current playback
    if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();
    setIsPlaying(false);

    const audio = new Audio(file.blobUrl);
    audio.preload = "auto";
    audioRef.current = audio;
    audioUrlRef.current = file.blobUrl;
    setCurrentTime(0);

    // Get metadata
    audio.onloadedmetadata = () => {
      const dur = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
      if (dur > 0) setDuration(dur);
    };

    // Decode waveform from blob URL + store AudioBuffer for editing
    fetch(file.blobUrl)
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        const ctx = new AudioContext();
        return ctx.decodeAudioData(buf).then((decoded) => {
          audioBufferRef.current = decoded;
          undoStackRef.current = [];
          redoStackRef.current = [];
          setCanUndo(false);
          setCanRedo(false);
          setSelectionStart(null);
          setSelectionEnd(null);
          setWaveformData(computeWaveformPeaks(decoded));
          if (decoded.duration > 0) setDuration(decoded.duration);
          ctx.close();
        });
      })
      .catch(() => {
        setWaveformData(Array.from({ length: 200 }, () => 0.15));
      });

    showStatus(`Loaded: ${file.name}`);
  }, [showStatus]);

  const toggleEffect = useCallback((id: string) => {
    setEffects((prev) =>
      prev.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e))
    );
  }, []);

  // ── Selection handler (called by WaveformDisplay) ──
  const handleSelectionChange = useCallback((start: number | null, end: number | null) => {
    setSelectionStart(start);
    setSelectionEnd(end);
  }, []);

  // ── Rebuild playback + waveform from an AudioBuffer ──
  const rebuildFromBuffer = useCallback(async (buffer: AudioBuffer) => {
    audioBufferRef.current = buffer;
    setDuration(buffer.duration);
    durationRef.current = buffer.duration;
    setWaveformData(computeWaveformPeaks(buffer));
    setSelectionStart(null);
    setSelectionEnd(null);

    // Render to WAV for playback
    try {
      const wav = audioBufferToWav(buffer);
      const blob = new Blob([wav], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);

      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = url;
      const audio = new Audio(url);
      audio.preload = "auto";
      audioRef.current = audio;

      setCurrentTime((prev) => Math.min(prev, buffer.duration));
    } catch (err) {
      console.error("[AudioEditor] rebuildFromBuffer failed:", err);
    }
  }, []);

  // ── Save current state to undo stack ──
  const saveToUndoStack = useCallback(() => {
    const buf = audioBufferRef.current;
    if (!buf) return;
    undoStackRef.current.push(snapshotBuffer(buf));
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  // ── TRIM: Keep only the selected region ──
  const handleTrim = useCallback(async () => {
    const buf = audioBufferRef.current;
    if (!buf) { showStatus("No audio loaded"); return; }
    if (selectionStart == null || selectionEnd == null) {
      showStatus("Select a region first — click and drag on the waveform");
      return;
    }
    const s0 = Math.min(selectionStart, selectionEnd);
    const s1 = Math.max(selectionStart, selectionEnd);
    if (s1 - s0 < 0.01) { showStatus("Selection too short"); return; }

    saveToUndoStack();
    const startSample = Math.floor(s0 * buf.sampleRate);
    const endSample = Math.min(Math.floor(s1 * buf.sampleRate), buf.length);
    const newLen = endSample - startSample;
    if (newLen <= 0) return;

    const newBuf = new AudioBuffer({ length: newLen, numberOfChannels: buf.numberOfChannels, sampleRate: buf.sampleRate });
    for (let c = 0; c < buf.numberOfChannels; c++) {
      newBuf.getChannelData(c).set(buf.getChannelData(c).subarray(startSample, endSample));
    }
    await rebuildFromBuffer(newBuf);
    setCurrentTime(0);
    showStatus(`Trimmed to ${(s1 - s0).toFixed(1)}s`);
  }, [selectionStart, selectionEnd, saveToUndoStack, rebuildFromBuffer, showStatus]);

  // ── DELETE: Remove the selected region, keep the rest ──
  const handleDeleteSelection = useCallback(async () => {
    const buf = audioBufferRef.current;
    if (!buf) { showStatus("No audio loaded"); return; }
    if (selectionStart == null || selectionEnd == null) {
      showStatus("Select a region first — click and drag on the waveform");
      return;
    }
    const s0 = Math.min(selectionStart, selectionEnd);
    const s1 = Math.max(selectionStart, selectionEnd);
    if (s1 - s0 < 0.01) { showStatus("Selection too short"); return; }

    saveToUndoStack();
    const startSample = Math.floor(s0 * buf.sampleRate);
    const endSample = Math.min(Math.floor(s1 * buf.sampleRate), buf.length);
    const newLen = buf.length - (endSample - startSample);
    if (newLen <= 0) { showStatus("Cannot delete entire audio"); return; }

    const newBuf = new AudioBuffer({ length: newLen, numberOfChannels: buf.numberOfChannels, sampleRate: buf.sampleRate });
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const oldData = buf.getChannelData(c);
      const newData = newBuf.getChannelData(c);
      newData.set(oldData.subarray(0, startSample), 0);
      newData.set(oldData.subarray(endSample), startSample);
    }
    await rebuildFromBuffer(newBuf);
    setCurrentTime(s0);
    showStatus(`Deleted ${(s1 - s0).toFixed(1)}s`);
  }, [selectionStart, selectionEnd, saveToUndoStack, rebuildFromBuffer, showStatus]);

  // ── SPLIT: Trim everything after the playhead (non-destructive marker) ──
  const handleSplitAtPlayhead = useCallback(async () => {
    const buf = audioBufferRef.current;
    if (!buf) { showStatus("No audio loaded"); return; }
    if (currentTime <= 0 || currentTime >= duration) {
      showStatus("Move playhead to split position (click on waveform)");
      return;
    }
    // Split = select from start to playhead as a trim (keep left side)
    saveToUndoStack();
    const splitSample = Math.floor(currentTime * buf.sampleRate);
    if (splitSample <= 0 || splitSample >= buf.length) return;

    const newBuf = new AudioBuffer({ length: splitSample, numberOfChannels: buf.numberOfChannels, sampleRate: buf.sampleRate });
    for (let c = 0; c < buf.numberOfChannels; c++) {
      newBuf.getChannelData(c).set(buf.getChannelData(c).subarray(0, splitSample));
    }
    await rebuildFromBuffer(newBuf);
    setCurrentTime(0);
    showStatus(`Split at ${formatTime(currentTime)} — kept first ${currentTime.toFixed(1)}s`);
  }, [currentTime, duration, saveToUndoStack, rebuildFromBuffer, showStatus]);

  // ── UNDO ──
  const handleUndo = useCallback(async () => {
    if (undoStackRef.current.length === 0) return;
    const cur = audioBufferRef.current;
    if (cur) {
      redoStackRef.current.push(snapshotBuffer(cur));
      setCanRedo(true);
    }
    const prev = undoStackRef.current.pop()!;
    setCanUndo(undoStackRef.current.length > 0);
    await rebuildFromBuffer(bufferFromSnapshot(prev));
    showStatus("Undo");
  }, [rebuildFromBuffer, showStatus]);

  // ── REDO ──
  const handleRedo = useCallback(async () => {
    if (redoStackRef.current.length === 0) return;
    const cur = audioBufferRef.current;
    if (cur) {
      undoStackRef.current.push(snapshotBuffer(cur));
      setCanUndo(true);
    }
    const next = redoStackRef.current.pop()!;
    setCanRedo(redoStackRef.current.length > 0);
    await rebuildFromBuffer(bufferFromSnapshot(next));
    showStatus("Redo");
  }, [rebuildFromBuffer, showStatus]);

  // ── EXPORT: Download edited audio as WAV ──
  const handleExport = useCallback(() => {
    const buf = audioBufferRef.current;
    if (!buf) { showStatus("No audio to export"); return; }
    try {
      const wav = audioBufferToWav(buf);
      const blob = new Blob([wav], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wccg-export-${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showStatus("Exported as WAV");
    } catch (err) {
      console.error("[AudioEditor] Export failed:", err);
      showStatus("Export failed — try again");
    }
  }, [showStatus]);

  // ── SELECT ALL ──
  const handleSelectAll = useCallback(() => {
    if (duration > 0) {
      setSelectionStart(0);
      setSelectionEnd(duration);
      showStatus("Selected all");
    }
  }, [duration, showStatus]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const ctrl = e.ctrlKey || e.metaKey;

      // Space = play/pause
      if (e.code === "Space" && !ctrl) {
        e.preventDefault();
        handlePlayPause();
        return;
      }
      // Ctrl+Z = undo
      if (ctrl && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        handleUndo();
        return;
      }
      // Ctrl+Shift+Z or Ctrl+Y = redo
      if ((ctrl && e.shiftKey && e.key === "z") || (ctrl && e.key === "y")) {
        e.preventDefault();
        handleRedo();
        return;
      }
      // Delete or Backspace = delete selection
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handleDeleteSelection();
        return;
      }
      // Ctrl+T = trim
      if (ctrl && e.key === "t") {
        e.preventDefault();
        handleTrim();
        return;
      }
      // Ctrl+A = select all
      if (ctrl && e.key === "a") {
        e.preventDefault();
        handleSelectAll();
        return;
      }
      // Ctrl+E or Ctrl+Shift+E = export
      if (ctrl && e.key === "e") {
        e.preventDefault();
        handleExport();
        return;
      }
      // S = split at playhead
      if (!ctrl && e.key === "s") {
        e.preventDefault();
        handleSplitAtPlayhead();
        return;
      }
      // Escape = close context menu / clear selection
      if (e.key === "Escape") {
        setContextMenu(null);
        setSelectionStart(null);
        setSelectionEnd(null);
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handlePlayPause, handleUndo, handleRedo, handleDeleteSelection, handleTrim, handleSelectAll, handleExport, handleSplitAtPlayhead]);

  return (
    <LoginRequired fullPage message="Sign in to access the Audio Editor. Record, edit, and mix your audio projects.">
    <div className="flex flex-col h-[calc(100vh-4rem)] -mx-4 sm:-mx-6 lg:-mx-8 -mt-6 overflow-hidden">
      {/* ================================================================= */}
      {/* Top Toolbar                                                       */}
      {/* ================================================================= */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-card/80 backdrop-blur-sm shrink-0">
        {/* Left: Back + Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            href="/studio"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Studio</span>
          </Link>
          <div className="h-4 w-px bg-border shrink-0" />
          {/* Mobile: Library toggle */}
          <button
            onClick={() => setShowLeftPanel(!showLeftPanel)}
            className={`md:hidden p-1.5 rounded-md text-xs transition-colors shrink-0 ${
              showLeftPanel
                ? "text-foreground bg-foreground/[0.08]"
                : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
            }`}
            title="Toggle library"
          >
            <FileAudio className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="hidden sm:flex h-6 w-6 items-center justify-center rounded-md bg-[#74ddc7]/20 shrink-0">
              <Music className="h-3.5 w-3.5 text-[#74ddc7]" />
            </div>
            <span className="hidden sm:inline text-sm font-semibold text-foreground truncate">
              Audio Editor
            </span>
            <span className="hidden lg:inline text-[10px] text-muted-foreground bg-foreground/[0.06] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider shrink-0">
              Beta
            </span>
          </div>
          {/* Recording indicator */}
          {isRecording && (
            <div className="flex items-center gap-1.5 ml-1 sm:ml-2 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 shrink-0">
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
            onClick={handleUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded-md transition-colors ${
              canUndo
                ? "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
                : "text-muted-foreground/30 cursor-not-allowed"
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded-md transition-colors ${
              canRedo
                ? "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
                : "text-muted-foreground/30 cursor-not-allowed"
            }`}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
          <div className="h-4 w-px bg-border mx-1" />
          <button
            onClick={handleSplitAtPlayhead}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
            title="Split at playhead (S)"
          >
            <Scissors className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleDeleteSelection}
            className={`p-1.5 rounded-md transition-colors ${
              selectionStart != null && selectionEnd != null
                ? "text-red-400 hover:text-red-300 hover:bg-red-500/10"
                : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
            }`}
            title="Delete selection (Del)"
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
        <div className="flex items-center gap-0.5 sm:gap-1">
          {/* Mobile: Bottom panel toggle */}
          <button
            onClick={() => setShowBottomPanel(!showBottomPanel)}
            className={`md:hidden p-1.5 rounded-md text-xs transition-colors ${
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
          <button
            onClick={handleExport}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
            title="Export audio (Ctrl+E)"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <div className="hidden sm:block h-4 w-px bg-border mx-0.5" />
          <button
            className="hidden sm:inline-flex p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
            title="Keyboard shortcuts"
          >
            <Keyboard className="h-3.5 w-3.5" />
          </button>
          <button
            className="hidden sm:inline-flex p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
            title="Help"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
          <button
            className="hidden sm:inline-flex p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
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
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* ── Left Panel: Library / Effects ── */}
        {showLeftPanel && (
          <div className="absolute inset-y-0 left-0 z-20 md:relative md:z-auto w-64 xl:w-72 border-r border-border bg-card flex flex-col shrink-0 overflow-hidden shadow-xl md:shadow-none">
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
                        onClick={() => loadFileFromLibrary(file)}
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
                                height: `${25 + Math.sin(i * 0.9) * 35 + Math.cos(i * 1.4) * 15}%`,
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
                        {/* Download & Delete buttons */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          {file.blobUrl && (
                            <button
                              onClick={(e) => { e.stopPropagation(); downloadAudioFile(file); }}
                              className="p-1 rounded text-muted-foreground hover:text-[#74ddc7] hover:bg-[#74ddc7]/10 transition-colors"
                              title="Download"
                            >
                              <Download className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteAudioFile(file.id); }}
                            className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
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
                        <p className="text-[8px] text-amber-500/60 uppercase tracking-wider mt-0.5">Coming Soon</p>
                      </div>
                      <button
                        onClick={() => toggleEffect(effect.id)}
                        disabled
                        className={`ml-2 relative w-8 h-4 rounded-full transition-colors shrink-0 opacity-40 cursor-not-allowed ${
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
                {selectionStart != null && selectionEnd != null && Math.abs(selectionEnd - selectionStart) > 0.01 && (
                  <>
                    <span className="text-[10px] text-muted-foreground/40">|</span>
                    <span className="text-[10px] text-[#74ddc7] font-mono">
                      Sel: {formatTime(Math.abs(selectionEnd - selectionStart)).split(".")[0]}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1">
                {/* Trim button — keep selected region */}
                {selectionStart != null && selectionEnd != null && (
                  <button
                    onClick={handleTrim}
                    className="p-1 rounded text-[#74ddc7] hover:bg-[#74ddc7]/10 transition-colors"
                    title="Trim to selection (Ctrl+T)"
                  >
                    <span className="text-[10px] font-bold">TRIM</span>
                  </button>
                )}
                {selectionStart != null && selectionEnd != null && (
                  <div className="h-3 w-px bg-border mx-0.5" />
                )}
                <button
                  onClick={handleSelectAll}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
                  title="Select all (Ctrl+A)"
                >
                  <Maximize2 className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Waveform canvas */}
            <div
              className="flex-1 min-h-0 bg-black/20 relative"
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY });
              }}
            >
              <WaveformDisplay
                currentTime={currentTime}
                duration={duration}
                isPlaying={isPlaying}
                isRecording={isRecording}
                onSeek={handleSeek}
                waveformData={waveformData}
                selectionStart={selectionStart}
                selectionEnd={selectionEnd}
                onSelectionChange={handleSelectionChange}
              />
              {/* Empty state — only show when nothing is loaded */}
              {!waveformData && audioFiles.length === 0 && !isRecording && duration <= 0 && (
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
          <div className="border-t border-border bg-card/60 px-2 sm:px-4 py-2 sm:py-3 shrink-0">
            <div className="flex items-center justify-center sm:justify-between gap-2 sm:gap-4">
              {/* Left: Input controls — hidden on small screens */}
              <div className="hidden sm:flex items-center gap-3 min-w-0">
                {/* Input source */}
                <div className="flex items-center gap-1.5">
                  <Mic className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <select
                    value={inputSource}
                    onChange={(e) => setInputSource(e.target.value)}
                    className="text-xs bg-foreground/[0.06] border border-border rounded-md px-2 py-1 text-foreground appearance-none cursor-pointer pr-6 focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50 max-w-[180px]"
                  >
                    <option value="default">Default Microphone</option>
                    {audioDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Mic (${d.deviceId.slice(0, 8)})`}
                      </option>
                    ))}
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

              {/* Right: Levels + Timer — hidden on very small screens */}
              <div className="hidden sm:flex items-center gap-3 min-w-0">
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
                  <StereoVUMeter isActive={isPlaying || isRecording} level={vuLevel} />
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
              className={`border-t border-border bg-card/50 shrink-0 ${
                bottomPanel === "timeline" ? "h-[160px] sm:h-[220px]" : "h-[180px] sm:h-[240px]"
              }`}
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
                  <TimelinePanel
                    currentTime={currentTime}
                    duration={duration}
                    selectionStart={selectionStart}
                    selectionEnd={selectionEnd}
                    onSelectionChange={handleSelectionChange}
                    onSeek={handleSeek}
                    waveformData={waveformData}
                    hasAudio={!!audioBufferRef.current}
                  />
                ) : (
                  <MixerPanel isMuted={isMuted} vuLevel={vuLevel} hasAudio={!!audioBufferRef.current} isActive={isPlaying || isRecording} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* Right-click Context Menu                                          */}
      {/* ================================================================= */}
      {contextMenu && (
        <>
          {/* Click-away overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          />
          {/* Menu */}
          <div
            className="fixed z-50 min-w-[180px] bg-card border border-border rounded-lg shadow-xl py-1 text-xs"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => { handlePlayPause(); setContextMenu(null); }}
              className="w-full px-3 py-1.5 text-left hover:bg-foreground/[0.06] flex items-center gap-2 text-foreground"
            >
              {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {isPlaying ? "Pause" : "Play"}
              <span className="ml-auto text-muted-foreground text-[10px]">Space</span>
            </button>
            <div className="h-px bg-border my-1" />
            <button
              onClick={() => { handleSelectAll(); setContextMenu(null); }}
              disabled={duration <= 0}
              className="w-full px-3 py-1.5 text-left hover:bg-foreground/[0.06] flex items-center gap-2 text-foreground disabled:opacity-30"
            >
              <Maximize2 className="h-3 w-3" />
              Select All
              <span className="ml-auto text-muted-foreground text-[10px]">Ctrl+A</span>
            </button>
            <button
              onClick={() => { handleTrim(); setContextMenu(null); }}
              disabled={selectionStart == null || selectionEnd == null}
              className="w-full px-3 py-1.5 text-left hover:bg-foreground/[0.06] flex items-center gap-2 text-foreground disabled:opacity-30"
            >
              <Scissors className="h-3 w-3" />
              Trim to Selection
              <span className="ml-auto text-muted-foreground text-[10px]">Ctrl+T</span>
            </button>
            <button
              onClick={() => { handleDeleteSelection(); setContextMenu(null); }}
              disabled={selectionStart == null || selectionEnd == null}
              className="w-full px-3 py-1.5 text-left hover:bg-foreground/[0.06] flex items-center gap-2 text-red-400 disabled:opacity-30"
            >
              <Trash2 className="h-3 w-3" />
              Delete Selection
              <span className="ml-auto text-muted-foreground text-[10px]">Del</span>
            </button>
            <button
              onClick={() => { handleSplitAtPlayhead(); setContextMenu(null); }}
              disabled={!audioBufferRef.current || currentTime <= 0}
              className="w-full px-3 py-1.5 text-left hover:bg-foreground/[0.06] flex items-center gap-2 text-foreground disabled:opacity-30"
            >
              <Scissors className="h-3 w-3" />
              Split at Playhead
              <span className="ml-auto text-muted-foreground text-[10px]">S</span>
            </button>
            <div className="h-px bg-border my-1" />
            <button
              onClick={() => { handleUndo(); setContextMenu(null); }}
              disabled={!canUndo}
              className="w-full px-3 py-1.5 text-left hover:bg-foreground/[0.06] flex items-center gap-2 text-foreground disabled:opacity-30"
            >
              <Undo2 className="h-3 w-3" />
              Undo
              <span className="ml-auto text-muted-foreground text-[10px]">Ctrl+Z</span>
            </button>
            <button
              onClick={() => { handleRedo(); setContextMenu(null); }}
              disabled={!canRedo}
              className="w-full px-3 py-1.5 text-left hover:bg-foreground/[0.06] flex items-center gap-2 text-foreground disabled:opacity-30"
            >
              <Redo2 className="h-3 w-3" />
              Redo
              <span className="ml-auto text-muted-foreground text-[10px]">Ctrl+Shift+Z</span>
            </button>
            <div className="h-px bg-border my-1" />
            <button
              onClick={() => { handleExport(); setContextMenu(null); }}
              disabled={!audioBufferRef.current}
              className="w-full px-3 py-1.5 text-left hover:bg-foreground/[0.06] flex items-center gap-2 text-foreground disabled:opacity-30"
            >
              <Download className="h-3 w-3" />
              Export as WAV
              <span className="ml-auto text-muted-foreground text-[10px]">Ctrl+E</span>
            </button>
          </div>
        </>
      )}

      {/* ================================================================= */}
      {/* Status Bar                                                        */}
      {/* ================================================================= */}
      <div className="flex items-center justify-between px-2 sm:px-3 py-1 border-t border-border bg-card/80 text-[10px] text-muted-foreground shrink-0 overflow-hidden">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="flex items-center gap-1 shrink-0">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isRecording ? "bg-red-500 animate-pulse" : "bg-green-500"
              }`}
            />
            {isRecording ? "Recording" : "Ready"}
          </span>
          {statusMessage ? (
            <span className="text-[#74ddc7] truncate max-w-[200px] sm:max-w-[400px]">{statusMessage}</span>
          ) : (
            <>
              <span className="hidden sm:inline">48kHz / 24-bit</span>
              <span className="hidden sm:inline">{outputFormat}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {isRecording && (
            <span className="text-red-400">
              REC {formatTime(recordingTime).split(".")[0]}
            </span>
          )}
          <span className="hidden sm:inline text-muted-foreground/60">v1.0</span>
        </div>
      </div>
    </div>
    </LoginRequired>
  );
}

// ---------------------------------------------------------------------------
// Timeline Panel (inline)
// ---------------------------------------------------------------------------

function TimelinePanel({
  currentTime,
  duration,
  selectionStart,
  selectionEnd,
  onSelectionChange,
  onSeek,
  waveformData,
  hasAudio,
}: {
  currentTime: number;
  duration: number;
  selectionStart: number | null;
  selectionEnd: number | null;
  onSelectionChange: (start: number | null, end: number | null) => void;
  onSeek: (time: number) => void;
  waveformData: number[] | null;
  hasAudio: boolean;
}) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartTimeRef = useRef(0);

  const playheadPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Selection percent range
  let selPctStart = -1, selPctEnd = -1;
  if (selectionStart != null && selectionEnd != null && duration > 0) {
    const s0 = Math.min(selectionStart, selectionEnd);
    const s1 = Math.max(selectionStart, selectionEnd);
    if (s1 - s0 > 0.001) {
      selPctStart = (s0 / duration) * 100;
      selPctEnd = (s1 / duration) * 100;
    }
  }

  const getTimeFromX = useCallback((clientX: number) => {
    const el = timelineRef.current;
    if (!el || duration <= 0) return 0;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    return Math.max(0, Math.min(duration, (x / rect.width) * duration));
  }, [duration]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    const t = getTimeFromX(e.clientX);
    dragStartTimeRef.current = t;
    onSelectionChange(t, t);
  }, [duration, getTimeFromX, onSelectionChange]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || duration <= 0) return;
    const t = getTimeFromX(e.clientX);
    onSelectionChange(dragStartTimeRef.current, t);
  }, [duration, getTimeFromX, onSelectionChange]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    const distance = Math.abs(e.clientX - dragStartXRef.current);
    if (distance < 5) {
      onSelectionChange(null, null);
      onSeek(getTimeFromX(e.clientX));
    }
  }, [getTimeFromX, onSelectionChange, onSeek]);

  return (
    <div className="flex h-full">
      {/* Track headers */}
      <div className="w-32 border-r border-border shrink-0 bg-card/30">
        <div className="h-6 border-b border-border px-2 flex items-center">
          <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider">Tracks</span>
        </div>
        {/* Main audio track */}
        <div className="h-12 border-b border-border px-2 flex items-center gap-2 group hover:bg-foreground/[0.02]">
          <div className="w-2 h-2 rounded-full shrink-0 bg-[#74ddc7]" />
          <span className="text-[10px] text-foreground truncate">Audio</span>
        </div>
        {/* Empty tracks */}
        {[2, 3].map((id) => (
          <div key={id} className="h-12 border-b border-border px-2 flex items-center gap-2 group hover:bg-foreground/[0.02]">
            <div className="w-2 h-2 rounded-full shrink-0 bg-foreground/10" />
            <span className="text-[10px] text-muted-foreground/40 truncate">Track {id}</span>
          </div>
        ))}
      </div>

      {/* Timeline area — drag-to-select */}
      <div
        ref={timelineRef}
        className="flex-1 relative overflow-x-auto cursor-crosshair select-none"
        style={{ touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Time ruler */}
        <div className="h-6 border-b border-border bg-card/20 relative pointer-events-none">
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

        {/* Main audio track lane */}
        <div className="h-12 border-b border-border relative">
          {hasAudio && (
            <div
              className="absolute top-1 bottom-1 left-0 right-0 rounded-md border overflow-hidden pointer-events-none"
              style={{ backgroundColor: "#74ddc715", borderColor: "#74ddc730" }}
            >
              {/* Mini waveform in clip from real data */}
              <div className="flex items-center h-full px-0.5 gap-px">
                {waveformData
                  ? waveformData.filter((_, i) => i % Math.max(1, Math.floor(waveformData.length / 80)) === 0).slice(0, 80).map((v, i) => (
                      <div
                        key={i}
                        className="w-0.5 rounded-full shrink-0"
                        style={{
                          height: `${Math.max(8, v * 90)}%`,
                          backgroundColor: "#74ddc760",
                        }}
                      />
                    ))
                  : Array.from({ length: 40 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-0.5 rounded-full shrink-0 bg-[#74ddc7]/30"
                        style={{ height: `${15 + Math.sin(i * 0.5) * 25}%` }}
                      />
                    ))}
              </div>
            </div>
          )}
        </div>

        {/* Empty track lanes */}
        {[2, 3].map((id) => (
          <div key={id} className="h-12 border-b border-border relative">
            {!hasAudio && id === 2 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[9px] text-muted-foreground/30">Drag to select on waveform or timeline</span>
              </div>
            )}
          </div>
        ))}

        {/* Selection highlight overlay */}
        {selPctStart >= 0 && selPctEnd > selPctStart && (
          <div
            className="absolute top-6 bottom-0 pointer-events-none z-[5]"
            style={{
              left: `${selPctStart}%`,
              width: `${selPctEnd - selPctStart}%`,
              backgroundColor: "rgba(116, 221, 199, 0.1)",
              borderLeft: "1px dashed rgba(116, 221, 199, 0.5)",
              borderRight: "1px dashed rgba(116, 221, 199, 0.5)",
            }}
          />
        )}

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

function MixerPanel({ isMuted, vuLevel, hasAudio, isActive }: { isMuted: boolean; vuLevel: number; hasAudio: boolean; isActive: boolean }) {
  const meterHeight = isMuted ? 0 : (isActive ? vuLevel * 80 : 0);

  return (
    <div className="flex h-full">
      {/* Audio channel strip */}
      <div className="flex-1 border-r border-border flex flex-col items-center px-3 py-2 max-w-[120px]">
        <div className="flex items-center gap-1 mb-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#74ddc7]" />
          <span className="text-[10px] text-foreground font-medium">Audio</span>
        </div>

        {/* Pan knob */}
        <div className="relative w-6 h-6 rounded-full border border-border bg-foreground/[0.04] mb-1.5">
          <div className="absolute w-0.5 h-2 bg-foreground/40 rounded-full left-1/2 -translate-x-1/2" style={{ top: "2px" }} />
        </div>
        <span className="text-[8px] text-muted-foreground mb-1">C</span>

        {/* Volume fader */}
        <div className="flex-1 w-full flex items-center justify-center mb-1.5">
          <div className="relative w-1.5 h-full bg-foreground/[0.06] rounded-full overflow-hidden">
            <div
              className="absolute bottom-0 w-full rounded-full bg-[#74ddc7]/60 transition-all duration-100"
              style={{ height: hasAudio ? (isMuted ? "0%" : "75%") : "0%" }}
            />
          </div>
        </div>
        <span className="text-[9px] text-muted-foreground font-mono mb-1.5">
          {hasAudio ? (isMuted ? "-inf" : "0.0dB") : "-inf"}
        </span>
      </div>

      {/* Empty slots */}
      {[2, 3].map((id) => (
        <div key={id} className="flex-1 border-r border-border flex flex-col items-center px-3 py-2 max-w-[120px] opacity-30">
          <span className="text-[10px] text-muted-foreground font-medium mb-1.5">Track {id}</span>
          <div className="flex-1 w-full flex items-center justify-center mb-1.5">
            <div className="relative w-1.5 h-full bg-foreground/[0.06] rounded-full overflow-hidden" />
          </div>
          <span className="text-[9px] text-muted-foreground font-mono mb-1.5">-inf</span>
        </div>
      ))}

      {/* Master channel */}
      <div className="w-24 flex flex-col items-center px-2 py-2 bg-foreground/[0.02] border-l border-border">
        <span className="text-[10px] text-foreground font-semibold mb-2">Master</span>
        <div className="flex-1 w-full flex items-center justify-center gap-1 mb-1.5">
          <div className="relative w-1.5 h-full bg-foreground/[0.06] rounded-full overflow-hidden">
            <div
              className="absolute bottom-0 w-full rounded-full bg-[#74ddc7]/60 transition-all duration-100"
              style={{ height: `${meterHeight}%` }}
            />
          </div>
          <div className="relative w-1.5 h-full bg-foreground/[0.06] rounded-full overflow-hidden">
            <div
              className="absolute bottom-0 w-full rounded-full bg-[#74ddc7]/60 transition-all duration-100"
              style={{ height: `${meterHeight * 0.95}%` }}
            />
          </div>
        </div>
        <span className="text-[9px] text-muted-foreground font-mono mb-1.5">
          {isMuted ? "-inf" : "0.0dB"}
        </span>
      </div>
    </div>
  );
}
