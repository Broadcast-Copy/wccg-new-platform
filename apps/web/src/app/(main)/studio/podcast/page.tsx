"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  Settings,
  HelpCircle,
  Keyboard,
  Layout,
  PanelBottomClose,
  PanelBottomOpen,
  Mic,
  FolderOpen,
  X,
} from "lucide-react";
import { StudioPreview } from "@/components/studio/studio-preview";
import {
  useOBSState,
  ScenesSources,
  RecordingControls,
} from "@/components/studio/obs-controls";
import { StudioTimeline } from "@/components/studio/timeline";
import { AudioMixer } from "@/components/studio/audio-mixer";
import { MediaBin } from "@/components/studio/media-bin";
import { LoginRequired } from "@/components/auth/login-required";

// ---------------------------------------------------------------------------
// Bottom‑panel tab type
// ---------------------------------------------------------------------------

type BottomPanel = "timeline" | "mixer";

function PodcastStudioContent() {
  const [showBottomPanel, setShowBottomPanel] = useState(true);
  const [bottomPanel, setBottomPanel] = useState<BottomPanel>("timeline");
  const [showMediaOverlay, setShowMediaOverlay] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Shared OBS state drives both Sources (left) and Controls (right)
  const obsState = useOBSState({
    onRecordingChange: useCallback(() => {}, []),
    onStreamingChange: useCallback(() => {}, []),
  });

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
    <div className="flex flex-col h-[calc(100vh-3.5rem)] -mx-4 sm:-mx-6 lg:-mx-8 -mt-6 overflow-hidden">
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
          <button
            onClick={() => setShowMediaOverlay(!showMediaOverlay)}
            className={`p-1.5 rounded-md text-xs transition-colors ${
              showMediaOverlay
                ? "text-foreground bg-foreground/[0.08]"
                : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
            }`}
            title="Media Library"
          >
            <FolderOpen className="h-3.5 w-3.5" />
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
      {/* Main Content                                                      */}
      {/* ================================================================= */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* ── Preview Monitor (takes all remaining vertical space) ── */}
        <div className="flex-1 min-h-[180px] p-2 overflow-hidden">
          <StudioPreview
            isRecording={obsState.isRecording}
            isStreaming={obsState.isStreaming}
          />
        </div>

        {/* ── Bottom Section: Sources | Timeline/Mixer | Controls ── */}
        {showBottomPanel && (
          <div className="flex border-t border-border bg-card/50 shrink-0 h-[300px] min-h-[240px] overflow-hidden">
            {/* ─── LEFT: Scenes & Sources ─── */}
            <div className="w-56 xl:w-64 border-r border-border flex flex-col shrink-0 overflow-hidden">
              <ScenesSources state={obsState} className="flex-1" />
            </div>

            {/* ─── CENTER: Timeline / Audio Mixer ─── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {/* Tabs */}
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

              {/* Content */}
              <div className="flex-1 overflow-hidden">
                {bottomPanel === "timeline" ? (
                  <StudioTimeline />
                ) : (
                  <AudioMixer />
                )}
              </div>
            </div>

            {/* ─── RIGHT: Recording Controls ─── */}
            <div className="w-48 xl:w-56 border-l border-border flex flex-col shrink-0 overflow-hidden">
              <RecordingControls state={obsState} className="flex-1" />
            </div>
          </div>
        )}
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
          <span>CPU: {obsState.stats.cpu}%</span>
          <span>RAM: 1.2 GB</span>
          <span>Disk: 45.2 GB free</span>
          <span className="text-muted-foreground/60">v1.0.0-beta</span>
        </div>
      </div>

      {/* ================================================================= */}
      {/* Media Library Overlay                                             */}
      {/* ================================================================= */}
      {showMediaOverlay && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setShowMediaOverlay(false)}
          />
          <div className="fixed inset-x-4 bottom-20 top-20 z-50 flex flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden sm:inset-x-12 lg:inset-x-24">
            <div className="flex items-center justify-between border-b border-border px-4 py-2 shrink-0">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-[#74ddc7]" />
                Media Library
              </h2>
              <button
                onClick={() => setShowMediaOverlay(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <MediaBin />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

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
