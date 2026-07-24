"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Mic,
  Music,
  Download,
  Loader2,
  Play,
  Radio,
  Upload,
  Info,
  Volume2,
  Sparkles,
  Square,
  Trash2,
  AudioLines,
  Scissors,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { LoginRequired } from "@/components/auth/login-required";
import { createClient } from "@/lib/supabase/client";
import { saveAudioFile } from "@/lib/audio-store";

const ACCENT = "#74ddc7";

type Gender = "all" | "Male" | "Female";

// Where the voiceover track comes from: a neural TTS voice, or the user's own
// recorded/uploaded audio. Both produce an AudioBuffer that feeds the same mixer.
type VoiceSource = "ai" | "mine";

type Voice = {
  id: string; // Azure ShortName
  name: string;
  gender: "Male" | "Female";
  group: string; // heritage / accent group
  desc: string;
};

// Curated subset of Microsoft neural voices, grouped by accent / heritage.
const VOICES: Voice[] = [
  // American
  { id: "en-US-GuyNeural", name: "Guy", gender: "Male", group: "American", desc: "Warm, confident" },
  { id: "en-US-AndrewNeural", name: "Andrew", gender: "Male", group: "American", desc: "Warm, casual host" },
  { id: "en-US-BrianNeural", name: "Brian", gender: "Male", group: "American", desc: "Easy, conversational" },
  { id: "en-US-ChristopherNeural", name: "Christopher", gender: "Male", group: "American", desc: "Authoritative" },
  { id: "en-US-EricNeural", name: "Eric", gender: "Male", group: "American", desc: "Mature, steady" },
  { id: "en-US-RogerNeural", name: "Roger", gender: "Male", group: "American", desc: "Deep, mature" },
  { id: "en-US-AriaNeural", name: "Aria", gender: "Female", group: "American", desc: "Confident, newsy" },
  { id: "en-US-JennyNeural", name: "Jenny", gender: "Female", group: "American", desc: "Friendly, warm" },
  { id: "en-US-AvaNeural", name: "Ava", gender: "Female", group: "American", desc: "Bright, modern" },
  { id: "en-US-EmmaNeural", name: "Emma", gender: "Female", group: "American", desc: "Light, upbeat" },
  { id: "en-US-MichelleNeural", name: "Michelle", gender: "Female", group: "American", desc: "Warm, mature" },
  // British
  { id: "en-GB-RyanNeural", name: "Ryan", gender: "Male", group: "British", desc: "Smooth, refined" },
  { id: "en-GB-ThomasNeural", name: "Thomas", gender: "Male", group: "British", desc: "Crisp, formal" },
  { id: "en-GB-SoniaNeural", name: "Sonia", gender: "Female", group: "British", desc: "Elegant, clear" },
  { id: "en-GB-LibbyNeural", name: "Libby", gender: "Female", group: "British", desc: "Youthful, bright" },
  // Nigerian / West African
  { id: "en-NG-AbeoNeural", name: "Abeo", gender: "Male", group: "Nigerian (West African)", desc: "Rich, resonant" },
  { id: "en-NG-EzinneNeural", name: "Ezinne", gender: "Female", group: "Nigerian (West African)", desc: "Warm, expressive" },
  // South African
  { id: "en-ZA-LukeNeural", name: "Luke", gender: "Male", group: "South African", desc: "Grounded, friendly" },
  { id: "en-ZA-LeahNeural", name: "Leah", gender: "Female", group: "South African", desc: "Smooth, warm" },
  // East African
  { id: "en-KE-ChilembaNeural", name: "Chilemba", gender: "Male", group: "East African (Kenya/Tanzania)", desc: "Clear, measured" },
  { id: "en-KE-AsiliaNeural", name: "Asilia", gender: "Female", group: "East African (Kenya/Tanzania)", desc: "Bright, friendly" },
  { id: "en-TZ-ElimuNeural", name: "Elimu", gender: "Male", group: "East African (Kenya/Tanzania)", desc: "Steady, warm" },
  { id: "en-TZ-ImaniNeural", name: "Imani", gender: "Female", group: "East African (Kenya/Tanzania)", desc: "Gentle, clear" },
  // Australian
  { id: "en-AU-WilliamNeural", name: "William", gender: "Male", group: "Australian", desc: "Relaxed, friendly" },
  { id: "en-AU-NatashaNeural", name: "Natasha", gender: "Female", group: "Australian", desc: "Bright, breezy" },
  // Irish
  { id: "en-IE-ConnorNeural", name: "Connor", gender: "Male", group: "Irish", desc: "Charming, warm" },
  { id: "en-IE-EmilyNeural", name: "Emily", gender: "Female", group: "Irish", desc: "Soft, lyrical" },
  // Indian
  { id: "en-IN-PrabhatNeural", name: "Prabhat", gender: "Male", group: "Indian", desc: "Clear, professional" },
  { id: "en-IN-NeerjaNeural", name: "Neerja", gender: "Female", group: "Indian", desc: "Warm, articulate" },
  // Canadian
  { id: "en-CA-LiamNeural", name: "Liam", gender: "Male", group: "Canadian", desc: "Neutral, friendly" },
  { id: "en-CA-ClaraNeural", name: "Clara", gender: "Female", group: "Canadian", desc: "Clear, pleasant" },
];

