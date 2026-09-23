"use client";

/**
 * Record a mix straight into one slot file, from the DJ portal (/my/dj).
 *
 * Made for the DJ sitting in the studio: pick the studio feed as the input,
 * watch the meters, record, listen back, save. The take is a 16-bit stereo WAV
 * at the input's own rate, built in the browser from an AudioWorklet
 * (public/worklets/pcm-capture.js). Why WAV and not MediaRecorder: Chrome's
 * MediaRecorder only makes WebM, which the dj-drops bucket refuses, which
 * sync-dj-drops.py can't identify, and which iPhones can't play on the DJ's
 * public page. WAV is lossless, allowed by the bucket, and the production PC
 * already converts it to MP3 for air -- the same road an uploaded WAV takes.
 *
 * Browser voice processing (echo cancellation, noise suppression, auto gain)
 * is switched off: it is built for speech and would pump and gate a music mix.
 * The input is never routed to the speakers, so there is no feedback loop.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, Mic, RotateCcw, Save, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** The dj-drops bucket takes 1 GiB; at 48 kHz stereo 16-bit that's ~93 min. */
const BUCKET_LIMIT_BYTES = 1024 * 1024 * 1024;
const WAV_HEADER_BYTES = 44;
/** Warn this many seconds before the take would outgrow the bucket. */
const LIMIT_WARN_SECONDS = 5 * 60;
/** Peaks under this for SILENCE_SECONDS while recording = "no signal" warning. */
const SILENCE_DB = -60;
const SILENCE_SECONDS = 10;
/** Fold the small per-batch buffers into one Blob every ~5 s so a long take
 *  isn't thousands of tiny arrays (and the browser can page it to disk). */
const BATCHES_PER_PART = 50;

type Phase = "idle" | "starting" | "ready" | "recording" | "review" | "saving";

interface Take {
  blob: Blob;
  url: string;
  seconds: number;
}

interface Level {
  l: number;
  r: number;
}

function toDb(peak: number): number {
  return peak > 0 ? 20 * Math.log10(peak) : -Infinity;
}

function fmtClock(sec: number): string {
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

function fmtMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
}

function wavHeader(dataBytes: number, sampleRate: number): ArrayBuffer {
  const channels = 2;
  const buf = new ArrayBuffer(WAV_HEADER_BYTES);
  const v = new DataView(buf);
  const tag = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(at + i, s.charCodeAt(i));
  };
  tag(0, "RIFF");
  v.setUint32(4, 36 + dataBytes, true);
  tag(8, "WAVE");
  tag(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, channels, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * channels * 2, true);
  v.setUint16(32, channels * 2, true);
  v.setUint16(34, 16, true);
  tag(36, "data");
  v.setUint32(40, dataBytes, true);
  return buf;
}

/** Interleave L/R floats into 16-bit PCM. */
function toPcm16(l: Float32Array, r: Float32Array): Int16Array {
  const out = new Int16Array(l.length * 2);
  for (let i = 0; i < l.length; i++) {
    const a = Math.max(-1, Math.min(1, l[i]));
    const b = Math.max(-1, Math.min(1, r[i]));
    out[i * 2] = a < 0 ? a * 0x8000 : a * 0x7fff;
    out[i * 2 + 1] = b < 0 ? b * 0x8000 : b * 0x7fff;
  }
  return out;
}

function peakOf(x: Float32Array): number {
  let p = 0;
  for (let i = 0; i < x.length; i++) {
    const a = Math.abs(x[i]);
    if (a > p) p = a;
  }
  return p;
}

