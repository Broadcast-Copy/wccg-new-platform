"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Duke Football game-day data — ESPN public API, browser-side.
 *
 * Two feeds:
 *  1. Team schedule (refreshed every 5 min) → which game is "up next" / live,
 *     kickoff time, opponent, venue, broadcast.
 *  2. Game summary (polled 10 s while live, 60 s in the pre/post window) →
 *     score, quarter/clock, possession, current drive + last play, team
 *     telemetry, Duke player box score, scoring plays, win probability.
 *
 * Everything is guarded — ESPN's shape drifts, and a failed fetch keeps the
 * last known data rather than blanking the card.
 */

/**
 * Team we render as "Duke". Preview knob: `?espnEvent=<id>&espnTeam=<id>`
 * on the home page points the card at any live ESPN game so the live face
 * can be checked outside a Duke game window. Defaults to Duke (150).
 */
let DUKE_ID = "150";
function readPreviewOverride(): { event: string | null; team: string | null } {
  if (typeof window === "undefined") return { event: null, team: null };
  const q = new URLSearchParams(window.location.search);
  return { event: q.get("espnEvent"), team: q.get("espnTeam") };
}
const SCHEDULE_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/150/schedule";
const summaryUrl = (eventId: string) =>
  `https://site.api.espn.com/apis/site/v2/sports/football/college-football/summary?event=${eventId}`;

const SCHEDULE_REFRESH_MS = 5 * 60_000;
const POLL_LIVE_MS = 10_000;
const POLL_IDLE_MS = 60_000;
/** Start polling the summary this long before kickoff (pregame warm-up). */
const PREGAME_POLL_LEAD_MS = 20 * 60_000;
/** Keep the post-game face up this long after ESPN marks the game final. */
export const POSTGAME_HOLD_MS = 90 * 60_000;

export interface FootballGame {
  espnEventId: string;
  /** ISO kickoff */
  date: string;
  opponent: string;
  opponentShort: string;
  opponentAbbr: string;
  opponentLogo: string | null;
  opponentId: string;
  isHome: boolean;
  venue: string;
  broadcast: string | null;
  /** ESPN's `state` from the schedule feed at fetch time */
  state: "pre" | "in" | "post";
}

export interface TeamTelemetry {
  totalYards: number;
  passingYards: number;
  rushingYards: number;
  firstDowns: number;
  thirdDown: string;
  turnovers: number;
  penalties: string;
  possessionTime: string;
}

export interface PlayerLine {
  id: string;
  name: string;
  shortName: string;
  jersey: string;
  headshot: string | null;
  /** Column labels for `stats`, e.g. ["C/ATT","YDS","AVG","TD","INT"] */
  labels: string[];
  stats: string[];
}

export interface PlayerGroup {
  key: string; // passing | rushing | receiving | defensive | ...
  title: string;
  labels: string[];
  players: PlayerLine[];
}

export interface Leader {
  key: string;
  title: string;
  name: string;
  headshot: string | null;
  value: string;
  team: "duke" | "opponent";
}

export interface ScoringPlay {
  id: string;
  text: string;
  type: string;
  period: number;
  clock: string;
  team: "duke" | "opponent";
  dukeScore: number;
  opponentScore: number;
}

export interface FootballLive {
  state: "pre" | "in" | "post";
  detail: string;
  period: number;
  displayPeriod: string;
  clock: string;
  dukeScore: number;
  opponentScore: number;
  dukeLinescores: string[];
  opponentLinescores: string[];
  possession: "duke" | "opponent" | null;
  downDistance: string | null;
  lastPlay: string | null;
  driveSummary: string | null;
  driveTeam: "duke" | "opponent" | null;
  dukeStats: TeamTelemetry | null;
  opponentStats: TeamTelemetry | null;
  dukePlayers: PlayerGroup[];
  leaders: Leader[];
  scoringPlays: ScoringPlay[];
  /** 0..1 Duke win probability, when ESPN provides it */
  dukeWinProbability: number | null;
  /** epoch ms of the last successful summary fetch */
  fetchedAt: number;
}

// ── loose ESPN typings (only the fields we read) ─────────────────────
type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec => (v && typeof v === "object" ? (v as Rec) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown, fallback = ""): string =>
  v === undefined || v === null ? fallback : String(v);
const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

