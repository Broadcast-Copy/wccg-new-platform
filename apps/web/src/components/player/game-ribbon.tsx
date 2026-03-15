"use client";

import { useEffect, useState, useMemo } from "react";
import { X } from "lucide-react";
import { DUKE_BASKETBALL, DUKE_PLAY_BY_PLAY } from "@/data/sports";
import { useESPNScores } from "@/hooks/use-espn-scores";

type RibbonMode = "pre" | "live" | "post" | "hidden";

export function GameRibbon() {
  const nextGame = DUKE_BASKETBALL.nextGame;
  const [dismissed, setDismissed] = useState(false);
  const [mode, setMode] = useState<RibbonMode>("hidden");
  const [countdownText, setCountdownText] = useState("");
  const [liveScore, setLiveScore] = useState({ duke: 0, opponent: 0 });
  const [half, setHalf] = useState("1st Half");
  const [gameClock, setGameClock] = useState("20:00");
  const [latestPlay, setLatestPlay] = useState("");

  const gameDate = useMemo(
    () => (nextGame ? new Date(nextGame.date) : null),
    [nextGame]
  );

  const opponentShort = useMemo(() => {
    if (!nextGame) return "";
    const parts = nextGame.opponent.split(" ");
    return parts.length > 1 ? parts.slice(0, -1).join(" ") : nextGame.opponent;
  }, [nextGame]);

  const tipoffTime = useMemo(() => {
    if (!gameDate) return "";
    return gameDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }, [gameDate]);

  // ── ESPN real-time scores ──
  const isGameActive = mode === "live" || mode === "post";
  const { data: espnData } = useESPNScores(isGameActive);

  // Apply ESPN scores when available
  useEffect(() => {
    if (espnData && (espnData.status === "in" || espnData.status === "post")) {
      setLiveScore({
        duke: espnData.dukeScore,
        opponent: espnData.opponentScore,
      });
      if (espnData.status === "in") {
        if (espnData.period === 1) setHalf("1st");
        else if (espnData.period === 2) setHalf("2nd");
        else setHalf(`OT`);
        setGameClock(espnData.clock || "");
      } else {
        setHalf("FINAL");
        setGameClock("");
      }
      if (espnData.lastPlay) {
        setLatestPlay(espnData.lastPlay);
      }
    }
  }, [espnData]);

  useEffect(() => {
    if (!gameDate) return;

    function tick() {
      const now = new Date();
      const diff = gameDate!.getTime() - now.getTime();
      const gameEnd = new Date(gameDate!.getTime() + 2.5 * 60 * 60 * 1000);

      const twentyFourHoursBefore =
        gameDate!.getTime() - 24 * 60 * 60 * 1000;
      const displayEnd = gameEnd.getTime() + 60 * 60 * 1000;

      if (
        now.getTime() < twentyFourHoursBefore ||
        now.getTime() > displayEnd
      ) {
        setMode("hidden");
        return;
      }

      if (now < gameDate!) {
        setMode("pre");
        const totalSeconds = Math.floor(diff / 1000);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        setCountdownText(
          `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`
        );
      } else if (now >= gameDate! && now < gameEnd) {
        setMode("live");
        const elapsed = now.getTime() - gameDate!.getTime();
        const elapsedMinutes = elapsed / 60000;

        // Only use simulated data if ESPN not available
        if (!espnData || espnData.status === "pre") {
          if (elapsedMinutes < 50) {
            setHalf("1st");
            const clockMin = Math.max(
              0,
              Math.floor(20 - (elapsedMinutes / 50) * 20)
            );
            const clockSec = Math.floor(Math.random() * 60);
            setGameClock(
              `${clockMin}:${clockSec.toString().padStart(2, "0")}`
            );
          } else if (elapsedMinutes < 65) {
            setHalf("HALF");
            setGameClock("");
          } else {
            setHalf("2nd");
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

          // Simulated scores
          const playsToShow = Math.min(
            DUKE_PLAY_BY_PLAY.length,
            Math.floor(elapsedMinutes / 4)
          );
          if (playsToShow > 0) {
            const latest = DUKE_PLAY_BY_PLAY[playsToShow - 1];
            setLiveScore({
              duke: latest.score.duke,
              opponent: latest.score.opponent,
            });
            setLatestPlay(latest.text);
          } else {
            setLiveScore({ duke: 0, opponent: 0 });
            setLatestPlay("Game underway — tipoff!");
          }
        }
      } else {
        setMode("post");
        if (!espnData || espnData.status !== "post") {
          setLiveScore({ duke: 82, opponent: 68 });
        }
        setLatestPlay("");
      }
    }

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [gameDate, espnData]);

  if (dismissed || mode === "hidden" || !nextGame) return null;

  return (
    <div
      className={`relative flex items-center px-3 text-[11px] sm:text-xs font-medium text-white transition-all overflow-hidden ${
        mode === "live"
          ? "bg-gradient-to-r from-red-700 via-red-600 to-red-700 h-8"
          : mode === "post"
          ? "bg-[#1a1a2e] h-7"
          : "bg-gradient-to-r from-[#003087] via-[#001a4d] to-[#003087] h-7"
      }`}
    >
      <div className="flex items-center gap-2 w-full overflow-hidden">
        {mode === "pre" && (
          <div className="flex items-center gap-2 truncate mx-auto">
            <span>🏀</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={DUKE_BASKETBALL.logoUrl}
              alt="Duke"
              className="h-4 w-4 object-contain"
            />
            <span className="font-bold">Duke</span>
            <span className="text-white/50">vs</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={nextGame.opponentLogo || ""}
              alt={opponentShort}
              className="h-4 w-4 object-contain"
            />
            <span className="font-bold">{opponentShort}</span>
            <span className="text-white/50">—</span>
            <span className="tabular-nums font-mono">{countdownText}</span>
            <span className="hidden sm:inline text-white/50">
              — Tipoff {tipoffTime}
            </span>
          </div>
        )}
        {mode === "live" && (
          <div className="flex items-center gap-0 w-full">
            {/* Score section — fixed left */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                <span className="font-bold">LIVE</span>
              </span>
              <span className="text-white/40">|</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={DUKE_BASKETBALL.logoUrl}
                alt="Duke"
                className="h-4 w-4 object-contain"
              />
              <span className="font-bold tabular-nums">
                {liveScore.duke}
              </span>
              <span className="text-white/40">-</span>
              <span className="tabular-nums">{liveScore.opponent}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={nextGame.opponentLogo || ""}
                alt={opponentShort}
                className="h-4 w-4 object-contain"
              />
              <span className="text-white/40">|</span>
              <span className="text-white/60 tabular-nums font-mono text-[10px]">
                {half} {gameClock}
              </span>
            </div>

            {/* Latest play — scrolling ticker */}
            {latestPlay && (
              <>
                <span className="text-white/30 mx-2 hidden sm:inline">|</span>
                <div className="hidden sm:block flex-1 min-w-0 overflow-hidden">
                  <div className="animate-marquee whitespace-nowrap">
                    <span className="text-white/70">{latestPlay}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        {mode === "post" && (
          <div className="flex items-center gap-2 truncate mx-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={DUKE_BASKETBALL.logoUrl}
              alt="Duke"
              className="h-4 w-4 object-contain"
            />
            <span className="font-bold">
              Duke {liveScore.duke}
            </span>
            <span className="text-white/40">-</span>
            <span>
              {opponentShort} {liveScore.opponent}
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={nextGame.opponentLogo || ""}
              alt={opponentShort}
              className="h-4 w-4 object-contain"
            />
            <span className="font-bold text-white/60">FINAL</span>
          </div>
        )}
      </div>

      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDismissed(true);
        }}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Dismiss game ribbon"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
