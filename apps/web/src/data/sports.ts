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
  gradient: string;
  nextGame?: UpcomingGame;
  schedule?: UpcomingGame[];
  lastGame?: LastGameResult;
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
  heroImageUrl: "https://wccg1045fm.com/wp-content/uploads/2025/09/duke-basket-ball.png",
  description: "Duke Men's Basketball is one of the most storied programs in college basketball history. Under legendary coach Mike Krzyzewski and now Jon Scheyer, the Blue Devils have won 5 national championships, made 17 Final Four appearances, and produced countless NBA players. WCCG 104.5 FM brings you complete coverage of Duke basketball throughout the season.",
  youtube: {
    channelName: "Duke Basketball",
    channelUrl: "https://www.youtube.com/@DukeMBB",
    channelId: "UC9KCzNMmf0IRcEIsFDgt2bg",
    searchQuery: "Duke Blue Devils Basketball highlights",
  },
  website: "https://goduke.com/sports/mens-basketball",
  newsUrl: "https://www.espn.com/mens-college-basketball/team/_/id/150/duke-blue-devils",
  coaches: [
    {
      name: "Jon Scheyer",
      title: "Head Coach",
      since: "2022",
    },
    {
      name: "Chris Carrawell",
      title: "Associate Head Coach",
      since: "2022",
    },
    {
      name: "Nolan Smith",
      title: "Assistant Coach",
      since: "2021",
    },
    {
      name: "Amile Jefferson",
      title: "Assistant Coach",
      since: "2023",
    },
  ],
  players: [
    { name: "Cooper Flagg", number: "2", position: "Forward", year: "Freshman" },
    { name: "Kon Knueppel", number: "5", position: "Guard", year: "Freshman" },
    { name: "Tyrese Proctor", number: "5", position: "Guard", year: "Junior" },
    { name: "Khaman Maluach", number: "15", position: "Center", year: "Freshman" },
    { name: "Mason Gillis", number: "0", position: "Forward", year: "Graduate" },
    { name: "Caleb Foster", number: "1", position: "Guard", year: "Sophomore" },
    { name: "Sion James", number: "11", position: "Guard", year: "Freshman" },
    { name: "Patrick Ngongba II", number: "21", position: "Forward", year: "Freshman" },
  ],
  stats: [
    { label: "National Championships", value: "5" },
    { label: "Final Four Appearances", value: "17" },
    { label: "ACC Tournament Titles", value: "16" },
    { label: "NCAA Tournament Appearances", value: "44" },
    { label: "All-Time Wins", value: "2,300+" },
    { label: "NBA Draft Picks", value: "70+" },
  ],
  gradient: "from-[#003087] via-[#001a4d] to-[#0a0a0f]",
  nextGame: {
    opponent: "North Carolina Tar Heels",
    opponentLogo: "https://a.espncdn.com/i/teamlogos/ncaa/500/153.png",
    date: "2026-03-14T19:30:00-04:00",
    time: "7:30 PM ET",
    venue: "Cameron Indoor Stadium",
    isHome: true,
    broadcast: "ESPN / WCCG 104.5 FM",
  },
  schedule: [
    {
      opponent: "North Carolina Tar Heels",
      opponentLogo: "https://a.espncdn.com/i/teamlogos/ncaa/500/153.png",
      date: "2026-03-14T19:30:00-04:00",
      time: "7:30 PM ET",
      venue: "Cameron Indoor Stadium",
      isHome: true,
      broadcast: "ESPN / WCCG 104.5 FM",
    },
    {
      opponent: "Wake Forest Demon Deacons",
      opponentLogo: "https://a.espncdn.com/i/teamlogos/ncaa/500/154.png",
      date: "2026-03-18T20:00:00-04:00",
      time: "8:00 PM ET",
      venue: "Lawrence Joel Veterans Memorial Coliseum",
      isHome: false,
      broadcast: "ACC Network / WCCG 104.5 FM",
    },
    {
      opponent: "Virginia Cavaliers",
      opponentLogo: "https://a.espncdn.com/i/teamlogos/ncaa/500/258.png",
      date: "2026-03-22T14:00:00-04:00",
      time: "2:00 PM ET",
      venue: "Cameron Indoor Stadium",
      isHome: true,
      broadcast: "CBS / WCCG 104.5 FM",
    },
  ],
  lastGame: {
    opponent: "Syracuse Orange",
    opponentLogo: "https://a.espncdn.com/i/teamlogos/ncaa/500/183.png",
    date: "2026-03-11T19:00:00-04:00",
    result: "W",
    score: { duke: 82, opponent: 68 },
    venue: "JMA Wireless Dome",
    topPerformer: { name: "Cooper Flagg", points: 24, rebounds: 8, assists: 5 },
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
  heroImageUrl: "https://wccg1045fm.com/wp-content/uploads/2025/09/DUKE-FB-1.png",
  description: "Duke Blue Devils Football competes in the Atlantic Coast Conference and plays home games at the historic Wallace Wade Stadium in Durham, NC. Under head coach Manny Diaz, the program continues to build on its recent success. WCCG 104.5 FM brings you full coverage of Duke Football including game highlights, player interviews, and analysis.",
  youtube: {
    channelName: "Duke Football",
    channelUrl: "https://www.youtube.com/@Duke_Football",
    channelId: "UC-v9UWlnqtYeCQtPDO1lGVQ",
    searchQuery: "Duke Blue Devils Football highlights",
  },
  website: "https://goduke.com/sports/football",
  newsUrl: "https://www.espn.com/college-football/team/_/id/150/duke-blue-devils",
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
  { id: 1, clock: "19:32", half: "1st", team: "duke", text: "Cooper Flagg drives baseline for the layup — DUKE SCORES!", score: { duke: 2, opponent: 0 } },
  { id: 2, clock: "19:05", half: "1st", team: "opponent", text: "RJ Davis answers with a pull-up jumper from the elbow", score: { duke: 2, opponent: 2 } },
  { id: 3, clock: "18:22", half: "1st", team: "duke", text: "Kon Knueppel drills the three-pointer from the wing!", score: { duke: 5, opponent: 2 } },
  { id: 4, clock: "17:41", half: "1st", team: "duke", text: "Khaman Maluach with the put-back dunk off the offensive rebound!", score: { duke: 7, opponent: 2 } },
  { id: 5, clock: "16:55", half: "1st", team: "opponent", text: "Elliot Cadeau finds Jae'Lyn Withers inside for the easy bucket", score: { duke: 7, opponent: 4 } },
  { id: 6, clock: "15:30", half: "1st", team: "duke", text: "Tyrese Proctor crosses over and hits the floater in the lane", score: { duke: 9, opponent: 4 } },
  { id: 7, clock: "14:48", half: "1st", team: "opponent", text: "Seth Trimble nails a contested three from the corner", score: { duke: 9, opponent: 7 } },
  { id: 8, clock: "13:15", half: "1st", team: "duke", text: "Flagg with the steal and coast-to-coast finish! Cameron erupts!", score: { duke: 11, opponent: 7 } },
  { id: 9, clock: "12:02", half: "1st", team: "duke", text: "Mason Gillis knocks down the mid-range jumper from the free throw line", score: { duke: 13, opponent: 7 } },
  { id: 10, clock: "11:30", half: "1st", team: "opponent", text: "Davis hits the pull-up three — Tar Heels cutting into the lead", score: { duke: 13, opponent: 10 } },
  { id: 11, clock: "10:45", half: "1st", team: "duke", text: "Knueppel finds Maluach on the alley-oop! MONSTER JAM!", score: { duke: 15, opponent: 10 } },
  { id: 12, clock: "9:18", half: "1st", team: "opponent", text: "Withers with the and-one inside — draws contact and converts", score: { duke: 15, opponent: 13 } },
  { id: 13, clock: "8:05", half: "1st", team: "duke", text: "Caleb Foster drains it from deep! Duke on a 6-0 run!", score: { duke: 18, opponent: 13 } },
  { id: 14, clock: "7:22", half: "1st", team: "duke", text: "Flagg blocks the shot and pushes it in transition — scores!", score: { duke: 20, opponent: 13 } },
  { id: 15, clock: "6:01", half: "1st", team: "opponent", text: "Cadeau drives and kicks to Trimble for the open three — SPLASH", score: { duke: 20, opponent: 16 } },
  { id: 16, clock: "4:44", half: "1st", team: "duke", text: "Sion James with the hustle offensive rebound and put-back", score: { duke: 22, opponent: 16 } },
  { id: 17, clock: "3:30", half: "1st", team: "opponent", text: "Davis hits the step-back midrange over Proctor", score: { duke: 22, opponent: 18 } },
  { id: 18, clock: "2:15", half: "1st", team: "duke", text: "Flagg with the fadeaway over two defenders — NOTHING BUT NET!", score: { duke: 24, opponent: 18 } },
  { id: 19, clock: "1:02", half: "1st", team: "duke", text: "Knueppel beats the shot clock with a deep three! What a shot!", score: { duke: 27, opponent: 18 } },
  { id: 20, clock: "0:05", half: "1st", team: "opponent", text: "Buzzer beater attempt by Davis — NO GOOD! Duke leads at the half", score: { duke: 27, opponent: 18 } },
  { id: 21, clock: "19:40", half: "2nd", team: "duke", text: "Flagg opens the second half with a thunderous dunk in transition!", score: { duke: 29, opponent: 18 } },
  { id: 22, clock: "18:55", half: "2nd", team: "opponent", text: "Davis answers immediately with a three — UNC not going away", score: { duke: 29, opponent: 21 } },
  { id: 23, clock: "17:30", half: "2nd", team: "duke", text: "Proctor dishes to Maluach for the easy slam — perfect pass!", score: { duke: 31, opponent: 21 } },
  { id: 24, clock: "16:15", half: "2nd", team: "duke", text: "Foster with the steal and breakaway layup — Cameron is ROCKING!", score: { duke: 33, opponent: 21 } },
  { id: 25, clock: "15:00", half: "2nd", team: "opponent", text: "Withers with a put-back dunk — UNC fighting back", score: { duke: 33, opponent: 23 } },
  { id: 26, clock: "13:45", half: "2nd", team: "duke", text: "Flagg triple from the top of the key! He's got 18 points now!", score: { duke: 36, opponent: 23 } },
  { id: 27, clock: "12:30", half: "2nd", team: "opponent", text: "Davis drives coast to coast for the layup — gutsy play", score: { duke: 36, opponent: 25 } },
  { id: 28, clock: "11:00", half: "2nd", team: "duke", text: "Knueppel crosses over and pulls up — BANG! Duke by 13!", score: { duke: 38, opponent: 25 } },
  { id: 29, clock: "9:15", half: "2nd", team: "opponent", text: "Trimble hits another three — Tar Heels on an 8-2 run", score: { duke: 38, opponent: 28 } },
  { id: 30, clock: "7:45", half: "2nd", team: "duke", text: "TIMEOUT Duke. Scheyer settling things down. Duke leads 38-28.", score: { duke: 38, opponent: 28 } },
];

// ─── YouTube Highlight IDs (Duke Basketball) ────────────────────────
export const DUKE_HIGHLIGHT_VIDEOS = [
  { id: "dQw4w9WgXcQ", title: "Cooper Flagg Monster Dunk" },
  { id: "dQw4w9WgXcQ", title: "Knueppel Deep Three" },
  { id: "dQw4w9WgXcQ", title: "Maluach Alley-Oop Slam" },
  { id: "dQw4w9WgXcQ", title: "Flagg Steal & Score" },
  { id: "dQw4w9WgXcQ", title: "Foster Breakaway Layup" },
];

export const ALL_SPORTS_TEAMS: SportsTeam[] = [
  DUKE_BASKETBALL,
  DUKE_FOOTBALL,
];

export function getTeamBySlug(slug: string): SportsTeam | undefined {
  return ALL_SPORTS_TEAMS.find((t) => t.slug === slug);
}
