"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  Volume2,
  VolumeX,
  Phone,
  Settings,
  Circle,
  Users,
  MessageSquare,
  Eye,
  MoreHorizontal,
  Shield,
  UserPlus,
  Copy,
  Check,
  ChevronDown,
  LayoutGrid,
  Columns2,
  Square,
  Grid2x2,
  Rows2,
  Film,
  Camera,
  Download,
  Maximize2,
  Minimize2,
  Radio,
  Clock,
  HardDrive,
  X,
  Send,
  MousePointer2,
  Scissors,
  ArrowLeftRight,
  MoveHorizontal,
  Repeat,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Minus,
  Plus,
  Lock,
  Unlock,
  PanelBottomOpen,
  PanelBottomClose,
} from "lucide-react";
import { LoginRequired } from "@/components/auth/login-required";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Participant {
  id: string;
  name: string;
  role: "host" | "guest";
  isRecording: boolean;
  resolution: string;
  device: string;
  bandwidth: string;
  audioLevel: number;
  isMuted: boolean;
  hasVideo: boolean;
  fileSize?: string;
  totalSize?: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
}

type LayoutPreset =
  | "single"
  | "side-by-side"
  | "highlight-right"
  | "grid-2x2"
  | "top-bottom"
  | "pip";
type SidebarTab = "studio" | "chat" | "participants";

type TimelineTool = "select" | "razor" | "trim" | "slip";

interface TimelineClip {
  id: string;
  trackId: string;
  startTime: number;
  duration: number;
  label: string;
  color: string;
  waveform: number[];
}

interface TimelineTrack {
  id: string;
  label: string;
  color: string;
  muted: boolean;
  solo: boolean;
  locked: boolean;
  height: number;
}

// ---------------------------------------------------------------------------
// Timeline constants
// ---------------------------------------------------------------------------

const PIXELS_PER_SECOND = 40;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const TRACK_HEADER_WIDTH = 144; // w-36
const MIN_CLIP_DURATION = 0.1;

const TOOL_INFO: { key: TimelineTool; icon: typeof MousePointer2; label: string; shortcut: string }[] = [
  { key: "select", icon: MousePointer2, label: "Select", shortcut: "V" },
  { key: "razor", icon: Scissors, label: "Razor", shortcut: "C" },
  { key: "trim", icon: ArrowLeftRight, label: "Trim", shortcut: "T" },
  { key: "slip", icon: MoveHorizontal, label: "Slip", shortcut: "Y" },
];

const TRACK_COLORS = ["#74ddc7", "#a855f7", "#3b82f6", "#f59e0b", "#ef4444", "#22c55e"];

// ---------------------------------------------------------------------------
// Generate synthetic waveform peaks
// ---------------------------------------------------------------------------

function generateWaveformPeaks(duration: number, numSamples = 200): number[] {
  const peaks: number[] = [];
  for (let i = 0; i < numSamples; i++) {
    const t = i / numSamples;
    // Natural-looking waveform with multiple frequencies
    const v =
      0.3 +
      0.25 * Math.sin(t * 47) +
      0.15 * Math.sin(t * 123 + 1.2) +
      0.1 * Math.sin(t * 271 + 0.5) +
      0.08 * Math.cos(t * 67 + 2.1);
    peaks.push(Math.max(0.05, Math.min(1, Math.abs(v))));
  }
  return peaks;
}

// ---------------------------------------------------------------------------
// Layout preset icons
// ---------------------------------------------------------------------------

function LayoutIcon({
  preset,
  active,
}: {
  preset: LayoutPreset;
  active: boolean;
}) {
  const cls = `h-full w-full rounded-sm ${
    active
      ? "border-2 border-[#7401df] bg-[#7401df]/10"
      : "border border-zinc-600 bg-zinc-800 hover:border-zinc-500"
  }`;

  switch (preset) {
    case "single":
      return (
        <div className={cls}>
          <div className="h-full w-full bg-zinc-600/30 rounded-sm" />
        </div>
      );
    case "side-by-side":
      return (
        <div className={`${cls} flex gap-[2px] p-[2px]`}>
          <div className="flex-1 bg-zinc-600/30 rounded-[1px]" />
          <div className="flex-1 bg-zinc-600/30 rounded-[1px]" />
        </div>
      );
    case "highlight-right":
      return (
        <div className={`${cls} flex gap-[2px] p-[2px]`}>
          <div className="flex-[2] bg-zinc-600/30 rounded-[1px]" />
          <div className="flex-1 bg-zinc-600/30 rounded-[1px]" />
        </div>
      );
    case "grid-2x2":
      return (
        <div className={`${cls} grid grid-cols-2 grid-rows-2 gap-[2px] p-[2px]`}>
          <div className="bg-zinc-600/30 rounded-[1px]" />
          <div className="bg-zinc-600/30 rounded-[1px]" />
          <div className="bg-zinc-600/30 rounded-[1px]" />
          <div className="bg-zinc-600/30 rounded-[1px]" />
        </div>
      );
    case "top-bottom":
      return (
        <div className={`${cls} flex flex-col gap-[2px] p-[2px]`}>
          <div className="flex-1 bg-zinc-600/30 rounded-[1px]" />
          <div className="flex-1 bg-zinc-600/30 rounded-[1px]" />
        </div>
      );
    case "pip":
      return (
        <div className={`${cls} relative p-[2px]`}>
          <div className="h-full w-full bg-zinc-600/30 rounded-[1px]" />
          <div className="absolute bottom-[3px] right-[3px] w-[35%] h-[35%] bg-zinc-500/40 rounded-[1px] border border-zinc-500/50" />
        </div>
      );
  }
}

// ---------------------------------------------------------------------------
// Audio level bar
// ---------------------------------------------------------------------------

