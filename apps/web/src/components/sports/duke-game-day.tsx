"use client";

import { useDukeFootballGame } from "@/hooks/use-duke-football-game";
import { DukeFootballCard } from "./duke-football-card";
import { DukeGameTile } from "./duke-game-tile";

/**
 * Home-page Duke sports card.
 *
 * Football owns the slot whenever ESPN lists an upcoming / in-progress Duke
 * football game: countdown before kickoff, then the card flips to the live
 * scoreboard + telemetry, then the final. Outside football season (no
 * remaining games on the schedule) the basketball tile takes over as before.
 */
export function DukeGameDay() {
  const football = useDukeFootballGame();

  if (football.phase === "loading") {
    return (
      <section className="px-4 md:px-[50px]">
        <div className="h-64 animate-pulse rounded-2xl border border-[#003087]/40 bg-gradient-to-r from-[#003087]/40 via-[#001a4d]/40 to-[#0a0a0f]/40" />
      </section>
    );
  }

  if (football.phase === "none") return <DukeGameTile />;

  return <DukeFootballCard state={football} />;
}
