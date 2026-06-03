"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ComponentType } from "react";
import {
  Home,
  CalendarDays,
  Compass,
  ShoppingBag,
  MapPin,
  Radio,
  Video,
  Gift,
  ChevronUp,
  ChevronDown,
  Settings2,
  Check,
  GripHorizontal,
} from "lucide-react";
import { useStreamPlayer } from "@/components/player/stream-player-overlay";

// ---------------------------------------------------------------------------
// Catalog — the full set of quick links the user can choose from.
// Each item is either a link (`href`) or the streaming action (`action: "stream"`).
// ---------------------------------------------------------------------------
type DockIcon = ComponentType<{ className?: string }>;

type DockItem = {
  key: string;
  label: string;
  icon: DockIcon;
} & (
  | { href: string; action?: undefined }
  | { href?: undefined; action: "stream" }
);

const CATALOG = [
  { key: "home", label: "Home", icon: Home, href: "/" },
  { key: "events", label: "Events", icon: CalendarDays, href: "/events" },
  { key: "discover", label: "Discover", icon: Compass, href: "/discover" },
  { key: "marketplace", label: "Market", icon: ShoppingBag, href: "/marketplace" },
  { key: "directory", label: "Directory", icon: MapPin, href: "/community" },
  { key: "streaming", label: "Live", icon: Radio, action: "stream" },
  { key: "watch", label: "Watch", icon: Video, href: "/videos" },
  { key: "rewards", label: "Rewards", icon: Gift, href: "/rewards" },
] as const satisfies readonly DockItem[];

type DockKey = (typeof CATALOG)[number]["key"];

const CATALOG_BY_KEY: Record<string, DockItem> = Object.fromEntries(
  CATALOG.map((item) => [item.key, item]),
);

const VALID_KEYS = new Set<string>(CATALOG.map((item) => item.key));

const MAX_TABS = 5;
const DEFAULT_KEYS: DockKey[] = [
  "home",
  "events",
  "discover",
  "marketplace",
  "directory",
];

const STORAGE_TABS = "wccg_dock_tabs";
const STORAGE_MIN = "wccg_dock_min";

// Routes where the dock should never render.
const HIDDEN_PREFIXES = [
  "/studio/video-editor",
  "/studio/podcast",
  "/studio/audio-editor",
];

// ---------------------------------------------------------------------------
// localStorage helpers — all SSR-guarded.
// ---------------------------------------------------------------------------
function readStoredKeys(): DockKey[] {
  if (typeof window === "undefined") return DEFAULT_KEYS;
  try {
    const raw = window.localStorage.getItem(STORAGE_TABS);
    if (!raw) return DEFAULT_KEYS;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_KEYS;
    const cleaned: DockKey[] = [];
    for (const entry of parsed) {
      if (typeof entry === "string" && VALID_KEYS.has(entry) && !cleaned.includes(entry as DockKey)) {
        cleaned.push(entry as DockKey);
      }
      if (cleaned.length >= MAX_TABS) break;
    }
    return cleaned.length > 0 ? cleaned : DEFAULT_KEYS;
  } catch {
    return DEFAULT_KEYS;
  }
}

function readStoredMin(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_MIN) === "true";
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Active-state helper for href items.
// ---------------------------------------------------------------------------
function isHrefActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

