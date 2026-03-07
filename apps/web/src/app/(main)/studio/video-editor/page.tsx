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
  VolumeX,
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
  Check,
  Camera,
  Monitor,
  StopCircle,
  Circle,
  Loader2,
  X,
  Copy,
  ArrowUpDown,
  Mic,
  Video,
  RefreshCw,
  Keyboard,
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

interface Marker {
  id: string;
  position: number; // percentage
  label: string;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

// Start with empty media bin — user imports their own files or records
const MOCK_MEDIA: MediaItem[] = [];

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

// Start with empty timeline — user adds their own clips
const INITIAL_TIMELINE_CLIPS: TimelineClip[] = [];

const TRACKS = ["V2", "V1", "A1", "A2"];

const TRACK_COLORS: Record<string, string> = {
  V2: "bg-[#74ddc7]/50",
  V1: "bg-[#7401df]/50",
  A1: "bg-pink-500/40",
  A2: "bg-yellow-500/40",
};

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
  const [totalDuration, setTotalDuration] = useState(60);

  // Volume
  const [volume, setVolume] = useState(75);

  // Real video state
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const simTimeRef = useRef(0);
  const [hasVideo, setHasVideo] = useState(false);
  const [importedMedia, setImportedMedia] = useState<MediaItem[]>(MOCK_MEDIA);

  // Timeline
  const [timelineZoom, setTimelineZoom] = useState(100);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [timelineClips, setTimelineClips] = useState<TimelineClip[]>(INITIAL_TIMELINE_CLIPS);
  const [markers, setMarkers] = useState<Marker[]>([]);

