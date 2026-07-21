"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Mic,
  Music,
  Download,
  Loader2,
  Play,
  Wand2,
  Radio,
  Upload,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { LoginRequired } from "@/components/auth/login-required";
import { createClient } from "@/lib/supabase/client";

const ACCENT = "#74ddc7";

type VoiceAccent = "us" | "uk" | "au" | "in";
type VoiceStyle = "natural" | "warm" | "deep" | "bright";
type BedId = "none" | "uplift" | "chill" | "drive" | "upload";

const ACCENTS: { id: VoiceAccent; label: string }[] = [
  { id: "us", label: "American" },
  { id: "uk", label: "British" },
  { id: "au", label: "Australian" },
  { id: "in", label: "Indian" },
];

const STYLES: { id: VoiceStyle; label: string; detune: number }[] = [
  { id: "natural", label: "Natural", detune: 0 },
  { id: "warm", label: "Warm", detune: -120 },
  { id: "deep", label: "Deep Announcer", detune: -300 },
  { id: "bright", label: "Bright / Upbeat", detune: 220 },
];

const BEDS: { id: BedId; label: string; src?: string }[] = [
  { id: "none", label: "No music (voice only)" },
  { id: "uplift", label: "Uplift", src: "/commercial-beds/uplift.mp3" },
  { id: "chill", label: "Chill", src: "/commercial-beds/chill.mp3" },
  { id: "drive", label: "Drive", src: "/commercial-beds/drive.mp3" },
  { id: "upload", label: "Upload my own…" },
];

const SAMPLE_SCRIPT =
  "Looking for the best mix of old school and today's hits? Tune in to W-C-C-G, 104.5 F-M — " +
  "Fayetteville's home for the music you love. From morning drive to late night, we've got you covered. " +
  "W-C-C-G 104.5. Turn it up.";

function b64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/** Encode an AudioBuffer to a 16-bit PCM WAV Blob. */
function encodeWav(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels;
  const sr = buffer.sampleRate;
  const frames = buffer.length;
  const chans: Float32Array[] = [];
  for (let c = 0; c < numCh; c++) chans.push(buffer.getChannelData(c));

  const bytesPerSample = 2;
  const blockAlign = numCh * bytesPerSample;
  const dataSize = frames * blockAlign;
  const ab = new ArrayBuffer(44 + dataSize);
  const view = new DataView(ab);

  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  let off = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < numCh; c++) {
      let s = chans[c][i];
      s = Math.max(-1, Math.min(1, s));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  return new Blob([ab], { type: "audio/wav" });
}

