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
import { X, Minimize2, Maximize2 } from "lucide-react";
import { useListeningTracker } from "@/hooks/use-listening-tracker";

// ---------------------------------------------------------------------------
// SecureNet Player URL — the hosted Cirrus player for WCCG
// ---------------------------------------------------------------------------
export const SECURENET_PLAYER_URL =
  "https://streamdb7web.securenetsystems.net/cirruscontent/WCCG";

// The native design-width of the Cirrus player page. When the overlay
// container is narrower than this, we CSS-scale the iframe down so it
// remains fully visible without horizontal overflow or scroll bars.
const PLAYER_NATIVE_WIDTH = 500;

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
// Provider + Bottom Drawer
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

  // ---------------------------------------------------------------------------
  // Responsive iframe scaling — when the container is narrower than the
  // player's native width we CSS-scale the iframe down so it fits.
  // ---------------------------------------------------------------------------
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const [iframeScale, setIframeScale] = useState(1);

  useEffect(() => {
    if (!isOpen || isMinimized) return;
    const el = iframeContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setIframeScale(w < PLAYER_NATIVE_WIDTH ? w / PLAYER_NATIVE_WIDTH : 1);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen, isMinimized]);

  // ---------------------------------------------------------------------------
  // Mount animation — slide up after first render frame
  // ---------------------------------------------------------------------------
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      // Delay one frame so the translate-y-full is applied first, then we
      // transition to translate-y-0.
      const raf = requestAnimationFrame(() => setMounted(true));
      return () => {
        cancelAnimationFrame(raf);
        setMounted(false);
      };
    }
    setMounted(false);
  }, [isOpen, isMinimized]);

  return (
    <StreamPlayerContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}

      {/* Bottom Drawer */}
      {isOpen && (
        <>
          {/* Minimized: floating pill at bottom-right, above global player */}
          {isMinimized ? (
            <div className="fixed z-[70] bottom-20 right-4 w-[320px] rounded-2xl shadow-2xl transition-all duration-300 ease-out">
              {/* Header bar */}
              <div className="flex items-center justify-between bg-[#1a1a2e] border border-border rounded-t-2xl px-4 py-2.5">
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
                    onClick={() => setIsMinimized(false)}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground/70 hover:bg-foreground/[0.08] transition-colors"
                    aria-label="Expand player"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={close}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground/70 hover:bg-foreground/[0.08] transition-colors"
                    aria-label="Close player"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Minimized iframe strip */}
              <div className="h-[56px] bg-white overflow-hidden rounded-b-2xl">
                <iframe
                  src={SECURENET_PLAYER_URL}
                  title="WCCG 104.5 FM Live Stream Player"
                  className="border-0"
                  allow="autoplay; encrypted-media"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            </div>
          ) : (
            /* ----------------------------------------------------------- */
            /* Expanded: bottom slide-up drawer, no full backdrop           */
            /* ----------------------------------------------------------- */
            <div
              className={`fixed z-[70] bottom-14 left-0 right-0 flex flex-col transition-transform duration-300 ease-out ${
                mounted ? "translate-y-0" : "translate-y-full"
              }`}
              style={{
                maxHeight: "min(92vh, 1200px)",
                /* Subtle top shadow instead of a full backdrop */
                boxShadow: "0 -8px 30px rgba(0,0,0,0.25), 0 -2px 8px rgba(0,0,0,0.12)",
              }}
            >
              {/* Drag handle visual affordance */}
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
                    onClick={() => setIsMinimized(true)}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground/70 hover:bg-foreground/[0.08] transition-colors"
                    aria-label="Minimize player"
                  >
                    <Minimize2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={close}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground/70 hover:bg-foreground/[0.08] transition-colors"
                    aria-label="Close player"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* iframe container — fills remaining height, scales on narrow viewports */}
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
          )}
        </>
      )}
    </StreamPlayerContext.Provider>
  );
}