export function MixRecorder({
  fileCode,
  replacing,
  onSave,
  onClose,
}: {
  fileCode: string;
  /** A mix is already uploaded for this file this week -- saving replaces it. */
  replacing: boolean;
  /** Upload the take. Resolve true once it's filed; false keeps the take here. */
  onSave: (file: File) => Promise<boolean>;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [problem, setProblem] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [format, setFormat] = useState<{ rate: number; channels: number } | null>(null);
  const [level, setLevel] = useState<Level>({ l: 0, r: 0 });
  const [clipped, setClipped] = useState(false);
  const [silent, setSilent] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [take, setTake] = useState<Take | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingRef = useRef(false);
  const pendingRef = useRef<Int16Array[]>([]);
  const partsRef = useRef<Blob[]>([]);
  const framesRef = useRef(0);
  const lastSignalRef = useRef(0);
  const wakeRef = useRef<WakeLockSentinel | null>(null);
  const takeUrlRef = useRef<string | null>(null);
  const stopRef = useRef<() => void>(() => {});

  const closeInput = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const ctx = ctxRef.current;
    ctxRef.current = null;
    if (ctx && ctx.state !== "closed") void ctx.close();
  }, []);

  const releaseWake = useCallback(() => {
    const w = wakeRef.current;
    wakeRef.current = null;
    if (w) void w.release().catch(() => {});
  }, []);

  // Tear everything down if the DJ navigates away or the row closes.
  useEffect(() => {
    return () => {
      recordingRef.current = false;
      closeInput();
      releaseWake();
      if (takeUrlRef.current) URL.revokeObjectURL(takeUrlRef.current);
    };
  }, [closeInput, releaseWake]);

  // A live or unsaved take is an hour of someone's work: ask before leaving.
  useEffect(() => {
    if (phase !== "recording" && phase !== "review" && phase !== "saving") return;
    const guard = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [phase]);

  const onBatch = useCallback((l: Float32Array, r: Float32Array, rate: number) => {
    const pl = peakOf(l);
    const pr = peakOf(r);
    setLevel({ l: pl, r: pr });
    if (Math.max(pl, pr) >= 0.999) setClipped(true);
    if (!recordingRef.current) return;

    const now = performance.now();
    if (toDb(Math.max(pl, pr)) > SILENCE_DB) lastSignalRef.current = now;
    setSilent(now - lastSignalRef.current > SILENCE_SECONDS * 1000);

    pendingRef.current.push(toPcm16(l, r));
    if (pendingRef.current.length >= BATCHES_PER_PART) {
      partsRef.current.push(new Blob(pendingRef.current as BlobPart[]));
      pendingRef.current = [];
    }
    framesRef.current += l.length;
    const secs = framesRef.current / rate;
    setSeconds(secs);
    // Stop cleanly before the WAV outgrows what the bucket will accept.
    if (WAV_HEADER_BYTES + framesRef.current * 4 >= BUCKET_LIMIT_BYTES - rate * 4) stopRef.current();
  }, []);

  const openInput = useCallback(
    async (wanted?: string) => {
      setProblem(null);
      setPhase("starting");
      closeInput();
      try {
        if (!navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === "undefined") {
          throw new Error("This browser can't record. Use Chrome or Edge on the studio computer.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: wanted ? { exact: wanted } : undefined,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            channelCount: { ideal: 2 },
            sampleRate: { ideal: 48000 },
          },
        });
        streamRef.current = stream;
        const track = stream.getAudioTracks()[0];
        const settings = track?.getSettings() ?? {};

        // Match the context to the input's own rate: no resampling, and
        // Firefox refuses to connect a stream at a different rate anyway.
        const ctx = new AudioContext({
          latencyHint: "playback",
          ...(settings.sampleRate ? { sampleRate: settings.sampleRate } : {}),
        });
        ctxRef.current = ctx;
        await ctx.audioWorklet.addModule("/worklets/pcm-capture.js");
        const source = ctx.createMediaStreamSource(stream);
        const node = new AudioWorkletNode(ctx, "pcm-capture", {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [1],
          channelCount: 2,
          channelCountMode: "explicit",
        });
        const rate = ctx.sampleRate;
        node.port.onmessage = (e: MessageEvent<{ l: Float32Array; r: Float32Array }>) =>
          onBatch(e.data.l, e.data.r, rate);
        // The worklet writes no output; the muted gain only keeps the graph
        // pulling it. Nothing reaches the speakers.
        const mute = ctx.createGain();
        mute.gain.value = 0;
        source.connect(node);
        node.connect(mute);
        mute.connect(ctx.destination);
        if (ctx.state === "suspended") await ctx.resume();

        const list = (await navigator.mediaDevices.enumerateDevices()).filter(
          (d) => d.kind === "audioinput" && d.deviceId,
        );
        setDevices(list);
        setDeviceId(settings.deviceId ?? wanted ?? "");
        setFormat({ rate, channels: settings.channelCount ?? 2 });
        setClipped(false);
        setPhase("ready");
      } catch (e) {
        closeInput();
        const err = e as DOMException;
        setProblem(
          err.name === "NotAllowedError"
            ? "The browser blocked the input. Allow microphone access for wccg1045fm.com (the icon in the address bar) and try again."
            : err.name === "NotFoundError" || err.name === "OverconstrainedError"
              ? "That input isn't available. Pick another one."
              : err.message || "Couldn't open the input.",
        );
        setPhase("idle");
      }
    },
    [closeInput, onBatch],
  );

  const start = async () => {
    pendingRef.current = [];
    partsRef.current = [];
    framesRef.current = 0;
    lastSignalRef.current = performance.now();
    setSeconds(0);
    setSilent(false);
    setClipped(false);
    recordingRef.current = true;
    setPhase("recording");
    try {
      wakeRef.current = (await navigator.wakeLock?.request("screen")) ?? null;
    } catch {
      /* no wake lock -- the recording still runs */
    }
  };

  const stop = useCallback(() => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    releaseWake();
    const rate = ctxRef.current?.sampleRate ?? 48000;
    if (pendingRef.current.length) {
      partsRef.current.push(new Blob(pendingRef.current as BlobPart[]));
      pendingRef.current = [];
    }
    const dataBytes = framesRef.current * 4;
    const blob = new Blob([wavHeader(dataBytes, rate), ...partsRef.current], { type: "audio/wav" });
    partsRef.current = [];
    const url = URL.createObjectURL(blob);
    if (takeUrlRef.current) URL.revokeObjectURL(takeUrlRef.current);
    takeUrlRef.current = url;
    setTake({ blob, url, seconds: framesRef.current / rate });
    setSilent(false);
    setPhase("review");
  }, [releaseWake]);

  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  const discard = () => {
    if (takeUrlRef.current) URL.revokeObjectURL(takeUrlRef.current);
    takeUrlRef.current = null;
    setTake(null);
    setSeconds(0);
    setPhase(streamRef.current ? "ready" : "idle");
  };

  const save = async () => {
    if (!take) return;
    setPhase("saving");
    const ok = await onSave(new File([take.blob], `${fileCode}.wav`, { type: "audio/wav" }));
    if (ok) {
      closeInput();
      onClose();
    } else {
      // Keep the take: the error shows on the page and the DJ can hit Save again.
      setPhase("review");
    }
  };

  const recording = phase === "recording";
  const bytes = WAV_HEADER_BYTES + seconds * (format?.rate ?? 48000) * 4;
  const secondsLeft = format ? (BUCKET_LIMIT_BYTES - bytes) / (format.rate * 4) : Infinity;

  return (
    <div className="space-y-4 border-t border-border bg-foreground/[0.02] px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-foreground">
            Record <span className="font-mono">{fileCode}</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Records straight from this computer&apos;s audio input. Pick the studio feed, check your
            levels, and hit record. It saves as a lossless WAV and goes to air as MP3.
          </p>
        </div>
        {!recording && phase !== "saving" && (
          <button
            type="button"
            onClick={() => {
              closeInput();
              onClose();
            }}
            className="rounded-full p-1 text-muted-foreground hover:text-foreground"
            aria-label="Close recorder"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {problem && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-2.5 text-xs text-red-500">{problem}</p>
      )}

      {(phase === "idle" || phase === "starting") && (
        <Button
          type="button"
          size="sm"
          onClick={() => openInput()}
          disabled={phase === "starting"}
          className="rounded-full"
        >
          <Mic className="mr-1.5 h-3.5 w-3.5" />
          {phase === "starting" ? "Opening input…" : "Turn on input"}
        </Button>
      )}

      {(phase === "ready" || recording) && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={`rec-in-${fileCode}`} className="text-xs font-bold text-muted-foreground">
              Input
            </label>
            <select
              id={`rec-in-${fileCode}`}
              value={deviceId}
              disabled={recording}
              onChange={(e) => openInput(e.target.value)}
              className="min-w-0 max-w-full flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
            >
              {devices.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Input ${i + 1}`}
                </option>
              ))}
            </select>
            {format && (
              <span className="text-[11px] text-muted-foreground">
                {(format.rate / 1000).toFixed(1)} kHz · {format.channels === 1 ? "mono → both sides" : "stereo"}
              </span>
            )}
          </div>

          <Meters level={level} clipped={clipped} />

          {recording && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-2 font-mono text-2xl font-black text-foreground">
                <Circle className="h-3 w-3 animate-pulse fill-red-500 text-red-500" />
                {fmtClock(seconds)}
              </span>
              <span className="text-xs text-muted-foreground">{fmtMb(bytes)}</span>
              {secondsLeft < LIMIT_WARN_SECONDS && (
                <span className="text-xs font-bold text-amber-500">
                  Stops by itself in {fmtClock(Math.max(0, secondsLeft))} (upload size limit)
                </span>
              )}
            </div>
          )}
          {silent && (
            <p className="text-xs font-bold text-amber-500">
              No signal for {SILENCE_SECONDS}+ seconds. Check that the right input is picked and the feed is up.
            </p>
          )}
          {clipped && (
            <p className="text-xs text-red-500">
              Clipping. Bring the level down a little so the meters stay out of the red.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {recording ? (
              <Button type="button" size="sm" onClick={stop} className="rounded-full bg-foreground text-background">
                <Square className="mr-1.5 h-3.5 w-3.5 fill-current" />
                Stop
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={start}
                className="rounded-full bg-[#dc2626] text-white hover:bg-[#b91c1c]"
              >
                <Circle className="mr-1.5 h-3.5 w-3.5 fill-current" />
                Start recording
              </Button>
            )}
          </div>
        </>
      )}

      {(phase === "review" || phase === "saving") && take && (
        <div className="space-y-3">
          <audio controls src={take.url} className="w-full" />
          <p className="text-xs text-muted-foreground">
            {fmtClock(take.seconds)} · {fmtMb(take.blob.size)} WAV
            {replacing && (
              <span className="text-amber-500"> · saving replaces the mix already uploaded for {fileCode}</span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={save}
              disabled={phase === "saving"}
              className="rounded-full bg-[#dc2626] text-white hover:bg-[#b91c1c]"
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {phase === "saving" ? `Uploading ${fmtMb(take.blob.size)}…` : `Save to ${fileCode}`}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={discard}
              disabled={phase === "saving"}
              className="rounded-full"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Discard &amp; record again
            </Button>
          </div>
          {phase === "saving" && (
            <p className="text-xs text-muted-foreground">Keep this page open until the upload finishes.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Meters({ level, clipped }: { level: Level; clipped: boolean }) {
  return (
    <div className="space-y-1.5" aria-label="Input level">
      {(["l", "r"] as const).map((side) => {
        const db = toDb(level[side]);
        const pct = Number.isFinite(db) ? Math.max(0, Math.min(100, ((db + 60) / 60) * 100)) : 0;
        const color = db > -3 ? "bg-red-500" : db > -12 ? "bg-amber-400" : "bg-[#74ddc7]";
        return (
          <div key={side} className="flex items-center gap-2">
            <span className="w-3 text-[10px] font-bold uppercase text-muted-foreground">{side}</span>
            <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
              <div className={`h-full ${color} transition-[width] duration-75`} style={{ width: `${pct}%` }} />
            </div>
            <span className="w-14 text-right font-mono text-[10px] text-muted-foreground">
              {Number.isFinite(db) ? `${db.toFixed(1)} dB` : "-∞ dB"}
            </span>
          </div>
        );
      })}
      {clipped && <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">Clip</span>}
    </div>
  );
}
