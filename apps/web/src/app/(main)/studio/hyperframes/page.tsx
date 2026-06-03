"use client";

/**
 * /studio/hyperframes — Hyperframes studio.
 *
 * One page, three modes (tab-switched):
 *   1. Frames & Overlays — drop a branded frame/lower-third/corner-label over a
 *      base image (upload OR paste URL) and export the composite as PNG via an
 *      HTML5 <canvas>.
 *   2. Embeds — build a sandboxed <iframe> widget, live-preview it, copy the code.
 *   3. Promo — an HTML5 ad-frame builder (IAB sizes) that emits standalone HTML.
 *
 * Persistence: each mode's "Save" writes a row to public.hyperframes
 * (kind/name/config jsonb). Frames optionally upload the exported PNG to the
 * public `hyperframe-assets` bucket and store its path in storage_path.
 * A "Saved hyperframes" list loads/deletes the signed-in user's rows.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Code2,
  Copy,
  Check,
  Download,
  Frame as FrameIcon,
  Image as ImageIcon,
  Link2,
  Loader2,
  Megaphone,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoginRequired } from "@/components/auth/login-required";
import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Shared types & constants                                          */
/* ------------------------------------------------------------------ */

type Mode = "frame" | "embed" | "promo";
type HyperframeKind = "frame" | "overlay" | "embed" | "promo";

const BRAND_TEAL = "#74ddc7";
const BRAND_PURPLE = "#7401df";
const BRAND_AMBER = "#f59e0b";
const BRAND_INK = "#0a0a0f";

const BRAND_SWATCHES = [BRAND_TEAL, BRAND_PURPLE, BRAND_AMBER, BRAND_INK, "#ffffff"];

type CornerPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

interface FrameConfig {
  /** 'frame' = full border kept; 'overlay' = transparent-center decoration */
  variant: "frame" | "overlay";
  imageUrl: string;
  borderColor: string;
  borderWidth: number;
  showLowerThird: boolean;
  headline: string;
  subtext: string;
  lowerThirdColor: string;
  showCorner: boolean;
  cornerLabel: string;
  cornerPosition: CornerPosition;
  cornerColor: string;
}

interface EmbedConfig {
  sourceUrl: string;
  title: string;
  ratio: "16:9" | "1:1" | "9:16" | "custom";
  width: number;
  height: number;
  border: boolean;
}

type PromoSizeKey = "300x250" | "728x90" | "320x50" | "160x600";

interface PromoConfig {
  size: PromoSizeKey;
  bgColor: string;
  bgImageUrl: string;
  headline: string;
  subtext: string;
  ctaLabel: string;
  ctaUrl: string;
  accentColor: string;
  textColor: string;
}

interface FramePreset {
  id: string;
  label: string;
  patch: Partial<FrameConfig>;
}

const FRAME_PRESETS: FramePreset[] = [
  {
    id: "now-playing",
    label: "Now Playing",
    patch: {
      variant: "frame",
      borderColor: BRAND_TEAL,
      showLowerThird: true,
      headline: "NOW PLAYING",
      subtext: "Artist — Track Title",
      lowerThirdColor: BRAND_INK,
      showCorner: true,
      cornerLabel: "WCCG 104.5",
      cornerColor: BRAND_TEAL,
    },
  },
  {
    id: "event",
    label: "Event",
    patch: {
      variant: "frame",
      borderColor: BRAND_PURPLE,
      showLowerThird: true,
      headline: "LIVE EVENT",
      subtext: "Fri · 8PM · Downtown Fayetteville",
      lowerThirdColor: BRAND_PURPLE,
      showCorner: true,
      cornerLabel: "WCCG 104.5",
      cornerColor: BRAND_PURPLE,
    },
  },
  {
    id: "quote",
    label: "Quote",
    patch: {
      variant: "overlay",
      borderColor: BRAND_AMBER,
      showLowerThird: true,
      headline: "“Your quote here.”",
      subtext: "— Attribution",
      lowerThirdColor: BRAND_INK,
      showCorner: true,
      cornerLabel: "WCCG 104.5",
      cornerColor: BRAND_AMBER,
    },
  },
];

