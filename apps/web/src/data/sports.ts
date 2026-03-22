/**
 * Duke Sports Data — WCCG 104.5 FM Sports Coverage
 * Duke University Athletics profiles featured on WCCG
 */

export interface Coach {
  name: string;
  title: string;
  imageUrl?: string;
  since: string;
}

export interface Player {
  name: string;
  number: string;
  position: string;
  year: string;
  imageUrl?: string;
}

export interface TeamStats {
  label: string;
  value: string;
}

export interface UpcomingGame {
  opponent: string;
  opponentLogo?: string;
  date: string; // ISO date string
  time: string; // e.g. "7:00 PM ET"
  venue: string;
  isHome: boolean;
  broadcast?: string;
  /** e.g. "ACC Championship", "NCAA Tournament Round of 64", "Final Four" */
  gameTitle?: string;
  /** Conference logo URL for tournament games */
  tournamentLogo?: string;
  /** ESPN event ID for linking to ESPN game pages */
  espnEventId?: string;
}

export interface GameResult {
  espnEventId: string;
  opponent: string;
  opponentLogo: string;
  date: string;
  result: "W" | "L";
  score: { duke: number; opponent: number };
  venue: string;
  isHome: boolean;
  broadcast?: string;
  gameTitle?: string;
}

export interface LastGameResult {
  opponent: string;
  opponentLogo: string;
  date: string;
  result: "W" | "L";
  score: { duke: number; opponent: number };
  venue: string;
  topPerformer: { name: string; points: number; rebounds: number; assists: number };
}

export interface Commentator {
  name: string;
  role: string;
  bio: string;
  imageUrl?: string;
}

export interface SportsTeam {
  id: string;
  slug: string;
  sport: string;
  name: string;
  fullName: string;
  nickname: string;
  conference: string;
  venue: string;
  location: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  heroImageUrl: string;
  description: string;
  broadcastDescription?: string;
  youtube: {
    channelName: string;
    channelUrl: string;
    channelId?: string;
    searchQuery: string;
  };
  website: string;
  newsUrl: string;
  coaches: Coach[];
  players: Player[];
  stats: TeamStats[];
  commentators?: Commentator[];
  gradient: string;
  nextGame?: UpcomingGame;
  schedule?: UpcomingGame[];
  lastGame?: LastGameResult;
  isLive?: boolean;
  /** ESPN fields — populated at build time from ESPN API */
  espnTeamId?: string;
  espnSport?: "mens-college-basketball" | "college-football";
  seasonRecord?: string;
  gameResults?: GameResult[];
}

/**
 * Check if a team is currently live based on their nextGame schedule.
 * A game is considered "live" from 15 minutes before start until 3 hours after start.
 */
export function isTeamLive(team: SportsTeam): boolean {
  if (team.isLive) return true; // manual override
  const game = team.nextGame;
  if (!game?.date) return false;
  const now = Date.now();
  const gameStart = new Date(game.date).getTime();
  const PRE_GAME = 15 * 60 * 1000; // 15 minutes before
  const GAME_DURATION = 3 * 60 * 60 * 1000; // 3 hours
  return now >= gameStart - PRE_GAME && now <= gameStart + GAME_DURATION;
}

/**
 * Merge ESPN-fetched data into a base team template.
 * ESPN data overlays the base; if ESPN data is null/empty, base data is preserved.
 */
export function mergeTeamWithESPN(
  base: SportsTeam,
  espnData: {
    upcoming?: UpcomingGame[];
    results?: GameResult[];
    nextGame?: UpcomingGame | null;
    lastGame?: LastGameResult | null;
    record?: string | null;
    players?: Player[];
    coaches?: Coach[];
  } | null,
): SportsTeam {
  if (!espnData) return base;
  return {
    ...base,
    players: espnData.players?.length ? espnData.players : base.players,
    coaches: espnData.coaches?.length ? espnData.coaches : base.coaches,
    nextGame: espnData.nextGame ?? base.nextGame,
    schedule: espnData.upcoming?.length ? espnData.upcoming : base.schedule,
    lastGame: espnData.lastGame ?? base.lastGame,
    seasonRecord: espnData.record ?? base.seasonRecord,
    gameResults: espnData.results?.length ? espnData.results : base.gameResults,
  };
}

