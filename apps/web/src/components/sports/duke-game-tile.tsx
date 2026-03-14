"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { DUKE_BASKETBALL } from "@/data/sports";

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

export function DukeGameTile() {
  const nextGame = DUKE_BASKETBALL.nextGame;
  const lastGame = DUKE_BASKETBALL.lastGame;

  const gameDate = useMemo(
    () => (nextGame ? new Date(nextGame.date) : null),
    [nextGame]
  );

  const [mode, setMode] = useState<GameMode>("pre");
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [liveScore, setLiveScore] = useState({ duke: 0, opponent: 0 });
  const [half, setHalf] = useState("1st Half");
  const [gameClock, setGameClock] = useState("20:00");

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
        // Simulate live score based on elapsed time
        const elapsed = now.getTime() - gameDate!.getTime();
        const elapsedMinutes = elapsed / 60000;
        const totalGameMinutes = 150; // 2.5 hours

        // Determine half
        if (elapsedMinutes < 50) {
          setHalf("1st Half");
          const clockMin = Math.max(0, Math.floor(20 - (elapsedMinutes / 50) * 20));
          const clockSec = Math.floor(Math.random() * 60);
          setGameClock(`${clockMin}:${clockSec.toString().padStart(2, "0")}`);
        } else if (elapsedMinutes < 65) {
          setHalf("Halftime");
          setGameClock("");
        } else {
          setHalf("2nd Half");
          const secondHalfElapsed = elapsedMinutes - 65;
          const clockMin = Math.max(0, Math.floor(20 - (secondHalfElapsed / 85) * 20));
          const clockSec = Math.floor(Math.random() * 60);
          setGameClock(`${clockMin}:${clockSec.toString().padStart(2, "0")}`);
        }

        // Score progression — Duke winning pace similar to lastGame
        const progress = Math.min(1, elapsedMinutes / totalGameMinutes);
        const dukeTarget = 82;
        const oppTarget = 68;
        const dukeScore = Math.floor(dukeTarget * progress + Math.sin(progress * 5) * 2);
        const oppScore = Math.floor(oppTarget * progress + Math.cos(progress * 4) * 2);
        setLiveScore({
          duke: Math.max(0, dukeScore),
          opponent: Math.max(0, oppScore),
        });
      } else {
        // Post-game — show final
        setLiveScore({ duke: 82, opponent: 68 });
      }
    }

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [gameDate]);

  if (!nextGame) return null;

  const opponentShort = nextGame.opponent.split(" ").slice(0, -1).join(" ") || nextGame.opponent;
  const formattedDate = gameDate
    ? gameDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "";
  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <section className="px-0">
      <Link href="/sports/duke-basketball" className="block group">
        <div
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#003087] via-[#001a4d] to-[#0a0a0f] p-5 sm:p-7 md:p-8 border transition-all ${
            mode === "live"
              ? "border-red-500/60 shadow-lg shadow-red-500/10"
              : "border-white/10 hover:border-white/20"
          }`}
        >
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
                <span className="text-sm">&#127936;</span> WCCG 104.5 FM
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
                  className="h-16 w-16 object-contain"
                />
                <span className="text-sm font-bold text-white">Duke</span>
                {mode === "live" && (
                  <span className="text-3xl font-black text-white tabular-nums">
                    {liveScore.duke}
                  </span>
                )}
                {mode === "post" && (
                  <span className="text-3xl font-black text-white tabular-nums">
                    {liveScore.duke}
                  </span>
                )}
              </div>

              {/* VS / Score Divider */}
              <div className="flex flex-col items-center gap-1">
                {mode === "live" ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white animate-pulse">
                      <span>&#128308;</span> LIVE
                    </span>
                    <span className="text-xs text-white/60 mt-1">
                      {half} {gameClock && `| ${gameClock}`}
                    </span>
                  </>
                ) : mode === "post" ? (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80">
                    FINAL
                  </span>
                ) : (
                  <span className="text-2xl sm:text-3xl font-black text-white/40">
                    VS
                  </span>
                )}
              </div>

              {/* Opponent */}
              <div className="flex flex-col items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={nextGame.opponentLogo || ""}
                  alt={nextGame.opponent}
                  className="h-16 w-16 object-contain"
                />
                <span className="text-sm font-bold text-white">{opponentShort}</span>
                {mode === "live" && (
                  <span className="text-3xl font-black text-white/80 tabular-nums">
                    {liveScore.opponent}
                  </span>
                )}
                {mode === "post" && (
                  <span className="text-3xl font-black text-white/80 tabular-nums">
                    {liveScore.opponent}
                  </span>
                )}
              </div>
            </div>

            {/* Live Banner */}
            {mode === "live" && (
              <div className="flex items-center justify-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-red-600/20 border border-red-500/30 px-4 py-1.5 text-sm font-bold text-red-300 animate-pulse">
                  <span>&#128308;</span> LIVE ON WCCG 104.5 FM
                </span>
              </div>
            )}

            {/* Countdown Timer (pre-game only) */}
            {mode === "pre" && (
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
            )}

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
              <div className="flex flex-wrap items-center justify-center gap-x-2 text-[11px] text-white/40 pt-1">
                <span>Last Game:</span>
                <span
                  className={`font-bold ${
                    lastGame.result === "W" ? "text-green-400/70" : "text-red-400/70"
                  }`}
                >
                  {lastGame.result} {lastGame.score.duke}-{lastGame.score.opponent}
                </span>
                <span>vs {lastGame.opponent}</span>
                <span className="hidden sm:inline">|</span>
                <span className="hidden sm:inline">
                  {lastGame.topPerformer.name}: {lastGame.topPerformer.points} pts,{" "}
                  {lastGame.topPerformer.rebounds} reb, {lastGame.topPerformer.assists} ast
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </section>
  );
}