const GROUPS = Array.from(new Set(VOICES.map((v) => v.group)));

type Tone = { id: string; label: string; rate: number; pitch: number };
const TONES: Tone[] = [
  { id: "neutral", label: "Neutral", rate: 0, pitch: 0 },
  { id: "hype", label: "Energetic / Hype", rate: 13, pitch: 2 },
  { id: "warm", label: "Warm / Friendly", rate: -2, pitch: 0 },
  { id: "authority", label: "Authoritative", rate: -4, pitch: -6 },
  { id: "deep", label: "Deep Announcer", rate: -5, pitch: -10 },
  { id: "calm", label: "Calm / Soothing", rate: -9, pitch: -2 },
  { id: "promo", label: "Fast Promo", rate: 22, pitch: 1 },
];

type BedId = "none" | "uplift" | "chill" | "drive" | "upload";
const BEDS: { id: BedId; label: string; src?: string }[] = [
  { id: "none", label: "No music" },
  { id: "uplift", label: "Uplift", src: "/commercial-beds/uplift.mp3" },
  { id: "chill", label: "Chill", src: "/commercial-beds/chill.mp3" },
  { id: "drive", label: "Drive", src: "/commercial-beds/drive.mp3" },
  { id: "upload", label: "Upload my own…" },
];

const SAMPLE =
  "Looking for the best mix of old school and today's hits? Tune in to W-C-C-G, 104.5 F-M — " +
  "Fayetteville's home for the music you love. W-C-C-G 104.5. Turn it up.";

function b64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function newAudioCtx(): AudioContext {
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return new AudioCtx();
}

function encodeWav(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels;
  const sr = buffer.sampleRate;
  const frames = buffer.length;
  const chans: Float32Array[] = [];
  for (let c = 0; c < numCh; c++) chans.push(buffer.getChannelData(c));
  const blockAlign = numCh * 2;
  const dataSize = frames * blockAlign;
  const ab = new ArrayBuffer(44 + dataSize);
  const view = new DataView(ab);
  const w = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  w(0, "RIFF"); view.setUint32(4, 36 + dataSize, true); w(8, "WAVE"); w(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, numCh, true);
  view.setUint32(24, sr, true); view.setUint32(28, sr * blockAlign, true);
  view.setUint16(32, blockAlign, true); view.setUint16(34, 16, true); w(36, "data");
  view.setUint32(40, dataSize, true);
  let off = 44;
  for (let i = 0; i < frames; i++)
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, chans[c][i]));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true); off += 2;
    }
  return new Blob([ab], { type: "audio/wav" });
}