export default function CommercialProducerPage() {
  const [supabase] = useState(() => createClient());

  const [script, setScript] = useState(SAMPLE_SCRIPT);
  const [accent, setAccent] = useState<VoiceAccent>("us");
  const [style, setStyle] = useState<VoiceStyle>("deep");
  const [bed, setBed] = useState<BedId>("uplift");
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [musicVol, setMusicVol] = useState(0.35);
  const [duck, setDuck] = useState(true);
  const [leadIn, setLeadIn] = useState(1.2);
  const [tail, setTail] = useState(2.0);

  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultLen, setResultLen] = useState<number | null>(null);

  const uploadBufRef = useRef<ArrayBuffer | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const charCount = script.trim().length;
  const tooLong = charCount > 3000;

  const styleDetune = useMemo(
    () => STYLES.find((s) => s.id === style)?.detune ?? 0,
    [style],
  );

  const onUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadName(f.name);
    setBed("upload");
    const r = new FileReader();
    r.onload = () => {
      uploadBufRef.current = r.result as ArrayBuffer;
    };
    r.readAsArrayBuffer(f);
  }, []);

  const produce = useCallback(async () => {
    setError(null);
    setResultUrl(null);
    setResultLen(null);
    if (!script.trim()) {
      setError("Write a script first.");
      return;
    }
    if (tooLong) {
      setError("Script is too long (max 3000 characters).");
      return;
    }
    setBusy(true);
    try {
      // 1) Voiceover via the free TTS edge function.
      setStatusMsg("Generating voiceover…");
      const { data, error: fnErr } = await supabase.functions.invoke<{
        audio_b64?: string;
        error?: string;
      }>("tts-commercial", { body: { text: script.trim(), voice: accent } });
      if (fnErr) throw new Error(fnErr.message || "Voiceover request failed.");
      if (!data?.audio_b64) throw new Error(data?.error || "No audio returned.");

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const decodeCtx = new AudioCtx();
      const voiceBuf = await decodeCtx.decodeAudioData(
        b64ToArrayBuffer(data.audio_b64),
      );

      // 2) Music bed (optional).
      setStatusMsg("Loading music bed…");
      let bedBuf: AudioBuffer | null = null;
      if (bed === "upload" && uploadBufRef.current) {
        bedBuf = await decodeCtx.decodeAudioData(uploadBufRef.current.slice(0));
      } else {
        const meta = BEDS.find((b) => b.id === bed);
        if (meta?.src) {
          const res = await fetch(meta.src);
          bedBuf = await decodeCtx.decodeAudioData(await res.arrayBuffer());
        }
      }
      await decodeCtx.close();

      // 3) Mix offline: [lead-in] voice(+ducked bed) [tail].
      setStatusMsg("Mixing commercial…");
      const sr = 44100;
      const voiceDur = voiceBuf.duration;
      const total = leadIn + voiceDur + tail;
      const off = new OfflineAudioContext(2, Math.ceil(total * sr), sr);

      // Voice
      const vSrc = off.createBufferSource();
      vSrc.buffer = voiceBuf;
      try {
        vSrc.detune.value = styleDetune;
      } catch {
        /* detune unsupported — ignore */
      }
      const vGain = off.createGain();
      vGain.gain.value = 1.0;
      vSrc.connect(vGain);

      // Music bed
      if (bedBuf) {
        const mSrc = off.createBufferSource();
        mSrc.buffer = bedBuf;
        mSrc.loop = true;
        const mGain = off.createGain();
        const base = musicVol;
        const duckLvl = duck ? base * 0.28 : base;
        const g = mGain.gain;
        g.setValueAtTime(base, 0);
        if (duck) {
          g.setValueAtTime(base, Math.max(0, leadIn - 0.3));
          g.linearRampToValueAtTime(duckLvl, leadIn + 0.25);
          g.setValueAtTime(duckLvl, leadIn + voiceDur);
          g.linearRampToValueAtTime(base, Math.min(total, leadIn + voiceDur + 0.6));
        }
        // graceful tail fade
        g.setValueAtTime(base, Math.max(0, total - 0.6));
        g.linearRampToValueAtTime(0.0001, total);
        mSrc.connect(mGain);
        mGain.connect(off.destination);
        mSrc.start(0);
        mSrc.stop(total);
      }

      // Voice bus -> soft limiter -> out
      const limiter = off.createDynamicsCompressor();
      limiter.threshold.value = -3;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.25;
      vGain.connect(limiter);
      limiter.connect(off.destination);
      vSrc.start(leadIn);

      const rendered = await off.startRendering();
      const wav = encodeWav(rendered);
      const url = URL.createObjectURL(wav);
      setResultUrl(url);
      setResultLen(total);
      setStatusMsg(null);
      // autoplay preview
      setTimeout(() => audioElRef.current?.play().catch(() => {}), 150);
    } catch (e) {
      setError((e as Error).message || "Something went wrong.");
      setStatusMsg(null);
    } finally {
      setBusy(false);
    }
  }, [script, tooLong, supabase, accent, bed, leadIn, tail, musicVol, duck, styleDetune]);

  return (
    <LoginRequired>
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-6xl px-4 py-10">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${ACCENT}22`, color: ACCENT }}
            >
              <Radio className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight">Commercial Producer</h1>
              <p className="text-sm text-muted-foreground">
                Paste a script, pick a voice and a music bed, and get a finished, downloadable radio spot.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] mt-6">
            {/* LEFT — script + controls */}
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label htmlFor="script" className="flex items-center gap-1.5">
                    <Mic className="h-4 w-4" /> Commercial script
                  </Label>
                  <span
                    className={`text-xs ${tooLong ? "text-red-400" : "text-muted-foreground"}`}
                  >
                    {charCount} / 3000
                  </span>
                </div>
                <Textarea
                  id="script"
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  rows={8}
                  placeholder="Write your 15–30 second commercial here. Tip: spell station calls as 'W-C-C-G' so they read as letters."
                  className="resize-y font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setScript(SAMPLE_SCRIPT)}
                  className="mt-1 text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Load sample script
                </button>
              </div>

              {/* Voice */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Wand2 className="h-4 w-4" style={{ color: ACCENT }} /> Voice
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Accent</Label>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {ACCENTS.map((a) => (
                        <Chip key={a.id} active={accent === a.id} onClick={() => setAccent(a.id)}>
                          {a.label}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Delivery</Label>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {STYLES.map((s) => (
                        <Chip key={s.id} active={style === s.id} onClick={() => setStyle(s.id)}>
                          {s.label}
                        </Chip>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Music */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Music className="h-4 w-4" style={{ color: ACCENT }} /> Music bed
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {BEDS.map((b) => (
                    <Chip key={b.id} active={bed === b.id} onClick={() => setBed(b.id)}>
                      {b.label}
                    </Chip>
                  ))}
                </div>
                {bed === "upload" && (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 hover:border-foreground/40">
                      <Upload className="h-3.5 w-3.5" /> Choose audio file
                    </span>
                    <span>{uploadName ?? "no file selected"}</span>
                    <input type="file" accept="audio/*" className="hidden" onChange={onUpload} />
                  </label>
                )}

                {bed !== "none" && (
                  <div className="grid grid-cols-1 gap-3 pt-1">
                    <Slider
                      label={`Music volume — ${Math.round(musicVol * 100)}%`}
                      min={0}
                      max={0.9}
                      step={0.05}
                      value={musicVol}
                      onChange={setMusicVol}
                    />
                    <div className="flex items-center gap-2">
                      <Switch id="duck" checked={duck} onCheckedChange={setDuck} />
                      <Label htmlFor="duck" className="text-xs text-muted-foreground">
                        Auto-duck music under the voice
                      </Label>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Slider
                    label={`Music lead-in — ${leadIn.toFixed(1)}s`}
                    min={0}
                    max={5}
                    step={0.1}
                    value={leadIn}
                    onChange={setLeadIn}
                  />
                  <Slider
                    label={`Music tail — ${tail.toFixed(1)}s`}
                    min={0}
                    max={6}
                    step={0.1}
                    value={tail}
                    onChange={setTail}
                  />
                </div>
              </div>

              <Button
                onClick={produce}
                disabled={busy || tooLong}
                className="w-full h-11 text-base font-semibold"
                style={{ backgroundColor: ACCENT, color: "#06251f" }}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {statusMsg ?? "Producing…"}
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-5 w-5" /> Produce commercial
                  </>
                )}
              </Button>
            </div>

            {/* RIGHT — output */}
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-5 min-h-[220px] flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Finished spot</span>
                  {resultLen != null && (
                    <Badge variant="secondary">{resultLen.toFixed(1)}s</Badge>
                  )}
                </div>

                {error && (
                  <div className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                    {error}
                  </div>
                )}

                {!resultUrl && !error && (
                  <div className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
                    {busy ? (statusMsg ?? "Working…") : "Your produced commercial will appear here."}
                  </div>
                )}

                {resultUrl && (
                  <div className="mt-4 space-y-3">
                    <audio ref={audioElRef} src={resultUrl} controls className="w-full" />
                    <a href={resultUrl} download="wccg-commercial.wav" className="block">
                      <Button
                        className="w-full"
                        style={{ backgroundColor: ACCENT, color: "#06251f" }}
                      >
                        <Download className="mr-2 h-4 w-4" /> Download WAV
                      </Button>
                    </a>
                    <p className="text-xs text-muted-foreground">
                      Broadcast-ready 44.1 kHz stereo WAV. Rename to a cart number (e.g.{" "}
                      <span className="font-mono">DJB_803.wav</span>) and drop into your Convert
                      folder to air it.
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Info className="h-3.5 w-3.5" /> About the audio
                </div>
                <p>
                  The voiceover uses a free text-to-speech engine (no account needed). Music beds
                  are original, royalty-free loops — or upload your own bed. Everything is mixed
                  right in your browser, so nothing leaves your machine except the script text.
                </p>
                <p>
                  Want premium AI voices from your Higgsfield account? That needs a Higgsfield API
                  key added to the site&apos;s secrets — ask to have it wired in and this tool will
                  offer those voices too.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LoginRequired>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? "border-transparent text-[#06251f]"
          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
      }`}
      style={active ? { backgroundColor: ACCENT } : undefined}
    >
      {children}
    </button>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-1 w-full accent-[#74ddc7]"
      />
    </div>
  );
}