// ---------------------------------------------------------------------------
// AppDock
// ---------------------------------------------------------------------------
export function AppDock({
  liveShows,
  newProducts,
}: {
  liveShows: boolean;
  newProducts: number;
}) {
  const pathname = usePathname();
  const { open: openStream } = useStreamPlayer();

  // Lazy initializers keep server + first client render on the DEFAULTS,
  // so there is no hydration mismatch. The mount effect syncs the real
  // localStorage values exactly once.
  const [mounted, setMounted] = useState(false);
  const [keys, setKeys] = useState<DockKey[]>(() => DEFAULT_KEYS);
  const [minimized, setMinimized] = useState(false);
  const [editing, setEditing] = useState(false);

  // Hydrate from localStorage AFTER first paint. Deferring to an animation
  // frame (rather than calling setState synchronously in the effect body)
  // keeps the first client render equal to the server render — no hydration
  // mismatch — and satisfies `react-hooks/set-state-in-effect`, which only
  // flags synchronous setState inside an effect.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setKeys(readStoredKeys());
      setMinimized(readStoredMin());
      setMounted(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // Persist selection whenever it changes (after mount only).
  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_TABS, JSON.stringify(keys));
    } catch {
      // ignore write failures (private mode / quota)
    }
  }, [keys, mounted]);

  // Persist minimized flag whenever it changes (after mount only).
  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_MIN, minimized ? "true" : "false");
    } catch {
      // ignore
    }
  }, [minimized, mounted]);

  const toggleKey = useCallback((key: DockKey) => {
    setKeys((prev) => {
      if (prev.includes(key)) {
        return prev.filter((k) => k !== key);
      }
      if (prev.length >= MAX_TABS) {
        return prev; // 5-max: ignore adds when full
      }
      return [...prev, key];
    });
  }, []);

  const resetToDefault = useCallback(() => {
    setKeys(DEFAULT_KEYS);
  }, []);

  // Hide entirely on studio editor routes.
  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  const selected = keys
    .map((key) => CATALOG_BY_KEY[key])
    .filter((item): item is DockItem => Boolean(item));
  const atMax = keys.length >= MAX_TABS;

  // -------------------------------------------------------------------------
  // Minimized state — a small centered pill/handle that expands the dock.
  // -------------------------------------------------------------------------
  if (minimized) {
    return (
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-center"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <button
          type="button"
          onClick={() => setMinimized(false)}
          aria-label="Expand navigation dock"
          className="mb-2 flex h-11 min-w-[64px] flex-col items-center justify-center gap-0.5 rounded-full border border-white/10 bg-[#0a0e1a]/95 px-5 text-white/55 shadow-2xl backdrop-blur-xl transition-colors hover:text-white/80"
        >
          <GripHorizontal className="h-4 w-4" />
          <ChevronUp className="h-3 w-3" />
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Expanded dock.
  // -------------------------------------------------------------------------
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0a0e1a]/95 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* Edit panel — floats ABOVE the dock. */}
      {editing && (
        <div className="absolute bottom-full left-1/2 mb-2 w-[min(420px,calc(100vw-1.5rem))] -translate-x-1/2 rounded-2xl border border-white/10 bg-[#0a0e1a] p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Customize your bar</h2>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-full bg-[#74ddc7]/15 px-3 py-1 text-xs font-semibold text-[#74ddc7] transition-colors hover:bg-[#74ddc7]/25"
            >
              Done
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CATALOG.map((item) => {
              const isSelected = keys.includes(item.key);
              const disabled = !isSelected && atMax;
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.key}
                  onClick={() => toggleKey(item.key)}
                  disabled={disabled}
                  aria-pressed={isSelected}
                  className={`relative flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all ${
                    isSelected
                      ? "border-[#74ddc7]/60 bg-[#74ddc7]/10 text-[#74ddc7]"
                      : disabled
                        ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-white/30"
                        : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-semibold">{item.label}</span>
                  {isSelected && (
                    <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-[#74ddc7]" />
                  )}
                  {disabled && (
                    <span className="ml-auto shrink-0 text-[9px] font-bold uppercase tracking-wide text-white/40">
                      5 max
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={resetToDefault}
              className="text-xs font-medium text-white/45 transition-colors hover:text-white/70"
            >
              Reset to default
            </button>
            <span className="text-[10px] font-medium text-white/30">
              {keys.length}/{MAX_TABS} selected
            </span>
          </div>
        </div>
      )}

      <div className="mx-auto flex h-14 max-w-lg items-center justify-around px-2">
        {selected.map((item) => {
          const Icon = item.icon;
          const showLiveDot = item.key === "streaming" && liveShows;
          const showMarketBadge = item.key === "marketplace" && newProducts > 0;

          const inner = (
            <>
              <div className="relative">
                <Icon
                  className={`h-5 w-5 ${
                    item.action === undefined && isHrefActive(item.href, pathname)
                      ? "drop-shadow-[0_0_6px_rgba(116,221,199,0.5)]"
                      : ""
                  }`}
                />
                {/* Live red pulsing dot on the streaming item */}
                {showLiveDot && (
                  <span className="absolute -right-1.5 -top-1 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                  </span>
                )}
                {/* New-product count badge on the marketplace item */}
                {showMarketBadge && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold text-white">
                    {newProducts > 99 ? "99+" : newProducts}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold">{item.label}</span>
            </>
          );

          // The streaming item is an action (opens the live player), never "active".
          if (item.action === "stream") {
            return (
              <button
                type="button"
                key={item.key}
                onClick={openStream}
                aria-label={item.label}
                className="relative flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 text-white/55 transition-all hover:text-white/80"
              >
                {inner}
              </button>
            );
          }

          const active = isHrefActive(item.href, pathname);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`relative flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 transition-all ${
                active ? "text-[#74ddc7]" : "text-white/55 hover:text-white/80"
              }`}
            >
              {inner}
            </Link>
          );
        })}

        {/* Right-edge controls: minimize + edit */}
        <div className="flex items-center gap-1 pl-1">
          <button
            type="button"
            onClick={() => setMinimized(true)}
            aria-label="Minimize navigation dock"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/45 transition-colors hover:bg-white/5 hover:text-white/75"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            aria-label="Edit navigation dock"
            aria-pressed={editing}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
              editing
                ? "bg-[#74ddc7]/15 text-[#74ddc7]"
                : "text-white/45 hover:bg-white/5 hover:text-white/75"
            }`}
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