const PROMO_SIZES: Record<PromoSizeKey, { w: number; h: number; label: string }> = {
  "300x250": { w: 300, h: 250, label: "Medium Rectangle" },
  "728x90": { w: 728, h: 90, label: "Leaderboard" },
  "320x50": { w: 320, h: 50, label: "Mobile Banner" },
  "160x600": { w: 160, h: 600, label: "Skyscraper" },
};

const EMBED_RATIOS: Record<EmbedConfig["ratio"], number | null> = {
  "16:9": 9 / 16,
  "1:1": 1,
  "9:16": 16 / 9,
  custom: null,
};

/** Output resolution (px) for the exported frame PNG. */
const FRAME_EXPORT_W = 1280;
const FRAME_EXPORT_H = 720;

const DEFAULT_FRAME: FrameConfig = {
  variant: "frame",
  imageUrl: "",
  borderColor: BRAND_TEAL,
  borderWidth: 14,
  showLowerThird: true,
  headline: "NOW PLAYING",
  subtext: "Artist — Track Title",
  lowerThirdColor: BRAND_INK,
  showCorner: true,
  cornerLabel: "WCCG 104.5",
  cornerPosition: "top-right",
  cornerColor: BRAND_TEAL,
};

const DEFAULT_EMBED: EmbedConfig = {
  sourceUrl: "",
  title: "WCCG Embed",
  ratio: "16:9",
  width: 560,
  height: 315,
  border: true,
};

const DEFAULT_PROMO: PromoConfig = {
  size: "300x250",
  bgColor: BRAND_INK,
  bgImageUrl: "",
  headline: "WCCG 104.5 FM",
  subtext: "Fayetteville's Hip-Hop & R&B",
  ctaLabel: "Listen Live",
  ctaUrl: "https://wccg1045fm.com",
  accentColor: BRAND_TEAL,
  textColor: "#ffffff",
};

