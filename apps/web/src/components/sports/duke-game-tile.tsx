"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  DUKE_BASKETBALL,
  DUKE_PLAY_BY_PLAY,
  type PlayByPlayEntry,
} from "@/data/sports";

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
function PlayByPlayTicker({ entries }: { entries: PlayByPlayEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(5);

  // Auto-reveal more entries over time
  useEffect(() => {
    if (visibleCount >= entries.length) return;
    const timer = setInterval(() => {
      setVisibleCount((prev) => Math.min(prev + 1, entries.length));
    }, 12000); // new play every 12 seconds
    return () => clearInterval(timer);
  }, [visibleCount, entries.length]);

  // Auto-scroll to latest
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleCount]);

  const visible = entries.slice(0, visibleCount);

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
        {visible.map((entry, i) => (
          <div
            key={entry.id}
            className={`flex items-start gap-2 px-3 py-2 border-b border-white/5 transition-all ${
              i === visible.length - 1 ? "bg-white/5" : ""
            }`}
          >
            {/* Team indicator dot */}
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
                  Duke {entry.score.duke} - {entry.score.opponent} UNC
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

// ── YouTube Highlights Embed ────────────────────────────────────────
function YouTubeHighlights() {
  const channelId = DUKE_BASKETBALL.youtube.channelId;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-white/10">
        <h3 className="text-xs font-bold text-white/80 uppercase tracking-wider">
          Live Highlights
        </h3>
      </div>
      <div className="flex-1 min-h-0 p-2">
        <div className="relative w-full h-full min-h-[200px] rounded-lg overflow-hidden bg-black">
          <iframe
            src={`https://www.youtube.com/embed?listType=search&list=Duke+Blue+Devils+Basketball+highlights+2026&autoplay=0`}
            title="Duke Basketball Highlights"
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          {/* Fallback if embed doesn't load */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#003087] to-[#001a4d] pointer-events-none opacity-0 transition-opacity peer-[.error]:opacity-100">
            <span className="text-4xl mb-2">🏀</span>
            <span className="text-xs text-white/60">Highlights loading...</span>
          </div>
        </div>
        {channelId && (
          <a
            href={DUKE_BASKETBALL.youtube.channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-2 text-center text-[10px] text-white/40 hover:text-white/60 transition-colors"
          >
            Watch more on YouTube →
          </a>
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
        const totalGameMinutes = 150;

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

        const progress = Math.min(1, elapsedMinutes / totalGameMinutes);
        const dukeTarget = 82;
        const oppTarget = 68;
        const dukeScore = Math.floor(
          dukeTarget * progress + Math.sin(progress * 5) * 2
        );
        const oppScore = Math.floor(
          oppTarget * progress + Math.cos(progress * 4) * 2
        );
        setLiveScore({
          duke: Math.max(0, dukeScore),
          opponent: Math.max(0, oppScore),
        });

        // Reveal play-by-play entries based on elapsed time
        const playsToShow = Math.min(
          DUKE_PLAY_BY_PLAY.length,
          Math.floor(elapsedMinutes / 4) + 1
        );
        setVisiblePlays(DUKE_PLAY_BY_PLAY.slice(0, playsToShow));
      } else {
        setLiveScore({ duke: 82, opponent: 68 });
        setVisiblePlays(DUKE_PLAY_BY_PLAY);
      }
    }

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [gameDate]);

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

  // ── LIVE MODE: 1/3 YouTube + 2/3 play-by-play ──
  if (mode === "live" || mode === "post") {
    return (
      <section className="px-0 space-y-0">
        {/* Scoreboard Header */}
        <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-[#003087] via-[#001a4d] to-[#003087] border border-b-0 border-red-500/40 p-4 sm:p-5">
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
            {/* LIVE badge + title */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                COUNTDOWN TO CRAZY
              </h2>
              {mode === "live" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                  LIVE ON WCCG
                </span>
              ) : (
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80">
                  FINAL
                </span>
              )}
            </div>

            {/* Scoreboard */}
            <div className="flex items-center justify-center gap-6 sm:gap-10">
              {/* Duke */}
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={DUKE_BASKETBALL.logoUrl}
                  alt="Duke"
                  className="h-12 w-12 sm:h-14 sm:w-14 object-contain"
                />
                <div className="text-center">
                  <span className="block text-xs font-bold text-white/70">
                    DUKE
                  </span>
                  <span className="text-3xl sm:text-4xl font-black text-white tabular-nums">
                    {liveScore.duke}
                  </span>
                </div>
              </div>

              {/* Game Clock */}
              <div className="flex flex-col items-center">
                <span className="text-lg font-black text-white/30">—</span>
                <span className="text-[11px] text-white/50 mt-0.5">
                  {half}
                  {gameClock && ` | ${gameClock}`}
                </span>
              </div>

              {/* Opponent */}
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <span className="block text-xs font-bold text-white/70">
                    {opponentShort.toUpperCase()}
                  </span>
                  <span className="text-3xl sm:text-4xl font-black text-white/80 tabular-nums">
                    {liveScore.opponent}
                  </span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={nextGame.opponentLogo || ""}
                  alt={nextGame.opponent}
                  className="h-12 w-12 sm:h-14 sm:w-14 object-contain"
                />
              </div>
            </div>

            {/* Game info */}
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-3 text-[11px] text-white/40">
              <span>{nextGame.venue}</span>
              <span>|</span>
              <span>{nextGame.broadcast}</span>
            </div>
          </div>
        </div>

        {/* 1/3 YouTube + 2/3 Play-by-Play */}
        <div className="grid grid-cols-1 md:grid-cols-3 rounded-b-2xl overflow-hidden border border-t-0 border-red-500/40 bg-[#0a0e1a]">
          {/* YouTube Highlights — 1/3 */}
          <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-white/10 min-h-[280px]">
            <YouTubeHighlights />
          </div>

          {/* Play-by-Play Ticker — 2/3 */}
          <div className="md:col-span-2 min-h-[280px]">
            <PlayByPlayTicker entries={visiblePlays} />
          </div>
        </div>
      </section>
    );
  }

  // ── PRE-GAME MODE: Countdown ──
  return (
    <section className="px-0">
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={nextGame.opponentLogo || ""}
                  alt={nextGame.opponent}
                  className="h-16 w-16 sm:h-20 sm:w-20 object-contain drop-shadow-lg"
                />
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
