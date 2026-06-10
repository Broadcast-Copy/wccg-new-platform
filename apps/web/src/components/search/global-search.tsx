"use client";

/**
 * Global search — command-palette style (Ctrl+K / Cmd+K / "/" / click).
 *
 * Exports:
 *   • GlobalSearchButton — the header icon button; registers the global
 *     hotkeys and renders the dialog. Mount this in the header.
 *   • GlobalSearchDialog — the palette itself, exported for direct control
 *     (`<GlobalSearchDialog open={...} onClose={...} />`).
 *
 * Results are grouped by type with per-type icons, capped at 5 per group with
 * total counts, fully keyboard-navigable (↑/↓ across a flat list spanning all
 * groups, Enter navigates in the SAME tab), and mouse-friendly. The dialog
 * renders through a portal to <body> — the sticky header's backdrop-blur
 * creates a containing block that would otherwise trap `fixed` children.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  CornerDownLeft,
  Disc3,
  Headphones,
  Loader2,
  MapPin,
  Radio,
  Search,
  SearchX,
  Users2,
  Video,
  type LucideIcon,
} from "lucide-react";
import {
  MIN_QUERY_LENGTH,
  useGlobalSearch,
  type SearchResult,
  type SearchResultType,
} from "./use-global-search";

const GROUP_META: Record<SearchResultType, { label: string; icon: LucideIcon }> = {
  dj: { label: "DJs", icon: Headphones },
  show: { label: "Shows", icon: Radio },
  video: { label: "Videos", icon: Video },
  mixshow: { label: "Mixshows", icon: Disc3 },
  event: { label: "Events", icon: CalendarDays },
  place: { label: "Places", icon: MapPin },
  wiki: { label: "Wiki", icon: BookOpen },
  member: { label: "Members", icon: Users2 },
};

/** Is the keydown target an editable element (so "/" should be left alone)? */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable
  );
}

// ─── Header button ───────────────────────────────────────────────────────────

/**
 * Icon button for the site header (sized/colored to match its siblings —
 * NotificationBell, cart, theme toggle). Opens the palette on click,
 * Ctrl+K / Cmd+K (toggle), or "/" when not typing in a field.
 */
export function GlobalSearchButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !isEditableTarget(e.target)) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        title="Search (Ctrl+K)"
        className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/40 hover:text-foreground/70 hover:bg-foreground/[0.06] transition-colors"
      >
        <Search className="h-4 w-4" />
      </button>
      <GlobalSearchDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

// ─── Dialog ──────────────────────────────────────────────────────────────────

export function GlobalSearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Mount the palette fresh each time it opens so its state (query, results,
  // selection) resets naturally — no setState-in-effect cleanup dance needed.
  if (!open) return null;
  return <SearchPalette onClose={onClose} />;
}

function SearchPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { query, setQuery, groups, flat, loading, searched, reset } = useGlobalSearch();
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Clamp-derived selection: results shrink/grow as the user types, so the
  // stored index is clamped at read time instead of synced via an effect.
  const active = flat.length > 0 ? Math.min(activeIndex, flat.length - 1) : -1;

  // Esc closes (capture window-level so it works wherever focus is).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock body scroll while the palette is up.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Keep the active row visible (DOM scroll only — no state writes).
  useEffect(() => {
    if (active < 0) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-result-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const navigateTo = (result: SearchResult) => {
    router.push(result.href);
    reset();
    onClose();
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (flat.length > 0) setActiveIndex((active + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (flat.length > 0) setActiveIndex((active - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter") {
      if (active >= 0 && flat[active]) {
        e.preventDefault();
        navigateTo(flat[active]);
      }
    }
  };

  // Flat-index offset of each group's first row, for cross-group keyboard nav.
  const offsets = useMemo(() => {
    const out: number[] = [];
    let acc = 0;
    for (const g of groups) {
      out.push(acc);
      acc += g.results.length;
    }
    return out;
  }, [groups]);

  const trimmed = query.trim();
  const showHint = trimmed.length < MIN_QUERY_LENGTH;
  const showEmpty = !showHint && searched && !loading && flat.length === 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Global search"
    >
      {/* Backdrop — click closes */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative mx-auto mt-[12vh] w-full max-w-xl px-4 pb-12 sm:px-0">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl ring-1 ring-[#74ddc7]/10">
          {/* Input row */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            {loading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#74ddc7]" />
            ) : (
              <Search className="h-4 w-4 shrink-0 text-[#74ddc7]" />
            )}
            <input
              // Palette mounts on open; autoFocus puts the caret straight in.
              autoFocus
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onInputKeyDown}
              placeholder="Search DJs, shows, videos, events, places…"
              aria-label="Search the platform"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
            />
            <button
              type="button"
              onClick={onClose}
              className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground sm:block"
            >
              Esc
            </button>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[55vh] overflow-y-auto overscroll-contain">
            {showHint ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Type at least {MIN_QUERY_LENGTH} characters to search.
              </p>
            ) : showEmpty ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <SearchX className="h-6 w-6 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No results for &ldquo;{trimmed}&rdquo;
                </p>
              </div>
            ) : flat.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Searching…</p>
            ) : (
              <div className="py-2">
                {groups.map((group, gi) => {
                  const meta = GROUP_META[group.type];
                  const GroupIcon = meta.icon;
                  return (
                    <section key={group.type} aria-label={meta.label}>
                      <header className="flex items-center gap-2 px-4 pb-1 pt-3">
                        <GroupIcon className="h-3.5 w-3.5 text-[#74ddc7]" />
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground/70">
                          {meta.label}
                        </h3>
                        <span className="rounded-full bg-[#7401df]/20 px-1.5 py-px text-[10px] font-bold text-foreground/60">
                          {group.count > group.results.length
                            ? `${group.results.length} of ${group.count}`
                            : group.count}
                        </span>
                      </header>
                      {group.results.map((r, ri) => {
                        const flatIndex = offsets[gi] + ri;
                        const isActive = flatIndex === active;
                        return (
                          <Link
                            key={`${r.type}-${r.id}`}
                            href={r.href}
                            data-result-index={flatIndex}
                            onClick={() => {
                              reset();
                              onClose();
                            }}
                            onMouseEnter={() => setActiveIndex(flatIndex)}
                            className={`flex items-center gap-3 px-4 py-2 transition-colors ${
                              isActive
                                ? "bg-[#74ddc7]/10 border-l-2 border-[#74ddc7]"
                                : "border-l-2 border-transparent hover:bg-foreground/[0.04]"
                            }`}
                          >
                            <GroupIcon
                              className={`h-4 w-4 shrink-0 ${
                                isActive ? "text-[#74ddc7]" : "text-muted-foreground/50"
                              }`}
                            />
                            <span className="min-w-0 flex-1">
                              <span
                                className={`block truncate text-sm font-semibold ${
                                  isActive ? "text-[#74ddc7]" : "text-foreground"
                                }`}
                              >
                                {r.title}
                              </span>
                              {r.subtitle ? (
                                <span className="block truncate text-xs text-muted-foreground">
                                  {r.subtitle}
                                </span>
                              ) : null}
                            </span>
                            {isActive ? (
                              <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-[#7401df] dark:text-[#a76bf0]" />
                            ) : null}
                          </Link>
                        );
                      })}
                    </section>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer hints */}
          <div className="flex items-center gap-4 border-t border-border bg-foreground/[0.02] px-4 py-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-card px-1 font-sans">↑</kbd>
              <kbd className="rounded border border-border bg-card px-1 font-sans">↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-card px-1 font-sans">↵</kbd>
              open
            </span>
            <span className="ml-auto hidden items-center gap-1 sm:flex">
              <kbd className="rounded border border-border bg-card px-1 font-sans">Ctrl</kbd>
              <kbd className="rounded border border-border bg-card px-1 font-sans">K</kbd>
              <span className="text-[#74ddc7]">search anywhere</span>
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
