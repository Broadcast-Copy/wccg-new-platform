/**
 * ESPN Public API Client — Build-time data fetching for Duke Sports
 *
 * Fetches schedule, roster, and game data from ESPN's public API.
 * Designed for use in Next.js server components and build-time data fetching.
 * All functions are safe to call at build time — they catch errors and return
 * empty/null values on failure.
 */

import type {
  Coach,
  GameResult,
  LastGameResult,
  Player,
  UpcomingGame,
} from "@/data/sports";

// ─── Constants ───────────────────────────────────────────────────────

const DUKE_TEAM_ID = "150";
const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";
const FETCH_TIMEOUT_MS = 10_000;

// ─── Types ───────────────────────────────────────────────────────────

export type ESPNSport = "mens-college-basketball" | "college-football";

/** Maps ESPNSport to the sport/league path segments ESPN expects. */
const SPORT_PATHS: Record<ESPNSport, string> = {
  "mens-college-basketball": "basketball/mens-college-basketball",
  "college-football": "football/college-football",
};

export interface ESPNScheduleResult {
  upcoming: UpcomingGame[];
  results: GameResult[];
  nextGame: UpcomingGame | null;
  lastGame: LastGameResult | null;
  record: string | null;
}

export interface ESPNTeamData {
  upcoming: UpcomingGame[];
  results: GameResult[];
  nextGame: UpcomingGame | null;
  lastGame: LastGameResult | null;
  record: string | null;
  players: Player[];
  coaches: Coach[];
}

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Format an ISO date string to "H:MM AM/PM ET" format.
 * Returns an empty string if the date is invalid.
 */
function formatGameTime(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/New_York",
    }) + " ET";
  } catch {
    return "";
  }
}

/**
 * Format an ISO date string to "YYYY-MM-DD" for display.
 */
function formatGameDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return isoDate;
    return date.toISOString().split("T")[0] ?? isoDate;
  } catch {
    return isoDate;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Extract the best logo URL from a competitor's team logos array.
 * Prefers the logo with rel: ["full", "default"], falls back to the first logo.
 */
function getLogoUrl(logos?: any[]): string {
  if (!logos?.length) return "";
  const defaultLogo = logos.find(
    (l: any) =>
      Array.isArray(l?.rel) &&
      l.rel.includes("full") &&
      l.rel.includes("default"),
  );
  return (defaultLogo?.href ?? logos[0]?.href ?? "") as string;
}

/**
 * Build the venue string from an ESPN venue object.
 */
function formatVenue(venue?: any): string {
  if (!venue) return "TBD";
  const name = venue.fullName ?? "TBD";
  const city = venue.address?.city;
  const state = venue.address?.state;
  if (city && state) return `${name}, ${city}, ${state}`;
  if (city) return `${name}, ${city}`;
  return name;
}

/**
 * Fetch JSON from a URL with a timeout. Returns null on failure.
 */
async function fetchJSON<T = any>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 300 }, // Cache for 5 minutes in Next.js
    });
    if (!response.ok) {
      console.warn(
        `[ESPN API] HTTP ${response.status} from ${url}`,
      );
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    console.warn(
      `[ESPN API] Failed to fetch ${url}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── Schedule Fetching ───────────────────────────────────────────────

/**
 * Fetch the Duke schedule from ESPN and classify games as upcoming or completed.
 *
 * - Upcoming games are sorted by date ascending (soonest first).
 * - Completed games (results) are sorted by date descending (most recent first).
 * - `nextGame` is the soonest upcoming game.
 * - `lastGame` is the most recently completed game with top performer data.
 */
export async function fetchESPNSchedule(
  sport: ESPNSport,
): Promise<ESPNScheduleResult> {
  const empty: ESPNScheduleResult = {
    upcoming: [],
    results: [],
    nextGame: null,
    lastGame: null,
    record: null,
  };

  try {
    const path = SPORT_PATHS[sport];
    const url = `${ESPN_BASE}/${path}/teams/${DUKE_TEAM_ID}/schedule`;
    const data = await fetchJSON(url);
    if (!data) return empty;

    // Extract record from the team object
    const record: string | null =
      (data as any)?.team?.recordSummary ?? null;

    const events: any[] = (data as any)?.events ?? [];
    const upcoming: UpcomingGame[] = [];
    const results: GameResult[] = [];
    let lastGame: LastGameResult | null = null;

    for (const event of events) {
      const competition = event?.competitions?.[0];
      if (!competition) continue;

      const status = competition.status?.type;
      const isCompleted = status?.completed === true;
      const eventDate: string = event?.date ?? "";
      const eventId: string = event?.id ?? "";

      // Find Duke and opponent competitors
      const competitors: any[] = competition.competitors ?? [];
      const duke = competitors.find(
        (c: any) => String(c?.id) === DUKE_TEAM_ID,
      );
      const opponent = competitors.find(
        (c: any) => String(c?.id) !== DUKE_TEAM_ID,
      );
      if (!duke || !opponent) continue;

      const opponentName: string =
        opponent.team?.displayName ?? "Unknown";
      const opponentLogo = getLogoUrl(opponent.team?.logos);
      const venue = formatVenue(competition.venue);
      const isHome = duke.homeAway === "home";
      const broadcast: string | undefined =
        competition.broadcasts?.[0]?.media?.shortName ??
        competition.broadcasts?.[0]?.names?.[0] ??
        undefined;

      // Game title from notes (e.g., "NCAA Tournament - Round of 64")
      const gameTitle: string | undefined =
        competition.notes?.[0]?.headline ?? undefined;

      if (isCompleted) {
        // ── Completed game → GameResult
        const dukeScore = Number(duke.score?.value ?? duke.score?.displayValue ?? 0);
        const oppScore = Number(
          opponent.score?.value ?? opponent.score?.displayValue ?? 0,
        );
        const result: "W" | "L" = duke.winner === true ? "W" : "L";

        const gameResult: GameResult = {
          espnEventId: eventId,
          opponent: opponentName,
          opponentLogo,
          date: formatGameDate(eventDate),
          result,
          score: { duke: dukeScore, opponent: oppScore },
          venue,
          isHome,
          broadcast,
          gameTitle,
        };
        results.push(gameResult);

        // Build LastGameResult with top performer from Duke's leaders
        const topPerformer = extractTopPerformer(duke);
        const lastGameCandidate: LastGameResult = {
          opponent: opponentName,
          opponentLogo,
          date: formatGameDate(eventDate),
          result,
          score: { duke: dukeScore, opponent: oppScore },
          venue,
          topPerformer,
        };

        // Keep the most recent completed game as lastGame
        if (
          !lastGame ||
          new Date(eventDate).getTime() >
            new Date(lastGame.date).getTime()
        ) {
          lastGame = lastGameCandidate;
        }
      } else {
        // ── Upcoming game
        const upcomingGame: UpcomingGame = {
          opponent: opponentName,
          opponentLogo,
          date: eventDate,
          time: formatGameTime(eventDate),
          venue,
          isHome,
          broadcast,
          gameTitle,
          espnEventId: eventId,
        };
        upcoming.push(upcomingGame);
      }
    }

    // Sort upcoming by date ascending (soonest first)
    upcoming.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    // Sort results by date descending (most recent first)
    results.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    const nextGame = upcoming[0] ?? null;

    return { upcoming, results, nextGame, lastGame, record };
  } catch (error) {
    console.warn(
      `[ESPN API] Failed to fetch schedule for ${sport}:`,
      error instanceof Error ? error.message : error,
    );
    return empty;
  }
}

/**
 * Extract the top performer from a Duke competitor's leaders array.
 * Falls back to zeroed stats if data is missing.
 */
function extractTopPerformer(dukeCompetitor: any): {
  name: string;
  points: number;
  rebounds: number;
  assists: number;
} {
  const fallback = { name: "Unknown", points: 0, rebounds: 0, assists: 0 };

  try {
    const leaders: any[] = dukeCompetitor?.leaders ?? [];

    // Points leader
    const pointsCategory = leaders.find(
      (l: any) => l?.name === "points" || l?.abbreviation === "PTS",
    );
    const pointsLeader = pointsCategory?.leaders?.[0];
    const name: string =
      pointsLeader?.athlete?.displayName ?? "Unknown";
    const points = Number(pointsLeader?.displayValue ?? 0);

    // Rebounds leader
    const reboundsCategory = leaders.find(
      (l: any) => l?.name === "rebounds" || l?.abbreviation === "REB",
    );
    const reboundsLeader = reboundsCategory?.leaders?.[0];
    const rebounds = Number(reboundsLeader?.displayValue ?? 0);

    // Assists leader
    const assistsCategory = leaders.find(
      (l: any) => l?.name === "assists" || l?.abbreviation === "AST",
    );
    const assistsLeader = assistsCategory?.leaders?.[0];
    const assists = Number(assistsLeader?.displayValue ?? 0);

    return { name, points, rebounds, assists };
  } catch {
    return fallback;
  }
}

// ─── Roster Fetching ─────────────────────────────────────────────────

/**
 * Fetch the Duke roster from ESPN and return an array of Player objects.
 * Also returns coach data extracted from the roster response.
 */
export async function fetchESPNRoster(
  sport: ESPNSport,
): Promise<Player[]> {
  try {
    const path = SPORT_PATHS[sport];
    const url = `${ESPN_BASE}/${path}/teams/${DUKE_TEAM_ID}/roster`;
    const data = await fetchJSON(url);
    if (!data) return [];

    const athletes: any[] = (data as any)?.athletes ?? [];
    const players: Player[] = [];

    for (const athlete of athletes) {
      // Some roster responses group athletes by position category
      // Handle both flat arrays and grouped { items: [] } shapes
      if (Array.isArray(athlete?.items)) {
        for (const item of athlete.items) {
          const player = mapAthlete(item);
          if (player) players.push(player);
        }
      } else {
        const player = mapAthlete(athlete);
        if (player) players.push(player);
      }
    }

    return players;
  } catch (error) {
    console.warn(
      `[ESPN API] Failed to fetch roster for ${sport}:`,
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}

/**
 * Extract coach data from an ESPN roster response.
 */
async function fetchESPNCoaches(sport: ESPNSport): Promise<Coach[]> {
  try {
    const path = SPORT_PATHS[sport];
    const url = `${ESPN_BASE}/${path}/teams/${DUKE_TEAM_ID}/roster`;
    const data = await fetchJSON(url);
    if (!data) return [];

    const coachList: any[] = (data as any)?.coach ?? [];
    return coachList.map((c: any) => ({
      name: [c?.firstName, c?.lastName].filter(Boolean).join(" ") || "Unknown",
      title: "Head Coach",
      imageUrl: c?.headshot?.href,
      since: "",
    }));
  } catch (error) {
    console.warn(
      `[ESPN API] Failed to fetch coaches for ${sport}:`,
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}

/**
 * Map a single ESPN athlete object to a Player.
 */
function mapAthlete(athlete: any): Player | null {
  if (!athlete) return null;
  const name: string = athlete.displayName ?? athlete.fullName ?? "";
  if (!name) return null;

  return {
    name,
    number: athlete.jersey ?? "",
    position:
      athlete.position?.abbreviation ??
      athlete.position?.name ??
      "",
    year:
      athlete.experience?.displayValue ??
      athlete.experience?.abbreviation ??
      "",
    imageUrl: athlete.headshot?.href,
  };
}

// ─── Master Fetch ────────────────────────────────────────────────────

/**
 * Fetch all Duke team data from ESPN in parallel (schedule + roster + coaches).
 * Returns a partial team data object suitable for merging with static team data.
 */
export async function fetchESPNTeamData(
  sport: ESPNSport,
): Promise<ESPNTeamData> {
  const [schedule, players, coaches] = await Promise.all([
    fetchESPNSchedule(sport),
    fetchESPNRoster(sport),
    fetchESPNCoaches(sport),
  ]);

  return {
    upcoming: schedule.upcoming,
    results: schedule.results,
    nextGame: schedule.nextGame,
    lastGame: schedule.lastGame,
    record: schedule.record,
    players,
    coaches,
  };
}