// ─── Duke Men's Basketball ──────────────────────────────────────────

export const DUKE_BASKETBALL: SportsTeam = {
  id: "duke_basketball",
  slug: "duke-basketball",
  sport: "Men's Basketball",
  name: "Duke Blue Devils",
  fullName: "Duke University Men's Basketball",
  nickname: "Blue Devils",
  conference: "ACC (Atlantic Coast Conference)",
  venue: "Cameron Indoor Stadium",
  location: "Durham, NC",
  primaryColor: "#003087",
  secondaryColor: "#FFFFFF",
  logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/150.png",
  espnTeamId: "150",
  espnSport: "mens-college-basketball",
  heroImageUrl: "https://wccg1045fm.com/wp-content/uploads/2025/09/duke-basket-ball.png",
  description: "Duke Men's Basketball is one of the most storied programs in college basketball history. Under legendary coach Mike Krzyzewski and now Jon Scheyer, the Blue Devils have won 5 national championships, made 17 Final Four appearances, and produced countless NBA players. WCCG 104.5 FM brings you complete coverage of Duke basketball throughout the season.",
  broadcastDescription: "Listen to Duke Basketball and experience the unmatched intensity, precision, and tradition that define one of the nation's most iconic programs. Since 1905, Duke basketball has been a cornerstone of college hoops, producing legends like Christian Laettner, Grant Hill, Kyrie Irving, Zion Williamson, and Paolo Banchero. Under Coach K's legendary tenure (1980–2022), the Blue Devils won five NCAA championships (1991, 1992, 2001, 2010, 2015) and now continue to dominate under head coach Jon Scheyer. WCCG 104.5 FM is your home for Duke Basketball — tune in for live play-by-play coverage, pre-game shows, postgame analysis, and exclusive interviews throughout the season. For broadcast inquiries, contact programming@wccg1045fm.com.",
  youtube: {
    channelName: "Duke Basketball",
    channelUrl: "https://www.youtube.com/@DukeMBB",
    channelId: "UC9KCzNMmf0IRcEIsFDgt2bg",
    searchQuery: "Duke Blue Devils Basketball highlights",
  },
  website: "https://goduke.com/sports/mens-basketball",
  newsUrl: "https://www.espn.com/mens-college-basketball/team/_/id/150/duke-blue-devils",
  commentators: [
    {
      name: "David Shumate",
      role: "Play-by-Play Announcer",
      bio: "David Shumate is the voice of Duke Blue Devils Basketball on WCCG 104.5 FM. With decades of broadcasting experience, Shumate delivers every dribble, dunk, and dramatic moment with unmatched energy and insight.",
    },
    {
      name: "Dave Harding",
      role: "Basketball Analyst",
      bio: "Dave Harding brings expert analysis and deep basketball knowledge to every broadcast. A keen strategist with years of experience covering ACC basketball, Harding breaks down plays and provides color commentary that enriches the listening experience.",
    },
    {
      name: "John Roth",
      role: "Sideline Reporter",
      bio: "John Roth reports from the sidelines and press row, delivering real-time injury updates, coaching insights, and in-game interviews. His courtside access gives listeners the inside story as it unfolds.",
    },
  ],
  coaches: [
    {
      name: "Jon Scheyer",
      title: "Head Coach",
      since: "2022",
      imageUrl: "https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/4278073.png",
    },
    {
      name: "Chris Carrawell",
      title: "Associate Head Coach",
      since: "2022",
      imageUrl: "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4278074.png",
    },
    {
      name: "Nolan Smith",
      title: "Assistant Coach",
      since: "2021",
      imageUrl: "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4278075.png",
    },
    {
      name: "Amile Jefferson",
      title: "Assistant Coach",
      since: "2023",
      imageUrl: "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4278076.png",
    },
  ],
  players: [
    { name: "Caleb Foster", number: "1", position: "Guard", year: "Sophomore", imageUrl: "https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/4711256.png" },
    { name: "Cayden Boozer", number: "2", position: "Guard", year: "Freshman", imageUrl: "https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/5041937.png" },
    { name: "Isaiah Evans", number: "3", position: "Guard", year: "Freshman", imageUrl: "https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/5061585.png" },
    { name: "Sebastian Wilkins", number: "5", position: "Guard", year: "Freshman", imageUrl: "https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/5144150.png" },
    { name: "Maliq Brown", number: "6", position: "Forward", year: "Junior", imageUrl: "https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/5105337.png" },
    { name: "Dame Sarr", number: "7", position: "Guard", year: "Sophomore", imageUrl: "https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/5287474.png" },
    { name: "Darren Harris", number: "8", position: "Guard", year: "Sophomore", imageUrl: "https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/4873107.png" },
    { name: "Cameron Boozer", number: "12", position: "Forward", year: "Freshman", imageUrl: "https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/5041935.png" },
    { name: "Cameron Sheffield", number: "13", position: "Guard", year: "Senior", imageUrl: "https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/4432321.png" },
    { name: "Nikolas Khamenia", number: "14", position: "Guard", year: "Sophomore", imageUrl: "https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/5144124.png" },
    { name: "Ifeanyi Ufochukwu", number: "15", position: "Center", year: "Freshman", imageUrl: "https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/5107141.png" },
    { name: "Patrick Ngongba II", number: "21", position: "Center", year: "Sophomore", imageUrl: "https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/4873209.png" },
  ],
  stats: [
    { label: "National Championships", value: "5" },
    { label: "Final Four Appearances", value: "17" },
    { label: "ACC Tournament Titles", value: "16" },
    { label: "2025-26 Record", value: "33-2" },
    { label: "NCAA Tournament Appearances", value: "48" },
    { label: "All-Time Wins", value: "2,300+" },
    { label: "NBA Draft Picks", value: "70+" },
  ],
  gradient: "from-[#003087] via-[#001a4d] to-[#0a0a0f]",
  nextGame: {
    opponent: "TCU Horned Frogs",
    opponentLogo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2628.png",
    date: "2026-03-21T17:15:00-04:00",
    time: "5:15 PM ET",
    venue: "Bon Secours Wellness Arena, Greenville, SC",
    isHome: false,
    broadcast: "CBS / WCCG 104.5 FM",
    gameTitle: "NCAA Tournament — Round of 32",
  },
  schedule: [
    {
      opponent: "Virginia Cavaliers",
      opponentLogo: "https://a.espncdn.com/i/teamlogos/ncaa/500/258.png",
      date: "2026-03-14T20:30:00-04:00",
      time: "8:30 PM ET",
      venue: "Spectrum Center, Charlotte, NC",
      isHome: false,
      broadcast: "ESPN / WCCG 104.5 FM",
      gameTitle: "2026 ACC Championship",
    },
    {
      opponent: "Siena Saints",
      opponentLogo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2561.png",
      date: "2026-03-19T14:50:00-04:00",
      time: "2:50 PM ET",
      venue: "Bon Secours Wellness Arena, Greenville, SC",
      isHome: false,
      broadcast: "CBS / WCCG 104.5 FM",
      gameTitle: "NCAA Tournament — Round of 64",
    },
    {
      opponent: "TCU Horned Frogs",
      opponentLogo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2628.png",
      date: "2026-03-21T17:15:00-04:00",
      time: "5:15 PM ET",
      venue: "Bon Secours Wellness Arena, Greenville, SC",
      isHome: false,
      broadcast: "CBS / WCCG 104.5 FM",
      gameTitle: "NCAA Tournament — Round of 32",
    },
  ],
  lastGame: {
    opponent: "Siena Saints",
    opponentLogo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2561.png",
    date: "2026-03-19T14:50:00-04:00",
    result: "W",
    score: { duke: 71, opponent: 65 },
    venue: "Bon Secours Wellness Arena, Greenville, SC",
    topPerformer: { name: "Cameron Boozer", points: 22, rebounds: 13, assists: 3 },
  },
};