  // Effects category expansion & applied effects
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["Transitions", "Color", "Text Overlays", "Audio"])
  );
  const [appliedEffects, setAppliedEffects] = useState<Set<string>>(new Set());

  // Drag state
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);

  // Recording state
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordMode, setRecordMode] = useState<"webcam" | "screen">("webcam");
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [streamReady, setStreamReady] = useState(false); // tracks when camera/screen stream is live
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordPreviewRef = useRef<HTMLVideoElement>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clip properties (editable)
  const [clipPosX, setClipPosX] = useState(960);
  const [clipPosY, setClipPosY] = useState(540);
  const [clipScale, setClipScale] = useState(100);
  const [clipRotation, setClipRotation] = useState(0);
  const [clipOpacity, setClipOpacity] = useState(100);
  const [clipVolume, setClipVolume] = useState(75);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  // Text tab state
  const [textFont, setTextFont] = useState("Inter");
  const [textSize, setTextSize] = useState(48);
  const [textWeight, setTextWeight] = useState("Bold");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [textAlign, setTextAlign] = useState("Center");
  const [textBgEnabled, setTextBgEnabled] = useState(false);

  // Context menu state (right-click on timeline clips)
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    clipId: string;
  } | null>(null);

  // Settings dialog state
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [availableVideoDevices, setAvailableVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [availableAudioDevices, setAvailableAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");
  const [audioTestLevel, setAudioTestLevel] = useState(0);
  const [settingsPreviewStream, setSettingsPreviewStream] = useState<MediaStream | null>(null);
  const settingsPreviewRef = useRef<HTMLVideoElement>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioAnimRef = useRef<number | null>(null);

  // Keyboard shortcuts dialog
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);

  // Status message (toast feedback)
  const [statusMsg, setStatusMsg] = useState("Ready");
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showStatus = useCallback((msg: string) => {
    setStatusMsg(msg);
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatusMsg("Ready"), 3000);
  }, []);

  // Supported file formats
  const SUPPORTED_VIDEO = ["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-matroska"];
  const SUPPORTED_AUDIO = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/webm", "audio/aac", "audio/mp4"];
  const SUPPORTED_IMAGE = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"];

  // Load a video/audio file
  const loadMediaFile = useCallback((file: File) => {
    try {
      const isVideo = file.type.startsWith("video/");
      const isAudio = file.type.startsWith("audio/");
      const isImage = file.type.startsWith("image/");

      // Validate file type
      if (!isVideo && !isAudio && !isImage) {
        showStatus(`Unsupported format: ${file.type || file.name.split(".").pop()}`);
        return;
      }
      if (isVideo && !SUPPORTED_VIDEO.some((t) => file.type === t)) {
        showStatus(`Unsupported video format: ${file.type}. Try MP4 or WebM.`);
        return;
      }

      const type: "video" | "audio" | "image" = isVideo ? "video" : isAudio ? "audio" : "image";

      setIsLoadingMedia(true);
      showStatus(`Loading: ${file.name}...`);

      // For video/audio, load into the player
      if ((isVideo || isAudio) && videoRef.current) {
        if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
        const url = URL.createObjectURL(file);
        videoUrlRef.current = url;

        const vid = videoRef.current;
        vid.src = url;
        vid.load();
        vid.onloadedmetadata = () => {
          const dur = vid.duration || 0;
          setTotalDuration(dur);
          setCurrentTime(0);
          setPlayheadPosition(0);
          if (isVideo) setHasVideo(true);
          setIsLoadingMedia(false);
          showStatus(`Loaded: ${file.name} (${Math.floor(dur)}s)`);

          // Auto-preview: play briefly then pause
          vid.currentTime = 0;
          vid.play().then(() => {
            setTimeout(() => {
              if (vid && !vid.paused) {
                vid.pause();
                vid.currentTime = 0;
                setCurrentTime(0);
                setPlayheadPosition(0);
              }
            }, 1000);
          }).catch(() => {
            // autoplay blocked — that's fine
          });
        };
        vid.onerror = () => {
          setIsLoadingMedia(false);
          showStatus(`Error: Could not load ${file.name} — format may be unsupported`);
        };
      } else if (isImage) {
        setIsLoadingMedia(false);
        showStatus(`Imported image: ${file.name}`);
      }

      // Add to media bin
      const newItem: MediaItem = {
        id: `imported-${Date.now()}`,
        name: file.name,
        type,
        duration: "loading...",
        thumbnail: type === "video" ? "bg-[#74ddc7]/30" : type === "audio" ? "bg-pink-500/30" : "bg-emerald-500/30",
      };
      setImportedMedia((prev) => [...prev, newItem]);

      // Also add a clip to the timeline
      const track = isAudio ? "A1" : "V1";
      const newClip: TimelineClip = {
        id: `tc-${Date.now()}`,
        name: file.name.replace(/\.\w+$/, ""),
        track,
        start: 0,
        width: 30,
        color: TRACK_COLORS[track] || "bg-gray-500/40",
      };
      setTimelineClips((prev) => [...prev, newClip]);
      setSelectedClipId(newClip.id);
    } catch (err) {
      console.error("[VideoEditor] Failed to load file:", err);
      setIsLoadingMedia(false);
      showStatus("Error loading file");
    }
  }, [showStatus]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadMediaFile(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [loadMediaFile]
  );

  // ---------------------------------------------------------------------------
  // Recording Functions — cleanupRecording MUST be defined first (used by others)
  // ---------------------------------------------------------------------------

  const cleanupRecording = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (recordPreviewRef.current) {
      recordPreviewRef.current.srcObject = null;
    }
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setShowRecordModal(false);
    setIsRecordingVideo(false);
    setStreamReady(false);
    setRecordingElapsed(0);
    setRecordError(null);
    recordChunksRef.current = [];
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop(); // triggers onstop → cleanupRecording
    }
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    cleanupRecording();
    showStatus("Recording cancelled");
  }, [cleanupRecording, showStatus]);

  // One-click recording: requests camera/screen FIRST (must stay in user gesture
  // context), then updates state to show the recording UI.
  const openRecordModal = useCallback(async (mode: "webcam" | "screen") => {
    // Check browser support
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      const msg = "Your browser does not support camera/screen recording. Please use Chrome, Edge, or Firefox.";
      setRecordError(msg);
      setShowRecordModal(true);
      showStatus(msg);
      return;
    }

    // CRITICAL: Call getUserMedia IMMEDIATELY — before any setState calls.
    // Browsers require getUserMedia to be called in the same user-activation
    // context as the click. Any React state update before this can push
    // getUserMedia into a new microtask, breaking the activation chain.
    try {
      let stream: MediaStream;
      if (mode === "webcam") {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
      } else {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      }

      // Stream acquired — NOW update all state
      mediaStreamRef.current = stream;
      recordChunksRef.current = [];
      setRecordMode(mode);
      setRecordError(null);
      setShowRecordModal(true);
      setStreamReady(true);
      setIsRecordingVideo(false);
      setRecordingElapsed(0);

      // Attach stream to preview video after React renders the overlay
      setTimeout(() => {
        if (recordPreviewRef.current && mediaStreamRef.current) {
          recordPreviewRef.current.srcObject = mediaStreamRef.current;
          recordPreviewRef.current.play().catch(() => {});
        }
      }, 150);

      showStatus(mode === "webcam" ? "Camera ready — click Record" : "Screen shared — click Record");

      // Handle screen share "Stop sharing" browser button
      if (mode === "screen") {
        stream.getVideoTracks()[0].onended = () => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
          } else {
            cleanupRecording();
          }
        };
      }
    } catch (err: unknown) {
      console.error("[VideoEditor] Camera/screen error:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      const msg = mode === "webcam"
        ? `Camera access denied: ${errMsg}. Please allow camera access in browser settings.`
        : `Screen share denied: ${errMsg}`;
      setRecordMode(mode);
      setRecordError(msg);
      setShowRecordModal(true);
      showStatus(msg);
    }
  }, [showStatus, cleanupRecording]);

  const startActualRecording = useCallback(() => {
    if (!mediaStreamRef.current) return;

    try {
      // Determine a supported MIME type
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";

      const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType });
      mediaRecorderRef.current = recorder;
      recordChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(recordChunksRef.current, { type: "video/webm" });
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const fileName = `${recordMode}-recording-${timestamp}.webm`;
        const file = new File([blob], fileName, { type: "video/webm" });
        loadMediaFile(file);
        cleanupRecording();
        showStatus(`Recording saved: ${fileName}`);
      };

      recorder.start(250);
      setIsRecordingVideo(true);
      setRecordingElapsed(0);
      showStatus("Recording...");

      recordTimerRef.current = setInterval(() => {
        setRecordingElapsed((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("[VideoEditor] MediaRecorder error:", err);
      setRecordError("Failed to start recording. Your browser may not support WebM recording.");
      showStatus("Recording failed — browser may not support WebM");
    }
  }, [recordMode, loadMediaFile, showStatus, cleanupRecording]);

  // Format recording elapsed as MM:SS
  const formatRecordTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Cleanup recording timer on unmount
  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Sync video playback (with simulation fallback when no video loaded)
  useEffect(() => {
    if (!isPlaying) return;

    if (hasVideo && videoRef.current) {
      videoRef.current.currentTime = currentTime;
      videoRef.current.play().catch(() => {});
    } else {
      simTimeRef.current = currentTime;
    }

    const interval = setInterval(() => {
      if (hasVideo && videoRef.current && !videoRef.current.paused) {
        const t = videoRef.current.currentTime;
        setCurrentTime(t);
        setPlayheadPosition((t / totalDuration) * 100);
        if (t >= totalDuration) {
          setIsPlaying(false);
          setCurrentTime(0);
          setPlayheadPosition(0);
        }
      } else {
        simTimeRef.current += 0.05;
        if (simTimeRef.current >= totalDuration) {
          simTimeRef.current = 0;
          setIsPlaying(false);
          setCurrentTime(0);
          setPlayheadPosition(0);
          showStatus("Playback complete");
        } else {
          setCurrentTime(simTimeRef.current);
          setPlayheadPosition((simTimeRef.current / totalDuration) * 100);
        }
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

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      if (videoRef.current && !videoRef.current.paused) videoRef.current.pause();
      setIsPlaying(false);
      showStatus("Paused");
    } else {
      setIsPlaying(true);
      showStatus("Playing");
    }
  }, [isPlaying, showStatus]);

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

  // Timeline actions
  const addMarker = useCallback(() => {
    const m: Marker = {
      id: `mk-${Date.now()}`,
      position: playheadPosition,
      label: `M${markers.length + 1}`,
    };
    setMarkers((prev) => [...prev, m]);
    showStatus(`Marker added at ${formatTimecode(currentTime)}`);
  }, [playheadPosition, markers.length, currentTime, showStatus]);

  const splitClip = useCallback(() => {
    if (!selectedClipId) {
      showStatus("No clip selected");
      return;
    }
    const clip = timelineClips.find((c) => c.id === selectedClipId);
    if (!clip) return;

    const splitAt = playheadPosition;
    if (splitAt <= clip.start || splitAt >= clip.start + clip.width) {
      showStatus("Playhead must be over the selected clip to split");
      return;
    }

    const leftWidth = splitAt - clip.start;
    const rightWidth = clip.width - leftWidth;
    const leftClip = { ...clip, width: leftWidth };
    const rightClip: TimelineClip = {
      id: `${clip.id}-split-${Date.now()}`,
      name: `${clip.name}_R`,
      track: clip.track,
      start: splitAt,
      width: rightWidth,
      color: clip.color,
    };

    setTimelineClips((prev) =>
      prev.map((c) => (c.id === clip.id ? leftClip : c)).concat(rightClip)
    );
    showStatus(`Split "${clip.name}" at ${formatTimecode(currentTime)}`);
  }, [selectedClipId, playheadPosition, timelineClips, currentTime, showStatus]);

  const deleteClip = useCallback(() => {
    if (!selectedClipId) {
      showStatus("No clip selected");
      return;
    }
    const clip = timelineClips.find((c) => c.id === selectedClipId);
    if (!clip) return;
    setTimelineClips((prev) => prev.filter((c) => c.id !== selectedClipId));
    setSelectedClipId(null);
    showStatus(`Deleted "${clip.name}"`);
  }, [selectedClipId, timelineClips, showStatus]);

  // Add media item to timeline
  const addToTimeline = useCallback(
    (item: MediaItem) => {
      const track = item.type === "audio" ? "A1" : "V1";
      const existingOnTrack = timelineClips.filter((c) => c.track === track);
      const maxEnd = existingOnTrack.reduce((m, c) => Math.max(m, c.start + c.width), 0);
      const newClip: TimelineClip = {
        id: `tc-${Date.now()}`,
        name: item.name.replace(/\.\w+$/, ""),
        track,
        start: Math.min(maxEnd + 1, 90),
        width: 10,
        color: TRACK_COLORS[track] || "bg-gray-500/40",
      };
      setTimelineClips((prev) => [...prev, newClip]);
      setSelectedClipId(newClip.id);
      showStatus(`Added "${item.name}" to ${track}`);
    },
    [timelineClips, showStatus]
  );

  // Clear all mock / all data
  const clearAllMedia = useCallback(() => {
    setImportedMedia([]);
    setTimelineClips([]);
    setSelectedClipId(null);
    setMarkers([]);
    setAppliedEffects(new Set());
    showStatus("Cleared all media & timeline");
  }, [showStatus]);

  // Remove a single media item + its timeline clips
  const removeMediaItem = useCallback(
    (item: MediaItem) => {
      setImportedMedia((prev) => prev.filter((m) => m.id !== item.id));
      const clipName = item.name.replace(/\.\w+$/, "");
      setTimelineClips((prev) => prev.filter((c) => c.name !== clipName));
      if (selectedClipId) {
        const sel = timelineClips.find((c) => c.id === selectedClipId);
        if (sel && sel.name === clipName) setSelectedClipId(null);
      }
      showStatus(`Removed: ${item.name}`);
    },
    [selectedClipId, timelineClips, showStatus]
  );

  // Toggle effect
  const toggleEffect = useCallback(
    (effectId: string, effectName: string) => {
      setAppliedEffects((prev) => {
        const next = new Set(prev);
        if (next.has(effectId)) {
          next.delete(effectId);
          showStatus(`Removed: ${effectName}`);
        } else {
          next.add(effectId);
          showStatus(`Applied: ${effectName}`);
        }
        return next;
      });
    },
    [showStatus]
  );

  // Context menu actions
  const duplicateClip = useCallback(
    (clipId: string) => {
      const clip = timelineClips.find((c) => c.id === clipId);
      if (!clip) return;
      const newClip: TimelineClip = {
        ...clip,
        id: `tc-${Date.now()}`,
        name: `${clip.name}_copy`,
        start: Math.min(clip.start + clip.width + 1, 90),
      };
      setTimelineClips((prev) => [...prev, newClip]);
      setSelectedClipId(newClip.id);
      showStatus(`Duplicated "${clip.name}"`);
    },
    [timelineClips, showStatus]
  );

  const moveClipToTrack = useCallback(
    (clipId: string, newTrack: string) => {
      setTimelineClips((prev) =>
        prev.map((c) =>
          c.id === clipId
            ? { ...c, track: newTrack, color: TRACK_COLORS[newTrack] || "bg-gray-500/40" }
            : c
        )
      );
      const clip = timelineClips.find((c) => c.id === clipId);
      showStatus(`Moved "${clip?.name}" to ${newTrack}`);
    },
    [timelineClips, showStatus]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, clipId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedClipId(clipId);
      setContextMenu({ x: e.clientX, y: e.clientY, clipId });
    },
    []
  );

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener("click", handleClick);
      window.addEventListener("contextmenu", handleClick);
      return () => {
        window.removeEventListener("click", handleClick);
        window.removeEventListener("contextmenu", handleClick);
      };
    }
  }, [contextMenu]);

  // Settings: enumerate devices
  const enumerateDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) {
        showStatus("Device enumeration not supported");
        return;
      }
      // Must request permission first to get labels
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(() => null);
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      const audioDevices = devices.filter((d) => d.kind === "audioinput");
      setAvailableVideoDevices(videoDevices);
      setAvailableAudioDevices(audioDevices);
      if (!selectedVideoDevice && videoDevices.length > 0) setSelectedVideoDevice(videoDevices[0].deviceId);
      if (!selectedAudioDevice && audioDevices.length > 0) setSelectedAudioDevice(audioDevices[0].deviceId);
      if (tempStream) tempStream.getTracks().forEach((t) => t.stop());
    } catch (err) {
      console.error("[Settings] Device enumeration error:", err);
    }
  }, [selectedVideoDevice, selectedAudioDevice, showStatus]);

  // Settings: start preview
  const startSettingsPreview = useCallback(async (videoDeviceId?: string, audioDeviceId?: string) => {
    // Stop existing
    if (settingsPreviewStream) {
      settingsPreviewStream.getTracks().forEach((t) => t.stop());
    }
    if (audioAnimRef.current) cancelAnimationFrame(audioAnimRef.current);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: videoDeviceId ? { exact: videoDeviceId } : undefined, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: { deviceId: audioDeviceId ? { exact: audioDeviceId } : undefined },
      });
      setSettingsPreviewStream(stream);

      // Attach video
      setTimeout(() => {
        if (settingsPreviewRef.current) {
          settingsPreviewRef.current.srcObject = stream;
          settingsPreviewRef.current.play().catch(() => {});
        }
      }, 100);

      // Set up audio level meter
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioAnalyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioTestLevel(Math.round((avg / 255) * 100));
        audioAnimRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (err) {
      console.error("[Settings] Preview error:", err);
      showStatus("Could not access camera/mic — check permissions");
    }
  }, [settingsPreviewStream, showStatus]);

  // Settings: cleanup
  const closeSettings = useCallback(() => {
    if (settingsPreviewStream) {
      settingsPreviewStream.getTracks().forEach((t) => t.stop());
      setSettingsPreviewStream(null);
    }
    if (audioAnimRef.current) cancelAnimationFrame(audioAnimRef.current);
    setAudioTestLevel(0);
    setShowSettingsDialog(false);
  }, [settingsPreviewStream]);

  // Settings: open
  const openSettings = useCallback(async () => {
    setShowSettingsDialog(true);
    await enumerateDevices();
  }, [enumerateDevices]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (selectedClipId) {
          const clip = timelineClips.find((c) => c.id === selectedClipId);
          if (clip) {
            setTimelineClips((prev) => prev.filter((c) => c.id !== selectedClipId));
            setSelectedClipId(null);
            showStatus(`Deleted "${clip.name}"`);
          }
        }
      } else if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "s" || e.key === "S") {
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          splitClip();
        }
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        addMarker();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedClipId, timelineClips, showStatus, togglePlay, splitClip, addMarker]);

  const selectedClip = timelineClips.find((c) => c.id === selectedClipId);

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
    <div className="flex flex-col h-[calc(100vh-10rem)] -mx-4 sm:-mx-6 lg:-mx-8 -mt-8 overflow-hidden">
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
            onClick={() => { setShowLeftPanel(!showLeftPanel); showStatus(showLeftPanel ? "Left panel hidden" : "Left panel shown"); }}
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
            onClick={() => { setShowRightPanel(!showRightPanel); showStatus(showRightPanel ? "Right panel hidden" : "Right panel shown"); }}
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
            onClick={() => { setShowBottomPanel(!showBottomPanel); showStatus(showBottomPanel ? "Timeline hidden" : "Timeline shown"); }}
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
            onClick={openSettings}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
            title="Settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setShowShortcutsDialog(true)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
            title="Keyboard shortcuts"
          >
            <Keyboard className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => showStatus("Help: Use toolbar buttons to import, record, and edit. Keyboard: Space=Play, S=Split, Del=Delete, M=Marker")}
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

                  {/* Record Buttons — Prominent */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Record</p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); openRecordModal("webcam"); }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-[11px] font-semibold text-[#74ddc7] bg-[#74ddc7]/10 hover:bg-[#74ddc7]/20 border border-[#74ddc7]/30 hover:border-[#74ddc7]/50 transition-colors active:scale-[0.97]"
                      >
                        <Camera className="h-4 w-4" />
                        Webcam
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); openRecordModal("screen"); }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-[11px] font-semibold text-[#7401df] bg-[#7401df]/10 hover:bg-[#7401df]/20 border border-[#7401df]/30 hover:border-[#7401df]/50 transition-colors active:scale-[0.97]"
                      >
                        <Monitor className="h-4 w-4" />
                        Screen
                      </button>
                    </div>
                  </div>

                  {/* Media Items — clickable to add to timeline */}
                  {importedMedia.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground/50">
                      <p className="text-[10px]">No media yet</p>
                      <p className="text-[10px] mt-0.5">Import files or record to get started</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    {importedMedia.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-2 p-1.5 rounded-md cursor-pointer transition-colors group ${
                          activeMediaId === item.id
                            ? "bg-[#74ddc7]/10 ring-1 ring-[#74ddc7]/40"
                            : "hover:bg-foreground/[0.04]"
                        }`}
                        onClick={() => {
                          setActiveMediaId(item.id);
                          showStatus(`Selected: ${item.name} — double-click to add to timeline`);
                        }}
                        onDoubleClick={() => addToTimeline(item)}
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
                        <button
                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#74ddc7] hover:bg-[#74ddc7]/10 transition-all"
                          title="Add to timeline"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToTimeline(item);
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-red-400 transition-all"
                          title="Remove from media bin & timeline"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeMediaItem(item);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Clear All button */}
                  {importedMedia.length > 0 && (
                    <button
                      onClick={clearAllMedia}
                      className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] text-red-400 hover:bg-red-500/10 hover:text-red-300 border border-red-500/20 transition-colors active:scale-[0.98]"
                    >
                      <Trash2 className="h-3 w-3" />
                      Clear All Media & Timeline
                    </button>
                  )}
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
                              onClick={() => toggleEffect(effect.id, effect.name)}
                              className={`flex items-center gap-2 px-2 py-1 rounded text-[11px] cursor-pointer transition-colors ${
                                appliedEffects.has(effect.id)
                                  ? "bg-[#74ddc7]/15 text-[#74ddc7]"
                                  : "text-foreground/80 hover:bg-foreground/[0.04]"
                              }`}
                            >
                              {appliedEffects.has(effect.id) ? (
                                <Check className="h-3 w-3 text-[#74ddc7] shrink-0" />
                              ) : (
                                <Layers className="h-3 w-3 text-muted-foreground shrink-0" />
                              )}
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
            {/* Video Preview Area — ALWAYS clickable for play/pause */}
            <div
              className="flex-1 flex items-center justify-center relative cursor-pointer overflow-hidden min-h-0"
              onClick={!showRecordModal ? togglePlay : undefined}
            >
              <div className="relative w-full max-w-3xl max-h-full aspect-video bg-black/80 rounded-sm mx-4 flex items-center justify-center overflow-hidden">
                {/* Video element ALWAYS in DOM so ref is available for file loading */}
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                  ref={videoRef}
                  className={`absolute inset-0 w-full h-full object-contain ${hasVideo && !showRecordModal ? "z-[1]" : "hidden"}`}
                  playsInline
                />

                {/* Loading indicator */}
                {isLoadingMedia && !showRecordModal && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-[2] bg-black/60">
                    <Loader2 className="h-10 w-10 text-[#74ddc7] animate-spin mb-2" />
                    <p className="text-xs text-[#74ddc7]">Loading media...</p>
                  </div>
                )}

                {/* Recording overlay is rendered OUTSIDE this container — see below */}

                {/* Placeholder overlay — shown when no video loaded */}
                {!hasVideo && !showRecordModal && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-[#7401df]/20 via-black/60 to-[#74ddc7]/10 pointer-events-none" />
                    <div className="relative z-10 text-center" onClick={(e) => e.stopPropagation()}>
                      <Film className="h-10 w-10 text-white/20 mx-auto mb-3" />
                      <p className="text-sm font-medium text-white/60 mb-1">Get Started</p>
                      <p className="text-[11px] text-white/30 mb-5 max-w-xs mx-auto">
                        Import a file, record your webcam, or capture your screen
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileInputRef.current?.click(); }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors active:scale-95"
                        >
                          <ImagePlus className="h-3.5 w-3.5" />
                          Import File
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); openRecordModal("webcam"); }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-[#74ddc7] bg-[#74ddc7]/15 hover:bg-[#74ddc7]/25 border border-[#74ddc7]/30 transition-colors active:scale-95"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          Record Webcam
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); openRecordModal("screen"); }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-[#7401df] bg-[#7401df]/15 hover:bg-[#7401df]/25 border border-[#7401df]/30 transition-colors active:scale-95"
                        >
                          <Monitor className="h-3.5 w-3.5" />
                          Record Screen
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Timecode Overlay */}
                {!showRecordModal && (
                  <div className="absolute top-2 right-2 bg-black/70 px-2 py-0.5 rounded text-[10px] font-mono text-[#74ddc7]">
                    {formatTimecode(currentTime)}
                  </div>
                )}

                {/* Playing indicator */}
                {isPlaying && !showRecordModal && (
                  <div className="absolute top-2 left-2 bg-red-500/80 px-2 py-0.5 rounded text-[10px] font-mono text-white flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    PLAYING
                  </div>
                )}

                {/* Safe area guides */}
                {!showRecordModal && (
                  <div className="absolute inset-[5%] border border-foreground/[0.06] rounded-sm pointer-events-none" />
                )}
              </div>

              {/* ========= Recording Overlay — OUTSIDE the aspect-video overflow-hidden ========= */}
              {showRecordModal && (
                <div
                  className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Close / Cancel button */}
                  <button
                    onClick={cancelRecording}
                    className="absolute top-3 right-3 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors z-40"
                    title="Cancel recording"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  {/* Title */}
                  <div className="absolute top-3 left-3 flex items-center gap-2 z-40">
                    {recordMode === "webcam" ? (
                      <Camera className="h-4 w-4 text-[#74ddc7]" />
                    ) : (
                      <Monitor className="h-4 w-4 text-[#7401df]" />
                    )}
                    <span className="text-xs font-semibold text-white/70">
                      {recordMode === "webcam" ? "Webcam Recording" : "Screen Capture"}
                    </span>
                  </div>

                  {/* Error state */}
                  {recordError && (
                    <div className="text-center px-6">
                      <div className="h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                        <X className="h-8 w-8 text-red-400" />
                      </div>
                      <p className="text-sm text-red-300 mb-2 max-w-sm">{recordError}</p>
                      <div className="flex items-center justify-center gap-2 mt-4">
                        <button
                          onClick={() => openRecordModal(recordMode)}
                          className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
                        >
                          Try Again
                        </button>
                        <button
                          onClick={cancelRecording}
                          className="px-4 py-2 rounded-lg text-xs font-semibold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Loading state — waiting for camera permission */}
                  {!streamReady && !recordError && (
                    <div className="text-center">
                      <Loader2 className="h-12 w-12 text-[#74ddc7] animate-spin mx-auto mb-4" />
                      <p className="text-sm text-white/70 mb-1">
                        {recordMode === "webcam" ? "Requesting camera access..." : "Waiting for screen selection..."}
                      </p>
                      <p className="text-[11px] text-white/40">
                        {recordMode === "webcam"
                          ? "Please allow camera & microphone access in your browser"
                          : "Select a screen, window, or tab to capture"}
                      </p>
                    </div>
                  )}

                  {/* Camera/Screen preview + controls — shown when stream is ready */}
                  {streamReady && !recordError && (
                    <div className="flex flex-col items-center w-full max-w-2xl px-4">
                      {/* Live preview */}
                      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden mb-4 border border-white/10">
                        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                        <video
                          ref={recordPreviewRef}
                          autoPlay
                          muted
                          playsInline
                          className="w-full h-full object-contain"
                          style={recordMode === "webcam" ? { transform: "scaleX(-1)" } : undefined}
                        />
                        {/* Recording indicator */}
                        {isRecordingVideo && (
                          <div className="absolute top-2 left-2 flex items-center gap-2 bg-black/70 px-2.5 py-1 rounded-full">
                            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-xs font-mono text-red-400 font-semibold">
                              REC {formatRecordTime(recordingElapsed)}
                            </span>
                          </div>
                        )}
                        {/* Live badge when not recording */}
                        {!isRecordingVideo && (
                          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/70 px-2.5 py-1 rounded-full">
                            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs font-mono text-green-400">LIVE</span>
                          </div>
                        )}
                      </div>

                      {/* Recording controls */}
                      <div className="flex items-center gap-3">
                        {!isRecordingVideo ? (
                          <>
                            <button
                              onClick={startActualRecording}
                              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-500 transition-colors active:scale-95 shadow-lg shadow-red-600/30"
                            >
                              <Circle className="h-4 w-4 fill-white" />
                              Start Recording
                            </button>
                            <button
                              onClick={cancelRecording}
                              className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={stopRecording}
                              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-500 transition-colors active:scale-95 shadow-lg shadow-red-600/30 animate-pulse"
                            >
                              <StopCircle className="h-4 w-4" />
                              Stop &amp; Save
                            </button>
                            <button
                              onClick={cancelRecording}
                              className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Discard
                            </button>
                          </>
                        )}
                      </div>

                      {/* Tips */}
                      {!isRecordingVideo && (
                        <p className="text-[10px] text-white/30 mt-3 text-center">
                          {recordMode === "webcam"
                            ? "Your camera preview is mirrored — the recording will not be"
                            : "Click Stop & Save when finished to add the recording to your project"}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Transport Controls */}
            <div className="flex items-center justify-center gap-3 py-2 border-t border-border/50 bg-card/80 backdrop-blur-sm shrink-0 z-10 relative">
              <div className="flex items-center gap-1">
                <button
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors active:scale-90"
                  title="Previous frame"
                  onClick={() => {
                    const t = Math.max(0, currentTime - 1 / 30);
                    setCurrentTime(t);
                    simTimeRef.current = t;
                    if (videoRef.current) videoRef.current.currentTime = t;
                    setPlayheadPosition((t / totalDuration) * 100);
                    showStatus(`Frame: ${formatTimecode(t)}`);
                  }}
                >
                  <SkipBack className="h-3.5 w-3.5" />
                </button>
                <button
                  className={`p-2 rounded-lg transition-colors active:scale-95 ${
                    isPlaying
                      ? "bg-[#74ddc7]/20 text-[#74ddc7] hover:bg-[#74ddc7]/30"
                      : "bg-foreground/[0.08] text-foreground hover:bg-foreground/[0.12]"
                  }`}
                  title={isPlaying ? "Pause" : "Play"}
                  onClick={togglePlay}
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </button>
                <button
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors active:scale-90"
                  title="Next frame"
                  onClick={() => {
                    const t = Math.min(totalDuration, currentTime + 1 / 30);
                    setCurrentTime(t);
                    simTimeRef.current = t;
                    if (videoRef.current) videoRef.current.currentTime = t;
                    setPlayheadPosition((t / totalDuration) * 100);
                    showStatus(`Frame: ${formatTimecode(t)}`);
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
                    showStatus(newVol === 0 ? "Muted" : `Volume: ${newVol}%`);
                  }}
                  className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  title={volume === 0 ? "Unmute" : "Mute"}
                >
                  {volume === 0 ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
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
              style={{ height: "200px" }}
            >
              {/* Timeline Toolbar */}
              <div className="flex items-center justify-between px-2 py-1 border-b border-border shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    className="p-1 rounded text-muted-foreground hover:text-[#74ddc7] hover:bg-[#74ddc7]/10 transition-colors active:scale-90"
                    title="Add marker"
                    onClick={addMarker}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    className="p-1 rounded text-muted-foreground hover:text-[#74ddc7] hover:bg-[#74ddc7]/10 transition-colors active:scale-90"
                    title="Split clip at playhead"
                    onClick={splitClip}
                  >
                    <Scissors className="h-3 w-3" />
                  </button>
                  <button
                    className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors active:scale-90"
                    title="Delete selected clip"
                    onClick={deleteClip}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  {selectedClip && (
                    <span className="text-[10px] text-muted-foreground ml-2 bg-foreground/[0.04] px-1.5 py-0.5 rounded">
                      {selectedClip.name}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors active:scale-90"
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
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors active:scale-90"
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
                    simTimeRef.current = t;
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
                    {/* Markers on ruler */}
                    {markers.map((m) => (
                      <div
                        key={m.id}
                        className="absolute bottom-0 flex flex-col items-center z-10"
                        style={{ left: `${m.position}%` }}
                        title={`${m.label} — ${formatTimecode((m.position / 100) * totalDuration)}`}
                      >
                        <span className="text-[8px] text-amber-400 font-bold mb-0.5">
                          {m.label}
                        </span>
                        <div className="w-1.5 h-2 bg-amber-400 rounded-t" />
                      </div>
                    ))}
                  </div>

                  {/* Track Lanes */}
                  <div className="flex flex-col flex-1 relative" style={{ height: "calc(100% - 20px)" }}>
                    {TRACKS.map((track) => {
                      const trackClips = timelineClips.filter(
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
                                  ? "ring-1 ring-[#74ddc7] ring-offset-1 ring-offset-transparent brightness-125"
                                  : "hover:brightness-125"
                              }`}
                              style={{
                                left: `${clip.start}%`,
                                width: `${clip.width}%`,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedClipId(clip.id);
                                showStatus(`Selected: ${clip.name}`);
                              }}
                              onContextMenu={(e) => handleContextMenu(e, clip.id)}
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
                      <div className="absolute -top-[20px] left-1/2 -translate-x-1/2 w-2.5 h-3 bg-red-500" style={{
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

                    {/* Transform — EDITABLE */}
                    <div>
                      <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Transform
                      </h4>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">Position X</span>
                          <input
                            type="number"
                            value={clipPosX}
                            onChange={(e) => { setClipPosX(Number(e.target.value)); showStatus(`Position X: ${e.target.value}`); }}
                            className="w-16 text-right text-[11px] bg-foreground/[0.04] border border-border rounded px-1.5 py-0.5 text-foreground tabular-nums focus:border-[#74ddc7] focus:outline-none transition-colors"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">Position Y</span>
                          <input
                            type="number"
                            value={clipPosY}
                            onChange={(e) => { setClipPosY(Number(e.target.value)); showStatus(`Position Y: ${e.target.value}`); }}
                            className="w-16 text-right text-[11px] bg-foreground/[0.04] border border-border rounded px-1.5 py-0.5 text-foreground tabular-nums focus:border-[#74ddc7] focus:outline-none transition-colors"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">Scale</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="range"
                              min={10}
                              max={200}
                              value={clipScale}
                              onChange={(e) => setClipScale(Number(e.target.value))}
                              className="w-12 h-1 accent-[#74ddc7] cursor-pointer"
                            />
                            <span className="w-10 text-right text-[11px] text-foreground tabular-nums">{clipScale}%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">Rotation</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="range"
                              min={-180}
                              max={180}
                              value={clipRotation}
                              onChange={(e) => setClipRotation(Number(e.target.value))}
                              className="w-12 h-1 accent-[#7401df] cursor-pointer"
                            />
                            <span className="w-10 text-right text-[11px] text-foreground tabular-nums">{clipRotation.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Opacity — REAL slider */}
                    <div>
                      <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Opacity
                      </h4>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={clipOpacity}
                          onChange={(e) => setClipOpacity(Number(e.target.value))}
                          className="flex-1 h-1.5 accent-[#74ddc7] cursor-pointer"
                        />
                        <span className="text-[11px] text-muted-foreground tabular-nums w-8 text-right">
                          {clipOpacity}%
                        </span>
                      </div>
                    </div>

                    {/* Volume — REAL slider */}
                    <div>
                      <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Volume
                      </h4>
                      <div className="flex items-center gap-2">
                        <Volume2 className="h-3 w-3 text-muted-foreground shrink-0" />
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={clipVolume}
                          onChange={(e) => setClipVolume(Number(e.target.value))}
                          className="flex-1 h-1.5 accent-[#7401df] cursor-pointer"
                        />
                        <span className="text-[11px] text-muted-foreground tabular-nums w-10 text-right">
                          {clipVolume > 0 ? `-${Math.round((1 - clipVolume / 100) * 48)}` : "-∞"} dB
                        </span>
                      </div>
                    </div>

                    {/* Speed — EDITABLE */}
                    <div>
                      <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Speed
                      </h4>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">
                          Playback Rate
                        </span>
                        <select
                          value={playbackRate}
                          onChange={(e) => {
                            const rate = Number(e.target.value);
                            setPlaybackRate(rate);
                            if (videoRef.current) videoRef.current.playbackRate = rate;
                            showStatus(`Speed: ${rate}x`);
                          }}
                          className="w-16 text-right text-[11px] bg-foreground/[0.04] border border-border rounded px-1.5 py-0.5 text-foreground tabular-nums focus:border-[#74ddc7] focus:outline-none appearance-none cursor-pointer"
                        >
                          <option value={0.25}>0.25x</option>
                          <option value={0.5}>0.5x</option>
                          <option value={0.75}>0.75x</option>
                          <option value={1.0}>1.0x</option>
                          <option value={1.25}>1.25x</option>
                          <option value={1.5}>1.5x</option>
                          <option value={2.0}>2.0x</option>
                        </select>
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
                /* Text Tab — FULLY INTERACTIVE */
                <div className="space-y-4">
                  {/* Add Text */}
                  <button
                    onClick={() => showStatus("Text layer added (visual only in beta)")}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:text-[#74ddc7] hover:border-[#74ddc7]/40 transition-colors active:scale-[0.98]"
                  >
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
                        <select
                          value={textFont}
                          onChange={(e) => { setTextFont(e.target.value); showStatus(`Font: ${e.target.value}`); }}
                          className="flex-1 text-[11px] bg-foreground/[0.04] border border-border rounded px-1.5 py-1 text-foreground appearance-none cursor-pointer focus:border-[#74ddc7] focus:outline-none"
                        >
                          <option>Inter</option>
                          <option>Roboto</option>
                          <option>Montserrat</option>
                          <option>Open Sans</option>
                        </select>
                        <input
                          type="number"
                          value={textSize}
                          onChange={(e) => setTextSize(Number(e.target.value))}
                          min={8}
                          max={200}
                          className="w-12 text-center text-[11px] bg-foreground/[0.04] border border-border rounded px-1 py-1 text-foreground tabular-nums focus:border-[#74ddc7] focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <select
                          value={textWeight}
                          onChange={(e) => { setTextWeight(e.target.value); showStatus(`Weight: ${e.target.value}`); }}
                          className="flex-1 text-[11px] bg-foreground/[0.04] border border-border rounded px-1.5 py-1 text-foreground appearance-none cursor-pointer focus:border-[#74ddc7] focus:outline-none"
                        >
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
                      <div
                        className="h-6 w-6 rounded border border-border"
                        style={{ backgroundColor: textColor }}
                      />
                      <input
                        type="text"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="flex-1 text-[11px] bg-foreground/[0.04] border border-border rounded px-1.5 py-1 text-foreground font-mono focus:border-[#74ddc7] focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-1 mt-1.5">
                      {["#FFFFFF", "#74ddc7", "#7401df", "#FF6B6B", "#FFD93D", "#000000"].map(
                        (color) => (
                          <button
                            key={color}
                            onClick={() => { setTextColor(color); showStatus(`Color: ${color}`); }}
                            className={`h-5 w-5 rounded border transition-all ${
                              textColor === color
                                ? "border-[#74ddc7] ring-1 ring-[#74ddc7] scale-110"
                                : "border-border hover:ring-1 hover:ring-[#74ddc7]"
                            }`}
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
                          onClick={() => { setTextAlign(align); showStatus(`Align: ${align}`); }}
                          className={`flex-1 px-2 py-1 rounded text-[10px] transition-colors ${
                            textAlign === align
                              ? "bg-[#74ddc7]/20 text-[#74ddc7] font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
                          }`}
                        >
                          {align}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Background Toggle */}
                  <div>
                    <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Background
                    </h4>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        Enable Background
                      </span>
                      <button
                        onClick={() => {
                          setTextBgEnabled(!textBgEnabled);
                          showStatus(textBgEnabled ? "Text background off" : "Text background on");
                        }}
                        className={`h-5 w-9 rounded-full relative transition-colors ${
                          textBgEnabled ? "bg-[#74ddc7]" : "bg-foreground/[0.12]"
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            textBgEnabled ? "translate-x-4" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* Status Bar — DYNAMIC                                              */}
      {/* ================================================================= */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-border bg-card/80 text-[10px] text-muted-foreground shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${isPlaying ? "bg-red-500 animate-pulse" : "bg-green-500"}`} />
            {statusMsg}
          </span>
          <span>1920 x 1080</span>
          <span>30 fps</span>
          <span>H.264 / AAC</span>
        </div>
        <div className="flex items-center gap-3">
          <span>
            Duration: {Math.floor(totalDuration / 60)}:{String(Math.floor(totalDuration % 60)).padStart(2, "0")}
          </span>
          <span>{timelineClips.length} clips</span>
          <span>{appliedEffects.size > 0 ? `${appliedEffects.size} effects` : "No effects"}</span>
          <span className="text-muted-foreground/60">v1.0.0-beta</span>
        </div>
      </div>

      {/* ================================================================= */}
      {/* Context Menu (right-click on timeline clips)                      */}
      {/* ================================================================= */}
      {contextMenu && (() => {
        const ctxClip = timelineClips.find((c) => c.id === contextMenu.clipId);
        if (!ctxClip) return null;
        const otherTracks = TRACKS.filter((t) => t !== ctxClip.track);
        return (
          <div
            className="fixed z-[100] min-w-[180px] py-1 rounded-lg border border-border bg-card shadow-2xl backdrop-blur-sm"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border mb-1">
              {ctxClip.name}
            </div>
            <button
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-foreground/[0.06] transition-colors"
              onClick={() => { splitClip(); setContextMenu(null); }}
            >
              <Scissors className="h-3 w-3 text-[#74ddc7]" />
              Split at Playhead
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-foreground/[0.06] transition-colors"
              onClick={() => { duplicateClip(contextMenu.clipId); setContextMenu(null); }}
            >
              <Copy className="h-3 w-3 text-[#7401df]" />
              Duplicate
            </button>
            <div className="h-px bg-border my-1" />
            <div className="px-3 py-1 text-[10px] text-muted-foreground/60 uppercase tracking-wider">
              Move to Track
            </div>
            {otherTracks.map((track) => (
              <button
                key={track}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-foreground/[0.06] transition-colors"
                onClick={() => { moveClipToTrack(contextMenu.clipId, track); setContextMenu(null); }}
              >
                <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                {track}
              </button>
            ))}
            <div className="h-px bg-border my-1" />
            <button
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-foreground/[0.06] transition-colors"
              onClick={() => {
                setTimelineClips((prev) => prev.map((c) =>
                  c.id === contextMenu.clipId ? { ...c, start: 0 } : c
                ));
                showStatus(`"${ctxClip.name}" snapped to start`);
                setContextMenu(null);
              }}
            >
              <SkipBack className="h-3 w-3 text-muted-foreground" />
              Snap to Start
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
              onClick={() => {
                setTimelineClips((prev) => prev.filter((c) => c.id !== contextMenu.clipId));
                if (selectedClipId === contextMenu.clipId) setSelectedClipId(null);
                showStatus(`Deleted "${ctxClip.name}"`);
                setContextMenu(null);
              }}
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          </div>
        );
      })()}

      {/* ================================================================= */}
      {/* Settings Dialog                                                    */}
      {/* ================================================================= */}
      {showSettingsDialog && (
        <>
          <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" onClick={closeSettings} />
          <div className="fixed inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 top-[10%] bottom-[10%] sm:w-[520px] z-[90] flex flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Settings className="h-4 w-4 text-[#74ddc7]" />
                Settings — Camera &amp; Audio
              </h2>
              <button
                onClick={closeSettings}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Camera Selection */}
              <div>
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5 mb-2">
                  <Video className="h-3.5 w-3.5 text-[#74ddc7]" />
                  Camera
                </label>
                <select
                  value={selectedVideoDevice}
                  onChange={(e) => {
                    setSelectedVideoDevice(e.target.value);
                    if (settingsPreviewStream) startSettingsPreview(e.target.value, selectedAudioDevice);
                  }}
                  className="w-full text-xs bg-foreground/[0.04] border border-border rounded-lg px-3 py-2 text-foreground appearance-none cursor-pointer focus:border-[#74ddc7] focus:outline-none transition-colors"
                >
                  {availableVideoDevices.length === 0 && <option value="">No cameras found</option>}
                  {availableVideoDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${availableVideoDevices.indexOf(d) + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Camera Preview */}
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-border">
                {settingsPreviewStream ? (
                  <>
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video
                      ref={settingsPreviewRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-contain"
                      style={{ transform: "scaleX(-1)" }}
                    />
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/70 px-2 py-0.5 rounded-full">
                      <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[10px] font-mono text-green-400">PREVIEW</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Camera className="h-8 w-8 text-white/15 mb-2" />
                    <p className="text-[11px] text-white/40">Click &quot;Start Preview&quot; to test</p>
                  </div>
                )}
              </div>

              {/* Audio Input Selection */}
              <div>
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5 mb-2">
                  <Mic className="h-3.5 w-3.5 text-[#7401df]" />
                  Microphone
                </label>
                <select
                  value={selectedAudioDevice}
                  onChange={(e) => {
                    setSelectedAudioDevice(e.target.value);
                    if (settingsPreviewStream) startSettingsPreview(selectedVideoDevice, e.target.value);
                  }}
                  className="w-full text-xs bg-foreground/[0.04] border border-border rounded-lg px-3 py-2 text-foreground appearance-none cursor-pointer focus:border-[#74ddc7] focus:outline-none transition-colors"
                >
                  {availableAudioDevices.length === 0 && <option value="">No microphones found</option>}
                  {availableAudioDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Microphone ${availableAudioDevices.indexOf(d) + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Audio Level Meter */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Audio Level</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{audioTestLevel}%</span>
                </div>
                <div className="h-3 bg-foreground/[0.06] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-75 ${
                      audioTestLevel > 80 ? "bg-red-500" : audioTestLevel > 50 ? "bg-amber-500" : "bg-[#74ddc7]"
                    }`}
                    style={{ width: `${audioTestLevel}%` }}
                  />
                </div>
                {settingsPreviewStream && (
                  <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                    Speak into your microphone to test audio levels
                  </p>
                )}
              </div>

              {/* Refresh + Preview buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => startSettingsPreview(selectedVideoDevice, selectedAudioDevice)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-[#74ddc7] bg-[#74ddc7]/10 hover:bg-[#74ddc7]/20 border border-[#74ddc7]/30 transition-colors active:scale-[0.97]"
                >
                  <Camera className="h-3.5 w-3.5" />
                  {settingsPreviewStream ? "Refresh Preview" : "Start Preview"}
                </button>
                <button
                  onClick={async () => { await enumerateDevices(); showStatus("Devices refreshed"); }}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground bg-foreground/[0.04] hover:bg-foreground/[0.08] border border-border transition-colors active:scale-[0.97]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh Devices
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border shrink-0">
              <button
                onClick={closeSettings}
                className="px-4 py-2 rounded-lg text-xs font-medium text-foreground bg-foreground/[0.06] hover:bg-foreground/[0.1] transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}

      {/* ================================================================= */}
      {/* Keyboard Shortcuts Dialog                                         */}
      {/* ================================================================= */}
      {showShortcutsDialog && (
        <>
          <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" onClick={() => setShowShortcutsDialog(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] z-[90] rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Keyboard className="h-4 w-4 text-[#74ddc7]" />
                Keyboard Shortcuts
              </h2>
              <button
                onClick={() => setShowShortcutsDialog(false)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-2">
              {[
                ["Space", "Play / Pause"],
                ["S", "Split clip at playhead"],
                ["Delete / Backspace", "Delete selected clip"],
                ["M", "Add marker at playhead"],
                ["Scroll", "Zoom timeline (with cursor)"],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-muted-foreground">{desc}</span>
                  <kbd className="px-2 py-0.5 rounded bg-foreground/[0.06] text-[11px] font-mono text-foreground border border-border">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end px-5 py-3 border-t border-border">
              <button
                onClick={() => setShowShortcutsDialog(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-foreground bg-foreground/[0.06] hover:bg-foreground/[0.1] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
