"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  AudioWaveform,
  Headphones,
  Shield,
  Gauge,
  SlidersHorizontal,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChannelState {
  id: string;
  label: string;
  inputSource: string;
  color: string;
  fader: number; // -60 to +12 dB
  pan: number; // -1 (L) to 1 (R)
  muted: boolean;
  solo: boolean;
  fxSend: boolean;
  level: number; // 0-100 current animated level
  peak: number; // 0-100 peak hold
  peakHold: boolean;
  inputGain: number; // 0-100
}

interface MasterState {
  fader: number;
  muted: boolean;
  levelL: number;
  levelR: number;
  peakL: number;
  peakR: number;
  peakHoldL: boolean;
  peakHoldR: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INITIAL_CHANNELS: ChannelState[] = [
  {
    id: "host",
    label: "Host",
    inputSource: "Mic 1",
    color: "#74ddc7",
    fader: 0,
    pan: 0,
    muted: false,
    solo: false,
    fxSend: false,
    level: 0,
    peak: 0,
    peakHold: false,
    inputGain: 75,
  },
  {
    id: "cohost",
    label: "Co-Host",
    inputSource: "Mic 2",
    color: "#7401df",
    fader: 0,
    pan: 0,
    muted: false,
    solo: false,
    fxSend: false,
    level: 0,
    peak: 0,
    peakHold: false,
    inputGain: 70,
  },
  {
    id: "guest1",
    label: "Guest 1",
    inputSource: "Mic 3",
    color: "#dc2626",
    fader: -6,
    pan: 0,
    muted: false,
    solo: false,
    fxSend: false,
    level: 0,
    peak: 0,
    peakHold: false,
    inputGain: 65,
  },
  {
    id: "guest2",
    label: "Guest 2",
    inputSource: "Mic 4",
    color: "#f59e0b",
    fader: -6,
    pan: 0,
    muted: false,
    solo: false,
    fxSend: false,
    level: 0,
    peak: 0,
    peakHold: false,
    inputGain: 65,
  },
  {
    id: "music",
    label: "Music/SFX",
    inputSource: "Line In",
    color: "#3b82f6",
    fader: -12,
    pan: 0,
    muted: false,
    solo: false,
    fxSend: true,
    level: 0,
    peak: 0,
    peakHold: false,
    inputGain: 80,
  },
];

const INITIAL_MASTER: MasterState = {
  fader: 0,
  muted: false,
  levelL: 0,
  levelR: 0,
  peakL: 0,
  peakR: 0,
  peakHoldL: false,
  peakHoldR: false,
};

// ---------------------------------------------------------------------------
// VU Meter Component
// ---------------------------------------------------------------------------

function VUMeter({
  level,
  peak,
  peakHold,
  height = 200,
}: {
  level: number;
  peak: number;
  peakHold: boolean;
  height?: number;
}) {
  const segments = 30;
  const filledSegments = Math.round((level / 100) * segments);
  const peakSegment = Math.round((peak / 100) * segments);

  return (
    <div
      className="relative flex w-3 flex-col-reverse gap-px rounded-sm bg-black/40 p-px"
      style={{ height }}
    >
      {Array.from({ length: segments }).map((_, i) => {
        const segmentIndex = i;
        const filled = segmentIndex < filledSegments;
        const isPeak = peakHold && segmentIndex === peakSegment - 1 && peakSegment > 0;
        const percent = (segmentIndex / segments) * 100;

        let colorClass = "bg-emerald-500";
        if (percent >= 80) colorClass = "bg-red-500";
        else if (percent >= 60) colorClass = "bg-yellow-400";

        return (
          <div
            key={segmentIndex}
            className={cn(
              "h-full w-full rounded-[1px] transition-opacity duration-75",
              filled || isPeak ? colorClass : "bg-white/5",
              filled ? "opacity-100" : isPeak ? "opacity-90" : "opacity-100"
            )}
          />
        );
      })}
      {/* Peak indicator dot */}
      {peakHold && peak > 85 && (
        <div className="absolute -top-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.8)]" />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stereo VU Meter (for master)
// ---------------------------------------------------------------------------

function StereoVUMeter({
  levelL,
  levelR,
  peakL,
  peakR,
  peakHoldL,
  peakHoldR,
}: {
  levelL: number;
  levelR: number;
  peakL: number;
  peakR: number;
  peakHoldL: boolean;
  peakHoldR: boolean;
}) {
  return (
    <div className="flex gap-1">
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[8px] text-muted-foreground">L</span>
        <VUMeter level={levelL} peak={peakL} peakHold={peakHoldL} height={200} />
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[8px] text-muted-foreground">R</span>
        <VUMeter level={levelR} peak={peakR} peakHold={peakHoldR} height={200} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vertical Fader Component
// ---------------------------------------------------------------------------

function VerticalFader({
  value,
  onChange,
  min = -60,
  max = 12,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const valueToPercent = (v: number) => ((v - min) / (max - min)) * 100;
  const percentToValue = (p: number) => min + (p / 100) * (max - min);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      updateFromPointer(e.clientY);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange, min, max]
  );

  const updateFromPointer = useCallback(
    (clientY: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const pct = 100 - ((clientY - rect.top) / rect.height) * 100;
      const clamped = Math.max(0, Math.min(100, pct));
      const newVal = Math.round(percentToValue(clamped));
      onChange(newVal);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange, min, max]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragging.current) updateFromPointer(e.clientY);
    },
    [updateFromPointer]
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const percent = valueToPercent(value);
  const zeroPercent = valueToPercent(0);

  return (
    <div
      ref={trackRef}
      className="relative h-[140px] w-6 cursor-ns-resize rounded-sm bg-black/30"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Track groove */}
      <div className="absolute left-1/2 top-1 bottom-1 w-0.5 -translate-x-1/2 rounded-full bg-white/10" />

      {/* dB scale marks */}
      <div
        className="absolute left-0 h-px w-full bg-white/20"
        style={{ bottom: `${zeroPercent}%` }}
      />

      {/* Fill below thumb */}
      <div
        className="absolute bottom-0 left-1/2 w-1 -translate-x-1/2 rounded-b-sm bg-gradient-to-t from-[#74ddc7]/60 to-[#74ddc7]/20"
        style={{ height: `${percent}%` }}
      />

      {/* Fader thumb */}
      <div
        className="absolute left-1/2 z-10 h-5 w-5 -translate-x-1/2 translate-y-1/2 rounded-sm border border-white/30 bg-gradient-to-b from-zinc-300 to-zinc-500 shadow-md"
        style={{ bottom: `${percent}%` }}
      >
        {/* Grip lines */}
        <div className="absolute inset-x-1 top-1/2 flex -translate-y-1/2 flex-col gap-px">
          <div className="h-px bg-black/30" />
          <div className="h-px bg-black/30" />
          <div className="h-px bg-black/30" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pan Indicator
// ---------------------------------------------------------------------------

function PanIndicator({ value }: { value: number }) {
  const label = value < -0.3 ? "L" : value > 0.3 ? "R" : "C";
  return (
    <div className="flex items-center gap-1">
      <div className="relative h-2 w-10 rounded-full bg-black/30">
        <div
          className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[#74ddc7] shadow-[0_0_4px_rgba(116,221,199,0.5)]"
          style={{ left: `${((value + 1) / 2) * 100}%`, transform: "translate(-50%, -50%)" }}
        />
      </div>
      <span className="w-3 text-center text-[9px] font-medium text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Input Gain Display
// ---------------------------------------------------------------------------

function InputGainKnob({ value }: { value: number }) {
  const rotation = (value / 100) * 270 - 135; // -135 to +135 degrees
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative h-5 w-5 rounded-full border border-white/10 bg-black/40">
        <div
          className="absolute left-1/2 top-0.5 h-2 w-px origin-bottom bg-[#74ddc7]"
          style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
        />
      </div>
      <span className="text-[8px] text-muted-foreground">{value}%</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Channel Strip Component
// ---------------------------------------------------------------------------

function ChannelStrip({
  channel,
  onFaderChange,
  onToggleMute,
  onToggleSolo,
  onToggleFx,
}: {
  channel: ChannelState;
  onFaderChange: (value: number) => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onToggleFx: () => void;
}) {
  return (
    <div className="flex w-[72px] flex-col items-center gap-1.5 rounded-lg border border-border bg-card/80 p-2 backdrop-blur-sm">
      {/* Channel label */}
      <span className="w-full truncate text-center text-[10px] font-semibold uppercase tracking-wider text-foreground">
        {channel.label}
      </span>

      {/* Input source */}
      <span className="text-[8px] text-muted-foreground">{channel.inputSource}</span>

      {/* Input gain knob */}
      <InputGainKnob value={channel.inputGain} />

      {/* VU Meter */}
      <VUMeter
        level={channel.muted ? 0 : channel.level}
        peak={channel.muted ? 0 : channel.peak}
        peakHold={channel.peakHold}
      />

      {/* Fader */}
      <VerticalFader value={channel.fader} onChange={onFaderChange} />

      {/* dB value display */}
      <span className="font-mono text-[10px] text-muted-foreground">
        {channel.fader > 0 ? "+" : ""}
        {channel.fader} dB
      </span>

      {/* Pan */}
      <PanIndicator value={channel.pan} />

      {/* Buttons row */}
      <div className="flex w-full gap-1">
        {/* Mute */}
        <button
          type="button"
          onClick={onToggleMute}
          className={cn(
            "flex h-5 flex-1 items-center justify-center rounded text-[10px] font-bold transition-all",
            channel.muted
              ? "bg-red-600 text-white shadow-[0_0_6px_rgba(220,38,38,0.5)]"
              : "bg-white/5 text-muted-foreground hover:bg-white/10"
          )}
        >
          M
        </button>

        {/* Solo */}
        <button
          type="button"
          onClick={onToggleSolo}
          className={cn(
            "flex h-5 flex-1 items-center justify-center rounded text-[10px] font-bold transition-all",
            channel.solo
              ? "bg-yellow-500 text-black shadow-[0_0_6px_rgba(234,179,8,0.5)]"
              : "bg-white/5 text-muted-foreground hover:bg-white/10"
          )}
        >
          S
        </button>

        {/* FX Send */}
        <button
          type="button"
          onClick={onToggleFx}
          className={cn(
            "flex h-5 flex-1 items-center justify-center rounded text-[10px] font-bold transition-all",
            channel.fxSend
              ? "bg-[#7401df] text-white shadow-[0_0_6px_rgba(116,1,223,0.5)]"
              : "bg-white/5 text-muted-foreground hover:bg-white/10"
          )}
        >
          FX
        </button>
      </div>

      {/* Channel color strip */}
      <div
        className="h-1 w-full rounded-full"
        style={{ backgroundColor: channel.color }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Master Channel Component
// ---------------------------------------------------------------------------

function MasterChannel({
  master,
  onFaderChange,
  onToggleMute,
}: {
  master: MasterState;
  onFaderChange: (value: number) => void;
  onToggleMute: () => void;
}) {
  return (
    <div className="flex w-[90px] flex-col items-center gap-1.5 rounded-lg border-2 border-[#74ddc7]/30 bg-card/90 p-2 backdrop-blur-sm">
      {/* Master label */}
      <span className="text-[10px] font-bold uppercase tracking-widest text-[#74ddc7]">
        Master
      </span>

      <span className="text-[8px] text-muted-foreground">Stereo Out</span>

      {/* Output level icon */}
      <div className="text-muted-foreground">
        {master.muted ? (
          <VolumeX className="h-3.5 w-3.5 text-red-500" />
        ) : (
          <Volume2 className="h-3.5 w-3.5 text-[#74ddc7]" />
        )}
      </div>

      {/* Stereo VU Meter */}
      <StereoVUMeter
        levelL={master.muted ? 0 : master.levelL}
        levelR={master.muted ? 0 : master.levelR}
        peakL={master.muted ? 0 : master.peakL}
        peakR={master.muted ? 0 : master.peakR}
        peakHoldL={master.peakHoldL}
        peakHoldR={master.peakHoldR}
      />

      {/* Master Fader */}
      <VerticalFader value={master.fader} onChange={onFaderChange} />

      {/* dB display */}
      <span className="font-mono text-[10px] text-[#74ddc7]">
        {master.fader > 0 ? "+" : ""}
        {master.fader} dB
      </span>

      {/* Peak hold indicator */}
      {(master.peakHoldL || master.peakHoldR) && master.peakL > 85 && (
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.8)]" />
          <span className="text-[8px] text-red-400">PEAK</span>
        </div>
      )}

      {/* Master mute */}
      <button
        type="button"
        onClick={onToggleMute}
        className={cn(
          "flex h-6 w-full items-center justify-center rounded text-[10px] font-bold transition-all",
          master.muted
            ? "bg-red-600 text-white shadow-[0_0_8px_rgba(220,38,38,0.5)]"
            : "bg-white/5 text-muted-foreground hover:bg-white/10"
        )}
      >
        {master.muted ? "MUTED" : "MUTE"}
      </button>

      {/* Output level */}
      <div className="text-center">
        <span className="text-[8px] text-muted-foreground">Output</span>
        <div className="font-mono text-[10px] text-foreground">
          {master.muted ? "-inf" : `${Math.round((master.levelL + master.levelR) / 2 * 0.72 - 60)} dB`}
        </div>
      </div>

      {/* Master color strip */}
      <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-[#74ddc7] via-[#7401df] to-[#dc2626]" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Audio Mixer Component
// ---------------------------------------------------------------------------

export function AudioMixer() {
  const [channels, setChannels] = useState<ChannelState[]>(INITIAL_CHANNELS);
  const [master, setMaster] = useState<MasterState>(INITIAL_MASTER);
  const [monitorEnabled, setMonitorEnabled] = useState(true);
  const [noiseGate, setNoiseGate] = useState(true);
  const [compressor, setCompressor] = useState(true);
  const [eqEnabled, setEqEnabled] = useState(false);
  const animFrameRef = useRef<number>(0);

  // -------------------------------------------------------------------------
  // Animate VU meters with realistic-looking random fluctuation
  // -------------------------------------------------------------------------

  useEffect(() => {
    let prevTime = performance.now();

    const animate = (time: number) => {
      const dt = time - prevTime;
      if (dt < 50) {
        // Cap at ~20fps for performance
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      prevTime = time;

      setChannels((prev) =>
        prev.map((ch) => {
          if (ch.muted) {
            // Decay to zero when muted
            return {
              ...ch,
              level: Math.max(0, ch.level - 8),
              peak: Math.max(0, ch.peak - 2),
              peakHold: false,
            };
          }

          // Base level influenced by fader position
          const faderFactor = Math.max(0, (ch.fader + 60) / 72); // normalize -60..+12 to 0..1
          const baseLevel = faderFactor * 65 + 10;

          // Random fluctuation to simulate audio
          const fluctuation = (Math.random() - 0.5) * 30;
          const targetLevel = Math.max(0, Math.min(100, baseLevel + fluctuation));

          // Smooth toward target (attack fast, release slow)
          const newLevel =
            targetLevel > ch.level
              ? ch.level + (targetLevel - ch.level) * 0.6
              : ch.level + (targetLevel - ch.level) * 0.15;

          // Peak detection
          let newPeak = ch.peak;
          let newPeakHold = ch.peakHold;
          if (newLevel > newPeak) {
            newPeak = newLevel;
            newPeakHold = true;
          } else {
            // Peak decay (slow)
            newPeak = Math.max(newLevel, newPeak - 0.5);
            if (newPeak <= newLevel) newPeakHold = false;
          }

          return {
            ...ch,
            level: newLevel,
            peak: newPeak,
            peakHold: newPeakHold,
          };
        })
      );

      // Update master levels based on active channels
      setChannels((currentChannels) => {
        const anySolo = currentChannels.some((c) => c.solo);

        const activeLevels = currentChannels
          .filter((c) => !c.muted && (!anySolo || c.solo))
          .map((c) => c.level);

        const avgLevel =
          activeLevels.length > 0
            ? activeLevels.reduce((a, b) => a + b, 0) / activeLevels.length
            : 0;

        setMaster((prev) => {
          if (prev.muted) {
            return {
              ...prev,
              levelL: Math.max(0, prev.levelL - 8),
              levelR: Math.max(0, prev.levelR - 8),
              peakL: Math.max(0, prev.peakL - 2),
              peakR: Math.max(0, prev.peakR - 2),
              peakHoldL: false,
              peakHoldR: false,
            };
          }

          const masterFactor = Math.max(0, (prev.fader + 60) / 72);
          const baseL = avgLevel * masterFactor + (Math.random() - 0.5) * 8;
          const baseR = avgLevel * masterFactor + (Math.random() - 0.5) * 8;
          const newL = Math.max(0, Math.min(100, baseL));
          const newR = Math.max(0, Math.min(100, baseR));

          const smoothL = newL > prev.levelL
            ? prev.levelL + (newL - prev.levelL) * 0.5
            : prev.levelL + (newL - prev.levelL) * 0.12;
          const smoothR = newR > prev.levelR
            ? prev.levelR + (newR - prev.levelR) * 0.5
            : prev.levelR + (newR - prev.levelR) * 0.12;

          let pL = prev.peakL;
          let pR = prev.peakR;
          let phL = prev.peakHoldL;
          let phR = prev.peakHoldR;

          if (smoothL > pL) { pL = smoothL; phL = true; }
          else { pL = Math.max(smoothL, pL - 0.5); if (pL <= smoothL) phL = false; }

          if (smoothR > pR) { pR = smoothR; phR = true; }
          else { pR = Math.max(smoothR, pR - 0.5); if (pR <= smoothR) phR = false; }

          return {
            ...prev,
            levelL: smoothL,
            levelR: smoothR,
            peakL: pL,
            peakR: pR,
            peakHoldL: phL,
            peakHoldR: phR,
          };
        });

        return currentChannels;
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  // -------------------------------------------------------------------------
  // Channel update helpers
  // -------------------------------------------------------------------------

  const updateChannel = useCallback(
    (id: string, updates: Partial<ChannelState>) => {
      setChannels((prev) =>
        prev.map((ch) => (ch.id === id ? { ...ch, ...updates } : ch))
      );
    },
    []
  );

  // -------------------------------------------------------------------------
  // Toolbar toggle button
  // -------------------------------------------------------------------------

  function ToolbarToggle({
    active,
    onClick,
    icon: Icon,
    label,
  }: {
    active: boolean;
    onClick: () => void;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
          active
            ? "bg-[#74ddc7]/20 text-[#74ddc7] shadow-[0_0_8px_rgba(116,221,199,0.15)]"
            : "bg-white/5 text-muted-foreground hover:bg-white/10"
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </button>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-background/95 p-4 shadow-xl backdrop-blur-sm">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AudioWaveform className="h-5 w-5 text-[#74ddc7]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Audio Mixer
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ToolbarToggle
            active={monitorEnabled}
            onClick={() => setMonitorEnabled(!monitorEnabled)}
            icon={Headphones}
            label="Monitor"
          />
          <ToolbarToggle
            active={noiseGate}
            onClick={() => setNoiseGate(!noiseGate)}
            icon={Shield}
            label="Gate"
          />
          <ToolbarToggle
            active={compressor}
            onClick={() => setCompressor(!compressor)}
            icon={Gauge}
            label="Comp"
          />
          <ToolbarToggle
            active={eqEnabled}
            onClick={() => setEqEnabled(!eqEnabled)}
            icon={SlidersHorizontal}
            label="EQ"
          />

          <div className="mx-1 h-5 w-px bg-border" />

          <Badge variant="outline" className="gap-1 font-mono text-[10px]">
            <Sparkles className="h-2.5 w-2.5" />
            48kHz / 24-bit
          </Badge>
        </div>
      </div>

      {/* Separator */}
      <div className="h-px bg-border" />

      {/* Channel strips + Master */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {/* Channel Strips */}
        {channels.map((ch) => (
          <ChannelStrip
            key={ch.id}
            channel={ch}
            onFaderChange={(v) => updateChannel(ch.id, { fader: v })}
            onToggleMute={() => updateChannel(ch.id, { muted: !ch.muted })}
            onToggleSolo={() => updateChannel(ch.id, { solo: !ch.solo })}
            onToggleFx={() => updateChannel(ch.id, { fxSend: !ch.fxSend })}
          />
        ))}

        {/* Divider */}
        <div className="mx-1 w-px self-stretch bg-border" />

        {/* Master Channel */}
        <MasterChannel
          master={master}
          onFaderChange={(v) => setMaster((prev) => ({ ...prev, fader: v }))}
          onToggleMute={() =>
            setMaster((prev) => ({ ...prev, muted: !prev.muted }))
          }
        />
      </div>
    </div>
  );
}