const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export default function ProductionStudioPage() {
  const [supabase] = useState(() => createClient());

  const [script, setScript] = useState(SAMPLE);
  const [gender, setGender] = useState<Gender>("all");
  const [group, setGroup] = useState<string>("American");
  const [voiceId, setVoiceId] = useState<string>("en-US-GuyNeural");
  const [tone, setTone] = useState<string>("hype");
  const [pace, setPace] = useState(0); // extra % on top of tone
  const [pitchAdj, setPitchAdj] = useState(0); // extra Hz on top of tone

  // Own-voice recording
  const [voiceSource, setVoiceSource] = useState<VoiceSource>("ai");
  const [recording, setRecording] = useState(false);
  const [ownVoiceUrl, setOwnVoiceUrl] = useState<string | null>(null);
  const [ownVoiceName, setOwnVoiceName] = useState<string | null>(null);
  const [ownVoiceDur, setOwnVoiceDur] = useState<number | null>(null);
  const ownVoiceBufRef = useRef<ArrayBuffer | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [bed, setBed] = useState<BedId>("uplift");
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [musicVol, setMusicVol] = useState(0.32);
  const [duck, setDuck] = useState(true);
  const [leadIn, setLeadIn] = useState(1.0);
  const [tail, setTail] = useState(2.0);

  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultLen, setResultLen] = useState<number | null>(null);
  const [voiceOnlyUrl, setVoiceOnlyUrl] = useState<string | null>(null);
  const [handoff, setHandoff] = useState(false);

  const uploadBufRef = useRef<ArrayBuffer | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const resultBufRef = useRef<AudioBuffer | null>(null);
  const router = useRouter();

  // Hand audio off to the full Audio Editor (waveform, trim, non-destructive
  // undo/redo). Saves a clean WAV to the shared audio-store, then opens the
  // editor with ?open=<id> so it loads straight into the waveform.
  const sendToEditor = useCallback(
    async (buf: AudioBuffer, name: string) => {
      setError(null);
      setHandoff(true);
      try {
        const wav = encodeWav(buf);
        const id = `ps-${Date.now()}`;
        const sizeStr = wav.size > 1048576 ? `${(wav.size / 1048576).toFixed(1)} MB` : `${(wav.size / 1024).toFixed(0)} KB`;
        const dur = `${Math.floor(buf.duration / 60)}:${String(Math.floor(buf.duration % 60)).padStart(2, "0")}`;
        await saveAudioFile({ id, name, duration: dur, size: sizeStr, blob: wav, createdAt: Date.now() });
        router.push(`/studio/audio-editor?open=${id}`);
      } catch (e) {
        setError((e as Error).message);
        setHandoff(false);
      }
    },
    [router],
  );

  const editRecording = useCallback(async () => {
    if (!ownVoiceBufRef.current) { setError("Record or upload your voice first."); return; }
    const ctx = newAudioCtx();
    const buf = await ctx.decodeAudioData(ownVoiceBufRef.current.slice(0));
    await ctx.close();
    await sendToEditor(buf, "Voice-over recording");
  }, [sendToEditor]);

  const editResult = useCallback(async () => {
    if (!resultBufRef.current) return;
    await sendToEditor(resultBufRef.current, "Produced spot");
  }, [sendToEditor]);

  const charCount = script.trim().length;
  const tooLong = charCount > 2800;
  const usingOwnVoice = voiceSource === "mine";

  // Release the mic if the page unmounts mid-recording.
  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  const filtered = useMemo(
    () => VOICES.filter((v) => v.group === group && (gender === "all" || v.gender === gender)),
    [group, gender],
  );
  const selectedVoice = useMemo(() => VOICES.find((v) => v.id === voiceId) ?? VOICES[0], [voiceId]);

  const prosody = useMemo(() => {
    const t = TONES.find((x) => x.id === tone) ?? TONES[0];
    const rate = Math.max(-90, Math.min(90, t.rate + pace));
    const pitch = Math.max(-40, Math.min(40, t.pitch + pitchAdj));
    return { rate: `${sign(rate)}%`, pitch: `${sign(pitch)}Hz`, volume: "+0%" };
  }, [tone, pace, pitchAdj]);

  const onUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadName(f.name);
    setBed("upload");
    const r = new FileReader();
    r.onload = () => { uploadBufRef.current = r.result as ArrayBuffer; };
    r.readAsArrayBuffer(f);
  }, []);

  // --- own voice: record / upload -----------------------------------------
  const measure = useCallback(async (ab: ArrayBuffer) => {
    try {
      const c = newAudioCtx();
      const d = await c.decodeAudioData(ab.slice(0));
      setOwnVoiceDur(d.duration);
      await c.close();
      return true;
    } catch {
      setOwnVoiceDur(null);
      return false;
    }
  }, []);

  const startRec = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        const ab = await blob.arrayBuffer();
        ownVoiceBufRef.current = ab;
        setOwnVoiceUrl(URL.createObjectURL(blob));
        setOwnVoiceName("Your recording");
        await measure(ab);
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setError("Couldn't access your microphone — allow mic permission in your browser and try again.");
    }
  }, [measure]);

  const stopRec = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }, []);

  const clearRec = useCallback(() => {
    ownVoiceBufRef.current = null;
    setOwnVoiceUrl(null);
    setOwnVoiceName(null);
    setOwnVoiceDur(null);
  }, []);

  const onVoiceUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);
    const ab = await f.arrayBuffer();
    ownVoiceBufRef.current = ab;
    setOwnVoiceName(f.name);
    setOwnVoiceUrl(URL.createObjectURL(f));
    const ok = await measure(ab);
    if (!ok) setError("That file couldn't be decoded — try MP3, WAV, or M4A.");
  }, [measure]);

  // Voiceover track: either the user's own audio, or neural TTS.
  const fetchVoice = useCallback(
    async (): Promise<AudioBuffer> => {
      if (usingOwnVoice) {
        if (!ownVoiceBufRef.current) throw new Error("Record or upload your voice first.");
        const ctx = newAudioCtx();
        const buf = await ctx.decodeAudioData(ownVoiceBufRef.current.slice(0));
        await ctx.close();
        return buf;
      }
      const { data, error: fnErr } = await supabase.functions.invoke<{ audio_b64?: string; error?: string }>(
        "produce-voice",
        { body: { text: script.trim(), voice: voiceId, rate: prosody.rate, pitch: prosody.pitch, volume: prosody.volume } },
      );
      if (fnErr) throw new Error(fnErr.message || "Voice request failed.");
      if (!data?.audio_b64) throw new Error(data?.error || "No audio returned.");
      const ctx = newAudioCtx();
      const buf = await ctx.decodeAudioData(b64ToArrayBuffer(data.audio_b64));
      await ctx.close();
      return buf;
    },
    [supabase, script, voiceId, prosody, usingOwnVoice],
  );

  // Shared input check for both preview and produce.
  const inputProblem = useCallback((): string | null => {
    if (usingOwnVoice) return ownVoiceBufRef.current ? null : "Record or upload your voice first.";
    if (!script.trim()) return "Write a script first.";
    if (tooLong) return "Script is too long (max 2800 characters).";
    return null;
  }, [usingOwnVoice, script, tooLong]);

  const previewVoice = useCallback(async () => {
    setError(null); setVoiceOnlyUrl(null);
    const problem = inputProblem();
    if (problem) { setError(problem); return; }
    setBusy(true); setStatusMsg("Generating voice preview…");
    try {
      const buf = await fetchVoice();
      const wav = encodeWav(buf);
      const url = URL.createObjectURL(wav);
      setVoiceOnlyUrl(url);
      setTimeout(() => audioElRef.current && (audioElRef.current.src = url, audioElRef.current.play().catch(() => {})), 100);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); setStatusMsg(null); }
  }, [fetchVoice, inputProblem]);

  const produce = useCallback(async () => {
    setError(null); setResultUrl(null); setResultLen(null);
    const problem = inputProblem();
    if (problem) { setError(problem); return; }
    setBusy(true);
    try {
      setStatusMsg(usingOwnVoice ? "Preparing your voice…" : "Generating voiceover…");
      const voiceBuf = await fetchVoice();

      setStatusMsg("Loading music bed…");
      const decodeCtx = newAudioCtx();
      let bedBuf: AudioBuffer | null = null;
      if (bed === "upload" && uploadBufRef.current) bedBuf = await decodeCtx.decodeAudioData(uploadBufRef.current.slice(0));
      else {
        const meta = BEDS.find((b) => b.id === bed);
        if (meta?.src) bedBuf = await decodeCtx.decodeAudioData(await (await fetch(meta.src)).arrayBuffer());
      }
      await decodeCtx.close();

      setStatusMsg("Mixing…");
      const sr = 44100;
      const voiceDur = voiceBuf.duration;
      const total = leadIn + voiceDur + tail;
      const off = new OfflineAudioContext(2, Math.ceil(total * sr), sr);

      const vSrc = off.createBufferSource();
      vSrc.buffer = voiceBuf;
      const vGain = off.createGain(); vGain.gain.value = 1.0;
      vSrc.connect(vGain);

      if (bedBuf) {
        const mSrc = off.createBufferSource();
        mSrc.buffer = bedBuf; mSrc.loop = true;
        const mGain = off.createGain();
        const base = musicVol; const duckLvl = duck ? base * 0.28 : base;
        const g = mGain.gain;
        g.setValueAtTime(base, 0);
        if (duck) {
          g.setValueAtTime(base, Math.max(0, leadIn - 0.3));
          g.linearRampToValueAtTime(duckLvl, leadIn + 0.25);
          g.setValueAtTime(duckLvl, leadIn + voiceDur);
          g.linearRampToValueAtTime(base, Math.min(total, leadIn + voiceDur + 0.6));
        }
        g.setValueAtTime(base, Math.max(0, total - 0.6));
        g.linearRampToValueAtTime(0.0001, total);
        mSrc.connect(mGain); mGain.connect(off.destination);
        mSrc.start(0); mSrc.stop(total);
      }

      const limiter = off.createDynamicsCompressor();
      limiter.threshold.value = -3; limiter.ratio.value = 12;
      limiter.attack.value = 0.003; limiter.release.value = 0.25;
      vGain.connect(limiter); limiter.connect(off.destination);
      vSrc.start(leadIn);

      const rendered = await off.startRendering();
      resultBufRef.current = rendered;
      const url = URL.createObjectURL(encodeWav(rendered));
      setResultUrl(url); setResultLen(total); setStatusMsg(null);
      setTimeout(() => audioElRef.current && (audioElRef.current.src = url, audioElRef.current.play().catch(() => {})), 120);
    } catch (e) { setError((e as Error).message); setStatusMsg(null); }
    finally { setBusy(false); }
  }, [fetchVoice, inputProblem, usingOwnVoice, bed, leadIn, tail, musicVol, duck]);

  const blocked = busy || (!usingOwnVoice && tooLong);

  return (
    <LoginRequired>
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${ACCENT}22`, color: ACCENT }}>
              <Radio className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight">Production Studio</h1>
              <p className="text-sm text-muted-foreground">
                Script → voiceover + music bed → finished, downloadable production. Use an AI voice, or record your own.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <div className="space-y-5">
              {/* Script */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label htmlFor="script" className="flex items-center gap-1.5"><Mic className="h-4 w-4" /> Script</Label>
                  <span className={`text-xs ${tooLong && !usingOwnVoice ? "text-red-400" : "text-muted-foreground"}`}>{charCount} / 2800</span>
                </div>
                <Textarea id="script" value={script} onChange={(e) => setScript(e.target.value)} rows={7}
                  placeholder="Write your 15–60 second spot. Spell station calls as 'W-C-C-G' so they read as letters."
                  className="resize-y font-mono text-sm" />
                <button type="button" onClick={() => setScript(SAMPLE)} className="mt-1 text-xs text-muted-foreground hover:text-foreground underline">Load sample</button>
                {usingOwnVoice && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Using your own voice — the script is just your read-along sheet, it isn&apos;t synthesized.
                  </p>
                )}
              </div>

              {/* Voice source */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <AudioLines className="h-4 w-4" style={{ color: ACCENT }} /> Voice source
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Chip active={voiceSource === "ai"} onClick={() => setVoiceSource("ai")}>AI voice</Chip>
                  <Chip active={voiceSource === "mine"} onClick={() => setVoiceSource("mine")}>My own voice</Chip>
                </div>

                {usingOwnVoice && (
                  <div className="space-y-3 pt-1">
                    <p className="text-[11px] text-muted-foreground">
                      Read your script out loud and we&apos;ll mix your take with the music bed. Your audio is processed
                      right here in your browser — it&apos;s never uploaded.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {!recording ? (
                        <Button type="button" variant="outline" size="sm" onClick={startRec}>
                          <Mic className="mr-2 h-4 w-4" /> {ownVoiceUrl ? "Re-record" : "Record"}
                        </Button>
                      ) : (
                        <Button type="button" size="sm" onClick={stopRec} className="bg-red-600 text-white hover:bg-red-700">
                          <Square className="mr-2 h-3.5 w-3.5" /> Stop
                        </Button>
                      )}
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-foreground/40">
                        <Upload className="h-3.5 w-3.5" /> Upload audio
                        <input type="file" accept="audio/*" className="hidden" onChange={onVoiceUpload} />
                      </label>
                      {ownVoiceUrl && !recording && (
                        <button type="button" onClick={clearRec} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                          <Trash2 className="h-3.5 w-3.5" /> Clear
                        </button>
                      )}
                      {recording && (
                        <span className="flex items-center gap-1.5 text-xs text-red-400">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> Recording…
                        </span>
                      )}
                    </div>
                    {ownVoiceUrl && (
                      <div className="space-y-1.5">
                        <audio src={ownVoiceUrl} controls className="w-full" />
                        <p className="text-[11px] text-muted-foreground">
                          {ownVoiceName}{ownVoiceDur != null ? ` · ${ownVoiceDur.toFixed(1)}s` : ""}
                        </p>
                        {!recording && (
                          <Button type="button" variant="outline" size="sm" onClick={editRecording} disabled={handoff}>
                            {handoff ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Scissors className="mr-2 h-4 w-4" />}
                            Edit in Audio Editor
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {voiceSource === "ai" && (
                <>
                  {/* Voice & heritage */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4" style={{ color: ACCENT }} /> Voice &amp; accent</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(["all", "Male", "Female"] as Gender[]).map((g) => (
                        <Chip key={g} active={gender === g} onClick={() => setGender(g)}>{g === "all" ? "All genders" : g}</Chip>
                      ))}
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Accent / heritage</Label>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {GROUPS.map((g) => (
                          <Chip key={g} active={group === g} onClick={() => {
                            setGroup(g);
                            const first = VOICES.find((v) => v.group === g && (gender === "all" || v.gender === gender));
                            if (first) setVoiceId(first.id);
                          }}>{g}</Chip>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Voice</Label>
                      <div className="mt-1 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                        {filtered.map((v) => (
                          <button key={v.id} type="button" onClick={() => setVoiceId(v.id)}
                            className={`rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors ${voiceId === v.id ? "border-transparent text-[#06251f]" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"}`}
                            style={voiceId === v.id ? { backgroundColor: ACCENT } : undefined}>
                            <div className="font-semibold">{v.name}</div>
                            <div className={voiceId === v.id ? "opacity-80" : "opacity-70"}>{v.gender} · {v.desc}</div>
                          </button>
                        ))}
                        {filtered.length === 0 && <p className="col-span-full text-xs text-muted-foreground">No {gender} voice in this group — try All genders.</p>}
                      </div>
                    </div>
                  </div>

                  {/* Tone */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold"><Volume2 className="h-4 w-4" style={{ color: ACCENT }} /> Tone &amp; delivery</div>
                    <div className="flex flex-wrap gap-1.5">
                      {TONES.map((t) => (<Chip key={t.id} active={tone === t.id} onClick={() => setTone(t.id)}>{t.label}</Chip>))}
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <Slider label={`Pace ${sign(pace)}%`} min={-40} max={40} step={1} value={pace} onChange={setPace} />
                      <Slider label={`Pitch ${sign(pitchAdj)}`} min={-15} max={15} step={1} value={pitchAdj} onChange={setPitchAdj} />
                    </div>
                    <p className="text-[11px] text-muted-foreground">Applied: rate {prosody.rate}, pitch {prosody.pitch}</p>
                  </div>
                </>
              )}

              {/* Music */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold"><Music className="h-4 w-4" style={{ color: ACCENT }} /> Music bed</div>
                <div className="flex flex-wrap gap-1.5">
                  {BEDS.map((b) => (<Chip key={b.id} active={bed === b.id} onClick={() => setBed(b.id)}>{b.label}</Chip>))}
                </div>
                {bed === "upload" && (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 hover:border-foreground/40"><Upload className="h-3.5 w-3.5" /> Choose audio file</span>
                    <span>{uploadName ?? "no file selected"}</span>
                    <input type="file" accept="audio/*" className="hidden" onChange={onUpload} />
                  </label>
                )}
                {bed !== "none" && (
                  <div className="space-y-3 pt-1">
                    <Slider label={`Music volume — ${Math.round(musicVol * 100)}%`} min={0} max={0.9} step={0.05} value={musicVol} onChange={setMusicVol} />
                    <div className="flex items-center gap-2">
                      <Switch id="duck" checked={duck} onCheckedChange={setDuck} />
                      <Label htmlFor="duck" className="text-xs text-muted-foreground">Auto-duck music under the voice</Label>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Slider label={`Lead-in — ${leadIn.toFixed(1)}s`} min={0} max={5} step={0.1} value={leadIn} onChange={setLeadIn} />
                  <Slider label={`Tail — ${tail.toFixed(1)}s`} min={0} max={6} step={0.1} value={tail} onChange={setTail} />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={previewVoice} disabled={blocked} className="flex-1">
                  {busy && statusMsg?.includes("preview") ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />} Preview voice
                </Button>
                <Button onClick={produce} disabled={blocked} className="flex-[1.4] h-11 text-base font-semibold" style={{ backgroundColor: ACCENT, color: "#06251f" }}>
                  {busy && !statusMsg?.includes("preview") ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> {statusMsg ?? "Producing…"}</> : <><Radio className="mr-2 h-5 w-5" /> Produce</>}
                </Button>
              </div>
            </div>

            {/* Output */}
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-5 min-h-[220px] flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Output</span>
                  {resultLen != null && <Badge variant="secondary">{resultLen.toFixed(1)}s</Badge>}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {usingOwnVoice
                    ? `Your own voice${ownVoiceDur != null ? ` · ${ownVoiceDur.toFixed(1)}s take` : " · nothing recorded yet"}`
                    : `${selectedVoice.name} · ${selectedVoice.group} · ${selectedVoice.gender}`}
                </div>

                {error && <div className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}

                {!resultUrl && !voiceOnlyUrl && !error && (
                  <div className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
                    {busy ? (statusMsg ?? "Working…") : "Your produced audio will appear here."}
                  </div>
                )}

                {(resultUrl || voiceOnlyUrl) && (
                  <div className="mt-4 space-y-3">
                    <audio ref={audioElRef} controls className="w-full" />
                    {resultUrl && (
                      <div className="space-y-2">
                        <a href={resultUrl} download="wccg-production.wav" className="block">
                          <Button className="w-full" style={{ backgroundColor: ACCENT, color: "#06251f" }}><Download className="mr-2 h-4 w-4" /> Download WAV</Button>
                        </a>
                        <Button variant="outline" className="w-full" onClick={editResult} disabled={handoff}>
                          {handoff ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Scissors className="mr-2 h-4 w-4" />}
                          Edit in Audio Editor
                        </Button>
                      </div>
                    )}
                    {!resultUrl && voiceOnlyUrl && <p className="text-xs text-muted-foreground">Voice-only preview. Hit <b>Produce</b> to add the music bed and get the downloadable spot.</p>}
                    {resultUrl && <p className="text-xs text-muted-foreground">Broadcast-ready 44.1 kHz stereo WAV. Rename to a cart (e.g. <span className="font-mono">DJB_803.wav</span>) and drop it in your Convert folder to air it.</p>}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-foreground"><Info className="h-3.5 w-3.5" /> About</div>
                <p><b>AI voice:</b> Microsoft neural voices — {VOICES.length} options across {GROUPS.length} accents/heritages, free and no account needed.</p>
                <p><b>My own voice:</b> record straight from your mic (or upload a take) and it becomes the voiceover track — same ducking, lead-in and limiter. Nothing is uploaded; the mix happens in your browser.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LoginRequired>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${active ? "border-transparent text-[#06251f]" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"}`}
      style={active ? { backgroundColor: ACCENT } : undefined}>
      {children}
    </button>
  );
}

function Slider({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} className="mt-1 w-full accent-[#74ddc7]" />
    </div>
  );
}