// ─── Duke Football ──────────────────────────────────────────────────

export const DUKE_FOOTBALL: SportsTeam = {
  id: "duke_football",
  slug: "duke-football",
  sport: "Football",
  name: "Duke Blue Devils",
  fullName: "Duke University Football",
  nickname: "Blue Devils",
  conference: "ACC (Atlantic Coast Conference)",
  venue: "Wallace Wade Stadium",
  location: "Durham, NC",
  primaryColor: "#003087",
  secondaryColor: "#FFFFFF",
  logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/150.png",
  espnTeamId: "150",
  espnSport: "college-football",
  heroImageUrl: "https://wccg1045fm.com/wp-content/uploads/2025/09/DUKE-FB-1.png",
  description: "Duke Blue Devils Football competes in the Atlantic Coast Conference and plays home games at the historic Wallace Wade Stadium in Durham, NC. Under head coach Manny Diaz, the program continues to build on its recent success. WCCG 104.5 FM brings you full coverage of Duke Football including game highlights, player interviews, and analysis.",
  broadcastDescription: "Duke Football has a proud tradition dating back to 1895, competing in the Atlantic Coast Conference. The Blue Devils play home games at the iconic Wallace Wade Stadium in Durham, NC — a venue that hosted the 1942 Rose Bowl. Under head coach Manny Diaz, Duke Football continues to build momentum. WCCG 104.5 FM is your home for Duke Football — tune in for live game broadcasts, pre-game tailgate shows, halftime analysis, and postgame wrap-ups. For broadcast inquiries, contact programming@wccg1045fm.com.",
  youtube: {
    channelName: "Duke Football",
    channelUrl: "https://www.youtube.com/@Duke_Football",
    channelId: "UC-v9UWlnqtYeCQtPDO1lGVQ",
    searchQuery: "Duke Blue Devils Football highlights",
  },
  website: "https://goduke.com/sports/football",
  newsUrl: "https://www.espn.com/college-football/team/_/id/150/duke-blue-devils",
  commentators: [
    {
      name: "David Shumate",
      role: "Play-by-Play Announcer",
      bio: "David Shumate calls Duke Blue Devils Football on WCCG 104.5 FM with the same passion and precision he brings to basketball broadcasts. Every snap, every scoring drive, every defensive stand — Shumate puts you in the stadium.",
    },
    {
      name: "Dave Harding",
      role: "Football Analyst",
      bio: "Dave Harding provides expert football analysis and color commentary, breaking down formations, play calls, and game strategy for Duke Football fans on WCCG 104.5 FM.",
    },
  ],
  coaches: [
    {
      name: "Manny Diaz",
      title: "Head Coach",
      since: "2024",
    },
    {
      name: "Scottie Montgomery",
      title: "Offensive Coordinator",
      since: "2024",
    },
    {
      name: "Matt Guerrieri",
      title: "Defensive Coordinator",
      since: "2024",
    },
  ],
  players: [
    { name: "Maalik Murphy", number: "9", position: "Quarterback", year: "Junior" },
    { name: "Star Thomas", number: "1", position: "Running Back", year: "Senior" },
    { name: "Jordan Moore", number: "8", position: "Wide Receiver", year: "Junior" },
    { name: "Terry Moore", number: "7", position: "Wide Receiver", year: "Junior" },
    { name: "DeWayne Carter", number: "90", position: "Defensive Tackle", year: "Senior" },
    { name: "Cedric Boswell", number: "6", position: "Cornerback", year: "Junior" },
  ],
  stats: [
    { label: "Conference", value: "ACC" },
    { label: "Home Stadium", value: "Wallace Wade Stadium" },
    { label: "Stadium Capacity", value: "40,004" },
    { label: "Bowl Game Appearances", value: "10" },
    { label: "ACC Championships", value: "7" },
    { label: "NFL Draft Picks", value: "100+" },
  ],
  gradient: "from-[#003087] via-[#001a4d] to-[#0a0a0f]",
  nextGame: {
    opponent: "NC State Wolfpack",
    opponentLogo: "https://a.espncdn.com/i/teamlogos/ncaa/500/152.png",
    date: "2026-09-05T15:30:00-04:00",
    time: "3:30 PM ET",
    venue: "Wallace Wade Stadium",
    isHome: true,
    broadcast: "ACC Network / WCCG 104.5 FM",
  },
  schedule: [
    {
      opponent: "NC State Wolfpack",
      opponentLogo: "https://a.espncdn.com/i/teamlogos/ncaa/500/152.png",
      date: "2026-09-05T15:30:00-04:00",
      time: "3:30 PM ET",
      venue: "Wallace Wade Stadium",
      isHome: true,
      broadcast: "ACC Network / WCCG 104.5 FM",
    },
    {
      opponent: "Clemson Tigers",
      opponentLogo: "https://a.espncdn.com/i/teamlogos/ncaa/500/228.png",
      date: "2026-09-12T19:00:00-04:00",
      time: "7:00 PM ET",
      venue: "Memorial Stadium",
      isHome: false,
      broadcast: "ESPN / WCCG 104.5 FM",
    },
    {
      opponent: "Virginia Tech Hokies",
      opponentLogo: "https://a.espncdn.com/i/teamlogos/ncaa/500/259.png",
      date: "2026-09-19T12:00:00-04:00",
      time: "12:00 PM ET",
      venue: "Wallace Wade Stadium",
      isHome: true,
      broadcast: "ACC Network / WCCG 104.5 FM",
    },
    {
      opponent: "North Carolina Tar Heels",
      opponentLogo: "https://a.espncdn.com/i/teamlogos/ncaa/500/153.png",
      date: "2026-10-03T15:30:00-04:00",
      time: "3:30 PM ET",
      venue: "Kenan Memorial Stadium",
      isHome: false,
      broadcast: "ABC / WCCG 104.5 FM",
    },
  ],
};

