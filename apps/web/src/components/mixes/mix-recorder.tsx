"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
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
  RotateCcw,
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

  // save form
  const [saveTitle, setSaveTitle] = useState("");
  const [saveGenre, setSaveGenre] = useState("Hip Hop");
  const [saveDescription, setSaveDescription] = useState("");

  // ---- enumerate audio devices ----
  useEffect(() => {
    async function loadDevices() {
      try {
        // Request permission first so labels are available
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach((t) => t.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter((d) => d.kind === "audioinput");
        setAudioDevices(audioInputs);
        if (audioInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(audioInputs[0].deviceId);
        }
        setMicError("");
      } catch {
        setMicError("Microphone access denied. Please allow microphone permissions.");
      }
    }
    loadDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- cleanup on unmount ----
  useEffect(() => {
    return () => {
      stopEverything();
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const step = Math.floor(bufferLength / barCount);

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

    // Update level state for the VU meter
    const slice = Math.floor(bufferLength / 32);
    const newLevels = [];
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

  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ---- stop & cleanup helpers ----
  function stopEverything() {
    pauseTimer();
    cancelAnimationFrame(animFrameRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
  }

  // ---- start recording ----
  const startRecording = useCallback(async () => {
    try {
      setMicError("");
      chunksRef.current = [];

      const constraints: MediaStreamConstraints = {
        audio: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Set up AudioContext + Analyser for visualization
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
      };

      // Record in 1-second chunks for more reliable data capture
      recorder.start(1000);
      setRecordingState("recording");
      setElapsedSeconds(0);
      startTimer();
      drawVisualizer();
    } catch {
      setMicError("Could not access microphone. Check permissions and try again.");
    }
  }, [selectedDeviceId, startTimer, drawVisualizer]);

  // ---- pause recording ----
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      setRecordingState("paused");
      pauseTimer();
      cancelAnimationFrame(animFrameRef.current);
    }
  }, [pauseTimer]);

  // ---- resume recording ----
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      setRecordingState("recording");
      startTimer();
      drawVisualizer();
    }
  }, [startTimer, drawVisualizer]);

  // ---- stop recording ----
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    pauseTimer();
    cancelAnimationFrame(animFrameRef.current);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    setRecordingState("stopped");
    setLevels(new Array(32).fill(0));
  }, [pauseTimer]);

  // ---- discard recording ----
  const discardRecording = useCallback(() => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
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
      previewAudioRef.current = new Audio(recordedUrl);
      previewAudioRef.current.onended = () => {
        setIsPreviewPlaying(false);
        setPreviewTime(0);
      };
      previewAudioRef.current.ontimeupdate = () => {
        setPreviewTime(previewAudioRef.current?.currentTime || 0);
      };
    }

    previewAudioRef.current.play().catch(console.error);
    setIsPreviewPlaying(true);
  }, [recordedUrl, isPreviewPlaying]);

  // ---- download recording ----
  const downloadRecording = useCallback(() => {
    if (!recordedBlob) return;
    const a = document.createElement("a");
    a.href = recordedUrl;
    a.download = `${saveTitle || "recording"}.webm`;
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
    stopEverything();
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, recordedUrl]);

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
          {/* Mic error */}
          {micError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {micError}
            </div>
          )}

          {/* Audio input selector */}
          {!isStopped && (
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
                  {formatTimer(isStopped ? elapsedSeconds : elapsedSeconds)}
                </span>
              </div>
            </div>

            {/* Recording state label */}
            {isIdle && (
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
          {!isStopped && (
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
            {isIdle && "Ready to record"}
            {isStopped && "Recording complete"}
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
                className="bg-[#74ddc7] text-black hover:bg-[#74ddc7]/80"
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