function AudioLevelBar({ level }: { level: number }) {
  const segments = 20;
  return (
    <div className="flex gap-[1.5px] h-[6px] items-end">
      {Array.from({ length: segments }).map((_, i) => {
        const threshold = (i + 1) / segments;
        const active = level >= threshold;
        let color = "bg-green-500";
        if (i >= segments * 0.75) color = "bg-red-500";
        else if (i >= segments * 0.5) color = "bg-yellow-500";
        return (
          <div
            key={i}
            className={`w-[3px] h-[6px] rounded-[0.5px] transition-colors ${
              active ? color : "bg-zinc-700"
            }`}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Video tile
// ---------------------------------------------------------------------------

function VideoTile({
  participant,
  streamRef,
  isLocal,
  large,
}: {
  participant: Participant;
  streamRef?: React.RefObject<MediaStream | null>;
  isLocal?: boolean;
  large?: boolean;
}) {
  const hasStream = isLocal && streamRef;
  // Callback ref ensures srcObject is always set when the video element is (re)created
  const videoCallbackRef = useCallback(
    (el: HTMLVideoElement | null) => {
      if (el && streamRef?.current) {
        el.srcObject = streamRef.current;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [streamRef?.current]
  );

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-800 group">
      {hasStream ? (
        /* eslint-disable-next-line jsx-a11y/media-has-caption */
        <video
          ref={videoCallbackRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : participant.hasVideo ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`rounded-full bg-gradient-to-br from-[#7401df]/30 to-[#74ddc7]/30 flex items-center justify-center ${
              large
                ? "h-28 w-28 text-4xl"
                : "h-16 w-16 text-2xl"
            }`}
          >
            <span className="font-bold text-white/80">
              {participant.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`rounded-full bg-zinc-700 flex items-center justify-center ${
              large ? "h-28 w-28 text-4xl" : "h-16 w-16 text-2xl"
            }`}
          >
            <span className="font-bold text-zinc-400">
              {participant.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Name label */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <span className="bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-lg flex items-center gap-1.5">
          {participant.name}
          {participant.isRecording && (
            <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
          )}
        </span>
      </div>

      {/* Muted indicator */}
      {participant.isMuted && (
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm p-1.5 rounded-lg">
          <MicOff className="h-3.5 w-3.5 text-red-400" />
        </div>
      )}

      {/* Recording badge */}
      {participant.isRecording && (
        <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg">
          <Circle className="h-2 w-2 fill-red-500 text-red-500 animate-pulse" />
          <span className="text-[10px] font-bold text-red-400 tracking-wide">
            REC
          </span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatTime(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":");
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

// ---------------------------------------------------------------------------
// MIME type detection
// ---------------------------------------------------------------------------

function getSupportedMimeType(includeVideo = false): string {
  if (includeVideo) {
    const videoTypes = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];
    for (const type of videoTypes) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) return type;
    }
  }
  const audioTypes = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const type of audioTypes) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

// ---------------------------------------------------------------------------
// Main Studio Content
// ---------------------------------------------------------------------------

function PodcastStudioContent() {
  // ------ State ------
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("studio");
  const [showSidebar, setShowSidebar] = useState(true);
  const [layout, setLayout] = useState<LayoutPreset>("side-by-side");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Audio/Video controls
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [liveViewers, setLiveViewers] = useState(0);

  // Camera
  const [hasCamera, setHasCamera] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  // Recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordingBytes, setRecordingBytes] = useState(0);

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: "1", sender: "System", text: "Studio session started. Welcome!", time: "now" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Invite link
  const [copied, setCopied] = useState(false);

  // Episode
  const [episodeName, setEpisodeName] = useState("Untitled Episode");
  const [editingName, setEditingName] = useState(false);

  // Timeline
  const [showTimeline, setShowTimeline] = useState(false);
  const [timelineTool, setTimelineTool] = useState<TimelineTool>("select");
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [timelineTracks, setTimelineTracks] = useState<TimelineTrack[]>([]);
  const [timelineClips, setTimelineClips] = useState<TimelineClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [timelinePlayhead, setTimelinePlayhead] = useState(0);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);
  const [razorPreviewX, setRazorPreviewX] = useState<number | null>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const lastRecordingDuration = useRef(0);

  // Settings & Devices
  const [showSettings, setShowSettings] = useState(false);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState("");
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState("");
  const [recordVideoEnabled, setRecordVideoEnabled] = useState(true);
  const recordingTimeRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // ------ Participants ------
  const [participants, setParticipants] = useState<Participant[]>([
    {
      id: "host",
      name: "You",
      role: "host",
      isRecording: false,
      resolution: "1080p",
      device: "Default Microphone",
      bandwidth: "2.4 mbps",
      audioLevel: 0,
      isMuted: false,
      hasVideo: true,
      fileSize: "0",
      totalSize: "0",
    },
  ]);

  // ------ Device enumeration ------
  const enumerateDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioDevices(devices.filter((d) => d.kind === "audioinput"));
      setVideoDevices(devices.filter((d) => d.kind === "videoinput"));
    } catch {
      /* ignore */
    }
  }, []);

  // ------ Camera init ------
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) return;
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setHasCamera(true);

        // Get device info and set initial IDs
        const audioTrack = stream.getAudioTracks()[0];
        const videoTrack = stream.getVideoTracks()[0];
        if (audioTrack) {
          setSelectedAudioDeviceId(audioTrack.getSettings().deviceId || "");
          setParticipants((prev) =>
            prev.map((p) =>
              p.id === "host"
                ? { ...p, device: audioTrack.label || "Default Microphone" }
                : p
            )
          );
        }
        if (videoTrack) {
          setSelectedVideoDeviceId(videoTrack.getSettings().deviceId || "");
        }

        // Enumerate after permission granted (labels now available)
        await enumerateDevices();
      } catch {
        console.warn("[PodcastStudio] Camera/mic not available");
        // Still try to enumerate (may have partial permissions)
        await enumerateDevices();
      }
    }

    startCamera();

    // Listen for device changes
    const handler = () => enumerateDevices();
    navigator.mediaDevices?.addEventListener("devicechange", handler);

    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      navigator.mediaDevices?.removeEventListener("devicechange", handler);
    };
  }, [enumerateDevices]);

  // ------ Mic toggle ------
  useEffect(() => {
    if (!streamRef.current) return;
    streamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = micEnabled;
    });
    setParticipants((prev) =>
      prev.map((p) => (p.id === "host" ? { ...p, isMuted: !micEnabled } : p))
    );
  }, [micEnabled]);

  // ------ Camera toggle ------
  useEffect(() => {
    if (!streamRef.current) return;
    streamRef.current.getVideoTracks().forEach((t) => {
      t.enabled = cameraEnabled;
    });
    setParticipants((prev) =>
      prev.map((p) => (p.id === "host" ? { ...p, hasVideo: cameraEnabled } : p))
    );
  }, [cameraEnabled]);

  // ------ Audio level monitoring ------
  useEffect(() => {
    let rafId = 0;
    let ctx: AudioContext | null = null;

    if (streamRef.current && micEnabled) {
      try {
        ctx = new AudioContext();
        audioContextRef.current = ctx;
        const source = ctx.createMediaStreamSource(streamRef.current);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          const avg = sum / data.length / 255;
          setParticipants((prev) =>
            prev.map((p) =>
              p.id === "host" ? { ...p, audioLevel: Math.min(1, avg * 3) } : p
            )
          );
          rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
      } catch {
        /* ignore */
      }
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (ctx && ctx.state !== "closed") {
        ctx.close().catch(() => {});
      }
      audioContextRef.current = null;
    };
  }, [micEnabled, hasCamera]);

  // ------ Recording timer ------
  useEffect(() => {
    if (!isRecording) return;
    const iv = setInterval(() => {
      setRecordingTime((p) => {
        const next = p + 1;
        recordingTimeRef.current = next;
        return next;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [isRecording]);

  // ------ Live viewer simulation ------
  useEffect(() => {
    if (!isLive) {
      setLiveViewers(0);
      return;
    }
    setLiveViewers(Math.floor(5 + Math.random() * 20));
    const iv = setInterval(() => {
      setLiveViewers((p) =>
        Math.max(1, p + Math.floor(Math.random() * 7) - 3)
      );
    }, 5000);
    return () => clearInterval(iv);
  }, [isLive]);

  // ------ Scroll chat ------
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ------ Recording bytes tracker ------
  useEffect(() => {
    if (!isRecording) return;
    const iv = setInterval(() => {
      setRecordingBytes((p) => p + Math.floor(30000 + Math.random() * 20000));
    }, 1000);
    return () => clearInterval(iv);
  }, [isRecording]);

  // ------ Handlers ------

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      // Stop
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.requestData();
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === "host" ? { ...p, isRecording: false } : p
        )
      );

      // Auto-create timeline clip from recording (use ref to avoid stale closure)
      const dur = recordingTimeRef.current;
      lastRecordingDuration.current = dur;
      if (dur > 0) {
        const trackId = "track-host";
        const existingTrack = timelineTracks.find((t) => t.id === trackId);
        if (!existingTrack) {
          setTimelineTracks((prev) => [
            ...prev,
            {
              id: trackId,
              label: "You (Host)",
              color: TRACK_COLORS[0],
              muted: false,
              solo: false,
              locked: false,
              height: 48,
            },
          ]);
        }
        // Place clip after any existing clips on this track
        const existingClips = timelineClips.filter((c) => c.trackId === trackId);
        const maxEnd = existingClips.reduce(
          (acc, c) => Math.max(acc, c.startTime + c.duration),
          0
        );
        setTimelineClips((prev) => [
          ...prev,
          {
            id: `clip-${Date.now()}`,
            trackId,
            startTime: maxEnd,
            duration: dur,
            label: `Take ${existingClips.length + 1}`,
            color: TRACK_COLORS[0],
            waveform: generateWaveformPeaks(dur),
          },
        ]);
        setShowTimeline(true);
        setTimelinePlayhead(0);
      }
    } else {
      // Start
      try {
        setRecordedUrl(null);
        setRecordingBytes(0);
        setRecordingTime(0);
        recordingTimeRef.current = 0;

        let stream = streamRef.current;
        if (!stream) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = stream;
        }

        // Use video MIME when camera is available and video recording is enabled
        const hasVideoTracks = stream.getVideoTracks().length > 0 && cameraEnabled && recordVideoEnabled;
        const mimeType = getSupportedMimeType(hasVideoTracks);
        const options: MediaRecorderOptions = {};
        if (mimeType) options.mimeType = mimeType;

        const recorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          if (chunksRef.current.length === 0) return;
          const blob = new Blob(chunksRef.current, {
            type: mimeType || "audio/webm",
          });
          const url = URL.createObjectURL(blob);
          setRecordedUrl(url);
          setRecordingBytes(blob.size);
        };

        recorder.start(1000);
        setIsRecording(true);
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === "host"
              ? {
                  ...p,
                  isRecording: true,
                  fileSize: "0",
                  totalSize: "0",
                }
              : p
          )
        );
      } catch (err) {
        console.error("[PodcastStudio] Recording failed:", err);
      }
    }
  }, [isRecording]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleCopyLink = () => {
    const link =
      typeof window !== "undefined"
        ? `${window.location.origin}/studio/podcast?join=true`
        : "";
    navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "You",
        text: chatInput.trim(),
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
    setChatInput("");
  };

  // ------ Device switching ------
  const switchDevices = useCallback(
    async (audioId?: string, videoId?: string) => {
      try {
        // Don't switch devices while recording
        if (isRecording) return;

        // Stop current stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        // Close existing AudioContext to prevent resource leak
        if (audioContextRef.current && audioContextRef.current.state !== "closed") {
          audioContextRef.current.close().catch(() => {});
          audioContextRef.current = null;
        }

        const constraints: MediaStreamConstraints = {
          audio: audioId ? { deviceId: { exact: audioId } } : true,
          video: videoId
            ? { deviceId: { exact: videoId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        setHasCamera(true);

        // Update device info
        const audioTrack = stream.getAudioTracks()[0];
        const videoTrack = stream.getVideoTracks()[0];
        if (audioTrack) {
          const devId = audioTrack.getSettings().deviceId || "";
          setSelectedAudioDeviceId(devId);
          setParticipants((prev) =>
            prev.map((p) =>
              p.id === "host"
                ? { ...p, device: audioTrack.label || "Default Microphone" }
                : p
            )
          );
        }
        if (videoTrack) {
          setSelectedVideoDeviceId(videoTrack.getSettings().deviceId || "");
        }
      } catch (err) {
        console.error("[PodcastStudio] Device switch failed:", err);
      }
    },
    [isRecording]
  );

  // ------ Timeline handlers ------

  const timelineDuration = useCallback(() => {
    if (timelineClips.length === 0) return 30; // default 30s view
    const maxEnd = timelineClips.reduce(
      (acc, c) => Math.max(acc, c.startTime + c.duration),
      0
    );
    return Math.max(30, maxEnd + 5); // pad 5s after last clip
  }, [timelineClips]);

  const pxPerSec = PIXELS_PER_SECOND * timelineZoom;
  const totalTimelineWidth = timelineDuration() * pxPerSec;

  const timeFromX = useCallback(
    (clientX: number) => {
      const container = timelineScrollRef.current;
      if (!container) return 0;
      const rect = container.getBoundingClientRect();
      const scrollLeft = container.scrollLeft;
      const x = clientX - rect.left + scrollLeft;
      return Math.max(0, x / pxPerSec);
    },
    [pxPerSec]
  );

  const handleRazorSplit = useCallback(
    (clipId: string, splitTime: number) => {
      setTimelineClips((prev) => {
        const clip = prev.find((c) => c.id === clipId);
        if (!clip) return prev;
        const relativeTime = splitTime - clip.startTime;
        if (relativeTime <= MIN_CLIP_DURATION || relativeTime >= clip.duration - MIN_CLIP_DURATION)
          return prev;

        const splitRatio = relativeTime / clip.duration;
        const waveformSplit = Math.floor(clip.waveform.length * splitRatio);

        const leftClip: TimelineClip = {
          ...clip,
          id: `clip-${Date.now()}-L`,
          duration: relativeTime,
          waveform: clip.waveform.slice(0, waveformSplit),
        };
        const rightClip: TimelineClip = {
          ...clip,
          id: `clip-${Date.now()}-R`,
          startTime: splitTime,
          duration: clip.duration - relativeTime,
          label: `${clip.label} (R)`,
          waveform: clip.waveform.slice(waveformSplit),
        };
        return prev.filter((c) => c.id !== clipId).concat([leftClip, rightClip]);
      });
    },
    []
  );

  const handleDeleteClip = useCallback(() => {
    if (!selectedClipId) return;
    setTimelineClips((prev) => prev.filter((c) => c.id !== selectedClipId));
    setSelectedClipId(null);
  }, [selectedClipId]);

  const handleTrimClip = useCallback(
    (clipId: string, edge: "left" | "right", deltaSeconds: number) => {
      setTimelineClips((prev) =>
        prev.map((c) => {
          if (c.id !== clipId) return c;
          if (edge === "left") {
            const newStart = Math.max(0, c.startTime + deltaSeconds);
            const newDuration = c.duration - (newStart - c.startTime);
            if (newDuration < MIN_CLIP_DURATION) return c;
            return { ...c, startTime: newStart, duration: newDuration };
          } else {
            const newDuration = Math.max(MIN_CLIP_DURATION, c.duration + deltaSeconds);
            return { ...c, duration: newDuration };
          }
        })
      );
    },
    []
  );

  // Timeline playback
  useEffect(() => {
    if (!isTimelinePlaying) return;
    const iv = setInterval(() => {
      setTimelinePlayhead((prev) => {
        const dur = timelineDuration();
        if (prev >= dur) {
          if (loopEnabled) return 0;
          setIsTimelinePlaying(false);
          return prev;
        }
        return prev + 0.05;
      });
    }, 50);
    return () => clearInterval(iv);
  }, [isTimelinePlaying, loopEnabled, timelineDuration]);

  // Timeline keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!showTimeline) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      switch (e.key.toLowerCase()) {
        case "v":
          setTimelineTool("select");
          break;
        case "c":
          if (!e.ctrlKey && !e.metaKey) setTimelineTool("razor");
          break;
        case "t":
          if (!e.ctrlKey && !e.metaKey) setTimelineTool("trim");
          break;
        case "y":
          if (!e.ctrlKey && !e.metaKey) setTimelineTool("slip");
          break;
        case "delete":
        case "backspace":
          if (selectedClipId) {
            e.preventDefault();
            handleDeleteClip();
          }
          break;
        case "home":
          setTimelinePlayhead(0);
          break;
        case "end":
          setTimelinePlayhead(timelineDuration());
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showTimeline, selectedClipId, handleDeleteClip, timelineDuration]);

  // ------ Video grid layout ------
  const renderVideoGrid = () => {
    const hostParticipant = participants.find((p) => p.id === "host");
    const others = participants.filter((p) => p.id !== "host");

    // For now single participant (host) + placeholder guest slots
    const allTiles = [
      hostParticipant && (
        <VideoTile
          key="host"
          participant={hostParticipant}
          streamRef={streamRef}
          isLocal
          large={layout === "single" || participants.length <= 2}
        />
      ),
      ...others.map((p) => (
        <VideoTile key={p.id} participant={p} />
      )),
    ].filter(Boolean);

    // If only host, add a placeholder "waiting for guests" tile
    if (allTiles.length === 1) {
      allTiles.push(
        <div
          key="empty"
          className="relative w-full h-full rounded-xl overflow-hidden bg-zinc-900 border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center gap-3"
        >
          <div className="h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center">
            <UserPlus className="h-7 w-7 text-zinc-600" />
          </div>
          <span className="text-sm text-zinc-500 font-medium">
            Invite a guest
          </span>
          <button
            onClick={handleCopyLink}
            className="text-xs bg-[#7401df]/20 text-[#7401df] px-3 py-1.5 rounded-lg hover:bg-[#7401df]/30 transition-colors font-medium"
          >
            Copy Invite Link
          </button>
        </div>
      );
    }

    switch (layout) {
      case "single":
        return (
          <div className="h-full p-3">
            <div className="h-full">{allTiles[0]}</div>
          </div>
        );
      case "side-by-side":
        return (
          <div className="h-full p-3 flex gap-3">
            {allTiles.map((tile, i) => (
              <div key={i} className="flex-1 h-full">
                {tile}
              </div>
            ))}
          </div>
        );
      case "highlight-right":
        return (
          <div className="h-full p-3 flex gap-3">
            <div className="flex-[2] h-full">{allTiles[0]}</div>
            <div className="flex-1 h-full">{allTiles[1]}</div>
          </div>
        );
      case "grid-2x2":
        return (
          <div className="h-full p-3 grid grid-cols-2 grid-rows-2 gap-3">
            {allTiles.map((tile, i) => (
              <div key={i}>{tile}</div>
            ))}
          </div>
        );
      case "top-bottom":
        return (
          <div className="h-full p-3 flex flex-col gap-3">
            {allTiles.map((tile, i) => (
              <div key={i} className="flex-1">
                {tile}
              </div>
            ))}
          </div>
        );
      case "pip":
        return (
          <div className="h-full p-3 relative">
            <div className="h-full">{allTiles[0]}</div>
            {allTiles[1] && (
              <div className="absolute bottom-6 right-6 w-[200px] h-[150px] shadow-2xl rounded-xl overflow-hidden border-2 border-zinc-700">
                {allTiles[1]}
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="h-full p-3 flex gap-3">
            {allTiles.map((tile, i) => (
              <div key={i} className="flex-1 h-full">
                {tile}
              </div>
            ))}
          </div>
        );
    }
  };

  // =====================================================================
  // RENDER
  // =====================================================================

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] -mx-4 sm:-mx-6 lg:-mx-8 -mt-6 overflow-hidden bg-zinc-950">
      {/* ================================================================= */}
      {/* Top Bar                                                           */}
      {/* ================================================================= */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/90 border-b border-zinc-800 shrink-0">
        {/* Left */}
        <div className="flex items-center gap-3">
          <Link
            href="/my/studio"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">My Studio</span>
          </Link>

          <div className="h-4 w-px bg-zinc-700" />

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7401df]">
              <Radio className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-white hidden sm:inline">
              WCCG Studio
            </span>
          </div>

          <button
            onClick={handleCopyLink}
            className="hidden md:flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs px-2.5 py-1 rounded-lg hover:border-zinc-600 hover:text-zinc-300 transition-colors"
          >
            <span className="max-w-[140px] truncate font-mono text-[11px]">
              /podcast-studio
            </span>
            {copied ? (
              <Check className="h-3 w-3 text-green-400" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>

          <div className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1">
            <Users className="h-3 w-3 text-zinc-400" />
            <span className="text-xs text-zinc-300 font-medium">
              {participants.length}
            </span>
          </div>

          {isLive && (
            <div className="flex items-center gap-1.5 bg-red-600 text-white px-2.5 py-1 rounded-lg">
              <span className="text-xs font-bold tracking-wide">Live</span>
              <Eye className="h-3 w-3" />
              <span className="text-xs font-mono">{liveViewers}</span>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className={`p-1.5 rounded-lg transition-colors ${
              showTimeline
                ? "text-[#74ddc7] bg-[#74ddc7]/10"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
            title="Toggle Timeline"
          >
            {showTimeline ? (
              <PanelBottomClose className="h-4 w-4" />
            ) : (
              <PanelBottomOpen className="h-4 w-4" />
            )}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>

          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className={`p-1.5 rounded-lg transition-colors ${
              showSidebar
                ? "text-white bg-zinc-800"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
            title="Toggle sidebar"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                showSidebar ? "rotate-0" : "-rotate-90"
              }`}
            />
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* Main Content Area                                                 */}
      {/* ================================================================= */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* ── Video Grid ── */}
        <div className="flex-1 min-w-0 bg-zinc-950 overflow-hidden">
          {renderVideoGrid()}
        </div>

        {/* ── Right Sidebar ── */}
        {showSidebar && (
          <div className="w-[300px] xl:w-[320px] bg-zinc-900 border-l border-zinc-800 flex flex-col shrink-0 overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="flex border-b border-zinc-800 shrink-0">
              {(
                [
                  { key: "studio" as const, label: "Studio", badge: 0 },
                  { key: "chat" as const, label: "Chat", badge: chatMessages.length },
                  { key: "participants" as const, label: "Participants", badge: 0 },
                ]
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSidebarTab(tab.key)}
                  className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
                    sidebarTab === tab.key
                      ? "border-[#7401df] text-white bg-zinc-800/50"
                      : "border-transparent text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {tab.label}
                  {tab.badge > 0 && (
                    <span className="bg-[#7401df] text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto">
              {/* ====== STUDIO TAB ====== */}
              {sidebarTab === "studio" && (
                <div className="flex flex-col gap-4 p-3">
                  {/* Episode Name */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                      Episode Name
                    </label>
                    {editingName ? (
                      <input
                        type="text"
                        value={episodeName}
                        onChange={(e) => setEpisodeName(e.target.value)}
                        onBlur={() => setEditingName(false)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && setEditingName(false)
                        }
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#7401df]"
                        autoFocus
                      />
                    ) : (
                      <button
                        onClick={() => setEditingName(true)}
                        className="w-full text-left bg-zinc-800/50 rounded-lg px-3 py-1.5 text-sm text-white hover:bg-zinc-800 transition-colors"
                      >
                        {episodeName}
                      </button>
                    )}
                    <p className="text-[10px] text-zinc-600">
                      Audio &amp; Video &bull; 1080p (HD)
                    </p>
                  </div>

                  {/* Participants summary */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                        Participants
                      </span>
                      <button className="text-[10px] text-[#7401df] hover:text-[#74ddc7] transition-colors font-medium flex items-center gap-1">
                        <UserPlus className="h-3 w-3" />
                        Invite
                      </button>
                    </div>

                    {participants.map((p) => (
                      <div
                        key={p.id}
                        className="bg-zinc-800/50 rounded-xl p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">
                              {p.name}
                            </span>
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                p.role === "host"
                                  ? "bg-[#7401df]/20 text-[#7401df]"
                                  : "bg-zinc-700 text-zinc-400"
                              }`}
                            >
                              {p.role}
                            </span>
                            {p.isRecording && (
                              <Circle className="h-2 w-2 fill-red-500 text-red-500 animate-pulse" />
                            )}
                          </div>
                          <button className="text-zinc-600 hover:text-zinc-400 transition-colors">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="text-[10px] text-zinc-500">
                          {p.resolution} / {p.device.split(" ").slice(0, 3).join(" ")} / {p.bandwidth}
                        </p>
                        <AudioLevelBar level={p.audioLevel} />
                      </div>
                    ))}
                  </div>

                  {/* Recording info */}
                  <div className="bg-zinc-800/50 rounded-xl p-3 space-y-2 border border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <HardDrive className="h-3.5 w-3.5 text-zinc-400" />
                        {episodeName}
                      </span>
                      <span
                        className={`font-mono text-xs px-2 py-0.5 rounded-lg ${
                          isRecording
                            ? "bg-red-600 text-white"
                            : "bg-zinc-700 text-zinc-400"
                        }`}
                      >
                        {formatTime(recordingTime)}
                      </span>
                    </div>

                    {participants.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs text-white font-medium">
                            {p.name}
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            Video and Audio
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
                          {isRecording
                            ? formatFileSize(recordingBytes)
                            : recordedUrl
                            ? formatFileSize(recordingBytes)
                            : "0 KB"}
                          <HardDrive className="h-3 w-3" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Download recording */}
                  {recordedUrl && (
                    <a
                      href={recordedUrl}
                      download={`${episodeName.replace(/\s+/g, "-")}-${Date.now()}.webm`}
                      className="flex items-center justify-center gap-2 bg-[#74ddc7]/10 text-[#74ddc7] border border-[#74ddc7]/30 rounded-xl px-3 py-2.5 text-xs font-semibold hover:bg-[#74ddc7]/20 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download Recording ({recordVideoEnabled ? "Video" : "Audio"})
                    </a>
                  )}

                  {/* Director — Layout presets */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                      Director
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          "single",
                          "side-by-side",
                          "highlight-right",
                          "grid-2x2",
                          "top-bottom",
                          "pip",
                        ] as const
                      ).map((preset) => (
                        <button
                          key={preset}
                          onClick={() => setLayout(preset)}
                          className="h-12 rounded-lg overflow-hidden transition-transform hover:scale-105"
                          title={preset
                            .replace(/-/g, " ")
                            .replace(/\b\w/g, (c) => c.toUpperCase())}
                        >
                          <LayoutIcon
                            preset={preset}
                            active={layout === preset}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ====== CHAT TAB ====== */}
              {sidebarTab === "chat" && (
                <div className="flex flex-col h-full">
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-semibold ${
                              msg.sender === "You"
                                ? "text-[#74ddc7]"
                                : msg.sender === "System"
                                ? "text-zinc-500"
                                : "text-white"
                            }`}
                          >
                            {msg.sender}
                          </span>
                          <span className="text-[9px] text-zinc-600">
                            {msg.time}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed">
                          {msg.text}
                        </p>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="border-t border-zinc-800 p-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleSendChat()
                        }
                        placeholder="Send a message..."
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#7401df]"
                      />
                      <button
                        onClick={handleSendChat}
                        className="bg-[#7401df] hover:bg-[#7401df]/80 text-white p-2 rounded-lg transition-colors"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ====== PARTICIPANTS TAB ====== */}
              {sidebarTab === "participants" && (
                <div className="p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400 font-medium">
                      In Studio ({participants.length})
                    </span>
                    <button
                      onClick={handleCopyLink}
                      className="text-xs bg-[#7401df] text-white px-3 py-1.5 rounded-lg hover:bg-[#7401df]/80 transition-colors font-medium flex items-center gap-1.5"
                    >
                      <UserPlus className="h-3 w-3" />
                      Invite
                    </button>
                  </div>

                  {participants.map((p) => (
                    <div
                      key={p.id}
                      className="bg-zinc-800/50 rounded-xl p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center ${
                              p.role === "host"
                                ? "bg-[#7401df]/30"
                                : "bg-zinc-700"
                            }`}
                          >
                            <span className="text-sm font-bold text-white/80">
                              {p.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-semibold text-white">
                                {p.name}
                              </span>
                              <span
                                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                  p.role === "host"
                                    ? "bg-[#7401df]/20 text-[#7401df]"
                                    : "bg-zinc-700 text-zinc-400"
                                }`}
                              >
                                {p.role}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-500">
                              {p.device.split(" ").slice(0, 3).join(" ")}
                            </p>
                          </div>
                        </div>
                        <button className="text-zinc-600 hover:text-zinc-400">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <AudioLevelBar level={p.audioLevel} />
                        <span className="text-[9px] text-zinc-600 font-mono">
                          {p.bandwidth}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Waiting room placeholder */}
                  <div className="bg-zinc-800/30 rounded-xl p-3 border border-dashed border-zinc-800">
                    <div className="flex items-center gap-2 text-zinc-600">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">
                        Waiting Room
                      </span>
                      <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">
                        0
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-600 mt-1.5">
                      Guests will appear here when they join via invite link.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* Timeline Panel                                                    */}
      {/* ================================================================= */}
      {showTimeline && (
        <div className="shrink-0 bg-zinc-900 border-t border-zinc-800 flex flex-col" style={{ height: 220 }}>
          {/* Timeline Toolbar */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800 shrink-0 gap-4">
            {/* Left: Editing Tools */}
            <div className="flex items-center gap-1">
              {TOOL_INFO.map((tool) => (
                <button
                  key={tool.key}
                  onClick={() => setTimelineTool(tool.key)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    timelineTool === tool.key
                      ? "bg-[#7401df]/20 text-[#7401df]"
                      : "text-zinc-500 hover:text-white hover:bg-zinc-800"
                  }`}
                  title={`${tool.label} (${tool.shortcut})`}
                >
                  <tool.icon className="h-4 w-4" />
                </button>
              ))}
            </div>

            {/* Center: Playback Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setTimelinePlayhead(0)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                title="Skip to Start (Home)"
              >
                <SkipBack className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsTimelinePlaying(!isTimelinePlaying)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isTimelinePlaying
                    ? "bg-[#74ddc7]/20 text-[#74ddc7]"
                    : "text-zinc-500 hover:text-white hover:bg-zinc-800"
                }`}
                title={isTimelinePlaying ? "Pause" : "Play"}
              >
                {isTimelinePlaying ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={() => setTimelinePlayhead(timelineDuration())}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                title="Skip to End (End)"
              >
                <SkipForward className="h-3.5 w-3.5" />
              </button>

              <span className="text-[11px] font-mono text-zinc-400 min-w-[60px] text-center tabular-nums">
                {formatTime(Math.floor(timelinePlayhead))}
              </span>

              <div className="h-4 w-px bg-zinc-700 mx-0.5" />

              <button
                onClick={() => setLoopEnabled(!loopEnabled)}
                className={`p-1.5 rounded-lg transition-colors ${
                  loopEnabled
                    ? "bg-[#74ddc7]/20 text-[#74ddc7]"
                    : "text-zinc-500 hover:text-white hover:bg-zinc-800"
                }`}
                title="Loop"
              >
                <Repeat className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Right: Snap + Zoom */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSnapEnabled(!snapEnabled)}
                className={`px-2 py-1 rounded-lg text-[9px] font-bold tracking-wider transition-colors ${
                  snapEnabled
                    ? "bg-[#74ddc7]/20 text-[#74ddc7]"
                    : "text-zinc-500 hover:text-white hover:bg-zinc-800"
                }`}
                title="Snap to Grid"
              >
                SNAP
              </button>

              <div className="h-4 w-px bg-zinc-700 mx-0.5" />

              <button
                onClick={() => setTimelineZoom((z) => Math.max(MIN_ZOOM, z - 0.25))}
                className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                title="Zoom Out"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="text-[10px] font-mono text-zinc-500 min-w-[32px] text-center">
                {timelineZoom.toFixed(1)}x
              </span>
              <button
                onClick={() => setTimelineZoom((z) => Math.min(MAX_ZOOM, z + 0.25))}
                className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                title="Zoom In"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Track Area */}
          <div className="flex flex-1 min-h-0">
            {/* Track Headers (fixed left) */}
            <div
              className="shrink-0 flex flex-col border-r border-zinc-800 bg-zinc-900"
              style={{ width: TRACK_HEADER_WIDTH }}
            >
              <div className="h-6 border-b border-zinc-800 shrink-0 flex items-center px-2">
                <span className="text-[9px] text-zinc-600 font-semibold uppercase tracking-wider">
                  Tracks
                </span>
              </div>
              <div className="flex-1 overflow-y-hidden">
                {timelineTracks.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-1.5 px-2 border-b border-zinc-800/50"
                    style={{ height: track.height }}
                  >
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: track.color }}
                    />
                    <span className="text-[10px] text-zinc-300 font-medium truncate flex-1">
                      {track.label}
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() =>
                          setTimelineTracks((prev) =>
                            prev.map((t) =>
                              t.id === track.id
                                ? { ...t, muted: !t.muted }
                                : t
                            )
                          )
                        }
                        className={`h-5 w-5 flex items-center justify-center rounded text-[9px] font-bold transition-colors ${
                          track.muted
                            ? "bg-red-500/20 text-red-400"
                            : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800"
                        }`}
                        title="Mute"
                      >
                        M
                      </button>
                      <button
                        onClick={() =>
                          setTimelineTracks((prev) =>
                            prev.map((t) =>
                              t.id === track.id
                                ? { ...t, solo: !t.solo }
                                : t
                            )
                          )
                        }
                        className={`h-5 w-5 flex items-center justify-center rounded text-[9px] font-bold transition-colors ${
                          track.solo
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800"
                        }`}
                        title="Solo"
                      >
                        S
                      </button>
                      <button
                        onClick={() =>
                          setTimelineTracks((prev) =>
                            prev.map((t) =>
                              t.id === track.id
                                ? { ...t, locked: !t.locked }
                                : t
                            )
                          )
                        }
                        className={`h-5 w-5 flex items-center justify-center rounded transition-colors ${
                          track.locked
                            ? "text-zinc-400"
                            : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800"
                        }`}
                        title={track.locked ? "Unlock" : "Lock"}
                      >
                        {track.locked ? (
                          <Lock className="h-2.5 w-2.5" />
                        ) : (
                          <Unlock className="h-2.5 w-2.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
                {timelineTracks.length === 0 && (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-[10px] text-zinc-600">No tracks</span>
                  </div>
                )}
              </div>
            </div>

            {/* Scrollable Timeline */}
            <div
              ref={timelineScrollRef}
              className="flex-1 overflow-x-auto overflow-y-hidden relative"
              onMouseMove={(e) => {
                if (timelineTool !== "razor") {
                  setRazorPreviewX(null);
                  return;
                }
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
                setRazorPreviewX(x);
              }}
              onMouseLeave={() => setRazorPreviewX(null)}
              onClick={(e) => {
                if (timelineTool === "select") {
                  const tag = (e.target as HTMLElement).closest(
                    "[data-clip-id]"
                  );
                  if (!tag) setSelectedClipId(null);
                }
                // Seek on ruler click
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top;
                if (y <= 24) {
                  const x =
                    e.clientX - rect.left + e.currentTarget.scrollLeft;
                  setTimelinePlayhead(Math.max(0, x / pxPerSec));
                }
              }}
            >
              <div
                style={{ width: totalTimelineWidth, minHeight: "100%" }}
                className="relative"
              >
                {/* Time Ruler */}
                <div className="sticky top-0 h-6 bg-zinc-900/90 border-b border-zinc-800 z-10 relative backdrop-blur-sm cursor-pointer">
                  {(() => {
                    const step =
                      pxPerSec >= 160
                        ? 0.5
                        : pxPerSec >= 80
                        ? 1
                        : pxPerSec >= 40
                        ? 2
                        : pxPerSec >= 20
                        ? 5
                        : 10;
                    const ticks = [];
                    const dur = timelineDuration();
                    for (let t = 0; t <= dur; t += step) {
                      const x = t * pxPerSec;
                      const isMajor = step >= 5 || t % (step * 2) === 0;
                      const mm = Math.floor(t / 60);
                      const ss = Math.floor(t) % 60;
                      ticks.push(
                        <div
                          key={t}
                          className="absolute bottom-0"
                          style={{ left: x }}
                        >
                          <div
                            className={`w-px ${
                              isMajor
                                ? "h-3 bg-zinc-600"
                                : "h-1.5 bg-zinc-700"
                            }`}
                          />
                          {isMajor && (
                            <span className="absolute bottom-3 -translate-x-1/2 text-[8px] text-zinc-500 font-mono whitespace-nowrap select-none">
                              {mm}:{ss.toString().padStart(2, "0")}
                            </span>
                          )}
                        </div>
                      );
                    }
                    return ticks;
                  })()}
                </div>

                {/* Track Lanes */}
                {timelineTracks.map((track) => (
                  <div
                    key={track.id}
                    className="relative border-b border-zinc-800/50"
                    style={{ height: track.height }}
                  >
                    {/* Clips */}
                    {timelineClips
                      .filter((c) => c.trackId === track.id)
                      .map((clip) => {
                        const clipLeft = clip.startTime * pxPerSec;
                        const clipWidth = clip.duration * pxPerSec;
                        const isSelected = selectedClipId === clip.id;
                        // Downsample waveform to reasonable bar count
                        const maxBars = Math.max(
                          1,
                          Math.floor(clipWidth / 3)
                        );
                        const waveStep = Math.max(
                          1,
                          Math.floor(clip.waveform.length / maxBars)
                        );
                        return (
                          <div
                            key={clip.id}
                            data-clip-id={clip.id}
                            className={`absolute top-1 bottom-1 rounded-lg overflow-hidden transition-shadow ${
                              timelineTool === "razor"
                                ? "cursor-crosshair"
                                : timelineTool === "trim"
                                ? "cursor-col-resize"
                                : "cursor-pointer"
                            } ${
                              isSelected
                                ? "ring-2 ring-[#74ddc7] shadow-[0_0_12px_rgba(116,221,199,0.3)]"
                                : "hover:ring-1 hover:ring-zinc-500"
                            }`}
                            style={{
                              left: clipLeft,
                              width: Math.max(clipWidth, 4),
                              backgroundColor: `${clip.color}30`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (timelineTool === "select") {
                                setSelectedClipId(clip.id);
                              } else if (timelineTool === "razor") {
                                const t = timeFromX(e.clientX);
                                handleRazorSplit(clip.id, t);
                              }
                            }}
                          >
                            {/* Waveform bars */}
                            <div className="flex items-center h-full px-0.5 gap-[1px]">
                              {clip.waveform
                                .filter(
                                  (_, wi) => wi % waveStep === 0
                                )
                                .map((peak, wi) => (
                                  <div
                                    key={wi}
                                    className="flex-1 min-w-[1px] rounded-full"
                                    style={{
                                      height: `${Math.max(
                                        10,
                                        peak * 80
                                      )}%`,
                                      backgroundColor: clip.color,
                                      opacity: track.muted ? 0.2 : 0.6,
                                    }}
                                  />
                                ))}
                            </div>

                            {/* Label */}
                            {clipWidth > 40 && (
                              <span
                                className="absolute top-0.5 left-1.5 text-[9px] font-semibold truncate pointer-events-none select-none"
                                style={{
                                  color: clip.color,
                                  maxWidth: clipWidth - 12,
                                }}
                              >
                                {clip.label}
                              </span>
                            )}

                            {/* Trim handles */}
                            {(isSelected ||
                              timelineTool === "trim") && (
                              <>
                                <div
                                  className="absolute top-0 bottom-0 left-0 w-1 cursor-col-resize hover:bg-white/30 transition-colors"
                                  style={{
                                    backgroundColor: `${clip.color}80`,
                                  }}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    let lastX = e.clientX;
                                    const onMove = (
                                      me: MouseEvent
                                    ) => {
                                      const delta =
                                        (me.clientX - lastX) /
                                        pxPerSec;
                                      lastX = me.clientX;
                                      handleTrimClip(
                                        clip.id,
                                        "left",
                                        delta
                                      );
                                    };
                                    const onUp = () => {
                                      window.removeEventListener(
                                        "mousemove",
                                        onMove
                                      );
                                      window.removeEventListener(
                                        "mouseup",
                                        onUp
                                      );
                                    };
                                    window.addEventListener(
                                      "mousemove",
                                      onMove
                                    );
                                    window.addEventListener(
                                      "mouseup",
                                      onUp
                                    );
                                  }}
                                />
                                <div
                                  className="absolute top-0 bottom-0 right-0 w-1 cursor-col-resize hover:bg-white/30 transition-colors"
                                  style={{
                                    backgroundColor: `${clip.color}80`,
                                  }}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    let lastX = e.clientX;
                                    const onMove = (
                                      me: MouseEvent
                                    ) => {
                                      const delta =
                                        (me.clientX - lastX) /
                                        pxPerSec;
                                      lastX = me.clientX;
                                      handleTrimClip(
                                        clip.id,
                                        "right",
                                        delta
                                      );
                                    };
                                    const onUp = () => {
                                      window.removeEventListener(
                                        "mousemove",
                                        onMove
                                      );
                                      window.removeEventListener(
                                        "mouseup",
                                        onUp
                                      );
                                    };
                                    window.addEventListener(
                                      "mousemove",
                                      onMove
                                    );
                                    window.addEventListener(
                                      "mouseup",
                                      onUp
                                    );
                                  }}
                                />
                              </>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ))}

                {/* Empty state when no tracks */}
                {timelineTracks.length === 0 && (
                  <div className="absolute inset-0 top-6 flex flex-col items-center justify-center gap-2 text-zinc-600">
                    <Scissors className="h-6 w-6" />
                    <span className="text-xs font-medium">
                      Start recording to see your timeline
                    </span>
                    <span className="text-[10px] text-zinc-700">
                      Clips will appear here automatically
                    </span>
                  </div>
                )}

                {/* Playhead */}
                <div
                  className="absolute top-0 bottom-0 z-20 pointer-events-none"
                  style={{ left: timelinePlayhead * pxPerSec }}
                >
                  <div className="relative w-px h-full bg-red-500">
                    <div className="absolute -top-0 -translate-x-[4px] w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-red-500" />
                  </div>
                </div>

                {/* Razor preview line */}
                {timelineTool === "razor" && razorPreviewX !== null && (
                  <div
                    className="absolute top-6 bottom-0 w-px bg-yellow-400/60 pointer-events-none z-10"
                    style={{ left: razorPreviewX }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Bottom Transport Bar                                              */}
      {/* ================================================================= */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/95 border-t border-zinc-800 shrink-0">
        {/* Left: Settings */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className={`p-2.5 rounded-xl transition-colors ${
              showSettings
                ? "text-[#74ddc7] bg-[#74ddc7]/10"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {/* Center: Controls */}
        <div className="flex items-center gap-2">
          {/* Screen Share */}
          <button
            className="p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Share Screen"
          >
            <MonitorUp className="h-5 w-5" />
          </button>

          {/* Mic */}
          <button
            onClick={() => setMicEnabled(!micEnabled)}
            className={`p-2.5 rounded-xl transition-colors ${
              micEnabled
                ? "text-white bg-zinc-800 hover:bg-zinc-700"
                : "text-red-400 bg-red-600/20 hover:bg-red-600/30"
            }`}
            title={micEnabled ? "Mute mic" : "Unmute mic"}
          >
            {micEnabled ? (
              <Mic className="h-5 w-5" />
            ) : (
              <MicOff className="h-5 w-5" />
            )}
          </button>

          {/* Record */}
          <button
            onClick={toggleRecording}
            className={`p-3 rounded-full transition-all ${
              isRecording
                ? "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/30 animate-pulse"
                : "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20"
            }`}
            title={isRecording ? "Stop recording" : "Start recording"}
          >
            {isRecording ? (
              <Square className="h-5 w-5 fill-current" />
            ) : (
              <Circle className="h-5 w-5 fill-current" />
            )}
          </button>

          {/* Speaker */}
          <button
            onClick={() => setSpeakerEnabled(!speakerEnabled)}
            className={`p-2.5 rounded-xl transition-colors ${
              speakerEnabled
                ? "text-white bg-zinc-800 hover:bg-zinc-700"
                : "text-red-400 bg-red-600/20 hover:bg-red-600/30"
            }`}
            title={speakerEnabled ? "Mute speaker" : "Unmute speaker"}
          >
            {speakerEnabled ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
          </button>

          {/* Camera */}
          <button
            onClick={() => setCameraEnabled(!cameraEnabled)}
            className={`p-2.5 rounded-xl transition-colors ${
              cameraEnabled
                ? "text-white bg-zinc-800 hover:bg-zinc-700"
                : "text-red-400 bg-red-600/20 hover:bg-red-600/30"
            }`}
            title={cameraEnabled ? "Turn off camera" : "Turn on camera"}
          >
            {cameraEnabled ? (
              <Video className="h-5 w-5" />
            ) : (
              <VideoOff className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Right: Leave + Recording timer */}
        <div className="flex items-center gap-3">
          {isRecording && (
            <div className="flex items-center gap-1.5 bg-red-600/10 border border-red-600/30 text-red-400 px-3 py-1.5 rounded-lg">
              <Circle className="h-2 w-2 fill-red-500 text-red-500 animate-pulse" />
              <span className="text-xs font-mono font-semibold">
                {formatTime(recordingTime)}
              </span>
            </div>
          )}

          <Link
            href="/my/studio"
            className="p-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
            title="Leave studio"
          >
            <Phone className="h-5 w-5 rotate-[135deg]" />
          </Link>
        </div>
      </div>

      {/* ================================================================= */}
      {/* Settings Modal                                                    */}
      {/* ================================================================= */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          />

          {/* Modal */}
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-[460px] max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7401df]/20">
                  <Settings className="h-4 w-4 text-[#7401df]" />
                </div>
                <h2 className="text-sm font-bold text-white">Studio Settings</h2>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-5">
              {/* Audio Input */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold flex items-center gap-1.5">
                  <Mic className="h-3 w-3" />
                  Microphone
                </label>
                <select
                  value={selectedAudioDeviceId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedAudioDeviceId(id);
                    switchDevices(id, selectedVideoDeviceId || undefined);
                  }}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7401df] appearance-none cursor-pointer"
                >
                  {audioDevices.length === 0 && (
                    <option value="">No microphones detected</option>
                  )}
                  {audioDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Microphone ${d.deviceId.slice(0, 8)}…`}
                    </option>
                  ))}
                </select>

                {/* Live audio level preview */}
                <div className="bg-zinc-800/50 rounded-lg p-2.5 flex items-center gap-3">
                  <span className="text-[10px] text-zinc-500 shrink-0">Level</span>
                  <div className="flex-1">
                    <AudioLevelBar level={participants.find((p) => p.id === "host")?.audioLevel || 0} />
                  </div>
                  <span className="text-[10px] text-zinc-600 font-mono shrink-0">
                    {micEnabled ? "Active" : "Muted"}
                  </span>
                </div>
              </div>

              {/* Video Input */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold flex items-center gap-1.5">
                  <Camera className="h-3 w-3" />
                  Camera
                </label>
                <select
                  value={selectedVideoDeviceId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedVideoDeviceId(id);
                    switchDevices(selectedAudioDeviceId || undefined, id);
                  }}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7401df] appearance-none cursor-pointer"
                >
                  {videoDevices.length === 0 && (
                    <option value="">No cameras detected</option>
                  )}
                  {videoDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.slice(0, 8)}…`}
                    </option>
                  ))}
                </select>

                {/* Camera preview */}
                <div className="bg-zinc-800/50 rounded-lg overflow-hidden">
                  <div className="aspect-video relative bg-zinc-900">
                    {hasCamera && cameraEnabled ? (
                      /* eslint-disable-next-line jsx-a11y/media-has-caption */
                      <video
                        ref={(el) => {
                          if (el && streamRef.current) {
                            el.srcObject = streamRef.current;
                          }
                        }}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <VideoOff className="h-8 w-8 text-zinc-600 mx-auto mb-1" />
                          <span className="text-[10px] text-zinc-600">
                            {!hasCamera ? "No camera" : "Camera off"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recording Format */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold flex items-center gap-1.5">
                  <HardDrive className="h-3 w-3" />
                  Recording Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setRecordVideoEnabled(true)}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors ${
                      recordVideoEnabled
                        ? "border-[#7401df] bg-[#7401df]/10 text-[#7401df]"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                    }`}
                  >
                    <Film className="h-3.5 w-3.5" />
                    Video + Audio
                  </button>
                  <button
                    onClick={() => setRecordVideoEnabled(false)}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors ${
                      !recordVideoEnabled
                        ? "border-[#7401df] bg-[#7401df]/10 text-[#7401df]"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                    }`}
                  >
                    <Mic className="h-3.5 w-3.5" />
                    Audio Only
                  </button>
                </div>
                <p className="text-[10px] text-zinc-600">
                  {recordVideoEnabled
                    ? "Records camera feed and microphone as WebM video"
                    : "Records microphone only as WebM audio"}
                </p>
              </div>

              {/* Speaker Output */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold flex items-center gap-1.5">
                  <Volume2 className="h-3 w-3" />
                  Speaker
                </label>
                <div className="bg-zinc-800/50 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-xs text-zinc-300">
                    {speakerEnabled ? "System Default" : "Muted"}
                  </span>
                  <button
                    onClick={() => setSpeakerEnabled(!speakerEnabled)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                      speakerEnabled
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {speakerEnabled ? "ON" : "OFF"}
                  </button>
                </div>
              </div>

              {/* Device info */}
              <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-800/50 space-y-1.5">
                <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Device Info</span>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  <span className="text-[10px] text-zinc-500">Microphones</span>
                  <span className="text-[10px] text-zinc-400 text-right">{audioDevices.length} found</span>
                  <span className="text-[10px] text-zinc-500">Cameras</span>
                  <span className="text-[10px] text-zinc-400 text-right">{videoDevices.length} found</span>
                  <span className="text-[10px] text-zinc-500">Format</span>
                  <span className="text-[10px] text-zinc-400 text-right font-mono">
                    {getSupportedMimeType(recordVideoEnabled).split(";")[0] || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="bg-[#7401df] hover:bg-[#7401df]/80 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page export
// ---------------------------------------------------------------------------

export default function PodcastStudioPage() {
  return (
    <LoginRequired
      fullPage
      message="Sign in to access the Podcast Studio. Record, edit, and publish your podcast episodes."
    >
      <PodcastStudioContent />
    </LoginRequired>
  );
}
