"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { X, Minimize2, Maximize2 } from "lucide-react";
import { useListeningTracker } from "@/hooks/use-listening-tracker";

// ---------------------------------------------------------------------------
// SecureNet Player URL — the hosted Cirrus player for WCCG
// ---------------------------------------------------------------------------
export const SECURENET_PLAYER_URL =
  "https://streamdb7web.securenetsystems.net/cirruscontent/WCCG";

// ---------------------------------------------------------------------------
// Context for opening/closing the stream player from anywhere
// ---------------------------------------------------------------------------
interface StreamPlayerContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const StreamPlayerContext = createContext<StreamPlayerContextValue | null>(null);

export function useStreamPlayer(): StreamPlayerContextValue {
  const ctx = useContext(StreamPlayerContext);
  if (!ctx) {
    throw new Error(
      "useStreamPlayer must be used within a StreamPlayerProvider.",
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider + Overlay
// ---------------------------------------------------------------------------
export function StreamPlayerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
    setIsMinimized(false);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, close]);

  // Track listening sessions via overlay open/close state
  useListeningTracker(isOpen);

  return (
    <StreamPlayerContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}

      {/* Overlay */}
      {isOpen && (
        <>
          {/* Backdrop — only show when NOT minimized */}
          {!isMinimized && (
            <div
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity"
              onClick={close}
            />
          )}

          {/* Player Panel */}
          <div
            className={`fixed z-[70] transition-all duration-300 ease-out ${
              isMinimized
                ? // Minimized: small floating pill at bottom-right
                  "bottom-20 right-4 w-[320px] h-[100px] rounded-2xl shadow-2xl"
                : // Full: responsive centered modal
                  "inset-x-0 bottom-0 sm:inset-auto sm:bottom-4 sm:right-4 sm:left-auto sm:w-[400px] sm:max-w-[95vw] rounded-t-2xl sm:rounded-2xl shadow-2xl"
            }`}
          >
            {/* Header bar */}
            <div className="flex items-center justify-between bg-[#1a1a2e] border border-white/[0.08] rounded-t-2xl sm:rounded-t-2xl px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#dc2626] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#dc2626]" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-white/70">
                    Live
                  </span>
                </div>
                <span className="text-sm font-semibold text-white">
                  WCCG 104.5 FM
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-colors"
                  aria-label={isMinimized ? "Expand player" : "Minimize player"}
                >
                  {isMinimized ? (
                    <Maximize2 className="h-3.5 w-3.5" />
                  ) : (
                    <Minimize2 className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  onClick={close}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-colors"
                  aria-label="Close player"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* iframe container */}
            <div
              className={`bg-white overflow-hidden transition-all duration-300 ${
                isMinimized
                  ? "h-[56px] rounded-b-2xl"
                  : "h-[75vh] sm:h-[520px] rounded-b-2xl sm:rounded-b-2xl"
              }`}
            >
              <iframe
                src={SECURENET_PLAYER_URL}
                title="WCCG 104.5 FM Live Stream Player"
                className="w-full h-full border-0"
                allow="autoplay; encrypted-media"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          </div>
        </>
      )}
    </StreamPlayerContext.Provider>
  );
}
