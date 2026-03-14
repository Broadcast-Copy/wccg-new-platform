"use client";

import { useEffect, useState, useMemo } from "react";
import { X } from "lucide-react";
import { DUKE_BASKETBALL } from "@/data/sports";

type RibbonMode = "pre" | "live" | "post" | "hidden";

export function GameRibbon() {
  const nextGame = DUKE_BASKETBALL.nextGame;
  const [dismissed, setDismissed] = useState(false);
  const [mode, setMode] = useState<RibbonMode>("hidden");
  const [countdownText, setCountdownText] = useState("");
  const [liveScore, setLiveScore] = useState({ duke: 0, opponent: 0 });
  const [half, setHalf] = useState("1st Half");
  const [gameClock, setGameClock] = useState("20:00");

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

  useEffect(() => {
    if (!gameDate) return;

    function tick() {
      const now = new Date();
      const diff = gameDate!.getTime() - now.getTime();
      const gameEnd = new Date(gameDate!.getTime() + 2.5 * 60 * 60 * 1000);

      // Only show if within 24 hours before game or during/after game (within 2.5h window + 1h post)
      const twentyFourHoursBefore = gameDate!.getTime() - 24 * 60 * 60 * 1000;
      const displayEnd = gameEnd.getTime() + 60 * 60 * 1000; // 1h after game ends

      if (now.getTime() < twentyFourHoursBefore || now.getTime() > displayEnd) {
        setMode("hidden");
        return;
      }

      if (now < gameDate!) {
        // Pre-game
        setMode("pre");
        const totalSeconds = Math.floor(diff / 1000);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        setCountdownText(
          `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`
        );
      } else if (now >= gameDate! && now < gameEnd) {
        // Live
        setMode("live");
        const elapsed = now.getTime() - gameDate!.getTime();
        const elapsedMinutes = elapsed / 60000;
        const totalGameMinutes = 150;

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

        const progress = Math.min(1, elapsedMinutes / totalGameMinutes);
        setLiveScore({
          duke: Math.max(0, Math.floor(82 * progress + Math.sin(progress * 5) * 2)),
          opponent: Math.max(0, Math.floor(68 * progress + Math.cos(progress * 4) * 2)),
        });
      } else {
        // Post-game
        setMode("post");
        setLiveScore({ duke: 82, opponent: 68 });
      }
    }

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [gameDate]);

  if (dismissed || mode === "hidden" || !nextGame) return null;

  return (
    <div
      className={`relative flex items-center justify-center px-3 text-[11px] sm:text-xs font-medium text-white transition-all ${
        mode === "live"
          ? "bg-red-600 animate-pulse h-8"
          : mode === "post"
          ? "bg-[#1a1a2e] h-7"
          : "bg-[#003087] h-7"
      }`}
    >
      <div className="flex items-center gap-2 truncate">
        {mode === "pre" && (
          <>
            <span>&#127936;</span>
            <span className="truncate">
              Duke vs {opponentShort} — Countdown: {countdownText} — Tipoff at{" "}
              {tipoffTime} on WCCG
            </span>
          </>
        )}
        {mode === "live" && (
          <>
            <span>&#128308;</span>
            <span className="font-bold">LIVE:</span>
            <span className="tabular-nums">
              Duke {liveScore.duke} - {opponentShort} {liveScore.opponent}
            </span>
            <span className="hidden sm:inline">
              | {half} {gameClock && gameClock}
            </span>
          </>
        )}
        {mode === "post" && (
          <span>
            Duke {liveScore.duke} - {opponentShort} {liveScore.opponent} FINAL
          </span>
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
