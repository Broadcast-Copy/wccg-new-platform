"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  Settings,
  HelpCircle,
  Keyboard,
  Layout,
  PanelLeftClose,
  PanelLeftOpen,
  PanelBottomClose,
  PanelBottomOpen,
  Radio,
  Mic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudioPreview } from "@/components/studio/studio-preview";
import { OBSControls } from "@/components/studio/obs-controls";
import { StudioTimeline } from "@/components/studio/timeline";
import { AudioMixer } from "@/components/studio/audio-mixer";
import { MediaBin } from "@/components/studio/media-bin";

// ---------------------------------------------------------------------------
// Layout Panel Tabs
// ---------------------------------------------------------------------------

type LeftPanel = "media" | "scenes";
type BottomPanel = "timeline" | "mixer";

export default function PodcastStudioPage() {
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showBottomPanel, setShowBottomPanel] = useState(true);
  const [leftPanel, setLeftPanel] = useState<LeftPanel>("scenes");
  const [bottomPanel, setBottomPanel] = useState<BottomPanel>("timeline");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -mx-4 sm:-mx-6 lg:-mx-8 -mt-6 overflow-hidden">
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
              <Mic className="h-3.5 w-3.5 text-[#7401df]" />
            </div>
            <span className="text-sm font-semibold text-foreground">
              Podcast Studio
            </span>
            <span className="hidden sm:inline text-[10px] text-muted-foreground bg-foreground/[0.06] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">
              Beta
            </span>
          </div>
        </div>

        {/* Center: Layout Controls */}
        <div className="hidden md:flex items-center gap-1">
          <button
            onClick={() => setShowLeftPanel(!showLeftPanel)}
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
            onClick={() => setShowBottomPanel(!showBottomPanel)}
            className={`p-1.5 rounded-md text-xs transition-colors ${
              showBottomPanel
                ? "text-foreground bg-foreground/[0.08]"
                : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
            }`}
            title="Toggle bottom panel"
          >
            {showBottomPanel ? (
              <PanelBottomClose className="h-3.5 w-3.5" />
            ) : (
              <PanelBottomOpen className="h-3.5 w-3.5" />
            )}
          </button>
          <div className="h-4 w-px bg-border mx-1" />
          <button
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
            title="Layout presets"
          >
            <Layout className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <button
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
            title="Keyboard shortcuts"
          >
            <Keyboard className="h-3.5 w-3.5" />
          </button>
          <button
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
            title="Help"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
          <button
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
            title="Settings"
          >
            <Settings className="h-3.5 w-3.5" />
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
        {/* ── Left Panel: Scenes/Controls or Media Bin ── */}
        {showLeftPanel && (
          <div className="w-72 xl:w-80 border-r border-border bg-card/50 flex flex-col shrink-0 overflow-hidden">
            {/* Panel Tabs */}
            <div className="flex border-b border-border shrink-0">
              <button
                onClick={() => setLeftPanel("scenes")}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  leftPanel === "scenes"
                    ? "text-foreground border-b-2 border-[#74ddc7] bg-foreground/[0.04]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Scenes & Controls
              </button>
              <button
                onClick={() => setLeftPanel("media")}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  leftPanel === "media"
                    ? "text-foreground border-b-2 border-[#74ddc7] bg-foreground/[0.04]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Media
              </button>
            </div>
            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto">
              {leftPanel === "scenes" ? <OBSControls /> : <MediaBin />}
            </div>
          </div>
        )}

        {/* ── Center: Preview + Controls ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Preview Monitor */}
          <div className="flex-1 min-h-0 p-2 overflow-hidden">
            <StudioPreview />
          </div>

          {/* ── Bottom Panel: Timeline or Mixer ── */}
          {showBottomPanel && (
            <div className="border-t border-border bg-card/50 shrink-0" style={{ height: bottomPanel === "timeline" ? "280px" : "260px" }}>
              {/* Panel Tabs */}
              <div className="flex border-b border-border shrink-0">
                <button
                  onClick={() => setBottomPanel("timeline")}
                  className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                    bottomPanel === "timeline"
                      ? "text-foreground border-b-2 border-[#74ddc7] bg-foreground/[0.04]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Timeline
                </button>
                <button
                  onClick={() => setBottomPanel("mixer")}
                  className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                    bottomPanel === "mixer"
                      ? "text-foreground border-b-2 border-[#74ddc7] bg-foreground/[0.04]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Audio Mixer
                </button>
              </div>
              {/* Panel Content */}
              <div className="h-[calc(100%-29px)] overflow-hidden">
                {bottomPanel === "timeline" ? (
                  <StudioTimeline />
                ) : (
                  <AudioMixer />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* Status Bar                                                        */}
      {/* ================================================================= */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-border bg-card/80 text-[10px] text-muted-foreground shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Connected
          </span>
          <span>48kHz / 24-bit</span>
          <span>H.264 / AAC</span>
        </div>
        <div className="flex items-center gap-3">
          <span>CPU: 12%</span>
          <span>RAM: 1.2 GB</span>
          <span>Disk: 45.2 GB free</span>
          <span className="text-muted-foreground/60">v1.0.0-beta</span>
        </div>
      </div>
    </div>
  );
}