function parseSchedule(json: unknown): { game: FootballGame | null; record: string | null } {
  const root = rec(json);
  const record = str(rec(root.team).recordSummary, "") || null;
  const events = arr(root.events);

  let game: FootballGame | null = null;
  for (const ev of events) {
    const e = rec(ev);
    const comp = rec(arr(e.competitions)[0]);
    const type = rec(rec(comp.status).type);
    const state = str(type.state, "pre") as FootballGame["state"];
    if (type.completed === true || state === "post") continue;

    const competitors = arr(comp.competitors).map(rec);
    const duke = competitors.find((c) => str(c.id) === DUKE_ID);
    const opp = competitors.find((c) => str(c.id) !== DUKE_ID);
    if (!duke || !opp) continue;

    const oppTeam = rec(opp.team);
    const venue = rec(comp.venue);
    const address = rec(venue.address);
    const broadcast = rec(rec(arr(comp.broadcasts)[0]).media).shortName;

    game = {
      espnEventId: str(e.id),
      date: str(e.date),
      opponent: str(oppTeam.displayName, "TBD"),
      opponentShort: str(oppTeam.location ?? oppTeam.shortDisplayName ?? oppTeam.displayName, "TBD"),
      opponentAbbr: str(oppTeam.abbreviation, "OPP"),
      opponentLogo: str(rec(arr(oppTeam.logos)[0]).href, "") || null,
      opponentId: str(opp.id),
      isHome: str(duke.homeAway) === "home",
      venue: [venue.fullName, address.city, address.state].filter(Boolean).map(String).join(", "),
      broadcast: str(broadcast, "") || null,
      state,
    };
    break;
  }
  return { game, record };
}

/** Build a FootballGame from a summary header (preview override path). */
function gameFromSummary(json: unknown, eventId: string): FootballGame | null {
  const root = rec(json);
  const comp = rec(arr(rec(root.header).competitions)[0]);
  const competitors = arr(comp.competitors).map(rec);
  const duke = competitors.find((c) => str(c.id) === DUKE_ID);
  const opp = competitors.find((c) => str(c.id) !== DUKE_ID);
  if (!duke || !opp) return null;
  const oppTeam = rec(opp.team);
  const venue = rec(rec(root.gameInfo).venue);
  const address = rec(venue.address);
  const type = rec(rec(comp.status).type);
  return {
    espnEventId: eventId,
    date: str(comp.date),
    opponent: str(oppTeam.displayName, "TBD"),
    opponentShort: str(oppTeam.location ?? oppTeam.displayName, "TBD"),
    opponentAbbr: str(oppTeam.abbreviation, "OPP"),
    opponentLogo: str(rec(arr(oppTeam.logos)[0]).href, "") || null,
    opponentId: str(opp.id),
    isHome: str(duke.homeAway) === "home",
    venue: [venue.fullName, address.city, address.state].filter(Boolean).map(String).join(", "),
    broadcast: str(rec(rec(arr(root.broadcasts)[0]).media).shortName, "") || null,
    state: str(type.state, "pre") as FootballGame["state"],
  };
}

function parseTeamStats(teamBox: Rec): TeamTelemetry {
  const map: Record<string, string> = {};
  for (const s of arr(teamBox.statistics).map(rec)) {
    map[str(s.name)] = str(s.displayValue);
  }
  return {
    totalYards: num(map.totalYards),
    passingYards: num(map.netPassingYards),
    rushingYards: num(map.rushingYards),
    firstDowns: num(map.firstDowns),
    thirdDown: map.thirdDownEff ?? "0-0",
    turnovers: num(map.turnovers),
    penalties: map.totalPenaltiesYards ?? "0-0",
    possessionTime: map.possessionTime ?? "0:00",
  };
}

const GROUP_TITLES: Record<string, string> = {
  passing: "Passing",
  rushing: "Rushing",
  receiving: "Receiving",
  defensive: "Defense",
  interceptions: "Interceptions",
  kicking: "Kicking",
  kickReturns: "Kick Returns",
  puntReturns: "Punt Returns",
  punting: "Punting",
};
const GROUP_ORDER = ["passing", "rushing", "receiving", "defensive", "interceptions", "kicking"];

