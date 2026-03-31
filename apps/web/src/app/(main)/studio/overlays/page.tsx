"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Image as ImageIcon,
  Type,
  Layers,
  Upload,
  Trash2,
  Check,
  X,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Droplet,
  Move,
  Settings,
  Eye,
  EyeOff,
  Save,
  ChevronDown,
  Palette,
  Sparkles,
  Radio,
  Tv,
  Music,
  Trophy,
  Timer,
  Instagram,
  MessageSquare,
  Newspaper,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type WatermarkPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";
type TextAnimation = "none" | "fade-in" | "slide-up" | "typewriter";
type TextPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

interface WatermarkSettings {
  position: WatermarkPosition;
  opacity: number;
  size: "small" | "medium" | "large";
  applyToAll: boolean;
}

interface OverlayTemplate {
  id: string;
  name: string;
  description: string;
  gradient: string;
  icon: React.ElementType;
  color: string;
}

interface TextSettings {
  text: string;
  font: string;
  size: number;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  alignment: "left" | "center" | "right";
  hasBackground: boolean;
  backgroundColor: string;
  position: TextPosition;
  animation: TextAnimation;
}

interface CustomDesign {
  id: string;
  name: string;
  url: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const OVERLAY_TEMPLATES: OverlayTemplate[] = [
  {
    id: "live",
    name: "WCCG Live",
    description: "Red live badge with station branding",
    gradient: "from-red-600 to-red-800",
    icon: Radio,
    color: "#dc2626",
  },
  {
    id: "lower-third",
    name: "Lower Third",
    description: "Name + title bar at bottom",
    gradient: "from-[#7401df] to-[#4c1d95]",
    icon: Type,
    color: "#7401df",
  },
  {
    id: "breaking",
    name: "Breaking News",
    description: "Red banner with scrolling text",
    gradient: "from-red-700 to-orange-600",
    icon: Newspaper,
    color: "#b91c1c",
  },
  {
    id: "now-playing",
    name: "Now Playing",
    description: "Song title + artist bar",
    gradient: "from-[#74ddc7] to-[#0d9488]",
    icon: Music,
    color: "#74ddc7",
  },
  {
    id: "interview",
    name: "Interview",
    description: "Split screen with name cards",
    gradient: "from-[#3b82f6] to-[#1d4ed8]",
    icon: Users,
    color: "#3b82f6",
  },
  {
    id: "countdown",
    name: "Countdown",
    description: "Countdown timer overlay",
    gradient: "from-[#f59e0b] to-[#d97706]",
    icon: Timer,
    color: "#f59e0b",
  },
  {
    id: "social-frame",
    name: "Social Frame",
    description: "Instagram/TikTok frame with handles",
    gradient: "from-[#ec4899] to-[#be185d]",
    icon: Instagram,
    color: "#ec4899",
  },
  {
    id: "sports-score",
    name: "Sports Score",
    description: "Scoreboard overlay",
    gradient: "from-[#22c55e] to-[#15803d]",
    icon: Trophy,
    color: "#22c55e",
  },
];

const FONTS = [
  { label: "Sans Serif", value: "sans-serif", example: "Aa" },
  { label: "Serif", value: "serif", example: "Aa" },
  { label: "Monospace", value: "monospace", example: "Aa" },
  { label: "Display", value: "'Impact', sans-serif", example: "Aa" },
  { label: "Handwritten", value: "'Comic Sans MS', cursive", example: "Aa" },
];

const PRESET_COLORS = [
  "#ffffff",
  "#74ddc7",
  "#7401df",
  "#dc2626",
  "#f59e0b",
  "#3b82f6",
  "#ec4899",
  "#22c55e",
  "#000000",
  "#64748b",
];

const POSITION_LABELS: Record<TextPosition, string> = {
  "top-left": "TL",
  "top-center": "TC",
  "top-right": "TR",
  "center-left": "CL",
  center: "C",
  "center-right": "CR",
  "bottom-left": "BL",
  "bottom-center": "BC",
  "bottom-right": "BR",
};

const POSITION_STYLES: Record<TextPosition, React.CSSProperties> = {
  "top-left": { top: "8%", left: "5%", textAlign: "left" },
  "top-center": { top: "8%", left: "50%", transform: "translateX(-50%)", textAlign: "center" },
  "top-right": { top: "8%", right: "5%", textAlign: "right" },
  "center-left": { top: "50%", left: "5%", transform: "translateY(-50%)", textAlign: "left" },
  center: { top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" },
  "center-right": { top: "50%", right: "5%", transform: "translateY(-50%)", textAlign: "right" },
  "bottom-left": { bottom: "8%", left: "5%", textAlign: "left" },
  "bottom-center": { bottom: "8%", left: "50%", transform: "translateX(-50%)", textAlign: "center" },
  "bottom-right": { bottom: "8%", right: "5%", textAlign: "right" },
};

const ANIMATIONS: { label: string; value: TextAnimation }[] = [
  { label: "None", value: "none" },
  { label: "Fade In", value: "fade-in" },
  { label: "Slide Up", value: "slide-up" },
  { label: "Typewriter", value: "typewriter" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function OverlaysPage() {
  const { user } = useAuth();

  // -- Active section tab --
  const [activeTab, setActiveTab] = useState<"watermark" | "overlays" | "text" | "custom">("watermark");

  // -- Watermark state --
  const [watermark, setWatermark] = useState<WatermarkSettings>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("wccg-watermark-settings");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return { position: "bottom-right", opacity: 80, size: "medium", applyToAll: true };
  });

  // -- Overlay state --
  const [selectedOverlay, setSelectedOverlay] = useState<string | null>(null);

  // -- Text state --
  const [textSettings, setTextSettings] = useState<TextSettings>({
    text: "WCCG 104.5 FM",
    font: "sans-serif",
    size: 36,
    color: "#ffffff",
    bold: true,
    italic: false,
    underline: false,
    alignment: "center",
    hasBackground: false,
    backgroundColor: "#000000",
    position: "bottom-center",
    animation: "none",
  });

  // -- Custom designs --
  const [customDesigns, setCustomDesigns] = useState<CustomDesign[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("wccg-custom-overlays");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return [];
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -- Save watermark to localStorage --
  useEffect(() => {
    localStorage.setItem("wccg-watermark-settings", JSON.stringify(watermark));
  }, [watermark]);

  // -- Save custom designs to localStorage --
  useEffect(() => {
    localStorage.setItem("wccg-custom-overlays", JSON.stringify(customDesigns));
  }, [customDesigns]);

  // -- Handlers --

  const saveWatermark = () => {
    localStorage.setItem("wccg-watermark-settings", JSON.stringify(watermark));
  };

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const newDesign: CustomDesign = {
        id: Date.now().toString(),
        name: file.name.replace(/\.[^.]+$/, ""),
        url: reader.result as string,
        createdAt: new Date().toISOString(),
      };
      setCustomDesigns((prev) => [...prev, newDesign]);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const deleteCustomDesign = (id: string) => {
    setCustomDesigns((prev) => prev.filter((d) => d.id !== id));
  };

  const watermarkSizeMap = { small: 40, medium: 64, large: 96 };

  const SECTION_TABS = [
    { id: "watermark" as const, label: "Watermark", icon: Droplet },
    { id: "overlays" as const, label: "Overlays", icon: Layers },
    { id: "text" as const, label: "Text Tool", icon: Type },
    { id: "custom" as const, label: "Custom", icon: Upload },
  ];

  // ================================================================
  //  RENDER
  // ================================================================

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#0a0a0f] text-white">
      {/* ---- HEADER ---- */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
        <Link href="/studio" className="text-white/50 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#7401df] to-[#4c1d95] flex items-center justify-center">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Video Overlays & Watermarks</h1>
            <p className="text-xs text-white/40">Manage overlays, watermarks, and text templates</p>
          </div>
        </div>
      </div>

      {/* ---- TABS ---- */}
      <div className="flex gap-1 px-6 pt-4 border-b border-white/10">
        {SECTION_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? "bg-white/10 text-white border-b-2 border-[#7401df]"
                : "text-white/50 hover:text-white/70 hover:bg-white/5"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ---- CONTENT ---- */}
      <div className="p-6">
        {/* ========== A. WATERMARK SETTINGS ========== */}
        {activeTab === "watermark" && (
          <div className="max-w-4xl space-y-6">
            {/* Preview + Position */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Preview */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
                  Preview
                </h3>
                <div className="relative aspect-video bg-[#15151f] rounded-xl border border-white/10 overflow-hidden">
                  {/* Simulated video content */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex items-center justify-center">
                    <div className="text-center">
                      <Tv className="h-12 w-12 text-white/10 mx-auto mb-2" />
                      <p className="text-white/20 text-sm">Video Preview</p>
                    </div>
                  </div>
                  {/* Watermark */}
                  <div
                    className="absolute flex items-center justify-center"
                    style={{
                      ...(watermark.position.includes("top") ? { top: "12px" } : { bottom: "12px" }),
                      ...(watermark.position.includes("left") ? { left: "12px" } : { right: "12px" }),
                      opacity: watermark.opacity / 100,
                    }}
                  >
                    <div
                      className="bg-gradient-to-br from-[#7401df] to-[#4c1d95] rounded-lg flex items-center justify-center font-bold text-white shadow-lg"
                      style={{
                        width: watermarkSizeMap[watermark.size],
                        height: watermarkSizeMap[watermark.size] * 0.6,
                        fontSize: watermark.size === "small" ? 8 : watermark.size === "medium" ? 11 : 14,
                      }}
                    >
                      1045TV
                    </div>
                  </div>
                </div>
              </div>

              {/* Settings */}
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
                  Settings
                </h3>

                {/* Position */}
                <div className="space-y-2">
                  <Label className="text-xs text-white/50">Position</Label>
                  <div className="grid grid-cols-2 gap-2 w-40">
                    {(["top-left", "top-right", "bottom-left", "bottom-right"] as WatermarkPosition[]).map(
                      (pos) => (
                        <button
                          key={pos}
                          onClick={() => setWatermark({ ...watermark, position: pos })}
                          className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                            watermark.position === pos
                              ? "bg-[#7401df] text-white"
                              : "bg-white/5 text-white/50 hover:bg-white/10 border border-white/10"
                          }`}
                        >
                          {pos
                            .split("-")
                            .map((w) => w[0].toUpperCase() + w.slice(1))
                            .join(" ")}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Opacity */}
                <div className="space-y-2">
                  <Label className="text-xs text-white/50">
                    Opacity: {watermark.opacity}%
                  </Label>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={watermark.opacity}
                    onChange={(e) =>
                      setWatermark({ ...watermark, opacity: parseInt(e.target.value) })
                    }
                    className="w-full accent-[#7401df]"
                  />
                  <div className="flex justify-between text-[10px] text-white/30">
                    <span>10%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Size */}
                <div className="space-y-2">
                  <Label className="text-xs text-white/50">Size</Label>
                  <div className="flex gap-2">
                    {(["small", "medium", "large"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setWatermark({ ...watermark, size: s })}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all ${
                          watermark.size === s
                            ? "bg-[#7401df] text-white"
                            : "bg-white/5 text-white/50 hover:bg-white/10 border border-white/10"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Apply to all */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <Label className="text-sm text-white/70">Apply to all exports</Label>
                  <Switch
                    checked={watermark.applyToAll}
                    onCheckedChange={(checked) =>
                      setWatermark({ ...watermark, applyToAll: checked })
                    }
                  />
                </div>

                {/* Save */}
                <Button
                  onClick={saveWatermark}
                  className="w-full bg-[#7401df] hover:bg-[#7401df]/80 text-white font-semibold"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Watermark Settings
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ========== B. OVERLAY TEMPLATES ========== */}
        {activeTab === "overlays" && (
          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
              Preset Overlay Templates
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {OVERLAY_TEMPLATES.map((template) => {
                const isSelected = selectedOverlay === template.id;
                return (
                  <div
                    key={template.id}
                    className={`group relative rounded-xl border overflow-hidden transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#7401df] shadow-lg shadow-[#7401df]/20"
                        : "border-white/10 hover:border-white/20"
                    }`}
                    onClick={() => setSelectedOverlay(isSelected ? null : template.id)}
                  >
                    {/* Preview thumbnail */}
                    <div className={`aspect-video bg-gradient-to-br ${template.gradient} relative`}>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <template.icon className="h-8 w-8 text-white/80 mb-2" />
                        <span className="text-xs font-bold text-white/90 uppercase tracking-wider">
                          {template.name}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-[#7401df] flex items-center justify-center">
                          <Check className="h-3.5 w-3.5 text-white" />
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="p-3 bg-[#12121c]">
                      <p className="text-sm font-semibold">{template.name}</p>
                      <p className="text-xs text-white/40 mt-0.5">{template.description}</p>
                      <Button
                        size="sm"
                        className={`w-full mt-2 text-xs font-semibold ${
                          isSelected
                            ? "bg-[#7401df] text-white"
                            : "bg-white/10 text-white/70 hover:bg-white/15"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOverlay(isSelected ? null : template.id);
                        }}
                      >
                        {isSelected ? "Active" : "Use"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom overlay upload */}
            <div className="mt-6 p-4 rounded-xl border border-dashed border-white/20 bg-white/5 text-center">
              <Upload className="h-8 w-8 text-white/30 mx-auto mb-2" />
              <p className="text-sm text-white/50 mb-3">Upload Custom Overlay (PNG with transparency)</p>
              <label className="cursor-pointer">
                <Button size="sm" className="bg-[#7401df] hover:bg-[#7401df]/80 text-white" asChild>
                  <span>Choose File</span>
                </Button>
                <input
                  type="file"
                  accept="image/png"
                  className="hidden"
                  onChange={handleCustomUpload}
                />
              </label>
            </div>
          </div>
        )}

        {/* ========== C. TEXT TOOL ========== */}
        {activeTab === "text" && (
          <div className="max-w-5xl space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
              {/* Preview canvas */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
                  Preview
                </h3>
                <div className="relative aspect-video bg-[#15151f] rounded-xl border border-white/10 overflow-hidden">
                  {/* Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]" />

                  {/* Grid position indicators */}
                  <div className="absolute inset-4 grid grid-cols-3 grid-rows-3 gap-1 pointer-events-none">
                    {(Object.keys(POSITION_LABELS) as TextPosition[]).map((pos) => (
                      <div
                        key={pos}
                        className={`rounded border border-dashed transition-colors ${
                          textSettings.position === pos
                            ? "border-[#7401df]/40"
                            : "border-transparent"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Text element */}
                  {textSettings.text && (
                    <div
                      className={`absolute max-w-[80%] transition-all ${
                        textSettings.animation === "fade-in"
                          ? "animate-[fadeIn_1s_ease-in]"
                          : textSettings.animation === "slide-up"
                          ? "animate-[slideUp_0.5s_ease-out]"
                          : ""
                      }`}
                      style={{
                        ...POSITION_STYLES[textSettings.position],
                        fontFamily: textSettings.font,
                        fontSize: `${Math.min(textSettings.size, 60)}px`,
                        color: textSettings.color,
                        fontWeight: textSettings.bold ? "bold" : "normal",
                        fontStyle: textSettings.italic ? "italic" : "normal",
                        textDecoration: textSettings.underline ? "underline" : "none",
                        textAlign: textSettings.alignment,
                        ...(textSettings.hasBackground
                          ? {
                              backgroundColor: textSettings.backgroundColor + "cc",
                              padding: "4px 12px",
                              borderRadius: "4px",
                            }
                          : {}),
                      }}
                    >
                      {textSettings.text}
                    </div>
                  )}
                </div>
              </div>

              {/* Text controls */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
                  Text Settings
                </h3>

                {/* Text input */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-white/50">Text Content</Label>
                  <Input
                    value={textSettings.text}
                    onChange={(e) =>
                      setTextSettings({ ...textSettings, text: e.target.value })
                    }
                    placeholder="Enter your text..."
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>

                {/* Font selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-white/50">Font</Label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {FONTS.map((f) => (
                      <button
                        key={f.value}
                        onClick={() =>
                          setTextSettings({ ...textSettings, font: f.value })
                        }
                        className={`py-2 rounded-lg text-center transition-all ${
                          textSettings.font === f.value
                            ? "bg-[#7401df] text-white"
                            : "bg-white/5 text-white/50 hover:bg-white/10 border border-white/10"
                        }`}
                        style={{ fontFamily: f.value }}
                        title={f.label}
                      >
                        <span className="text-sm">{f.example}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Size slider */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-white/50">
                    Size: {textSettings.size}px
                  </Label>
                  <input
                    type="range"
                    min={12}
                    max={120}
                    value={textSettings.size}
                    onChange={(e) =>
                      setTextSettings({ ...textSettings, size: parseInt(e.target.value) })
                    }
                    className="w-full accent-[#7401df]"
                  />
                  <div className="flex justify-between text-[10px] text-white/30">
                    <span>12px</span>
                    <span>120px</span>
                  </div>
                </div>

                {/* Color picker */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-white/50">Color</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() =>
                          setTextSettings({ ...textSettings, color: c })
                        }
                        className={`h-7 w-7 rounded-lg border-2 transition-all ${
                          textSettings.color === c
                            ? "border-[#7401df] scale-110"
                            : "border-white/10 hover:border-white/30"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <div className="relative">
                      <input
                        type="color"
                        value={textSettings.color}
                        onChange={(e) =>
                          setTextSettings({ ...textSettings, color: e.target.value })
                        }
                        className="absolute inset-0 w-7 h-7 opacity-0 cursor-pointer"
                      />
                      <div className="h-7 w-7 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center">
                        <Palette className="h-3.5 w-3.5 text-white/40" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Formatting: bold, italic, underline */}
                <div className="flex gap-1.5">
                  <button
                    onClick={() =>
                      setTextSettings({ ...textSettings, bold: !textSettings.bold })
                    }
                    className={`p-2.5 rounded-lg transition-all ${
                      textSettings.bold
                        ? "bg-[#7401df] text-white"
                        : "bg-white/5 text-white/50 hover:bg-white/10"
                    }`}
                  >
                    <Bold className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      setTextSettings({ ...textSettings, italic: !textSettings.italic })
                    }
                    className={`p-2.5 rounded-lg transition-all ${
                      textSettings.italic
                        ? "bg-[#7401df] text-white"
                        : "bg-white/5 text-white/50 hover:bg-white/10"
                    }`}
                  >
                    <Italic className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      setTextSettings({
                        ...textSettings,
                        underline: !textSettings.underline,
                      })
                    }
                    className={`p-2.5 rounded-lg transition-all ${
                      textSettings.underline
                        ? "bg-[#7401df] text-white"
                        : "bg-white/5 text-white/50 hover:bg-white/10"
                    }`}
                  >
                    <Underline className="h-4 w-4" />
                  </button>

                  <div className="w-px bg-white/10 mx-1" />

                  {/* Alignment */}
                  {(
                    [
                      { val: "left", Icon: AlignLeft },
                      { val: "center", Icon: AlignCenter },
                      { val: "right", Icon: AlignRight },
                    ] as const
                  ).map(({ val, Icon }) => (
                    <button
                      key={val}
                      onClick={() =>
                        setTextSettings({ ...textSettings, alignment: val })
                      }
                      className={`p-2.5 rounded-lg transition-all ${
                        textSettings.alignment === val
                          ? "bg-[#7401df] text-white"
                          : "bg-white/5 text-white/50 hover:bg-white/10"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>

                {/* Background toggle */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                  <Switch
                    checked={textSettings.hasBackground}
                    onCheckedChange={(checked) =>
                      setTextSettings({ ...textSettings, hasBackground: checked })
                    }
                  />
                  <Label className="text-sm text-white/70 flex-1">Text Background</Label>
                  {textSettings.hasBackground && (
                    <div className="relative">
                      <input
                        type="color"
                        value={textSettings.backgroundColor}
                        onChange={(e) =>
                          setTextSettings({
                            ...textSettings,
                            backgroundColor: e.target.value,
                          })
                        }
                        className="absolute inset-0 w-6 h-6 opacity-0 cursor-pointer"
                      />
                      <div
                        className="h-6 w-6 rounded border border-white/20"
                        style={{ backgroundColor: textSettings.backgroundColor }}
                      />
                    </div>
                  )}
                </div>

                {/* Position grid */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-white/50">Position</Label>
                  <div className="grid grid-cols-3 gap-1 w-32">
                    {(Object.entries(POSITION_LABELS) as [TextPosition, string][]).map(
                      ([pos, label]) => (
                        <button
                          key={pos}
                          onClick={() =>
                            setTextSettings({ ...textSettings, position: pos })
                          }
                          className={`py-1.5 rounded text-[10px] font-medium transition-all ${
                            textSettings.position === pos
                              ? "bg-[#7401df] text-white"
                              : "bg-white/5 text-white/40 hover:bg-white/10"
                          }`}
                        >
                          {label}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Animation */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-white/50">Animation</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ANIMATIONS.map((anim) => (
                      <button
                        key={anim.value}
                        onClick={() =>
                          setTextSettings({ ...textSettings, animation: anim.value })
                        }
                        className={`py-2 rounded-lg text-xs font-medium transition-all ${
                          textSettings.animation === anim.value
                            ? "bg-[#7401df] text-white"
                            : "bg-white/5 text-white/50 hover:bg-white/10 border border-white/10"
                        }`}
                      >
                        {anim.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== D. CUSTOM DESIGNS ========== */}
        {activeTab === "custom" && (
          <div className="space-y-6">
            {/* Upload area */}
            <div className="p-6 rounded-xl border border-dashed border-white/20 bg-white/5 text-center">
              <Upload className="h-10 w-10 text-white/30 mx-auto mb-3" />
              <p className="text-sm text-white/50 mb-1">
                Upload custom overlays and frames
              </p>
              <p className="text-xs text-white/30 mb-4">
                PNG format recommended (supports transparency)
              </p>
              <label className="cursor-pointer">
                <Button
                  size="sm"
                  className="bg-[#7401df] hover:bg-[#7401df]/80 text-white"
                  asChild
                >
                  <span>Upload Image</span>
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleCustomUpload}
                />
              </label>
            </div>

            {/* Gallery */}
            {customDesigns.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
                  Your Custom Designs ({customDesigns.length})
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {customDesigns.map((design) => (
                    <div
                      key={design.id}
                      className="group rounded-xl border border-white/10 overflow-hidden hover:border-white/20 transition-colors"
                    >
                      <div className="aspect-video bg-[#15151f] relative">
                        <img
                          src={design.url}
                          alt={design.name}
                          className="absolute inset-0 w-full h-full object-contain"
                        />
                      </div>
                      <div className="p-3 bg-[#12121c] flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{design.name}</p>
                          <p className="text-[10px] text-white/30">
                            {new Date(design.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteCustomDesign(design.id)}
                          className="p-1.5 rounded-md text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <ImageIcon className="h-12 w-12 text-white/10 mx-auto mb-3" />
                <p className="text-sm text-white/30">No custom designs yet</p>
                <p className="text-xs text-white/20 mt-1">
                  Upload PNG files with transparency for the best results
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CSS keyframes for text animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
