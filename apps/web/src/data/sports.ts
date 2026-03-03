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
  description: string;
  youtube: {
    channelName: string;
    channelUrl: string;
    searchQuery: string;
  };
  website: string;
  coaches: Coach[];
  players: Player[];
  stats: TeamStats[];
  gradient: string;
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
  logoUrl: "/images/sports/duke-logo.png",
  description: "Duke Men's Basketball is one of the most storied programs in college basketball history. Under legendary coach Mike Krzyzewski and now Jon Scheyer, the Blue Devils have won 5 national championships, made 17 Final Four appearances, and produced countless NBA players. WCCG 104.5 FM brings you complete coverage of Duke basketball throughout the season.",
  youtube: {
    channelName: "Duke Blue Planet",
    channelUrl: "https://www.youtube.com/@DukeBluePlanet",
    searchQuery: "Duke Blue Devils Basketball highlights",
  },
  website: "https://goduke.com/sports/mens-basketball",
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
  logoUrl: "/images/sports/duke-logo.png",
  description: "Duke Blue Devils Football competes in the Atlantic Coast Conference and plays home games at the historic Wallace Wade Stadium in Durham, NC. Under head coach Manny Diaz, the program continues to build on its recent success. WCCG 104.5 FM brings you full coverage of Duke Football including game highlights, player interviews, and analysis.",
  youtube: {
    channelName: "Duke Blue Planet",
    channelUrl: "https://www.youtube.com/@DukeBluePlanet",
    searchQuery: "Duke Blue Devils Football highlights",
  },
  website: "https://goduke.com/sports/football",
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
};

export const ALL_SPORTS_TEAMS: SportsTeam[] = [
  DUKE_BASKETBALL,
  DUKE_FOOTBALL,
];

export function getTeamBySlug(slug: string): SportsTeam | undefined {
  return ALL_SPORTS_TEAMS.find((t) => t.slug === slug);
}
