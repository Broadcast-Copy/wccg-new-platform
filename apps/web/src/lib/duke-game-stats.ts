type Row = Record<string, unknown>;
const row = (value: unknown): Row => value && typeof value === "object" ? value as Row : {};
const rows = (value: unknown): Row[] => Array.isArray(value) ? value.map(row) : [];
const text = (value: unknown): string => value == null ? "" : String(value);
const id = (value: Row) => text(row(value.team).id ?? value.id);
const score = (value: unknown) => text(typeof value === "object" ? row(value).displayValue : value) || "—";

export interface DukeGameStats {
  eventId: string;
  state: "pre" | "in" | "post";
  status: string;
  date: string;
  dukeScore: string;
  opponentScore: string;
  opponent: string;
  opponentAbbr: string;
  comparisons: { key: string; label: string; duke: string; opponent: string }[];
  playerGroups: { label: string; columns: string[]; players: { id: string; name: string; values: string[] }[] }[];
}

/** Today's Duke event only; never substitute an unrelated game or a saved demo. */
export function selectDukeEvent(json: unknown): string | null {
  const events = rows(row(json).events).filter(event =>
    rows(rows(event.competitions)[0]?.competitors).some(team => id(team) === "150"));
  const state = (event: Row) => text(row(row(rows(event.competitions)[0]?.status).type).state);
  const selected = events.find(event => state(event) === "in")
    ?? events.find(event => state(event) === "pre")
    ?? events.filter(event => state(event) === "post").at(-1);
  return selected ? text(selected.id) || null : null;
}

export function parseDukeGameStats(json: unknown, eventId: string): DukeGameStats | null {
  const root = row(json);
  const header = row(root.header);
  const competition = rows(header.competitions)[0];
  if (!competition || text(header.id ?? competition.id) !== eventId) return null;
  const competitors = rows(competition.competitors);
  const duke = competitors.find(team => id(team) === "150");
  const opponent = competitors.find(team => id(team) !== "150");
  if (!duke || !opponent) return null;
  const status = row(competition.status);
  const type = row(status.type);
  const state = text(type.state);
  if (state !== "pre" && state !== "in" && state !== "post") return null;
  const boxscore = row(root.boxscore);
  const teams = rows(boxscore.teams);
  const dukeStats = rows(teams.find(team => id(team) === "150")?.statistics);
  const opponentStats = rows(teams.find(team => id(team) === id(opponent))?.statistics);
  const byName = new Map(opponentStats.map(stat => [text(stat.name), text(stat.displayValue)]));
  return {
    eventId, state, date: text(competition.date ?? header.date),
    status: text(type.shortDetail ?? type.detail ?? type.description) || (state === "post" ? "Final" : state === "in" ? "In progress" : "Pregame"),
    dukeScore: score(duke.score), opponentScore: score(opponent.score),
    opponent: text(row(opponent.team).displayName) || "Opponent",
    opponentAbbr: text(row(opponent.team).abbreviation) || "OPP",
    comparisons: dukeStats.filter(stat => text(stat.name)).map(stat => ({
      key: text(stat.name), label: text(stat.label ?? stat.abbreviation ?? stat.name),
      duke: text(stat.displayValue) || "—", opponent: byName.get(text(stat.name)) || "—",
    })),
    playerGroups: rows(rows(boxscore.players).find(team => id(team) === "150")?.statistics).map(group => ({
      label: text(group.text ?? group.name) || "Duke box score",
      columns: Array.isArray(group.labels) ? group.labels.map(text) : [],
      players: rows(group.athletes).filter(player => player.didNotPlay !== true && Array.isArray(player.stats) && player.stats.length).map(player => ({
        id: text(row(player.athlete).id), name: text(row(player.athlete).displayName) || "Unknown player",
        values: (player.stats as unknown[]).map(value => text(value) || "—"),
      })),
    })).filter(group => group.columns.length && group.players.length),
  };
}
