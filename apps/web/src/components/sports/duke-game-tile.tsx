"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import {
  DUKE_BASKETBALL,
  type PlayByPlayEntry,
  type PostGameEntry,
} from "@/data/sports";
import { DUKE_VS_VIRGINIA_PLAYS } from "@/data/duke-vs-virginia-plays";
import { useESPNScores } from "@/hooks/use-espn-scores";
import {
  useStreamTranscription,
  findMentionedPerson,
  type TranscriptLine,
} from "@/hooks/use-stream-transcription";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { setDukeGameLive } from "@/lib/multipliers";
import { useDukeNews } from "@/hooks/use-duke-news";

type GameMode = "pre" | "live" | "post";

function getGameMode(gameDate: Date): GameMode {
  const now = new Date();
  const gameEnd = new Date(gameDate.getTime() + 2.5 * 60 * 60 * 1000);
  if (now < gameDate) return "pre";
  if (now >= gameDate && now < gameEnd) return "live";
  return "post";
}

function formatCountdown(diffMs: number) {
  if (diffMs <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

// ── Play-by-play horizontal ticker ─────────────────────────────────
function PlayByPlayTicker({
  entries,
  espnLastPlay,
  onRevealedPlayChange,
}: {
  entries: PlayByPlayEntry[];
  espnLastPlay?: string;
  onRevealedPlayChange?: (play: PlayByPlayEntry | null) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(5);

  // Auto-reveal more entries over time
  useEffect(() => {
    if (visibleCount >= entries.length) return;
    const timer = setInterval(() => {
      setVisibleCount((prev) => Math.min(prev + 1, entries.length));
    }, 6000);
    return () => clearInterval(timer);
  }, [visibleCount, entries.length]);

  // Notify parent of the latest revealed play (for player spotlight sync)
  useEffect(() => {
    if (!onRevealedPlayChange) return;
    const revealed = entries.slice(0, visibleCount);
    onRevealedPlayChange(revealed.length > 0 ? revealed[revealed.length - 1] : null);
  }, [visibleCount, entries, onRevealedPlayChange]);

  // Auto-scroll to top (newest first)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [visibleCount]);

  // Reverse so newest plays appear at the top
  const visible = entries.slice(0, visibleCount).slice().reverse();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <h3 className="text-xs font-bold text-white/80 uppercase tracking-wider">
          Play-by-Play
        </h3>
        <span className="text-[10px] text-white/40 tabular-nums">
          {visibleCount}/{entries.length} plays
        </span>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
        style={{ maxHeight: 320 }}
      >
        {/* ESPN live play pinned at top */}
        {espnLastPlay && (
          <div className="flex items-start gap-2 px-3 py-2 bg-[#003087]/20 border-b border-white/5">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#74ddc7] animate-pulse" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-[10px] text-[#74ddc7]/70">
                <span className="font-mono">LIVE</span>
                <span className="font-semibold">ESPN</span>
              </div>
              <p className="text-[11px] sm:text-xs text-white/90 leading-snug mt-0.5">
                {espnLastPlay}
              </p>
            </div>
          </div>
        )}
        {visible.map((entry, i) => (
          <div
            key={entry.id}
            className={`flex items-start gap-2 px-3 py-2 border-b border-white/5 transition-all ${
              i === 0 && !espnLastPlay ? "bg-white/5" : ""
            }`}
          >
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                entry.team === "duke" ? "bg-[#003087]" : "bg-[#7BAFD4]"
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-[10px] text-white/40">
                <span className="font-mono tabular-nums">
                  {entry.half} {entry.clock}
                </span>
                <span className="tabular-nums font-semibold">
                  Duke {entry.score.duke} - {entry.score.opponent} OPP
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-white/80 leading-snug mt-0.5">
                {entry.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Player Spotlight — shows player from last play in real time ────
function PlayerSpotlight({
  lastPlayText,
  lastPlayTeam,
}: {
  lastPlayText?: string;
  lastPlayTeam?: "duke" | "opponent";
}) {
  const players = DUKE_BASKETBALL.players.filter((p) => p.imageUrl);
  const [imageLoaded, setImageLoaded] = useState<string | null>(null);

  // Preload ALL player headshots on mount so swaps are instant
  useEffect(() => {
    for (const p of players) {
      if (p.imageUrl) {
        const img = new Image();
        img.src = p.imageUrl;
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Find the Duke player mentioned in the last play text
  const matchedPlayer = useMemo(() => {
    if (!lastPlayText) return null;
    const text = lastPlayText.toLowerCase();
    for (const p of players) {
      const parts = p.name.split(" ");
      const lastName = parts[parts.length - 1].toLowerCase();
      if (text.includes(lastName)) return p;
    }
    return null;
  }, [lastPlayText, players]);

  // Track when a new player image loads
  useEffect(() => {
    if (matchedPlayer?.imageUrl) {
      setImageLoaded(matchedPlayer.imageUrl);
    }
  }, [matchedPlayer]);

  // If opponent has the ball or no Duke player matched, show team logo
  const showDukeLogo = !matchedPlayer || lastPlayTeam === "opponent";

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-xs font-bold text-white/80 uppercase tracking-wider">
          {lastPlayTeam === "duke" && matchedPlayer ? "Last Play" : "Possession"}
        </h3>
        <div className="flex items-center gap-1.5">
          {lastPlayTeam && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              lastPlayTeam === "duke"
                ? "bg-[#003087]/50 text-white/70"
                : "bg-white/10 text-white/50"
            }`}>
              {lastPlayTeam === "duke" ? "DUKE BALL" : "OPP BALL"}
            </span>
          )}
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Live updating" />
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 relative">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#003087]/30 via-transparent to-transparent" />
        <div className="relative z-10 flex flex-col items-center gap-3 transition-all duration-500 ease-in-out">
          {showDukeLogo ? (
            <div className="flex flex-col items-center gap-3 animate-[fadeIn_0.3s_ease-in-out]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={DUKE_BASKETBALL.logoUrl}
                alt="Duke Blue Devils"
                className="h-28 w-28 object-contain drop-shadow-lg opacity-80 transition-opacity duration-300"
              />
              <span className="text-sm font-bold text-white/60">
                {lastPlayTeam === "opponent" ? "Opponent Possession" : "Duke Blue Devils"}
              </span>
            </div>
          ) : (
            <div
              key={matchedPlayer!.name}
              className="flex flex-col items-center gap-3 animate-[fadeIn_0.3s_ease-in-out]"
            >
              {/* Player headshot — preloaded for instant display */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={matchedPlayer!.imageUrl!}
                alt={matchedPlayer!.name}
                className={`h-36 w-auto object-contain drop-shadow-lg transition-opacity duration-300 ${
                  imageLoaded === matchedPlayer!.imageUrl ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => setImageLoaded(matchedPlayer!.imageUrl!)}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              {/* Player info */}
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-black text-white/30 tabular-nums">
                    #{matchedPlayer!.number}
                  </span>
                  <span className="text-sm font-bold text-white">
                    {matchedPlayer!.name}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2 text-[10px] text-white/50">
                  <span>{matchedPlayer!.position}</span>
                  <span className="text-white/20">|</span>
                  <span>{matchedPlayer!.year}</span>
                </div>
              </div>
            </div>
          )}
          {/* Last play text */}
          {lastPlayText && (
            <p className="text-[10px] text-white/40 text-center leading-snug mt-1 line-clamp-2 px-2 transition-all duration-300">
              {lastPlayText}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Post-Game Captions — live transcription + ESPN play-by-play ──────
function PostGameCaptions({
  onCurrentEntryChange,
  transcriptLines,
  currentTranscriptLine,
  isListening,
  transcriptError,
  playByPlayEntries,
  espnLastPlay,
}: {
  onCurrentEntryChange?: (entry: PostGameEntry | null) => void;
  transcriptLines: TranscriptLine[];
  currentTranscriptLine: TranscriptLine | null;
  isListening: boolean;
  transcriptError: string | null;
  playByPlayEntries: PlayByPlayEntry[];
  espnLastPlay?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Notify parent of latest entry for spotlight images
  useEffect(() => {
    if (!onCurrentEntryChange) return;
    if (isListening && currentTranscriptLine) {
      // Live transcription is active — use that
      onCurrentEntryChange({
        id: currentTranscriptLine.id,
        speaker: "Live",
        text: currentTranscriptLine.text,
        mentionedPerson: currentTranscriptLine.mentionedPerson,
      });
    } else if (espnLastPlay) {
      // Use ESPN last play for spotlight matching
      const mentioned = findMentionedPerson(espnLastPlay);
      onCurrentEntryChange({
        id: Date.now(),
        speaker: "ESPN",
        text: espnLastPlay,
        mentionedPerson: mentioned,
      });
    } else if (playByPlayEntries.length > 0) {
      const last = playByPlayEntries[playByPlayEntries.length - 1];
      onCurrentEntryChange({
        id: last.id,
        speaker: last.team === "duke" ? "Duke" : "Opponent",
        text: last.text,
        mentionedPerson: findMentionedPerson(last.text),
      });
    }
  }, [currentTranscriptLine, isListening, espnLastPlay, playByPlayEntries, onCurrentEntryChange]);

  // Auto-scroll to top
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [transcriptLines.length, playByPlayEntries.length]);

  // Reverse play-by-play so newest is first
  const reversedPlays = useMemo(
    () => [...playByPlayEntries].reverse(),
    [playByPlayEntries]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <h3 className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
          <span>🎙️</span> Post-Game Show
        </h3>
        <div className="flex items-center gap-1.5">
          {isListening ? (
            <>
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] text-[#74ddc7] font-bold">
                LIVE CAPTIONS
              </span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
              <span className="text-[10px] text-white/40 tabular-nums">
                LIVE
              </span>
            </>
          )}
        </div>
      </div>

      {/* Transcription error */}
      {transcriptError && (
        <div className="px-3 py-1.5 bg-yellow-500/10 border-b border-yellow-500/20">
          <p className="text-[10px] text-yellow-300/80">{transcriptError}</p>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
        style={{ maxHeight: 320 }}
      >
        {/* Live transcription lines (when mic is authorized) */}
        {isListening && transcriptLines.length > 0 &&
          transcriptLines.map((line, i) => (
            <div
              key={`t-${line.id}`}
              className={`flex items-start gap-2 px-3 py-2.5 border-b border-white/5 transition-all ${
                i === 0 ? "bg-white/5" : ""
              }`}
            >
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-[10px] mb-0.5">
                  <span className="font-bold text-red-400/70">
                    Live Caption
                  </span>
                  {line.mentionedPerson && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-[#003087]/30 text-[#74ddc7]/70">
                      {line.mentionedPerson}
                    </span>
                  )}
                  <span className="text-[9px] text-white/20 font-mono">
                    {new Date(line.timestamp).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-white/80 leading-snug">
                  &ldquo;{line.text}&rdquo;
                </p>
              </div>
            </div>
          ))}

        {/* ESPN live play pinned at top */}
        {espnLastPlay && (
          <div className="flex items-start gap-2 px-3 py-2 bg-[#003087]/20 border-b border-white/5">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#74ddc7] animate-pulse" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-[10px] text-[#74ddc7]/70">
                <span className="font-mono">LIVE</span>
                <span className="font-semibold">ESPN</span>
              </div>
              <p className="text-[11px] sm:text-xs text-white/90 leading-snug mt-0.5">
                {espnLastPlay}
              </p>
            </div>
          </div>
        )}

        {/* Full play-by-play from the game */}
        {reversedPlays.map((entry, i) => (
          <div
            key={entry.id}
            className={`flex items-start gap-2 px-3 py-2 border-b border-white/5 transition-all ${
              i === 0 && !espnLastPlay && !(isListening && transcriptLines.length > 0) ? "bg-white/5" : ""
            }`}
          >
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                entry.team === "duke" ? "bg-[#003087]" : "bg-[#7BAFD4]"
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-[10px] text-white/40">
                <span className="font-mono tabular-nums">
                  {entry.half} {entry.clock}
                </span>
                <span className="tabular-nums font-semibold">
                  Duke {entry.score.duke} - {entry.score.opponent} OPP
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-white/80 leading-snug mt-0.5">
                {entry.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Post-Game Spotlight — shows player/coach being discussed ───────
function PostGameSpotlight({
  currentEntry,
}: {
  currentEntry: PostGameEntry | null;
}) {
  const players = DUKE_BASKETBALL.players.filter((p) => p.imageUrl);
  const coaches = DUKE_BASKETBALL.coaches.filter((c) => c.imageUrl);

  // Preload all images on mount
  useEffect(() => {
    for (const p of [...players, ...coaches]) {
      if (p.imageUrl) {
        const img = new Image();
        img.src = p.imageUrl;
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Match mentioned person to player or coach
  const matched = useMemo((): {
    name: string;
    imageUrl: string;
    subtitle: string;
    role: string;
  } | null => {
    if (!currentEntry?.mentionedPerson) return null;
    const mentioned = currentEntry.mentionedPerson.toLowerCase();

    // Try full name match first (handles "Cameron Boozer" vs "Cayden Boozer")
    for (const p of players) {
      if (p.name.toLowerCase() === mentioned)
        return {
          name: p.name,
          imageUrl: p.imageUrl!,
          subtitle: `#${p.number} | ${p.position} | ${p.year}`,
          role: "player",
        };
    }
    for (const c of coaches) {
      if (c.name.toLowerCase() === mentioned)
        return {
          name: c.name,
          imageUrl: c.imageUrl!,
          subtitle: c.title,
          role: "coach",
        };
    }

    // Fall back to last name
    const lastNameMentioned = mentioned.split(" ").pop() || "";
    for (const p of players) {
      const lastName = p.name.split(" ").pop()?.toLowerCase() || "";
      if (lastName === lastNameMentioned)
        return {
          name: p.name,
          imageUrl: p.imageUrl!,
          subtitle: `#${p.number} | ${p.position} | ${p.year}`,
          role: "player",
        };
    }
    for (const c of coaches) {
      const lastName = c.name.split(" ").pop()?.toLowerCase() || "";
      if (lastName === lastNameMentioned)
        return {
          name: c.name,
          imageUrl: c.imageUrl!,
          subtitle: c.title,
          role: "coach",
        };
    }

    return null;
  }, [currentEntry, players, coaches]);

  const isSpeakerInterview =
    currentEntry &&
    currentEntry.speaker !== "Host" &&
    currentEntry.speaker !== "Analyst";

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-xs font-bold text-white/80 uppercase tracking-wider">
          {isSpeakerInterview ? "Interview" : "Talking About"}
        </h3>
        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Live" />
      </div>
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#003087]/30 via-transparent to-transparent" />
        <div className="relative z-10 flex flex-col items-center gap-3 transition-all duration-500 ease-in-out">
          {matched ? (
            <div
              key={matched.name}
              className="flex flex-col items-center gap-3 animate-[fadeIn_0.3s_ease-in-out]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={matched.imageUrl}
                alt={matched.name}
                className="h-36 w-auto object-contain drop-shadow-lg transition-opacity duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="text-center space-y-1">
                <span className="text-sm font-bold text-white">
                  {matched.name}
                </span>
                <div className="flex items-center justify-center gap-2 text-[10px] text-white/50">
                  <span>{matched.subtitle}</span>
                </div>
                {isSpeakerInterview && (
                  <span className="inline-block text-[9px] px-2 py-0.5 rounded-full bg-[#74ddc7]/10 text-[#74ddc7] font-bold border border-[#74ddc7]/20 mt-1">
                    🎙️ SPEAKING NOW
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 animate-[fadeIn_0.3s_ease-in-out]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={DUKE_BASKETBALL.logoUrl}
                alt="Duke Blue Devils"
                className="h-28 w-28 object-contain drop-shadow-lg opacity-80"
              />
              <span className="text-sm font-bold text-white/60">
                Post-Game Coverage
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Post-Game Recap — highlights, player stats, photos ──────────────
function PostGameRecap({
  highlights,
  playerStats,
  playByPlayEntries,
  news,
}: {
  highlights: import("@/hooks/use-espn-scores").ESPNHighlight[];
  playerStats: import("@/hooks/use-espn-scores").ESPNPlayerStats[];
  playByPlayEntries: PlayByPlayEntry[];
  news: import("@/hooks/use-duke-news").DukeNewsItem[];
}) {
  const [activeTab, setActiveTab] = useState<"news" | "highlights" | "stats" | "plays">("news");

  return (
    <div className="flex flex-col h-full">
      {/* Tabs — News first */}
      <div className="flex items-center border-b border-white/10">
        {(
          [
            { key: "news", label: "Duke News" },
            { key: "highlights", label: "Highlights" },
            { key: "stats", label: "Stats" },
            { key: "plays", label: "Plays" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-2 py-1.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider transition-colors ${
              activeTab === tab.key
                ? "text-[#74ddc7] border-b-2 border-[#74ddc7] bg-white/5"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
        style={{ maxHeight: 320 }}
      >
        {/* ── Duke News Tab (default) — single-line stories with mini thumbnails ── */}
        {activeTab === "news" && (
          <div>
            {news.length > 0 ? (
              <div className="divide-y divide-white/5">
                {news.map((item) => (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors group"
                  >
                    {item.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.thumbnail}
                        alt=""
                        className="h-10 w-14 rounded object-cover shrink-0 opacity-80 group-hover:opacity-100 transition-opacity bg-[#003087]/20"
                      />
                    ) : (
                      <div className="h-10 w-14 rounded shrink-0 bg-[#003087]/30 flex items-center justify-center">
                        <span className="text-xs">D</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-white/90 line-clamp-1 group-hover:text-white transition-colors">
                        {item.headline}
                      </p>
                      <p className="text-[9px] text-white/35 line-clamp-1 mt-0.5">
                        {item.published ? new Date(item.published).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        }) : "ESPN"}
                      </p>
                    </div>
                    <span className="text-white/20 text-xs shrink-0 group-hover:text-white/40 transition-colors">
                      ›
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-white/40 text-sm">
                <span className="text-2xl mb-2">📰</span>
                Loading Duke news...
              </div>
            )}
          </div>
        )}

        {/* ── Highlights Tab — 2-column grid ── */}
        {activeTab === "highlights" && (
          <div>
            {highlights.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 p-2">
                {highlights.map((h) => (
                  <a
                    key={h.id}
                    href={h.mp4Url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative rounded-lg overflow-hidden bg-black/40 border border-white/5 hover:border-white/20 transition-all"
                  >
                    {h.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={h.thumbnail}
                        alt={h.title}
                        className="w-full aspect-video object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      />
                    ) : (
                      <div className="w-full aspect-video bg-gradient-to-br from-[#003087]/40 to-black/60 flex items-center justify-center">
                        <span className="text-3xl">🎬</span>
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="h-10 w-10 rounded-full bg-black/60 flex items-center justify-center text-white group-hover:bg-[#003087] transition-colors">
                        ▶
                      </span>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                      <p className="text-[10px] sm:text-[11px] font-bold text-white line-clamp-2">
                        {h.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`inline-block text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          h.source === "youtube"
                            ? "bg-red-500/20 text-red-300"
                            : "bg-[#74ddc7]/20 text-[#74ddc7]"
                        }`}>
                          {h.source === "youtube" ? "YouTube" : "ESPN"}
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-white/40 text-sm">
                <span className="text-2xl mb-2">🎬</span>
                Highlights coming soon...
              </div>
            )}
          </div>
        )}

        {/* ── Player Stats Tab ── */}
        {activeTab === "stats" && (
          <div>
            {playerStats.length > 0 ? (
              <table className="w-full text-[10px] sm:text-[11px]">
                <thead>
                  <tr className="border-b border-white/10 text-white/40">
                    <th className="text-left px-2 py-1.5 font-semibold">Player</th>
                    <th className="text-center px-1 py-1.5 font-semibold">MIN</th>
                    <th className="text-center px-1 py-1.5 font-semibold">PTS</th>
                    <th className="text-center px-1 py-1.5 font-semibold">REB</th>
                    <th className="text-center px-1 py-1.5 font-semibold">AST</th>
                    <th className="text-center px-1 py-1.5 font-semibold hidden sm:table-cell">STL</th>
                    <th className="text-center px-1 py-1.5 font-semibold hidden sm:table-cell">BLK</th>
                    <th className="text-center px-1 py-1.5 font-semibold">FG</th>
                    <th className="text-center px-1 py-1.5 font-semibold hidden sm:table-cell">3PT</th>
                  </tr>
                </thead>
                <tbody>
                  {playerStats.map((p, i) => (
                    <tr
                      key={p.name}
                      className={`border-b border-white/5 ${
                        i === 0 ? "bg-yellow-500/5" : ""
                      } hover:bg-white/5 transition-colors`}
                    >
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          {p.headshot && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.headshot}
                              alt={p.name}
                              className="h-6 w-6 rounded-full object-cover bg-[#003087]/30"
                            />
                          )}
                          <div>
                            <span className={`font-bold ${i === 0 ? "text-yellow-300" : "text-white/90"}`}>
                              {p.name}
                            </span>
                            <span className="text-white/30 ml-1">#{p.jersey}</span>
                            {p.starter && (
                              <span className="text-[8px] text-[#74ddc7]/50 ml-1">★</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-center px-1 py-1.5 text-white/50 tabular-nums">{p.minutes}</td>
                      <td className="text-center px-1 py-1.5 font-bold text-white tabular-nums">{p.points}</td>
                      <td className="text-center px-1 py-1.5 text-white/70 tabular-nums">{p.rebounds}</td>
                      <td className="text-center px-1 py-1.5 text-white/70 tabular-nums">{p.assists}</td>
                      <td className="text-center px-1 py-1.5 text-white/50 tabular-nums hidden sm:table-cell">{p.steals}</td>
                      <td className="text-center px-1 py-1.5 text-white/50 tabular-nums hidden sm:table-cell">{p.blocks}</td>
                      <td className="text-center px-1 py-1.5 text-white/60 tabular-nums">
                        {p.fgMade}-{p.fgAtt}
                      </td>
                      <td className="text-center px-1 py-1.5 text-white/50 tabular-nums hidden sm:table-cell">
                        {p.threeMade}-{p.threeAtt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-white/40 text-sm">
                <span className="text-2xl mb-2">📊</span>
                Stats loading from ESPN...
              </div>
            )}
          </div>
        )}

        {/* ── Play-by-Play Tab ── */}
        {activeTab === "plays" && (
          <div>
            {[...playByPlayEntries].reverse().map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-2 px-3 py-2 border-b border-white/5"
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    entry.team === "duke" ? "bg-[#003087]" : "bg-[#7BAFD4]"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[10px] text-white/40">
                    <span className="font-mono tabular-nums">
                      {entry.half} {entry.clock}
                    </span>
                    <span className="tabular-nums font-semibold">
                      Duke {entry.score.duke} - {entry.score.opponent} OPP
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-white/80 leading-snug mt-0.5">
                    {entry.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main DukeGameTile ───────────────────────────────────────────────
export function DukeGameTile() {
  const nextGame = DUKE_BASKETBALL.nextGame;
  const lastGame = DUKE_BASKETBALL.lastGame;

  const gameDate = useMemo(
    () => (nextGame ? new Date(nextGame.date) : null),
    [nextGame]
  );

  const [mode, setMode] = useState<GameMode>("pre");
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [liveScore, setLiveScore] = useState({ duke: 0, opponent: 0 });
  const [half, setHalf] = useState("1st Half");
  const [gameClock, setGameClock] = useState("20:00");
  const [visiblePlays, setVisiblePlays] = useState<PlayByPlayEntry[]>([]);
  const [currentRevealedPlay, setCurrentRevealedPlay] = useState<PlayByPlayEntry | null>(null);
  const [currentPostGameEntry, setCurrentPostGameEntry] = useState<PostGameEntry | null>(null);
  const [scoreExpanded, setScoreExpanded] = useState(false);

  // Detect post-game show window (up to 1 hour after game ends)
  const isPostGameShow = useMemo(() => {
    if (!gameDate || mode !== "post") return false;
    const now = new Date();
    const gameEnd = new Date(gameDate.getTime() + 2.5 * 60 * 60 * 1000);
    const postGameEnd = new Date(gameEnd.getTime() + 1 * 60 * 60 * 1000); // 1 hour post-game show
    return now >= gameEnd && now < postGameEnd;
  }, [gameDate, mode]);

  // ── Live stream transcription for post-game show ──
  const { getAudioElement } = useAudioPlayer();
  const {
    lines: transcriptLines,
    currentLine: currentTranscriptLine,
    isListening,
    error: transcriptError,
  } = useStreamTranscription(isPostGameShow, getAudioElement());

  // ── Duke Game Day double points ──
  useEffect(() => {
    // Activate 2x multiplier when Duke game is live or in post-game show
    const isLive = mode === "live" || isPostGameShow;
    setDukeGameLive(isLive);
    return () => setDukeGameLive(false);
  }, [mode, isPostGameShow]);

  // ── ESPN real-time scores ──
  const isGameActive = mode === "live" || mode === "post";
  const { data: espnData, highlights: espnHighlights, playerStats: espnPlayerStats } = useESPNScores(isGameActive);

  // ── Duke news feed ──
  const dukeNews = useDukeNews();

  // ── Cycle featured video on each page load ──
  // Filter to only videos with a playable embedUrl or thumbnail
  const playableHighlights = useMemo(
    () => espnHighlights.filter((h) => h.embedUrl || h.thumbnail),
    [espnHighlights]
  );
  const featuredVideoIndex = useMemo(() => {
    if (playableHighlights.length === 0) return 0;
    try {
      const key = "wccg_featured_video_idx";
      const stored = parseInt(localStorage.getItem(key) || "0", 10);
      const next = (stored + 1) % playableHighlights.length;
      localStorage.setItem(key, String(next));
      return stored % playableHighlights.length;
    } catch {
      return 0;
    }
  }, [playableHighlights.length]);
  const featuredVideo = playableHighlights[featuredVideoIndex] || null;

  // Use ESPN scores when available, fall back to simulated
  useEffect(() => {
    if (espnData && (espnData.status === "in" || espnData.status === "post")) {
      setLiveScore({
        duke: espnData.dukeScore,
        opponent: espnData.opponentScore,
      });
      // Update period/clock from ESPN
      if (espnData.status === "in") {
        if (espnData.period === 1) setHalf("1st Half");
        else if (espnData.period === 2) setHalf("2nd Half");
        else setHalf(`OT${espnData.period > 3 ? espnData.period - 2 : ""}`);
        setGameClock(espnData.clock || "");
      } else {
        setHalf("Final");
        setGameClock("");
      }
    }
  }, [espnData]);

  useEffect(() => {
    if (!gameDate) return;

    function tick() {
      const now = new Date();
      const currentMode = getGameMode(gameDate!);
      setMode(currentMode);

      if (currentMode === "pre") {
        const diff = gameDate!.getTime() - now.getTime();
        setCountdown(formatCountdown(diff));
      } else if (currentMode === "live") {
        const elapsed = now.getTime() - gameDate!.getTime();
        const elapsedMinutes = elapsed / 60000;

        // Only use simulated clock/scores if ESPN data not available
        if (!espnData || espnData.status === "pre") {
          if (elapsedMinutes < 50) {
            setHalf("1st Half");
            const clockMin = Math.max(
              0,
              Math.floor(20 - (elapsedMinutes / 50) * 20)
            );
            const clockSec = Math.floor(Math.random() * 60);
            setGameClock(
              `${clockMin}:${clockSec.toString().padStart(2, "0")}`
            );
          } else if (elapsedMinutes < 65) {
            setHalf("Halftime");
            setGameClock("");
          } else {
            setHalf("2nd Half");
            const secondHalfElapsed = elapsedMinutes - 65;
            const clockMin = Math.max(
              0,
              Math.floor(20 - (secondHalfElapsed / 85) * 20)
            );
            const clockSec = Math.floor(Math.random() * 60);
            setGameClock(
              `${clockMin}:${clockSec.toString().padStart(2, "0")}`
            );
          }

          // Simulated scores from play-by-play
          const playsToShow = Math.min(
            DUKE_VS_VIRGINIA_PLAYS.length,
            Math.floor(elapsedMinutes / 4)
          );
          const currentPlays = DUKE_VS_VIRGINIA_PLAYS.slice(0, playsToShow);
          setVisiblePlays(currentPlays);

          if (currentPlays.length > 0) {
            const latest = currentPlays[currentPlays.length - 1];
            setLiveScore({
              duke: latest.score.duke,
              opponent: latest.score.opponent,
            });
          } else {
            setLiveScore({ duke: 0, opponent: 0 });
          }
        } else {
          // ESPN is providing data — still show play-by-play for flavor
          const playsToShow = Math.min(
            DUKE_VS_VIRGINIA_PLAYS.length,
            Math.floor(elapsedMinutes / 4)
          );
          setVisiblePlays(DUKE_VS_VIRGINIA_PLAYS.slice(0, playsToShow));
        }
      } else {
        // Post-game — use ESPN final scores if available
        if (!espnData || espnData.status !== "post") {
          setLiveScore({ duke: 82, opponent: 68 });
        }
        setVisiblePlays(DUKE_VS_VIRGINIA_PLAYS);
      }
    }

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [gameDate, espnData]);

  if (!nextGame) return null;

  const opponentShort =
    nextGame.opponent.split(" ").slice(0, -1).join(" ") || nextGame.opponent;
  const formattedDate = gameDate
    ? gameDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";
  const pad = (n: number) => n.toString().padStart(2, "0");

  // Detect big games
  const gameTitle = nextGame.gameTitle || "";

  // ── LIVE MODE: Full scoreboard + play-by-play ──
  if (mode === "live") {
    return (
      <section className="px-[50px] space-y-0">
        {/* Scoreboard Header */}
        <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-[#003087] via-[#001a4d] to-[#003087] border border-b-0 border-[#003087]/60 p-4 sm:p-5">
          <div className="absolute inset-0 opacity-[0.04]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.3) 0%, transparent 50%)",
              }}
            />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  DUKE BASKETBALL
                </h2>
                {gameTitle && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 font-bold uppercase tracking-wider border border-yellow-500/30">
                    {gameTitle}
                  </span>
                )}
                {espnData && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-mono">
                    ESPN LIVE
                  </span>
                )}
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white animate-pulse">
                <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                LIVE ON WCCG
              </span>
            </div>

            {/* Scoreboard */}
            <div className="flex items-center justify-center gap-6 sm:gap-10">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={DUKE_BASKETBALL.logoUrl} alt="Duke" className="h-12 w-12 sm:h-14 sm:w-14 object-contain" />
                <div className="text-center">
                  <span className="block text-xs font-bold text-white/70">DUKE</span>
                  <span className="text-3xl sm:text-4xl font-black text-white tabular-nums">{liveScore.duke}</span>
                </div>
              </div>
              <div className="flex flex-col items-center">
                {espnData?.possession && (
                  <div className="flex items-center gap-1 mb-1">
                    {espnData.possession === "duke" && <span className="text-[10px] animate-pulse" title="Duke has possession">◀</span>}
                    <span className="text-sm">🏀</span>
                    {espnData.possession === "opponent" && <span className="text-[10px] animate-pulse" title="Opponent has possession">▶</span>}
                  </div>
                )}
                {!espnData?.possession && <span className="text-lg font-black text-white/30">—</span>}
                <span className="text-[11px] text-white/50 mt-0.5">{half}{gameClock && ` | ${gameClock}`}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <span className="block text-xs font-bold text-white/70">{opponentShort.toUpperCase()}</span>
                  <span className="text-3xl sm:text-4xl font-black text-white/80 tabular-nums">{liveScore.opponent}</span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {nextGame.opponentLogo && <img src={nextGame.opponentLogo} alt={nextGame.opponent} className="h-12 w-12 sm:h-14 sm:w-14 object-contain" />}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-3 text-[11px] text-white/40">
              <span>{nextGame.venue}</span>
              <span>|</span>
              <span>{nextGame.broadcast}</span>
            </div>
          </div>
        </div>

        {/* Bottom section — play-by-play */}
        <div className="rounded-b-2xl overflow-hidden border border-t-0 border-[#003087]/60 bg-[#0a0e1a]">
          <div className="grid grid-cols-3">
            <div className="col-span-1 border-r border-white/10 min-h-[320px]">
              <PlayerSpotlight
                lastPlayText={espnData?.lastPlay || currentRevealedPlay?.text}
                lastPlayTeam={espnData?.possession || currentRevealedPlay?.team}
              />
            </div>
            <div className="col-span-2 min-h-[320px]">
              <PlayByPlayTicker
                entries={visiblePlays}
                espnLastPlay={espnData?.lastPlay}
                onRevealedPlayChange={setCurrentRevealedPlay}
              />
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── POST MODE: Mini ribbon (collapsible) ──
  if (mode === "post") {
    const lastGameDate = lastGame
      ? new Date(lastGame.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "";

    return (
      <section className="px-[50px]">
        {/* Mini ribbon — always visible */}
        <button
          onClick={() => setScoreExpanded((prev) => !prev)}
          className={`w-full relative overflow-hidden bg-gradient-to-r from-[#003087] via-[#001a4d] to-[#003087] border border-[#003087]/60 px-4 py-2.5 flex items-center justify-between cursor-pointer hover:border-white/20 transition-all ${
            scoreExpanded ? "rounded-t-2xl border-b-0" : "rounded-2xl"
          }`}
        >
          <div className="flex items-center gap-4 sm:gap-6 flex-1 justify-center">
            {/* Duke */}
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={DUKE_BASKETBALL.logoUrl} alt="Duke" className="h-7 w-7 sm:h-8 sm:w-8 object-contain" />
              <span className="text-xs sm:text-sm font-bold text-white">Duke</span>
            </div>

            {/* VS + last game date */}
            <div className="flex flex-col items-center">
              <span className="text-xs font-black text-white/40">VS</span>
              {lastGameDate && (
                <span className="text-[9px] text-white/30">{lastGameDate}</span>
              )}
            </div>

            {/* Opponent */}
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-white">{opponentShort}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {nextGame.opponentLogo && <img src={nextGame.opponentLogo} alt={nextGame.opponent} className="h-7 w-7 sm:h-8 sm:w-8 object-contain" />}
            </div>

            {/* Last game result badge */}
            {lastGame && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                lastGame.result === "W"
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}>
                {lastGame.result} {lastGame.score.duke}-{lastGame.score.opponent}
              </span>
            )}
          </div>

          {/* Expand/collapse arrow */}
          <span className="text-white/40 text-xs ml-2 shrink-0">
            {scoreExpanded ? "▲" : "▼"}
          </span>
        </button>

        {/* Expanded scoreboard + recap */}
        {scoreExpanded && (
          <div className="rounded-b-2xl overflow-hidden border border-t-0 border-[#003087]/60 bg-[#0a0e1a]">
            {isPostGameShow ? (
              <div className="grid grid-cols-3">
                <div className="col-span-1 border-r border-white/10 min-h-[320px]">
                  <PostGameSpotlight currentEntry={currentPostGameEntry} />
                </div>
                <div className="col-span-2 min-h-[320px]">
                  <PostGameCaptions
                    onCurrentEntryChange={setCurrentPostGameEntry}
                    transcriptLines={transcriptLines}
                    currentTranscriptLine={currentTranscriptLine}
                    isListening={isListening}
                    transcriptError={transcriptError}
                    playByPlayEntries={visiblePlays}
                    espnLastPlay={espnData?.lastPlay}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3">
                {/* Left 1/3 — Featured video */}
                <div className="col-span-1 border-r border-white/10 min-h-[320px]">
                  <div className="flex flex-col h-full">
                    <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                      <h3 className="text-xs font-bold text-white/80 uppercase tracking-wider">
                        {featuredVideo ? "Featured" : espnPlayerStats.length > 0 ? "Top Performer" : "Duke"}
                      </h3>
                      {playableHighlights.length > 1 && (
                        <span className="text-[9px] text-white/30 tabular-nums">
                          {featuredVideoIndex + 1}/{playableHighlights.length}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col p-3 gap-2">
                      {featuredVideo ? (
                        <div className="w-full flex flex-col gap-2">
                          <div className="relative w-full rounded-lg overflow-hidden bg-black border border-white/10">
                            {featuredVideo.embedUrl ? (
                              <iframe
                                src={featuredVideo.embedUrl}
                                title={featuredVideo.title}
                                className="w-full aspect-video"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                style={{ border: 0 }}
                              />
                            ) : featuredVideo.thumbnail ? (
                              <a href={featuredVideo.mp4Url} target="_blank" rel="noopener noreferrer" className="group block relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={featuredVideo.thumbnail} alt={featuredVideo.title} className="w-full aspect-video object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="h-12 w-12 rounded-full bg-black/60 flex items-center justify-center text-white group-hover:bg-[#003087] transition-colors text-lg">▶</span>
                                </div>
                              </a>
                            ) : null}
                          </div>
                          <div>
                            <p className="text-[10px] sm:text-[11px] font-bold text-white line-clamp-2">{featuredVideo.title}</p>
                            {featuredVideo.description && (
                              <p className="text-[9px] text-white/40 line-clamp-2 mt-0.5">{featuredVideo.description}</p>
                            )}
                            <span className={`inline-block mt-1 text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              featuredVideo.source === "youtube" ? "bg-red-500/20 text-red-300" : "bg-[#74ddc7]/20 text-[#74ddc7]"
                            }`}>
                              {featuredVideo.source === "youtube" ? "YouTube" : "ESPN"}
                            </span>
                          </div>
                        </div>
                      ) : espnPlayerStats.length > 0 ? (
                        <div className="flex flex-col items-center gap-3 animate-[fadeIn_0.5s_ease-in-out]">
                          {espnPlayerStats[0].headshot && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={espnPlayerStats[0].headshot} alt={espnPlayerStats[0].name} className="h-24 w-24 rounded-full object-cover border-2 border-[#74ddc7]/40 shadow-lg" />
                          )}
                          <span className="text-sm font-bold text-white">{espnPlayerStats[0].name}</span>
                          <div className="flex items-center gap-3 text-center">
                            <div>
                              <span className="block text-xl font-black text-[#74ddc7]">{espnPlayerStats[0].points}</span>
                              <span className="text-[9px] text-white/40 uppercase">PTS</span>
                            </div>
                            <div>
                              <span className="block text-xl font-black text-white/80">{espnPlayerStats[0].rebounds}</span>
                              <span className="text-[9px] text-white/40 uppercase">REB</span>
                            </div>
                            <div>
                              <span className="block text-xl font-black text-white/80">{espnPlayerStats[0].assists}</span>
                              <span className="text-[9px] text-white/40 uppercase">AST</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-white/30">
                            {espnPlayerStats[0].fgMade}-{espnPlayerStats[0].fgAtt} FG | {espnPlayerStats[0].threeMade}-{espnPlayerStats[0].threeAtt} 3PT | {espnPlayerStats[0].ftMade}-{espnPlayerStats[0].ftAtt} FT
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={DUKE_BASKETBALL.logoUrl} alt="Duke" className="h-28 w-28 object-contain drop-shadow-lg opacity-80" />
                          <span className="text-sm font-bold text-white/60">Game Recap</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Recap tabs — 2/3 right */}
                <div className="col-span-2 min-h-[320px]">
                  <PostGameRecap
                    highlights={espnHighlights}
                    playerStats={espnPlayerStats}
                    playByPlayEntries={visiblePlays}
                    news={dukeNews}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    );
  }

  // ── PRE-GAME MODE: Countdown ──
  return (
    <section className="px-[50px]">
      <Link href="/sports/duke-basketball" className="block group">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#003087] via-[#001a4d] to-[#0a0a0f] p-5 sm:p-7 md:p-8 border border-white/10 hover:border-white/20 transition-all">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-[0.04]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.15) 0%, transparent 40%)",
              }}
            />
          </div>

          <div className="relative z-10 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
                COUNTDOWN TO CRAZY
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/80">
                <span className="text-sm">🏀</span> WCCG 104.5 FM
              </span>
            </div>

            {/* Team Matchup */}
            <div className="flex items-center justify-center gap-4 sm:gap-8 md:gap-12">
              {/* Duke */}
              <div className="flex flex-col items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={DUKE_BASKETBALL.logoUrl}
                  alt="Duke Blue Devils"
                  className="h-16 w-16 sm:h-20 sm:w-20 object-contain drop-shadow-lg"
                />
                <span className="text-sm font-bold text-white">Duke</span>
              </div>

              {/* VS */}
              <span className="text-2xl sm:text-3xl font-black text-white/40">
                VS
              </span>

              {/* Opponent */}
              <div className="flex flex-col items-center gap-2">
                {nextGame.opponentLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={nextGame.opponentLogo}
                    alt={nextGame.opponent}
                    className="h-16 w-16 sm:h-20 sm:w-20 object-contain drop-shadow-lg"
                  />
                ) : (
                  <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-2xl sm:text-3xl font-black text-white/30">?</span>
                  </div>
                )}
                <span className="text-sm font-bold text-white">
                  {opponentShort}
                </span>
              </div>
            </div>

            {/* Countdown Timer */}
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-sm mx-auto">
                {[
                  { value: countdown.days, label: "DAYS" },
                  { value: countdown.hours, label: "HRS" },
                  { value: countdown.minutes, label: "MIN" },
                  { value: countdown.seconds, label: "SEC" },
                ].map((unit) => (
                  <div
                    key={unit.label}
                    className="flex flex-col items-center rounded-xl bg-white/10 backdrop-blur-sm py-3 px-2"
                  >
                    <span className="text-2xl sm:text-3xl md:text-4xl font-black text-white tabular-nums leading-none">
                      {pad(unit.value)}
                    </span>
                    <span className="mt-1 text-[10px] sm:text-[11px] font-semibold text-white/50 tracking-widest">
                      {unit.label}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-center text-xs text-white/40">
                Pre-game coverage starts 1 hour before tipoff on WCCG 104.5 FM
              </p>
            </div>

            {/* Game Info Bar */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-xl bg-white/5 px-4 py-2.5 text-xs text-white/60">
              <span>{formattedDate}</span>
              <span className="hidden sm:inline">|</span>
              <span>{nextGame.time}</span>
              <span className="hidden sm:inline">|</span>
              <span>{nextGame.venue}</span>
              {nextGame.broadcast && (
                <>
                  <span className="hidden sm:inline">|</span>
                  <span>{nextGame.broadcast}</span>
                </>
              )}
            </div>

            {/* Last Game Result */}
            {lastGame && (
              <div className="rounded-xl bg-white/5 px-4 py-3">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={lastGame.opponentLogo}
                    alt={lastGame.opponent}
                    className="h-8 w-8 object-contain opacity-60"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <span>Last Game vs {lastGame.opponent}</span>
                      <span
                        className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                          lastGame.result === "W"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {lastGame.result} {lastGame.score.duke}-
                        {lastGame.score.opponent}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/40 mt-0.5">
                      {lastGame.topPerformer.name}:{" "}
                      {lastGame.topPerformer.points} pts,{" "}
                      {lastGame.topPerformer.rebounds} reb,{" "}
                      {lastGame.topPerformer.assists} ast
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Link>
    </section>
  );
}
