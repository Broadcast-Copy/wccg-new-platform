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
  logoUrl: "/images/sports/duke-logo.svg",
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
    opponentLogo: "/images/sports/unc-logo.svg",
    date: "2026-03-14T19:00:00",
    time: "7:00 PM ET",
    venue: "Cameron Indoor Stadium",
    isHome: true,
    broadcast: "ESPN / WCCG 104.5 FM",
  },
  schedule: [
    {
      opponent: "North Carolina Tar Heels",
      opponentLogo: "/images/sports/unc-logo.svg",
      date: "2026-03-14T19:00:00",
      time: "7:00 PM ET",
      venue: "Cameron Indoor Stadium",
      isHome: true,
      broadcast: "ESPN / WCCG 104.5 FM",
    },
    {
      opponent: "Wake Forest Demon Deacons",
      date: "2026-03-18T20:00:00",
      time: "8:00 PM ET",
      venue: "Lawrence Joel Veterans Memorial Coliseum",
      isHome: false,
      broadcast: "ACC Network / WCCG 104.5 FM",
    },
    {
      opponent: "Virginia Cavaliers",
      date: "2026-03-22T14:00:00",
      time: "2:00 PM ET",
      venue: "Cameron Indoor Stadium",
      isHome: true,
      broadcast: "CBS / WCCG 104.5 FM",
    },
  ],
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
  logoUrl: "/images/sports/duke-logo.svg",
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
    opponentLogo: "/images/sports/ncstate-logo.svg",
    date: "2026-09-05T15:30:00",
    time: "3:30 PM ET",
    venue: "Wallace Wade Stadium",
    isHome: true,
    broadcast: "ACC Network / WCCG 104.5 FM",
  },
  schedule: [
    {
      opponent: "NC State Wolfpack",
      opponentLogo: "/images/sports/ncstate-logo.svg",
      date: "2026-09-05T15:30:00",
      time: "3:30 PM ET",
      venue: "Wallace Wade Stadium",
      isHome: true,
      broadcast: "ACC Network / WCCG 104.5 FM",
    },
    {
      opponent: "Clemson Tigers",
      date: "2026-09-12T19:00:00",
      time: "7:00 PM ET",
      venue: "Memorial Stadium",
      isHome: false,
      broadcast: "ESPN / WCCG 104.5 FM",
    },
    {
      opponent: "Virginia Tech Hokies",
      date: "2026-09-19T12:00:00",
      time: "12:00 PM ET",
      venue: "Wallace Wade Stadium",
      isHome: true,
      broadcast: "ACC Network / WCCG 104.5 FM",
    },
    {
      opponent: "North Carolina Tar Heels",
      date: "2026-10-03T15:30:00",
      time: "3:30 PM ET",
      venue: "Kenan Memorial Stadium",
      isHome: false,
      broadcast: "ABC / WCCG 104.5 FM",
    },
  ],
};

export const ALL_SPORTS_TEAMS: SportsTeam[] = [
  DUKE_BASKETBALL,
  DUKE_FOOTBALL,
];

export function getTeamBySlug(slug: string): SportsTeam | undefined {
  return ALL_SPORTS_TEAMS.find((t) => t.slug === slug);
}
