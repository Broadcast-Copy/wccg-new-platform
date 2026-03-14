export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  city: string;
  pointsEarned: number;
  totalPoints: number;
  listeningHours: number;
  rankChange: number; // positive = moved up, negative = moved down, 0 = no change
  email?: string; // for matching current user
}

export const weekStartDate = "2026-03-09";

export const LEADERBOARD_DATA: LeaderboardEntry[] = [
  {
    rank: 1,
    displayName: "Tasha M.",
    city: "Fayetteville",
    pointsEarned: 487,
    totalPoints: 3240,
    listeningHours: 42,
    rankChange: 2,
  },
  {
    rank: 2,
    displayName: "Marcus J.",
    city: "Clinton",
    pointsEarned: 462,
    totalPoints: 2980,
    listeningHours: 38,
    rankChange: -1,
  },
  {
    rank: 3,
    displayName: "Aaliyah W.",
    city: "Lumberton",
    pointsEarned: 431,
    totalPoints: 2750,
    listeningHours: 35,
    rankChange: 0,
  },
  {
    rank: 4,
    displayName: "Demetrius L.",
    city: "Hope Mills",
    pointsEarned: 398,
    totalPoints: 2410,
    listeningHours: 33,
    rankChange: 1,
  },
  {
    rank: 5,
    displayName: "Keisha B.",
    city: "Spring Lake",
    pointsEarned: 372,
    totalPoints: 2190,
    listeningHours: 30,
    rankChange: -2,
  },
  {
    rank: 6,
    displayName: "Andre T.",
    city: "Sanford",
    pointsEarned: 345,
    totalPoints: 1950,
    listeningHours: 28,
    rankChange: 3,
  },
  {
    rank: 7,
    displayName: "LaShonda P.",
    city: "Fayetteville",
    pointsEarned: 310,
    totalPoints: 1820,
    listeningHours: 25,
    rankChange: 0,
  },
  {
    rank: 8,
    displayName: "Jerome C.",
    city: "Raeford",
    pointsEarned: 289,
    totalPoints: 1640,
    listeningHours: 23,
    rankChange: -1,
  },
  {
    rank: 9,
    displayName: "Crystal D.",
    city: "Dunn",
    pointsEarned: 256,
    totalPoints: 1480,
    listeningHours: 20,
    rankChange: 2,
  },
  {
    rank: 10,
    displayName: "Tyrone H.",
    city: "Fayetteville",
    pointsEarned: 234,
    totalPoints: 1320,
    listeningHours: 18,
    rankChange: -1,
  },
];