// ─── Live Play-by-Play Feed (simulated) ─────────────────────────────
export interface PlayByPlayEntry {
  id: number;
  clock: string;
  half: string;
  team: "duke" | "opponent";
  text: string;
  score: { duke: number; opponent: number };
}

export const DUKE_PLAY_BY_PLAY: PlayByPlayEntry[] = [
  { id: 1, clock: "19:32", half: "1st", team: "duke", text: "Cameron Boozer drives baseline for the layup — DUKE SCORES!", score: { duke: 2, opponent: 0 } },
  { id: 2, clock: "19:05", half: "1st", team: "opponent", text: "Thijs De Ridder answers with a pull-up jumper from the elbow", score: { duke: 2, opponent: 2 } },
  { id: 3, clock: "18:22", half: "1st", team: "duke", text: "Isaiah Evans drills the three-pointer from the wing!", score: { duke: 5, opponent: 2 } },
  { id: 4, clock: "17:41", half: "1st", team: "duke", text: "Ifeanyi Ufochukwu with the put-back dunk off the offensive rebound!", score: { duke: 7, opponent: 2 } },
  { id: 5, clock: "16:55", half: "1st", team: "opponent", text: "De Ridder finds the open lane inside for the easy bucket", score: { duke: 7, opponent: 4 } },
  { id: 6, clock: "15:30", half: "1st", team: "duke", text: "Dame Sarr crosses over and hits the floater in the lane", score: { duke: 9, opponent: 4 } },
  { id: 7, clock: "14:48", half: "1st", team: "opponent", text: "Virginia nails a contested three from the corner", score: { duke: 9, opponent: 7 } },
  { id: 8, clock: "13:15", half: "1st", team: "duke", text: "Boozer with the steal and coast-to-coast finish! Spectrum Center erupts!", score: { duke: 11, opponent: 7 } },
  { id: 9, clock: "12:02", half: "1st", team: "duke", text: "Maliq Brown knocks down the mid-range jumper from the free throw line", score: { duke: 13, opponent: 7 } },
  { id: 10, clock: "11:30", half: "1st", team: "opponent", text: "Virginia hits the pull-up three — Cavaliers cutting into the lead", score: { duke: 13, opponent: 10 } },
  { id: 11, clock: "10:45", half: "1st", team: "duke", text: "Evans finds Ufochukwu on the alley-oop! MONSTER JAM!", score: { duke: 15, opponent: 10 } },
  { id: 12, clock: "9:18", half: "1st", team: "opponent", text: "De Ridder with the and-one inside — draws contact and converts", score: { duke: 15, opponent: 13 } },
  { id: 13, clock: "8:05", half: "1st", team: "duke", text: "Caleb Foster drains it from deep! Duke on a 6-0 run!", score: { duke: 18, opponent: 13 } },
  { id: 14, clock: "7:22", half: "1st", team: "duke", text: "Boozer blocks the shot and pushes it in transition — scores!", score: { duke: 20, opponent: 13 } },
  { id: 15, clock: "6:01", half: "1st", team: "opponent", text: "Virginia works the shot clock and finds the open three — SPLASH", score: { duke: 20, opponent: 16 } },
  { id: 16, clock: "4:44", half: "1st", team: "duke", text: "Darren Harris with the hustle offensive rebound and put-back", score: { duke: 22, opponent: 16 } },
  { id: 17, clock: "3:30", half: "1st", team: "opponent", text: "De Ridder hits the step-back midrange over Sarr", score: { duke: 22, opponent: 18 } },
  { id: 18, clock: "2:15", half: "1st", team: "duke", text: "Boozer with the fadeaway over two defenders — NOTHING BUT NET!", score: { duke: 24, opponent: 18 } },
  { id: 19, clock: "1:02", half: "1st", team: "duke", text: "Evans beats the shot clock with a deep three! What a shot!", score: { duke: 27, opponent: 18 } },
  { id: 20, clock: "0:05", half: "1st", team: "opponent", text: "Buzzer beater attempt by Virginia — NO GOOD! Duke leads at the half", score: { duke: 27, opponent: 18 } },
  { id: 21, clock: "19:40", half: "2nd", team: "duke", text: "Boozer opens the second half with a thunderous dunk in transition!", score: { duke: 29, opponent: 18 } },
  { id: 22, clock: "18:55", half: "2nd", team: "opponent", text: "De Ridder answers immediately with a three — Virginia not going away", score: { duke: 29, opponent: 21 } },
  { id: 23, clock: "17:30", half: "2nd", team: "duke", text: "Sarr dishes to Ufochukwu for the easy slam — perfect pass!", score: { duke: 31, opponent: 21 } },
  { id: 24, clock: "16:15", half: "2nd", team: "duke", text: "Foster with the steal and breakaway layup — crowd is ROCKING!", score: { duke: 33, opponent: 21 } },
  { id: 25, clock: "15:00", half: "2nd", team: "opponent", text: "Virginia with a put-back dunk — Cavaliers fighting back", score: { duke: 33, opponent: 23 } },
  { id: 26, clock: "13:45", half: "2nd", team: "duke", text: "Boozer triple from the top of the key! He's got 22 points now!", score: { duke: 36, opponent: 23 } },
  { id: 27, clock: "12:30", half: "2nd", team: "opponent", text: "De Ridder drives coast to coast for the layup — gutsy play", score: { duke: 36, opponent: 25 } },
  { id: 28, clock: "11:00", half: "2nd", team: "duke", text: "Evans crosses over and pulls up — BANG! Duke by 13!", score: { duke: 38, opponent: 25 } },
  { id: 29, clock: "9:15", half: "2nd", team: "opponent", text: "Virginia hits another three — Cavaliers on an 8-2 run", score: { duke: 38, opponent: 28 } },
  { id: 30, clock: "7:45", half: "2nd", team: "duke", text: "Cayden Boozer hits the pull-up jumper! Duke leads 40-28.", score: { duke: 40, opponent: 28 } },
];


