"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X, Minimize2 } from "lucide-react";
import { useListeningTracker } from "@/hooks/use-listening-tracker";

// ---------------------------------------------------------------------------
// SecureNet Player URL — the hosted Cirrus player for WCCG
// ---------------------------------------------------------------------------
export const SECURENET_PLAYER_URL =
  "https://streamdb7web.securenetsystems.net/cirruscontent/WCCG";

// The native design-width of the Cirrus player page.
const PLAYER_NATIVE_WIDTH = 500;

// ---------------------------------------------------------------------------
// Player modes
// ---------------------------------------------------------------------------
type PlayerMode = "closed" | "minimized" | "expanded";

// ---------------------------------------------------------------------------
// Context
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
// Provider + Persistent Player
// ---------------------------------------------------------------------------
export function StreamPlayerProvider({ children }: { children: ReactNode }) {
  // Once true the iframe stays mounted — audio keeps playing across pages
  const [iframeMounted, setIframeMounted] = useState(false);
  const [mode, setMode] = useState<PlayerMode>("closed");

  // ── Actions ──────────────────────────────────────────────────────────────
  const open = useCallback(() => {
    setIframeMounted(true);
    setMode("expanded");
  }, []);

  // "Close" from expanded → minimize (keeps playing)
  const close = useCallback(() => {
    setMode("minimized");
  }, []);

  // Actually stop & destroy the iframe
  const stop = useCallback(() => {
    setMode("closed");
    setIframeMounted(false);
  }, []);

  const toggle = useCallback(() => {
    setMode((prev) => {
      if (prev === "expanded") return "minimized";
      setIframeMounted(true);
      return "expanded";
    });
  }, []);

  // Escape: expanded → minimize
  useEffect(() => {
    if (mode !== "expanded") return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMode("minimized");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [mode]);

  // Track listening sessions
  useListeningTracker(iframeMounted);

  // ── Responsive iframe scaling ────────────────────────────────────────────
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const [iframeScale, setIframeScale] = useState(1);

  useEffect(() => {
    if (mode !== "expanded") return;
    const el = iframeContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setIframeScale(w < PLAYER_NATIVE_WIDTH ? w / PLAYER_NATIVE_WIDTH : 1);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [mode]);

  // ── Slide-up animation ───────────────────────────────────────────────────
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (mode === "expanded") {
      const raf = requestAnimationFrame(() => setMounted(true));
      return () => {
        cancelAnimationFrame(raf);
        setMounted(false);
      };
    }
    setMounted(false);
  }, [mode]);

  const isExpanded = mode === "expanded";

  return (
    <StreamPlayerContext.Provider value={{ isOpen: mode !== "closed", open, close, toggle }}>
      {children}

      {/* ================================================================
          PERSISTENT IFRAME — mounted once, never destroyed until stop()
          The expanded drawer uses translate-y to show/hide; the iframe
          stays in the DOM so audio never interrupts.
          ================================================================ */}
      {iframeMounted && (
        <>
          {/* ─── Expanded drawer ─── */}
          <div
            className={`fixed z-[70] bottom-14 left-0 right-0 flex flex-col transition-transform duration-300 ease-out ${
              isExpanded && mounted ? "translate-y-0" : "translate-y-full"
            }`}
            style={{
              maxHeight: "min(92vh, 1200px)",
              boxShadow: isExpanded
                ? "0 -8px 30px rgba(0,0,0,0.25), 0 -2px 8px rgba(0,0,0,0.12)"
                : "none",
            }}
            aria-hidden={!isExpanded}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2 pb-1 bg-[#1a1a2e] rounded-t-2xl">
              <div className="w-10 h-1 rounded-full bg-foreground/25" />
            </div>

            {/* Header bar */}
            <div className="flex items-center justify-between bg-[#1a1a2e] border-x border-border px-4 py-1.5">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#dc2626] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#dc2626]" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-foreground/70">
                    Live
                  </span>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  WCCG 104.5 FM
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMode("minimized")}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground/70 hover:bg-foreground/[0.08] transition-colors"
                  aria-label="Minimize player"
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={stop}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground/70 hover:bg-foreground/[0.08] transition-colors"
                  aria-label="Stop and close player"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Iframe container */}
            <div
              ref={iframeContainerRef}
              className="bg-white overflow-hidden"
              style={{ height: "calc(92vh - 80px)", minHeight: "500px" }}
            >
              <iframe
                src={SECURENET_PLAYER_URL}
                title="WCCG 104.5 FM Live Stream Player"
                className="border-0"
                allow="autoplay; encrypted-media"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                style={
                  iframeScale < 1
                    ? {
                        width: `${PLAYER_NATIVE_WIDTH}px`,
                        height: `${100 / iframeScale}%`,
                        transform: `scale(${iframeScale})`,
                        transformOrigin: "top left",
                      }
                    : { width: "100%", height: "100%" }
                }
              />
            </div>
          </div>

        </>
      )}
    </StreamPlayerContext.Provider>
  );
}
