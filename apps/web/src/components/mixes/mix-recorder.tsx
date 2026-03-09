"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Mic,
  Square,
  Pause,
  Play,
  Save,
  Download,
  X,
  Circle,
  Trash2,
  Volume2,
  ChevronDown,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecordingResult {
  blob: Blob;
  blobUrl: string;
  duration: number;
  title: string;
  genre: string;
  description?: string;
}

interface MixRecorderProps {
  onSave: (result: RecordingResult) => void;
  onClose: () => void;
}

type RecordingState = "idle" | "recording" | "paused" | "stopped";

const GENRE_OPTIONS = [
  "Hip Hop",
  "R&B",
  "Club",
  "Old School",
  "Gospel",
  "Afrobeats",
  "Reggae",
  "Soca",
  "Other",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/** Pick the best supported mime type for MediaRecorder */
function getSupportedMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  for (const mime of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(mime)) return mime;
    } catch {
      // isTypeSupported may throw in some browsers
    }
  }
  // Let the browser choose its default
  return "";
}

/** Check if the browser supports recording APIs */
function checkBrowserSupport(): string | null {
  if (typeof window === "undefined") return "Recording requires a browser environment.";
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return "Your browser does not support microphone access. Please use Chrome, Firefox, or Edge.";
  }
  if (typeof MediaRecorder === "undefined") {
    return "Your browser does not support MediaRecorder. Please use Chrome, Firefox, or Edge.";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MixRecorder({ onSave, onClose }: MixRecorderProps) {
  // ---- refs ----
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const recordedUrlRef = useRef<string>("");
  const mimeTypeRef = useRef<string>("");
  const mountedRef = useRef(true);

  // ---- state ----
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [levels, setLevels] = useState<number[]>(new Array(32).fill(0));
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string>("");
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [micError, setMicError] = useState<string>("");
  const [browserError] = useState<string | null>(() => checkBrowserSupport());

  // save form
  const [saveTitle, setSaveTitle] = useState("");
  const [saveGenre, setSaveGenre] = useState("Hip Hop");
  const [saveDescription, setSaveDescription] = useState("");

  // ---- stop & cleanup helpers (ref-stored to avoid stale closures) ----
  const stopEverythingRef = useRef<() => void>(() => {});

  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Keep the ref updated every render so it always closes over latest state
  stopEverythingRef.current = () => {
    pauseTimer();
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = 0;

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try { recorder.stop(); } catch (err) { console.error("[MixRecorder] Error stopping recorder:", err); }
    }
    mediaRecorderRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => { try { t.stop(); } catch {} });
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
  };

  // ---- enumerate audio devices ----
  useEffect(() => {
    if (browserError) return;

    let cancelled = false;

    async function loadDevices() {
      try {
        // Request permission first so device labels are available
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach((t) => t.stop());

        if (cancelled) return;

        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter((d) => d.kind === "audioinput");

        if (cancelled) return;

        setAudioDevices(audioInputs);
        if (audioInputs.length > 0) {
          setSelectedDeviceId((prev) => prev || audioInputs[0].deviceId);
        }
        setMicError("");
      } catch (err) {
        console.error("[MixRecorder] Microphone access error:", err);
        if (!cancelled) {
          setMicError("Microphone access denied. Please allow microphone permissions and reload.");
        }
      }
    }

    loadDevices();

    return () => { cancelled = true; };
  }, [browserError]);

  // ---- cleanup on unmount ----
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopEverythingRef.current();
      if (recordedUrlRef.current) {
        URL.revokeObjectURL(recordedUrlRef.current);
        recordedUrlRef.current = "";
      }
    };
  }, []);

  // Keep recordedUrlRef in sync
  useEffect(() => {
    recordedUrlRef.current = recordedUrl;
  }, [recordedUrl]);

  // ---- visualizer animation ----
  const drawVisualizer = useCallback(() => {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    if (!analyser || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Draw frequency bars
    const barCount = 48;
    const barWidth = (width / barCount) * 0.7;
    const gap = (width / barCount) * 0.3;
    const step = Math.max(1, Math.floor(bufferLength / barCount));

    for (let i = 0; i < barCount; i++) {
      const value = dataArray[i * step] / 255;
      const barHeight = value * height * 0.85;

      // Gradient color: teal → purple based on level
      const r = Math.floor(116 + (116 - 116) * value);
      const g = Math.floor(221 - (221 - 1) * value * 0.6);
      const b = Math.floor(199 + (223 - 199) * value * 0.5);

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(
        i * (barWidth + gap) + gap / 2,
        height - barHeight,
        barWidth,
        barHeight,
      );

      // Mirror reflection
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.15)`;
      ctx.fillRect(
        i * (barWidth + gap) + gap / 2,
        height,
        barWidth,
        barHeight * 0.3,
      );
    }

    // Update level state for the VU meter (throttled — only 32 values)
    const slice = Math.max(1, Math.floor(bufferLength / 32));
    const newLevels: number[] = [];
    for (let i = 0; i < 32; i++) {
      newLevels.push(dataArray[i * slice] / 255);
    }
    setLevels(newLevels);

    animFrameRef.current = requestAnimationFrame(drawVisualizer);
  }, []);

  // ---- timer ----
  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }, []);

  // ---- start recording ----
  const startRecording = useCallback(async () => {
    try {
      setMicError("");
      chunksRef.current = [];

      // Clean up any previous recording state
      if (recordedUrlRef.current) {
        URL.revokeObjectURL(recordedUrlRef.current);
        recordedUrlRef.current = "";
      }
      setRecordedBlob(null);
      setRecordedUrl("");

      const constraints: MediaStreamConstraints = {
        audio: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : true,
      };

      console.log("[MixRecorder] Requesting microphone access...", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      console.log("[MixRecorder] Got media stream, tracks:", stream.getAudioTracks().length);

      // Set up AudioContext + Analyser for visualization
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      // Resume context (required after user gesture in many browsers)
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
        console.log("[MixRecorder] AudioContext resumed");
      }

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Set up MediaRecorder with best supported mime type
      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;
      console.log("[MixRecorder] Using MIME type:", mimeType || "(browser default)");

      const recorderOptions: MediaRecorderOptions = {};
      if (mimeType) {
        recorderOptions.mimeType = mimeType;
      }

      const recorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
          console.log("[MixRecorder] Chunk received, size:", e.data.size, "total chunks:", chunksRef.current.length);
        }
      };

      recorder.onstop = () => {
        console.log("[MixRecorder] Recorder stopped, total chunks:", chunksRef.current.length);
        if (chunksRef.current.length === 0) {
          console.warn("[MixRecorder] No audio data captured!");
          if (mountedRef.current) {
            setMicError("No audio data was captured. Please check your microphone input.");
            setRecordingState("idle");
          }
          return;
        }

        const finalMime = mimeTypeRef.current || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalMime });
        const url = URL.createObjectURL(blob);
        console.log("[MixRecorder] Created blob:", blob.size, "bytes, type:", blob.type);

        if (mountedRef.current) {
          setRecordedBlob(blob);
          setRecordedUrl(url);
          recordedUrlRef.current = url;
        } else {
          URL.revokeObjectURL(url);
        }
      };

      recorder.onerror = (event) => {
        console.error("[MixRecorder] MediaRecorder error:", event);
        if (mountedRef.current) {
          setMicError("Recording error occurred. Please try again.");
          setRecordingState("idle");
        }
      };

      // Start recording — use timeslice of 1000ms for regular data chunks
      recorder.start(1000);
      console.log("[MixRecorder] Recording started, state:", recorder.state);

      setRecordingState("recording");
      setElapsedSeconds(0);
      startTimer();
      drawVisualizer();
    } catch (err) {
      console.error("[MixRecorder] startRecording error:", err);
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("NotAllowedError") || message.includes("Permission")) {
        setMicError("Microphone permission denied. Please allow access and try again.");
      } else if (message.includes("NotFoundError") || message.includes("Requested device not found")) {
        setMicError("Selected microphone not found. Please choose a different input device.");
      } else {
        setMicError(`Could not start recording: ${message}`);
      }
    }
  }, [selectedDeviceId, startTimer, drawVisualizer]);

  // ---- pause recording ----
  const pauseRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.pause();
      console.log("[MixRecorder] Recording paused");
      setRecordingState("paused");
      pauseTimer();
      cancelAnimationFrame(animFrameRef.current);
    }
  }, [pauseTimer]);

  // ---- resume recording ----
  const resumeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "paused") {
      recorder.resume();
      console.log("[MixRecorder] Recording resumed");
      setRecordingState("recording");
      startTimer();
      drawVisualizer();
    }
  }, [startTimer, drawVisualizer]);

  // ---- stop recording ----
  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      // Request any remaining data before stopping
      try { recorder.requestData(); } catch {}
      recorder.stop();
      console.log("[MixRecorder] Recorder.stop() called");
    }

    pauseTimer();
    cancelAnimationFrame(animFrameRef.current);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => { try { t.stop(); } catch {} });
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;

    setRecordingState("stopped");
    setLevels(new Array(32).fill(0));
  }, [pauseTimer]);

  // ---- discard recording ----
  const discardRecording = useCallback(() => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      recordedUrlRef.current = "";
    }
    setRecordedBlob(null);
    setRecordedUrl("");
    setRecordingState("idle");
    setElapsedSeconds(0);
    setIsPreviewPlaying(false);
    setPreviewTime(0);
    setSaveTitle("");
    setSaveDescription("");
    setSaveGenre("Hip Hop");

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
  }, [recordedUrl]);

  // ---- preview playback ----
  const togglePreview = useCallback(() => {
    if (!recordedUrl) return;

    if (isPreviewPlaying) {
      previewAudioRef.current?.pause();
      setIsPreviewPlaying(false);
      return;
    }

    if (!previewAudioRef.current) {
      const audio = new Audio(recordedUrl);
      audio.onended = () => {
        setIsPreviewPlaying(false);
        setPreviewTime(0);
      };
      audio.ontimeupdate = () => {
        setPreviewTime(audio.currentTime || 0);
      };
      previewAudioRef.current = audio;
    }

    previewAudioRef.current.play().catch((err) => {
      console.error("[MixRecorder] Preview playback error:", err);
    });
    setIsPreviewPlaying(true);
  }, [recordedUrl, isPreviewPlaying]);

  // ---- download recording ----
  const downloadRecording = useCallback(() => {
    if (!recordedBlob || !recordedUrl) return;
    const ext = mimeTypeRef.current.includes("mp4") ? "m4a"
      : mimeTypeRef.current.includes("ogg") ? "ogg"
      : "webm";
    const a = document.createElement("a");
    a.href = recordedUrl;
    a.download = `${saveTitle || "recording"}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [recordedBlob, recordedUrl, saveTitle]);

  // ---- save to mixes ----
  const handleSave = useCallback(() => {
    if (!recordedBlob || !recordedUrl) return;
    if (!saveTitle.trim()) return;

    onSave({
      blob: recordedBlob,
      blobUrl: recordedUrl,
      duration: elapsedSeconds,
      title: saveTitle.trim(),
      genre: saveGenre,
      description: saveDescription.trim() || undefined,
    });
  }, [recordedBlob, recordedUrl, elapsedSeconds, saveTitle, saveGenre, saveDescription, onSave]);

  // ---- close handler ----
  const handleClose = useCallback(() => {
    stopEverythingRef.current();
    if (recordedUrlRef.current) {
      URL.revokeObjectURL(recordedUrlRef.current);
      recordedUrlRef.current = "";
    }
    onClose();
  }, [onClose]);

  // ===========================================================================
  // Render
  // ===========================================================================

  const isIdle = recordingState === "idle";
  const isRecording = recordingState === "recording";
  const isPaused = recordingState === "paused";
  const isStopped = recordingState === "stopped";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 mx-4 w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-[#0e0e18] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#dc2626] to-[#b91c1c]">
              <Mic className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Recording Studio</h2>
              <p className="text-xs text-muted-foreground">Record a mix directly from your audio input</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.08] hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Browser support error */}
          {browserError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {browserError}
            </div>
          )}

          {/* Mic error */}
          {micError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {micError}
            </div>
          )}

          {/* Audio input selector */}
          {!isStopped && !browserError && (
            <div className="flex items-center gap-3">
              <Volume2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="relative flex-1">
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  disabled={isRecording || isPaused}
                  className="h-9 w-full appearance-none rounded-md border border-input bg-background px-3 pr-8 text-sm text-foreground outline-none focus:border-[#74ddc7] disabled:opacity-50"
                >
                  {audioDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Microphone ${d.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                  {audioDevices.length === 0 && (
                    <option value="">No microphone found</option>
                  )}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          )}

          {/* Visualizer */}
          <div className="relative overflow-hidden rounded-xl border border-border bg-[#0a0a14]">
            <canvas
              ref={canvasRef}
              width={600}
              height={160}
              className="w-full"
              style={{ height: "160px" }}
            />

            {/* Timer overlay */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
              <div className={`flex items-center gap-2 rounded-full px-4 py-1.5 backdrop-blur-md ${
                isRecording
                  ? "bg-red-500/20 border border-red-500/30"
                  : isPaused
                    ? "bg-amber-500/20 border border-amber-500/30"
                    : "bg-foreground/10 border border-border"
              }`}>
                {isRecording && (
                  <Circle className="h-2.5 w-2.5 fill-red-500 text-red-500 animate-pulse" />
                )}
                {isPaused && (
                  <Pause className="h-3 w-3 text-amber-400" />
                )}
                <span className={`font-mono text-lg font-bold ${
                  isRecording ? "text-red-400" : isPaused ? "text-amber-400" : "text-foreground"
                }`}>
                  {formatTimer(elapsedSeconds)}
                </span>
              </div>
            </div>

            {/* Recording state label */}
            {isIdle && !browserError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Mic className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground/50">
                    Select your audio input and press Record
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Level meter (horizontal bar) */}
          {(isRecording || isPaused) && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Level</span>
              <div className="flex flex-1 gap-0.5">
                {levels.map((level, i) => (
                  <div
                    key={i}
                    className="h-2 flex-1 rounded-full transition-all duration-75"
                    style={{
                      backgroundColor: level > 0.7
                        ? "#dc2626"
                        : level > 0.4
                          ? "#f59e0b"
                          : "#74ddc7",
                      opacity: Math.max(0.15, level),
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Transport controls */}
          {!isStopped && !browserError && (
            <div className="flex items-center justify-center gap-4">
              {isIdle ? (
                <Button
                  size="lg"
                  className="h-14 w-14 rounded-full bg-[#dc2626] text-white hover:bg-[#dc2626]/80 shadow-lg shadow-red-500/20"
                  onClick={startRecording}
                  disabled={audioDevices.length === 0 || !!micError}
                >
                  <Circle className="h-6 w-6 fill-current" />
                </Button>
              ) : (
                <>
                  {/* Pause / Resume */}
                  <Button
                    size="lg"
                    className="h-12 w-12 rounded-full bg-foreground/10 text-foreground hover:bg-foreground/20"
                    onClick={isPaused ? resumeRecording : pauseRecording}
                  >
                    {isPaused ? (
                      <Play className="h-5 w-5 ml-0.5" />
                    ) : (
                      <Pause className="h-5 w-5" />
                    )}
                  </Button>

                  {/* Stop */}
                  <Button
                    size="lg"
                    className="h-14 w-14 rounded-full bg-[#dc2626] text-white hover:bg-[#dc2626]/80 shadow-lg shadow-red-500/20"
                    onClick={stopRecording}
                  >
                    <Square className="h-5 w-5 fill-current" />
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Post-recording: Preview + Save Form */}
          {isStopped && recordedBlob && (
            <div className="space-y-4">
              {/* Preview controls */}
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <Button
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-full bg-[#74ddc7] text-[#0a0a0f] hover:bg-[#74ddc7]/80"
                  onClick={togglePreview}
                >
                  {isPreviewPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4 ml-0.5" />
                  )}
                </Button>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Recording Preview
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimer(Math.floor(previewTime))} / {formatTimer(elapsedSeconds)}
                    {" · "}
                    {(recordedBlob.size / 1_000_000).toFixed(1)} MB
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-[#74ddc7]"
                    onClick={downloadRecording}
                    title="Download recording"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-red-400"
                    onClick={discardRecording}
                    title="Discard & re-record"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Save form */}
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground/70">
                      Title <span className="text-red-400">*</span>
                    </label>
                    <Input
                      placeholder="Name your mix"
                      value={saveTitle}
                      onChange={(e) => setSaveTitle(e.target.value)}
                      className="border-input bg-background text-foreground placeholder:text-muted-foreground/70"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground/70">
                      Genre
                    </label>
                    <div className="relative">
                      <select
                        value={saveGenre}
                        onChange={(e) => setSaveGenre(e.target.value)}
                        className="h-9 w-full appearance-none rounded-md border border-input bg-background px-3 pr-8 text-sm text-foreground outline-none focus:border-[#74ddc7]"
                      >
                        {GENRE_OPTIONS.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground/70">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe your mix..."
                    value={saveDescription}
                    onChange={(e) => setSaveDescription(e.target.value)}
                    className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-[#74ddc7] focus:ring-1 focus:ring-[#74ddc7]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isRecording && (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                Recording...
              </>
            )}
            {isPaused && (
              <>
                <Pause className="h-3 w-3 text-amber-400" />
                Paused
              </>
            )}
            {isIdle && !browserError && "Ready to record"}
            {isStopped && "Recording complete"}
            {browserError && "Recording unavailable"}
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground/80"
              onClick={handleClose}
            >
              Cancel
            </Button>
            {isStopped && recordedBlob && (
              <Button
                size="sm"
                className="bg-[#74ddc7] text-[#0a0a0f] hover:bg-[#74ddc7]/80"
                onClick={handleSave}
                disabled={!saveTitle.trim()}
              >
                <Save className="h-4 w-4" />
                Save to My Mixes
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