// ─── ESPN API Config ────────────────────────────────────────────────
export const ESPN_GAME_ID = "401851183";
export const ESPN_SCOREBOARD_URL = `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event=${ESPN_GAME_ID}`;

export const ALL_SPORTS_TEAMS: SportsTeam[] = [
  DUKE_BASKETBALL,
  DUKE_FOOTBALL,
];

export function getTeamBySlug(slug: string): SportsTeam | undefined {
  return ALL_SPORTS_TEAMS.find((t) => t.slug === slug);
}

// ─── Post-Game Show Commentary ─────────────────────────────────────
export interface PostGameEntry {
  id: number;
  speaker: string;
  text: string;
  /** Name of person being discussed — matches player or coach name for spotlight */
  mentionedPerson?: string;
}

export const DUKE_POST_GAME_COMMENTARY: PostGameEntry[] = [
  { id: 1, speaker: "Host", text: "What a performance from this Duke squad tonight! The Blue Devils dominated from start to finish.", mentionedPerson: undefined },
  { id: 2, speaker: "Analyst", text: "Cameron Boozer was absolutely phenomenal — 22 points, 10 boards, and 3 blocks. He controlled the paint all night long.", mentionedPerson: "Cameron Boozer" },
  { id: 3, speaker: "Host", text: "Coach Scheyer, your team looked locked in from the opening tip. Walk us through the game plan tonight.", mentionedPerson: "Jon Scheyer" },
  { id: 4, speaker: "Jon Scheyer", text: "Our guys were ready. We talked about energy and effort all week, and they delivered. I'm proud of how connected we were defensively.", mentionedPerson: "Jon Scheyer" },
  { id: 5, speaker: "Analyst", text: "Isaiah Evans caught fire in the second half — that 15-point stretch was the dagger. Three straight threes and then the and-one.", mentionedPerson: "Isaiah Evans" },
  { id: 6, speaker: "Host", text: "Dame Sarr with another impressive floor game — 8 assists, only 1 turnover. He's running this team like a veteran.", mentionedPerson: "Dame Sarr" },
  { id: 7, speaker: "Analyst", text: "Caleb Foster's defense was elite tonight. Two steals leading to fast break points that swung the momentum in the first half.", mentionedPerson: "Caleb Foster" },
  { id: 8, speaker: "Host", text: "Let's talk about Cayden Boozer's energy off the bench — 12 points in 18 minutes with that electric crossover.", mentionedPerson: "Cayden Boozer" },
  { id: 9, speaker: "Analyst", text: "Maliq Brown was a force on the boards tonight — 11 rebounds and his rim protection changed the game.", mentionedPerson: "Maliq Brown" },
  { id: 10, speaker: "Jon Scheyer", text: "Maliq brings toughness. He does things that don't always show up in the box score, but he's the heart of this team.", mentionedPerson: "Maliq Brown" },
  { id: 11, speaker: "Host", text: "Ifeanyi Ufochukwu with the huge block in the final minutes — Cameron Indoor erupted!", mentionedPerson: "Ifeanyi Ufochukwu" },
  { id: 12, speaker: "Analyst", text: "Darren Harris hit two clutch free throws down the stretch. That composure under pressure is what separates this team.", mentionedPerson: "Darren Harris" },
  { id: 13, speaker: "Host", text: "Patrick Ngongba came in and gave great minutes — his presence inside changed the opponent's offense.", mentionedPerson: "Patrick Ngongba II" },
  { id: 14, speaker: "Analyst", text: "Coach Carrawell's defensive scheme was masterful tonight. They held the opponent to 28% from three.", mentionedPerson: "Chris Carrawell" },
  { id: 15, speaker: "Host", text: "Cameron Sheffield showed veteran leadership — his communication on defense kept everyone in position.", mentionedPerson: "Cameron Sheffield" },
  { id: 16, speaker: "Analyst", text: "Nikolas Khamenia knocked down a huge three when they were making a run. That shot quieted the crowd and stopped the momentum.", mentionedPerson: "Nikolas Khamenia" },
  { id: 17, speaker: "Host", text: "Sebastian Wilkins with the hustle play of the night — that diving save led to a three-pointer on the other end.", mentionedPerson: "Sebastian Wilkins" },
  { id: 18, speaker: "Jon Scheyer", text: "This is what Duke basketball is about. Every single guy was ready when their number was called. That's a championship mindset.", mentionedPerson: "Jon Scheyer" },
  { id: 19, speaker: "Host", text: "That wraps up another Blue Devils victory! Stay tuned to WCCG 104.5 FM for more post-game coverage.", mentionedPerson: undefined },
  { id: 20, speaker: "Analyst", text: "Duke improves their record and moves closer to tournament positioning. This team is peaking at the right time.", mentionedPerson: undefined },
];