interface SavedRow {
  id: string;
  kind: HyperframeKind;
  name: string;
  config: Record<string, unknown>;
  storage_path: string | null;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/*  Small helpers                                                     */
/* ------------------------------------------------------------------ */

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Build the standalone HTML document for a promo frame. */
function buildPromoHtml(cfg: PromoConfig): string {
  const { w, h } = PROMO_SIZES[cfg.size];
  const compact = h <= 90; // leaderboard / mobile banners are horizontal
  const bg = cfg.bgImageUrl
    ? `background:${cfg.bgColor} url('${escapeHtml(cfg.bgImageUrl)}') center/cover no-repeat;`
    : `background:${cfg.bgColor};`;
  const href = cfg.ctaUrl.trim() || "#";
  const layout = compact
    ? `display:flex;align-items:center;justify-content:space-between;gap:12px;`
    : `display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-end;`;
  const headlineSize = compact ? 18 : 26;
  const subSize = compact ? 12 : 14;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=${w}, initial-scale=1" />
<title>${escapeHtml(cfg.headline || "WCCG Promo")}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${w}px; height: ${h}px; overflow: hidden; }
  .ad {
    width: ${w}px; height: ${h}px; position: relative;
    ${bg}
    color: ${cfg.textColor};
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
    padding: ${compact ? "8px 12px" : "16px"};
    ${layout}
    text-decoration: none;
    border: 2px solid ${cfg.accentColor};
    overflow: hidden;
  }
  .ad::after { content: ""; position: absolute; inset: 0; background: ${cfg.bgImageUrl ? "linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.55))" : "transparent"}; }
  .ad__copy { position: relative; z-index: 1; ${compact ? "min-width:0;" : ""} }
  .ad__headline { font-size: ${headlineSize}px; font-weight: 800; line-height: 1.1; ${compact ? "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" : ""} }
  .ad__sub { font-size: ${subSize}px; opacity: .85; margin-top: 4px; ${compact ? "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" : ""} }
  .ad__cta {
    position: relative; z-index: 1; ${compact ? "" : "margin-top: 12px;"}
    background: ${cfg.accentColor}; color: ${BRAND_INK};
    font-weight: 800; font-size: ${compact ? 12 : 14}px;
    padding: ${compact ? "6px 12px" : "8px 16px"}; border-radius: 999px;
    white-space: nowrap; flex-shrink: 0;
  }
</style>
</head>
<body>
  <a class="ad" href="${escapeHtml(href)}" target="_blank" rel="noopener">
    <span class="ad__copy">
      <span class="ad__headline">${escapeHtml(cfg.headline)}</span>
      ${cfg.subtext ? `<span class="ad__sub">${escapeHtml(cfg.subtext)}</span>` : ""}
    </span>
    ${cfg.ctaLabel ? `<span class="ad__cta">${escapeHtml(cfg.ctaLabel)}</span>` : ""}
  </a>
</body>
</html>`;
}

/** Build the <iframe …> embed snippet for the Embeds mode. */
function buildEmbedCode(cfg: EmbedConfig): string {
  const ratio = EMBED_RATIOS[cfg.ratio];
  const styleParts = [
    "border:" + (cfg.border ? "1px solid #2a2a35" : "0"),
    "border-radius:12px",
    "max-width:100%",
  ];
  if (ratio == null) {
    styleParts.unshift(`width:${cfg.width}px`, `height:${cfg.height}px`);
  } else {
    styleParts.unshift("width:100%", `aspect-ratio:${cfg.ratio.replace(":", " / ")}`);
  }
  const widthAttr = ratio == null ? ` width="${cfg.width}" height="${cfg.height}"` : "";
  return `<iframe
  src="${escapeHtml(cfg.sourceUrl)}"
  title="${escapeHtml(cfg.title)}"${widthAttr}
  style="${styleParts.join(";")}"
  loading="lazy"
  sandbox="allow-scripts allow-same-origin allow-popups"
  allowfullscreen
></iframe>`;
}

/** Load an <img>, trying CORS-enabled first so the canvas stays exportable. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Retry without CORS so at least the preview renders (may taint canvas).
      const fallback = new window.Image();
      fallback.onload = () => resolve(fallback);
      fallback.onerror = () => reject(new Error("Could not load image"));
      fallback.src = src;
    };
    img.src = src;
  });
}

/** Rounded-rect path helper for canvas. */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Draw the full composite (background image + frame/overlay + lower-third +
 * corner label) onto the given canvas at export resolution. Returns false if
 * the base image could not be drawn (so callers can warn).
 */
async function drawFrame(canvas: HTMLCanvasElement, cfg: FrameConfig): Promise<boolean> {
  const W = FRAME_EXPORT_W;
  const H = FRAME_EXPORT_H;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  // Backdrop (shows through transparent/letterboxed areas).
  ctx.fillStyle = BRAND_INK;
  ctx.fillRect(0, 0, W, H);

  let drewImage = false;
  if (cfg.imageUrl.trim()) {
    try {
      const img = await loadImage(cfg.imageUrl.trim());
      // cover-fit the image
      const scale = Math.max(W / img.width, H / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      drewImage = true;
    } catch {
      // leave the ink backdrop; draw a hint
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "600 28px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Add a base image (upload or URL)", W / 2, H / 2);
      ctx.textAlign = "left";
    }
  }

  const bw = Math.max(0, cfg.borderWidth);

  // Frame border. For 'overlay', draw a slightly translucent inner stroke so
  // the picture reads through; for 'frame', a solid hard border.
  if (bw > 0) {
    ctx.lineWidth = bw;
    ctx.strokeStyle = cfg.borderColor;
    ctx.globalAlpha = cfg.variant === "overlay" ? 0.9 : 1;
    ctx.strokeRect(bw / 2, bw / 2, W - bw, H - bw);
    ctx.globalAlpha = 1;
  }

  // Lower-third bar.
  if (cfg.showLowerThird && (cfg.headline.trim() || cfg.subtext.trim())) {
    const barH = 150;
    const barY = H - barH - bw;
    const barX = bw;
    const barW = W - bw * 2;

    // gradient backing for legibility
    const grad = ctx.createLinearGradient(0, barY, 0, barY + barH);
    grad.addColorStop(0, hexToRgba(cfg.lowerThirdColor, 0.78));
    grad.addColorStop(1, hexToRgba(cfg.lowerThirdColor, 0.95));
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, barW, barH);

    // accent strip
    ctx.fillStyle = cfg.borderColor;
    ctx.fillRect(barX, barY, 8, barH);

    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    const textX = barX + 36;
    if (cfg.headline.trim()) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 46px system-ui, sans-serif";
      ctx.fillText(truncateToWidth(ctx, cfg.headline.trim(), barW - 72), textX, barY + 66);
    }
    if (cfg.subtext.trim()) {
      ctx.fillStyle = "rgba(255,255,255,0.82)";
      ctx.font = "500 28px system-ui, sans-serif";
      ctx.fillText(truncateToWidth(ctx, cfg.subtext.trim(), barW - 72), textX, barY + 110);
    }
  }

  // Corner label pill.
  if (cfg.showCorner && cfg.cornerLabel.trim()) {
    const label = cfg.cornerLabel.trim();
    ctx.font = "800 26px system-ui, sans-serif";
    const padX = 20;
    const padY = 12;
    const textW = ctx.measureText(label).width;
    const pillW = textW + padX * 2;
    const pillH = 26 + padY * 2;
    const margin = bw + 20;
    let px = margin;
    let py = margin;
    if (cfg.cornerPosition.includes("right")) px = W - pillW - margin;
    if (cfg.cornerPosition.includes("bottom")) py = H - pillH - margin;

    ctx.fillStyle = cfg.cornerColor;
    roundRect(ctx, px, py, pillW, pillH, pillH / 2);
    ctx.fill();

    ctx.fillStyle = pickReadable(cfg.cornerColor);
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(label, px + padX, py + pillH / 2 + 1);
    ctx.textBaseline = "alphabetic";
  }

  return drewImage || !cfg.imageUrl.trim();
}

function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxW) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Pick black/white text for legibility over a solid background hex. */
function pickReadable(hex: string): string {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? BRAND_INK : "#ffffff";
}

/* ------------------------------------------------------------------ */
/*  Reusable UI bits                                                  */
/* ------------------------------------------------------------------ */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function ColorSwatches({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {BRAND_SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`Use ${c}`}
          className={`h-7 w-7 rounded-lg border-2 transition-all ${
            value.toLowerCase() === c.toLowerCase()
              ? "border-[#74ddc7] scale-110"
              : "border-border hover:border-foreground/40"
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
      <div className="relative h-7 w-7">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-7 w-7 cursor-pointer opacity-0"
          aria-label="Pick a custom color"
        />
        <div className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-dashed border-border">
          <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
    >
      <span className="font-medium text-foreground/80">{label}</span>
      <span
        className={`relative h-5 w-9 rounded-full transition-colors ${
          checked ? "bg-[#74ddc7]" : "bg-foreground/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function CopyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(getText());
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked — ignore */
        }
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

/* ------------------------------------------------------------------ */
/*  Mode 1 — Frames & Overlays                                        */
/* ------------------------------------------------------------------ */

function FrameMode({
  cfg,
  setCfg,
  onSave,
  saving,
}: {
  cfg: FrameConfig;
  setCfg: (next: FrameConfig) => void;
  onSave: (opts: { name: string; uploadPng: boolean; getCanvas: () => HTMLCanvasElement | null }) => void;
  saving: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState("Untitled frame");
  const [uploadPng, setUploadPng] = useState(true);
  const [warn, setWarn] = useState<string | null>(null);

  const patch = (p: Partial<FrameConfig>) => setCfg({ ...cfg, ...p });

  // Re-render the canvas whenever the config changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ok = await drawFrame(canvas, cfg);
      if (!cancelled) {
        setWarn(ok ? null : "Image blocked by its host — preview only; export may be limited.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cfg]);

  const onPickFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => patch({ imageUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  const downloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(name || "hyperframe").replace(/[^a-z0-9-_]+/gi, "-")}.png`;
      a.click();
    } catch {
      setWarn("Export blocked: the base image's host disallows cross-origin reads. Upload the file instead of using its URL.");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* Preview + presets */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {FRAME_PRESETS.map((p) => (
            <Button
              key={p.id}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => patch(p.patch)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <canvas ref={canvasRef} className="block h-auto w-full" />
        </div>

        {warn && (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            {warn}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={downloadPng} className="bg-[#74ddc7] text-[#0a0a0f] hover:bg-[#74ddc7]/90">
            <Download className="h-4 w-4" /> Download PNG
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => onSave({ name, uploadPng, getCanvas: () => canvasRef.current })}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
        <div className="inline-flex w-full rounded-lg border border-border p-0.5">
          {(["frame", "overlay"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => patch({ variant: v })}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-semibold capitalize transition-colors ${
                cfg.variant === v ? "bg-[#7401df] text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <Field label="Base image">
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" /> Upload
            </Button>
            {cfg.imageUrl && (
              <Button type="button" variant="ghost" size="sm" onClick={() => patch({ imageUrl: "" })}>
                Clear
              </Button>
            )}
          </div>
        </Field>

        <Field label="…or paste an image URL">
          <Input
            value={cfg.imageUrl.startsWith("data:") ? "" : cfg.imageUrl}
            placeholder="https://… (e.g. from the AI generator)"
            onChange={(e) => patch({ imageUrl: e.target.value })}
          />
        </Field>

        <Field label="Border color">
          <ColorSwatches value={cfg.borderColor} onChange={(c) => patch({ borderColor: c })} />
        </Field>

        <Field label={`Border width — ${cfg.borderWidth}px`}>
          <input
            type="range"
            min={0}
            max={48}
            value={cfg.borderWidth}
            onChange={(e) => patch({ borderWidth: Number(e.target.value) })}
            className="w-full accent-[#7401df]"
          />
        </Field>

        <ToggleRow
          label="Lower-third bar"
          checked={cfg.showLowerThird}
          onChange={(v) => patch({ showLowerThird: v })}
        />
        {cfg.showLowerThird && (
          <div className="space-y-3 rounded-lg border border-border bg-background/40 p-3">
            <Field label="Headline">
              <Input value={cfg.headline} onChange={(e) => patch({ headline: e.target.value })} />
            </Field>
            <Field label="Subtext">
              <Input value={cfg.subtext} onChange={(e) => patch({ subtext: e.target.value })} />
            </Field>
            <Field label="Bar color">
              <ColorSwatches value={cfg.lowerThirdColor} onChange={(c) => patch({ lowerThirdColor: c })} />
            </Field>
          </div>
        )}

        <ToggleRow
          label="Corner label"
          checked={cfg.showCorner}
          onChange={(v) => patch({ showCorner: v })}
        />
        {cfg.showCorner && (
          <div className="space-y-3 rounded-lg border border-border bg-background/40 p-3">
            <Field label="Label">
              <Input value={cfg.cornerLabel} onChange={(e) => patch({ cornerLabel: e.target.value })} />
            </Field>
            <Field label="Position">
              <div className="grid grid-cols-2 gap-1.5">
                {(["top-left", "top-right", "bottom-left", "bottom-right"] as CornerPosition[]).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => patch({ cornerPosition: pos })}
                    className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                      cfg.cornerPosition === pos
                        ? "bg-[#7401df] text-white"
                        : "border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {pos.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ")}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Label color">
              <ColorSwatches value={cfg.cornerColor} onChange={(c) => patch({ cornerColor: c })} />
            </Field>
          </div>
        )}

        <div className="space-y-2 border-t border-border pt-4">
          <Field label="Name (for saving)">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <ToggleRow
            label="Upload exported PNG to asset bucket"
            checked={uploadPng}
            onChange={setUploadPng}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mode 2 — Embeds                                                   */
/* ------------------------------------------------------------------ */

function EmbedMode({
  cfg,
  setCfg,
  onSave,
  saving,
}: {
  cfg: EmbedConfig;
  setCfg: (next: EmbedConfig) => void;
  onSave: (opts: { name: string }) => void;
  saving: boolean;
}) {
  const patch = (p: Partial<EmbedConfig>) => setCfg({ ...cfg, ...p });
  const code = useMemo(() => buildEmbedCode(cfg), [cfg]);
  const ratio = EMBED_RATIOS[cfg.ratio];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        {/* Live preview */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Live preview
          </p>
          {cfg.sourceUrl.trim() ? (
            <div
              className="mx-auto overflow-hidden rounded-xl bg-black"
              style={
                ratio == null
                  ? { width: cfg.width, maxWidth: "100%", height: cfg.height }
                  : { width: "100%", aspectRatio: cfg.ratio.replace(":", " / ") }
              }
            >
              <iframe
                src={cfg.sourceUrl}
                title={cfg.title}
                className="h-full w-full"
                style={{ border: cfg.border ? "1px solid #2a2a35" : "0" }}
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-popups"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
              <Link2 className="mr-2 h-4 w-4" /> Enter a source URL to preview
            </div>
          )}
        </div>

        {/* Generated code */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Embed code
            </p>
            <CopyButton getText={() => code} />
          </div>
          <textarea
            readOnly
            value={code}
            spellCheck={false}
            className="h-44 w-full resize-none rounded-lg border border-border bg-background/60 p-3 font-mono text-xs text-foreground/80 outline-none"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
        <Field label="Source URL">
          <Input
            value={cfg.sourceUrl}
            placeholder="https://example.com/widget"
            onChange={(e) => patch({ sourceUrl: e.target.value })}
          />
        </Field>
        <Field label="Title (accessibility)">
          <Input value={cfg.title} onChange={(e) => patch({ title: e.target.value })} />
        </Field>
        <Field label="Aspect ratio / size">
          <div className="grid grid-cols-4 gap-1.5">
            {(["16:9", "1:1", "9:16", "custom"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => patch({ ratio: r })}
                className={`rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
                  cfg.ratio === r
                    ? "bg-[#7401df] text-white"
                    : "border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {r === "custom" ? "Custom" : r}
              </button>
            ))}
          </div>
        </Field>
        {cfg.ratio === "custom" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Width (px)">
              <Input
                type="number"
                value={cfg.width}
                onChange={(e) => patch({ width: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Height (px)">
              <Input
                type="number"
                value={cfg.height}
                onChange={(e) => patch({ height: Number(e.target.value) || 0 })}
              />
            </Field>
          </div>
        )}
        <ToggleRow label="Border" checked={cfg.border} onChange={(v) => patch({ border: v })} />

        <p className="rounded-lg border border-border bg-background/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          Preview &amp; output are sandboxed: <code>allow-scripts allow-same-origin allow-popups</code>.
          Some sites set <code>X-Frame-Options</code> and refuse to embed.
        </p>

        <div className="border-t border-border pt-4">
          <Button
            type="button"
            className="w-full bg-[#74ddc7] text-[#0a0a0f] hover:bg-[#74ddc7]/90"
            disabled={saving}
            onClick={() => onSave({ name: cfg.title || "Untitled embed" })}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save embed
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mode 3 — Promo                                                    */
/* ------------------------------------------------------------------ */

function PromoMode({
  cfg,
  setCfg,
  onSave,
  saving,
}: {
  cfg: PromoConfig;
  setCfg: (next: PromoConfig) => void;
  onSave: (opts: { name: string }) => void;
  saving: boolean;
}) {
  const patch = (p: Partial<PromoConfig>) => setCfg({ ...cfg, ...p });
  const { w, h } = PROMO_SIZES[cfg.size];
  const html = useMemo(() => buildPromoHtml(cfg), [cfg]);

  const downloadHtml = () => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `promo-${cfg.size}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        {/* Live preview at true size */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Live preview — {w}×{h} ({PROMO_SIZES[cfg.size].label})
          </p>
          <div className="flex justify-center overflow-auto">
            <iframe
              key={cfg.size}
              title="Promo preview"
              srcDoc={html}
              width={w}
              height={h}
              className="shrink-0 rounded-lg"
              sandbox="allow-popups"
              style={{ border: "0", width: w, height: h }}
            />
          </div>
        </div>

        {/* Generated HTML */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Standalone HTML
            </p>
            <div className="flex gap-2">
              <CopyButton getText={() => html} />
              <Button type="button" size="sm" variant="outline" onClick={downloadHtml}>
                <Download className="h-3.5 w-3.5" /> .html
              </Button>
            </div>
          </div>
          <textarea
            readOnly
            value={html}
            spellCheck={false}
            className="h-48 w-full resize-none rounded-lg border border-border bg-background/60 p-3 font-mono text-xs text-foreground/80 outline-none"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
        <Field label="Size">
          <div className="grid grid-cols-1 gap-1.5">
            {(Object.keys(PROMO_SIZES) as PromoSizeKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => patch({ size: key })}
                className={`flex items-center justify-between rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                  cfg.size === key
                    ? "bg-[#7401df] text-white"
                    : "border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{PROMO_SIZES[key].label}</span>
                <span className="opacity-70">{key.replace("x", "×")}</span>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Headline">
          <Input value={cfg.headline} onChange={(e) => patch({ headline: e.target.value })} />
        </Field>
        <Field label="Subtext">
          <Input value={cfg.subtext} onChange={(e) => patch({ subtext: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="CTA label">
            <Input value={cfg.ctaLabel} onChange={(e) => patch({ ctaLabel: e.target.value })} />
          </Field>
          <Field label="Click URL">
            <Input value={cfg.ctaUrl} onChange={(e) => patch({ ctaUrl: e.target.value })} />
          </Field>
        </div>

        <Field label="Background color">
          <ColorSwatches value={cfg.bgColor} onChange={(c) => patch({ bgColor: c })} />
        </Field>
        <Field label="Background image URL (optional)">
          <Input
            value={cfg.bgImageUrl}
            placeholder="https://…"
            onChange={(e) => patch({ bgImageUrl: e.target.value })}
          />
        </Field>
        <Field label="Accent color">
          <ColorSwatches value={cfg.accentColor} onChange={(c) => patch({ accentColor: c })} />
        </Field>
        <Field label="Text color">
          <ColorSwatches value={cfg.textColor} onChange={(c) => patch({ textColor: c })} />
        </Field>

        <div className="border-t border-border pt-4">
          <Button
            type="button"
            className="w-full bg-[#74ddc7] text-[#0a0a0f] hover:bg-[#74ddc7]/90"
            disabled={saving}
            onClick={() => onSave({ name: cfg.headline || "Untitled promo" })}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save promo
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Saved list                                                        */
/* ------------------------------------------------------------------ */

const KIND_BADGE: Record<HyperframeKind, { label: string; color: string }> = {
  frame: { label: "Frame", color: BRAND_TEAL },
  overlay: { label: "Overlay", color: BRAND_TEAL },
  embed: { label: "Embed", color: BRAND_PURPLE },
  promo: { label: "Promo", color: BRAND_AMBER },
};

function SavedList({
  rows,
  loading,
  onLoad,
  onDelete,
}: {
  rows: SavedRow[];
  loading: boolean;
  onLoad: (row: SavedRow) => void;
  onDelete: (row: SavedRow) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
        <ImageIcon className="h-4 w-4 text-[#74ddc7]" /> Saved hyperframes
        <span className="text-xs font-normal text-muted-foreground">({rows.length})</span>
      </h2>
      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">
          Nothing saved yet. Build something above and hit Save.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const badge = KIND_BADGE[row.kind];
            return (
              <li
                key={row.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background/40 p-3"
              >
                <button
                  type="button"
                  onClick={() => onLoad(row)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                      style={{ backgroundColor: badge.color, color: pickReadable(badge.color) }}
                    >
                      {badge.label}
                    </span>
                    <span className="truncate text-sm font-semibold text-foreground">{row.name}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(row.updated_at).toLocaleString()}
                    {row.storage_path ? " · asset saved" : ""}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(row)}
                  aria-label="Delete"
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

const TABS: { id: Mode; label: string; icon: React.ElementType }[] = [
  { id: "frame", label: "Frames & Overlays", icon: FrameIcon },
  { id: "embed", label: "Embeds", icon: Code2 },
  { id: "promo", label: "Promo", icon: Megaphone },
];

export default function HyperframesPage() {
  const [mode, setMode] = useState<Mode>("frame");
  const [frameCfg, setFrameCfg] = useState<FrameConfig>(DEFAULT_FRAME);
  const [embedCfg, setEmbedCfg] = useState<EmbedConfig>(DEFAULT_EMBED);
  const [promoCfg, setPromoCfg] = useState<PromoConfig>(DEFAULT_PROMO);

  const [rows, setRows] = useState<SavedRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const flash = useCallback((kind: "ok" | "err", text: string) => {
    setNotice({ kind, text });
    setTimeout(() => setNotice(null), 4000);
  }, []);

  const loadRows = useCallback(async () => {
    setListLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setRows([]);
      setListLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("hyperframes")
      .select("id, kind, name, config, storage_path, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (!error && data) setRows(data as SavedRow[]);
    setListLoading(false);
  }, []);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  // ---- Save handlers ----

  async function saveRow(kind: HyperframeKind, name: string, config: object, storagePath: string | null) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      flash("err", "Please sign in to save.");
      return;
    }
    const { error } = await supabase.from("hyperframes").insert({
      user_id: user.id,
      kind,
      name: name.trim() || "Untitled",
      config,
      storage_path: storagePath,
    });
    if (error) {
      flash("err", `Save failed: ${error.message}`);
      return;
    }
    flash("ok", "Saved to your hyperframes.");
    loadRows();
  }

  const saveFrame = async ({
    name,
    uploadPng,
    getCanvas,
  }: {
    name: string;
    uploadPng: boolean;
    getCanvas: () => HTMLCanvasElement | null;
  }) => {
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        flash("err", "Please sign in to save.");
        return;
      }

      let storagePath: string | null = null;
      if (uploadPng) {
        const canvas = getCanvas();
        const blob = canvas
          ? await new Promise<Blob | null>((resolve) => {
              try {
                canvas.toBlob((b) => resolve(b), "image/png");
              } catch {
                resolve(null);
              }
            })
          : null;
        if (blob) {
          const path = `${user.id}/${uuid()}.png`;
          const { error: upErr } = await supabase.storage
            .from("hyperframe-assets")
            .upload(path, blob, { contentType: "image/png", upsert: false });
          if (upErr) {
            flash("err", `Asset upload failed (${upErr.message}); saving config only.`);
          } else {
            storagePath = path;
          }
        } else {
          flash("err", "Could not export PNG (image host may block it); saving config only.");
        }
      }

      // config keyed to the actual kind so a loaded row repopulates the form.
      const kind: HyperframeKind = frameCfg.variant;
      await saveRow(kind, name, frameCfg, storagePath);
    } finally {
      setSaving(false);
    }
  };

  const saveEmbed = async ({ name }: { name: string }) => {
    setSaving(true);
    try {
      await saveRow("embed", name, embedCfg, null);
    } finally {
      setSaving(false);
    }
  };

  const savePromo = async ({ name }: { name: string }) => {
    setSaving(true);
    try {
      await saveRow("promo", name, promoCfg, null);
    } finally {
      setSaving(false);
    }
  };

  // ---- Load a saved row back into its editor ----
  const loadRow = (row: SavedRow) => {
    if (row.kind === "embed") {
      setEmbedCfg({ ...DEFAULT_EMBED, ...(row.config as Partial<EmbedConfig>) });
      setMode("embed");
    } else if (row.kind === "promo") {
      setPromoCfg({ ...DEFAULT_PROMO, ...(row.config as Partial<PromoConfig>) });
      setMode("promo");
    } else {
      setFrameCfg({ ...DEFAULT_FRAME, ...(row.config as Partial<FrameConfig>) });
      setMode("frame");
    }
    flash("ok", `Loaded “${row.name}”.`);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteRow = async (row: SavedRow) => {
    const supabase = createClient();
    // Best-effort remove of any uploaded asset, then the row.
    if (row.storage_path) {
      await supabase.storage.from("hyperframe-assets").remove([row.storage_path]);
    }
    const { error } = await supabase.from("hyperframes").delete().eq("id", row.id);
    if (error) {
      flash("err", `Delete failed: ${error.message}`);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    flash("ok", "Deleted.");
  };

  return (
    <LoginRequired
      fullPage
      message="Sign in to use the Hyperframes studio — build branded frames, embeds, and promo units."
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Link
            href="/studio"
            className="mt-1 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Back to studio"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#74ddc7] to-[#7401df]">
              <FrameIcon className="h-5 w-5 text-[#0a0a0f]" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">Hyperframes</h1>
              <p className="text-sm text-muted-foreground">
                Branded frames &amp; overlays, embeddable widgets, and HTML5 promo units.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 rounded-2xl border border-border bg-card p-1">
          {TABS.map((tab) => {
            const active = mode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMode(tab.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-[#7401df] text-white"
                    : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Notice */}
        {notice && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              notice.kind === "ok"
                ? "border-[#74ddc7]/40 bg-[#74ddc7]/10 text-[#74ddc7]"
                : "border-red-500/40 bg-red-500/10 text-red-300"
            }`}
          >
            {notice.text}
          </div>
        )}

        {/* Active mode */}
        {mode === "frame" && (
          <FrameMode cfg={frameCfg} setCfg={setFrameCfg} onSave={saveFrame} saving={saving} />
        )}
        {mode === "embed" && (
          <EmbedMode cfg={embedCfg} setCfg={setEmbedCfg} onSave={saveEmbed} saving={saving} />
        )}
        {mode === "promo" && (
          <PromoMode cfg={promoCfg} setCfg={setPromoCfg} onSave={savePromo} saving={saving} />
        )}

        {/* Saved list */}
        <SavedList rows={rows} loading={listLoading} onLoad={loadRow} onDelete={deleteRow} />
      </div>
    </LoginRequired>
  );
}
