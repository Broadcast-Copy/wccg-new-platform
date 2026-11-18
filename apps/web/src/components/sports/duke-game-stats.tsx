"use client";

import type { DukeGameStatsState } from "@/hooks/use-duke-game-stats";

export function DukeGameStats({ state }: { state: DukeGameStatsState }) {
  const { game, loading, error, fetchedAt } = state;
  const title = error && game ? "Game stats — last update" : game?.state === "in" ? "Live game stats" : game?.state === "post" ? "Final game stats" : "Game center";
  return (
    <section aria-label="Duke game center" className="mb-8 rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-extrabold">{title}</h2>
        <p className="text-xs text-muted-foreground">ESPN{fetchedAt ? ` · Updated ${new Date(fetchedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "America/New_York" })} ET` : ""}</p>
      </div>
      {error && <p role="status" className="mt-3 text-sm text-amber-600 dark:text-amber-400">⚠️ Stats feed unavailable. {game ? "Showing the last successful update; scores may be out of date." : "Game stats will appear when the feed recovers."}</p>}
      {loading && <p role="status" className="mt-4 text-sm text-muted-foreground">Checking Duke’s game feed…</p>}
      {!loading && !error && !game && <p className="mt-4 text-sm text-muted-foreground">No Duke game is listed today. Live scores, team stats and Duke player stats will appear here on game day.</p>}
      {game && <>
        {game.date && Number.isFinite(Date.parse(game.date)) && <p className="mt-3 text-xs text-muted-foreground">{new Date(game.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" })} · {new Date(game.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })} ET</p>}
        <div className="my-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl bg-[#003087] p-4 text-white">
          <div><p className="text-xs font-bold uppercase tracking-wider">Duke</p><p className="text-3xl font-extrabold tabular-nums">{game.state === "pre" ? "—" : game.dukeScore}</p></div>
          <p className="max-w-32 text-center text-xs font-bold">{game.state === "in" && !error && <span className="mb-1 block text-[#74ddc7]">LIVE</span>}{game.status}</p>
          <div className="min-w-0 text-right"><p className="break-words text-xs font-bold">{game.opponent}</p><p className="text-3xl font-extrabold tabular-nums">{game.state === "pre" ? "—" : game.opponentScore}</p></div>
        </div>
        {game.comparisons.length ? <table className="w-full text-sm">
          <caption className="sr-only">Duke versus {game.opponent} game statistics</caption>
          <thead><tr className="border-b border-border text-xs text-muted-foreground"><th scope="col" className="py-2 text-left">Team comparison</th><th scope="col" className="px-2 text-right">DUKE</th><th scope="col" className="text-right">{game.opponentAbbr}</th></tr></thead>
          <tbody>{game.comparisons.map(stat => <tr key={stat.key} className="border-b border-border/50"><th scope="row" className="py-2 pr-2 text-left font-medium">{stat.label}</th><td className="px-2 text-right tabular-nums">{stat.duke}</td><td className="text-right tabular-nums">{stat.opponent}</td></tr>)}</tbody>
        </table> : <p className="text-sm text-muted-foreground">Team stats have not been reported for this game yet.</p>}
        {game.playerGroups.length ? <details className="mt-5 rounded-xl border border-border p-3">
          <summary className="cursor-pointer font-semibold">Duke player stats</summary>
          {game.playerGroups.map((group, index) => <div key={`${group.label}-${index}`} className="mt-4 overflow-x-auto">
            <table className="w-full whitespace-nowrap text-xs">
              <caption className="mb-2 text-left font-bold">{group.label}</caption>
              <thead><tr><th scope="col" className="py-2 text-left">Player</th>{group.columns.map((label, i) => <th scope="col" key={`${label}-${i}`} className="px-2 text-right">{label}</th>)}</tr></thead>
              <tbody>{group.players.map(player => <tr key={player.id} className="border-t border-border"><th scope="row" className="py-2 pr-3 text-left font-medium">{player.name}</th>{group.columns.map((_, i) => <td key={i} className="px-2 text-right tabular-nums">{player.values[i] ?? "—"}</td>)}</tr>)}</tbody>
            </table>
          </div>)}
        </details> : <p className="mt-3 text-sm text-muted-foreground">Duke player stats have not been reported yet.</p>}
      </>}
    </section>
  );
}