function parsePlayers(box: Rec): PlayerGroup[] {
  const groups: PlayerGroup[] = [];
  for (const teamBox of arr(box.players).map(rec)) {
    if (str(rec(teamBox.team).id) !== DUKE_ID) continue;
    for (const g of arr(teamBox.statistics).map(rec)) {
      const key = str(g.name);
      const labels = arr(g.labels).map(String);
      const players: PlayerLine[] = [];
      for (const a of arr(g.athletes).map(rec)) {
        const ath = rec(a.athlete);
        const stats = arr(a.stats).map(String);
        if (stats.length === 0) continue;
        players.push({
          id: str(ath.id, Math.random().toString(36).slice(2)),
          name: str(ath.displayName, str(ath.shortName, "Unknown")),
          shortName: str(ath.shortName, str(ath.displayName, "")),
          jersey: str(ath.jersey, ""),
          headshot: str(rec(ath.headshot).href, "") || null,
          labels,
          stats,
        });
      }
      if (players.length > 0) {
        groups.push({ key, title: GROUP_TITLES[key] ?? key, labels, players });
      }
    }
  }
  groups.sort((a, b) => {
    const ai = GROUP_ORDER.indexOf(a.key);
    const bi = GROUP_ORDER.indexOf(b.key);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  return groups;
}

function parseLeaders(json: Rec): Leader[] {
  const out: Leader[] = [];
  for (const teamLeaders of arr(json.leaders).map(rec)) {
    const team: Leader["team"] = str(rec(teamLeaders.team).id) === DUKE_ID ? "duke" : "opponent";
    for (const cat of arr(teamLeaders.leaders).map(rec)) {
      const top = rec(arr(cat.leaders)[0]);
      const ath = rec(top.athlete);
      const value = str(top.displayValue, "");
      if (!value || !ath.displayName) continue;
      out.push({
        key: str(cat.name),
        title: str(cat.displayName, str(cat.name)),
        name: str(ath.displayName),
        headshot: str(rec(ath.headshot).href, "") || null,
        value,
        team,
      });
    }
  }
  return out;
}

function parseSummary(json: unknown, game: FootballGame): FootballLive | null {
  const root = rec(json);
  const comp = rec(arr(rec(root.header).competitions)[0]);
  const status = rec(comp.status);
  const type = rec(status.type);
  const state = str(type.state, "pre") as FootballLive["state"];
  if (!comp.competitors) return null;

  const competitors = arr(comp.competitors).map(rec);
  const duke = competitors.find((c) => str(c.id) === DUKE_ID);
  const opp = competitors.find((c) => str(c.id) !== DUKE_ID);

  let possession: FootballLive["possession"] = null;
  if (duke?.possession === true) possession = "duke";
  else if (opp?.possession === true) possession = "opponent";

  const linescores = (c: Rec | undefined) =>
    arr(c?.linescores).map((l) => str(rec(l).displayValue, "0"));

  // Current drive / last play / down & distance
  const drives = rec(root.drives);
  const current = rec(drives.current);
  const plays = arr(current.plays).map(rec);
  const last = plays[plays.length - 1];
  const driveTeamId = str(rec(current.team).id, "");
  const lastPlayText = last ? str(last.text, "") : "";
  const dd = last ? str(rec(last.end).downDistanceText, "") || str(rec(last.end).shortDownDistanceText, "") : "";
  const situation = rec(root.situation);
  const sitDD = str(situation.downDistanceText, "") || str(situation.shortDownDistanceText, "");
  const sitPoss = str(situation.possession, "");
  if (!possession && sitPoss) possession = sitPoss === DUKE_ID ? "duke" : "opponent";
  if (!possession && driveTeamId && state === "in") possession = driveTeamId === DUKE_ID ? "duke" : "opponent";

  // Team telemetry
  const box = rec(root.boxscore);
  let dukeStats: TeamTelemetry | null = null;
  let opponentStats: TeamTelemetry | null = null;
  for (const t of arr(box.teams).map(rec)) {
    const parsed = parseTeamStats(t);
    if (str(rec(t.team).id) === DUKE_ID) dukeStats = parsed;
    else opponentStats = parsed;
  }

  // Scoring plays (newest first)
  const scoringPlays: ScoringPlay[] = arr(root.scoringPlays)
    .map(rec)
    .map((p) => {
      const teamId = str(rec(p.team).id);
      const home = num(p.homeScore);
      const away = num(p.awayScore);
      return {
        id: str(p.id),
        text: str(p.text),
        type: str(rec(p.type).abbreviation, str(rec(p.type).text)),
        period: num(rec(p.period).number),
        clock: str(rec(p.clock).displayValue),
        team: (teamId === DUKE_ID ? "duke" : "opponent") as ScoringPlay["team"],
        dukeScore: game.isHome ? home : away,
        opponentScore: game.isHome ? away : home,
      };
    })
    .reverse();

  // Win probability (last sample)
  const wp = arr(root.winprobability);
  const lastWp = rec(wp[wp.length - 1]);
  let dukeWinProbability: number | null = null;
  if (lastWp.homeWinPercentage !== undefined) {
    const home = num(lastWp.homeWinPercentage);
    dukeWinProbability = game.isHome ? home : 1 - home;
  }

  return {
    state,
    detail: str(type.shortDetail, str(type.detail, "")),
    period: num(status.period),
    displayPeriod: str(status.displayPeriod, ""),
    clock: str(status.displayClock, ""),
    dukeScore: num(duke?.score),
    opponentScore: num(opp?.score),
    dukeLinescores: linescores(duke),
    opponentLinescores: linescores(opp),
    possession,
    downDistance: (sitDD || dd) && state === "in" ? sitDD || dd : null,
    lastPlay: lastPlayText || (str(situation.lastPlay ? rec(situation.lastPlay).text : "", "") || null),
    driveSummary: str(current.description, "") || null,
    driveTeam: driveTeamId ? (driveTeamId === DUKE_ID ? "duke" : "opponent") : null,
    dukeStats,
    opponentStats,
    dukePlayers: parsePlayers(box),
    leaders: parseLeaders(root),
    scoringPlays,
    dukeWinProbability,
    fetchedAt: Date.now(),
  };
}

export type FootballPhase = "loading" | "none" | "pre" | "live" | "post";

export interface DukeFootballGameState {
  game: FootballGame | null;
  record: string | null;
  live: FootballLive | null;
  /** pre = countdown, live = in-game, post = final (held for POSTGAME_HOLD_MS) */
  phase: FootballPhase;
  error: boolean;
}

/**
 * Derive the card phase from the schedule + latest summary.
 * ESPN's `state` wins whenever we have a fresh summary; the wall clock is the
 * fallback so the card still flips at kickoff if the summary poll is slow.
 */
export function derivePhase(
  game: FootballGame | null,
  live: FootballLive | null,
  now: number
): FootballPhase {
  if (!game) return "none";
  if (live) {
    if (live.state === "in") return "live";
    if (live.state === "post") return "post";
  }
  const kickoff = new Date(game.date).getTime();
  if (now < kickoff) return "pre";
  // Past kickoff but ESPN hasn't said "in" yet — treat as live so the card
  // flips on time; the summary poll fills in real numbers seconds later.
  return "live";
}

export function useDukeFootballGame(): DukeFootballGameState {
  const [game, setGame] = useState<FootballGame | null>(null);
  const [record, setRecord] = useState<string | null>(null);
  const [live, setLive] = useState<FootballLive | null>(null);
  const [scheduleLoaded, setScheduleLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const liveRef = useRef<FootballLive | null>(null);
  liveRef.current = live;
  const lastEventRef = useRef<string | null>(null);

  // 1-second wall clock (drives the countdown + phase transitions)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Schedule feed
  const loadSchedule = useCallback(async (): Promise<boolean> => {
    try {
      const override = readPreviewOverride();
      if (override.team) DUKE_ID = override.team;
      let parsed: { game: FootballGame | null; record: string | null };
      if (override.event) {
        const res = await fetch(summaryUrl(override.event), { cache: "no-store", signal: AbortSignal.timeout(10_000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        parsed = { game: gameFromSummary(await res.json(), override.event), record: null };
      } else {
        const res = await fetch(SCHEDULE_URL, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        parsed = parseSchedule(await res.json());
      }
      // New event → drop the previous game's live snapshot so the card
      // doesn't show last week's final under this week's countdown.
      if (parsed.game?.espnEventId !== lastEventRef.current) {
        lastEventRef.current = parsed.game?.espnEventId ?? null;
        setLive(null);
      }
      setGame((prev) =>
        prev && parsed.game && prev.espnEventId === parsed.game.espnEventId && prev.state === parsed.game.state
          ? prev
          : parsed.game
      );
      setRecord(parsed.record);
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const ok = await loadSchedule();
      if (!active) return;
      setScheduleLoaded(true);
      if (!ok) setError(true);
    })();
    const t = setInterval(loadSchedule, SCHEDULE_REFRESH_MS);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [loadSchedule]);

  // Summary poll — only inside the game window
  const kickoff = game ? new Date(game.date).getTime() : null;
  const inWindow =
    !!game &&
    kickoff !== null &&
    (game.state === "in" ||
      (now >= kickoff - PREGAME_POLL_LEAD_MS &&
        (liveRef.current?.state !== "post" || now - liveRef.current.fetchedAt < POSTGAME_HOLD_MS)));
  const isLiveNow = !!live && live.state === "in";
  const eventId = game?.espnEventId ?? null;

  useEffect(() => {
    if (!inWindow || !eventId || !game) return;
    let active = true;
    const g = game;

    async function poll() {
      try {
        const res = await fetch(summaryUrl(eventId!), { cache: "no-store", signal: AbortSignal.timeout(8_000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const parsed = parseSummary(await res.json(), g);
        if (!active || !parsed) return;
        setLive(parsed);
        setError(false);
      } catch {
        if (active) setError(true);
      }
    }

    poll();
    const t = setInterval(poll, isLiveNow ? POLL_LIVE_MS : POLL_IDLE_MS);
    return () => {
      active = false;
      clearInterval(t);
    };
    // `game` identity only changes when the event or its state changes (see setGame above).
  }, [inWindow, eventId, isLiveNow, game]);

  const phase: FootballPhase = !scheduleLoaded ? "loading" : derivePhase(game, live, now);

  return { game, record, live, phase, error };
}
