/**
 * Mock DJ mixes data — maps host IDs to their uploaded mixes
 * Used on host profile pages and the mixes browse page
 */

export interface HostMix {
  id: string;
  title: string;
  genre: string;
  duration: number; // seconds
  playCount: number;
  coverImageUrl?: string;
  audioUrl?: string;
  createdAt: string;
  description?: string;
}

// ─── DJ SpinWiz (6 mixes) ────────────────────────────────────────

const SPINWIZ_MIXES: HostMix[] = [
  {
    id: "mix_spinwiz_001",
    title: "Friday Night Takeover Vol. 12",
    genre: "Hip Hop",
    duration: 3720,
    playCount: 14200,
    createdAt: "2026-02-21T20:00:00Z",
    description: "Live set from the Friday night slot — all new drops, no skips.",
  },
  {
    id: "mix_spinwiz_002",
    title: "R&B Slow Jams After Dark",
    genre: "R&B",
    duration: 5400,
    playCount: 8750,
    createdAt: "2026-02-07T22:00:00Z",
    description: "Smooth late-night vibes for the grown and sexy crowd.",
  },
  {
    id: "mix_spinwiz_003",
    title: "Trap House Sessions Vol. 8",
    genre: "Hip Hop",
    duration: 4200,
    playCount: 11300,
    createdAt: "2026-01-18T19:00:00Z",
    description: "Hard-hitting trap from the squad — bass on max.",
  },
  {
    id: "mix_spinwiz_004",
    title: "Old School Block Party Mix",
    genre: "Old School",
    duration: 7200,
    playCount: 6480,
    createdAt: "2025-12-28T14:00:00Z",
    description: "Two hours of classics from the 90s golden era.",
  },
  {
    id: "mix_spinwiz_005",
    title: "Club Banger Blitz",
    genre: "Club",
    duration: 3600,
    playCount: 9870,
    createdAt: "2025-12-14T23:00:00Z",
    description: "Non-stop club energy — recorded live at the function.",
  },
  {
    id: "mix_spinwiz_006",
    title: "Southern Smoke Blendz",
    genre: "Hip Hop",
    duration: 4500,
    playCount: 7320,
    createdAt: "2025-11-22T21:00:00Z",
    description: "Dirty South anthems blended with today's hardest tracks.",
  },
];

// ─── DJ Rayn (4 mixes) ──────────────────────────────────────────

const RAYN_MIXES: HostMix[] = [
  {
    id: "mix_rayn_001",
    title: "Smooth Operator Vol. 5",
    genre: "R&B",
    duration: 5100,
    playCount: 6200,
    createdAt: "2026-02-14T20:00:00Z",
    description: "Valentine's Day special — all the slow jams you need.",
  },
  {
    id: "mix_rayn_002",
    title: "Afro Fusion Fridays",
    genre: "Afrobeats",
    duration: 3900,
    playCount: 4850,
    createdAt: "2026-01-24T19:00:00Z",
    description: "Afrobeats, amapiano, and everything in between.",
  },
  {
    id: "mix_rayn_003",
    title: "Late Night Cruise Control",
    genre: "R&B",
    duration: 4800,
    playCount: 5430,
    createdAt: "2025-12-20T22:00:00Z",
    description: "Laid-back R&B for the midnight drive.",
  },
  {
    id: "mix_rayn_004",
    title: "Hip Hop Heat Check",
    genre: "Hip Hop",
    duration: 3600,
    playCount: 7100,
    createdAt: "2025-11-30T18:00:00Z",
    description: "The hottest bars of the month packed into one hour.",
  },
];

// ─── DJ TommyGee (5 mixes) ──────────────────────────────────────

const TOMMYGEE_MIXES: HostMix[] = [
  {
    id: "mix_tommygee_001",
    title: "Party Rock Anthems Vol. 3",
    genre: "Club",
    duration: 4200,
    playCount: 12400,
    createdAt: "2026-02-28T21:00:00Z",
    description: "Club bangers that had the crowd going crazy all night.",
  },
  {
    id: "mix_tommygee_002",
    title: "Throwback Thursday Jams",
    genre: "Old School",
    duration: 5400,
    playCount: 8900,
    createdAt: "2026-02-06T17:00:00Z",
    description: "Taking it back to the 2000s — Lil Wayne, T.I., Jeezy era.",
  },
  {
    id: "mix_tommygee_003",
    title: "Carolina Crown Mix",
    genre: "Hip Hop",
    duration: 3600,
    playCount: 10200,
    createdAt: "2026-01-11T20:00:00Z",
    description: "Showcasing the best hip hop talent from the Carolinas.",
  },
  {
    id: "mix_tommygee_004",
    title: "R&B Essentials Pack",
    genre: "R&B",
    duration: 6000,
    playCount: 5600,
    createdAt: "2025-12-25T15:00:00Z",
    description: "Holiday R&B vibes — classic and new together.",
  },
  {
    id: "mix_tommygee_005",
    title: "Soca Carnival Warm-Up",
    genre: "Soca",
    duration: 3000,
    playCount: 3450,
    createdAt: "2025-12-01T16:00:00Z",
    description: "Pre-carnival energy with the best soca selections.",
  },
];

// ─── DJ Chuck T (4 mixes) ───────────────────────────────────────

const CHUCK_T_MIXES: HostMix[] = [
  {
    id: "mix_chuck_t_001",
    title: "Mixtape King Vol. 22",
    genre: "Hip Hop",
    duration: 5400,
    playCount: 14800,
    createdAt: "2026-02-15T19:00:00Z",
    description: "Another classic in the series — street anthems only.",
  },
  {
    id: "mix_chuck_t_002",
    title: "Carolina Street Heat",
    genre: "Hip Hop",
    duration: 4200,
    playCount: 11200,
    createdAt: "2026-01-20T20:00:00Z",
    description: "The hardest tracks coming out of NC right now.",
  },
  {
    id: "mix_chuck_t_003",
    title: "Old School Cypher Sessions",
    genre: "Old School",
    duration: 3600,
    playCount: 6750,
    createdAt: "2025-12-10T18:00:00Z",
    description: "Golden age hip hop blended with unreleased freestyles.",
  },
  {
    id: "mix_chuck_t_004",
    title: "Club Takeover Live Set",
    genre: "Club",
    duration: 7200,
    playCount: 8900,
    createdAt: "2025-11-15T23:00:00Z",
    description: "Two-hour live recording from the club — uncut and unfiltered.",
  },
];

// ─── DJ Juice (3 mixes) ─────────────────────────────────────────

const JUICE_MIXES: HostMix[] = [
  {
    id: "mix_juice_001",
    title: "Fresh Squeezed Vol. 7",
    genre: "Hip Hop",
    duration: 4500,
    playCount: 7800,
    createdAt: "2026-02-10T20:00:00Z",
    description: "Premium selections — nothing but fresh drops and exclusives.",
  },
  {
    id: "mix_juice_002",
    title: "Old School Juice Box",
    genre: "Old School",
    duration: 5400,
    playCount: 5300,
    createdAt: "2026-01-05T17:00:00Z",
    description: "90s and 2000s R&B and hip hop classics remixed.",
  },
  {
    id: "mix_juice_003",
    title: "Gospel Sunday Uplift",
    genre: "Gospel",
    duration: 3600,
    playCount: 2200,
    createdAt: "2025-12-22T09:00:00Z",
    description: "Inspirational gospel mix for Sunday morning worship.",
  },
];

// ─── DJ Wolf (3 mixes) ──────────────────────────────────────────

const WOLF_MIXES: HostMix[] = [
  {
    id: "mix_wolf_001",
    title: "Midnight Howl Vol. 4",
    genre: "Hip Hop",
    duration: 4800,
    playCount: 6500,
    createdAt: "2026-02-18T23:00:00Z",
    description: "Late-night energy — aggressive mixes for the after hours.",
  },
  {
    id: "mix_wolf_002",
    title: "Reggae Rundown",
    genre: "Reggae",
    duration: 3600,
    playCount: 3900,
    createdAt: "2026-01-08T18:00:00Z",
    description: "Roots reggae and dancehall vibes to close out the week.",
  },
  {
    id: "mix_wolf_003",
    title: "Wolf Pack Club Session",
    genre: "Club",
    duration: 5400,
    playCount: 8200,
    createdAt: "2025-12-05T22:00:00Z",
    description: "Recorded live at the Wolf Pack party — crowd went wild.",
  },
];

// ─── DJ Swin (4 mixes) ──────────────────────────────────────────

const SWIN_MIXES: HostMix[] = [
  {
    id: "mix_swin_001",
    title: "Morning Takeover Mega Mix",
    genre: "Hip Hop",
    duration: 3600,
    playCount: 13500,
    createdAt: "2026-02-24T07:00:00Z",
    description: "Best of the morning show mixes compiled into one fire set.",
  },
  {
    id: "mix_swin_002",
    title: "R&B Breakfast Blends",
    genre: "R&B",
    duration: 2700,
    playCount: 9200,
    createdAt: "2026-01-27T08:00:00Z",
    description: "Smooth R&B to start the day right — morning show exclusive.",
  },
  {
    id: "mix_swin_003",
    title: "Afrobeats Wake Up Call",
    genre: "Afrobeats",
    duration: 1800,
    playCount: 4100,
    createdAt: "2025-12-30T07:30:00Z",
    description: "Afrobeats energy for the early risers.",
  },
  {
    id: "mix_swin_004",
    title: "New Year's Eve Countdown Mix 2025",
    genre: "Club",
    duration: 7200,
    playCount: 15000,
    createdAt: "2025-12-31T22:00:00Z",
    description: "The official NYE mix — two hours of non-stop celebration.",
  },
];

// ─── Shorty Corleone (3 mixes) ──────────────────────────────────

const SHORTY_CORLEONE_MIXES: HostMix[] = [
  {
    id: "mix_shorty_001",
    title: "Crank After Dark Vol. 9",
    genre: "Hip Hop",
    duration: 5400,
    playCount: 10800,
    createdAt: "2026-02-08T23:00:00Z",
    description: "Late-night crank session — Southern rap at its finest.",
  },
  {
    id: "mix_shorty_002",
    title: "Go-Go Bounce Mix",
    genre: "Club",
    duration: 3600,
    playCount: 7400,
    createdAt: "2026-01-15T21:00:00Z",
    description: "Go-go and bounce music mashup to keep the energy going.",
  },
  {
    id: "mix_shorty_003",
    title: "Trap Soul Saturdays",
    genre: "R&B",
    duration: 4200,
    playCount: 5600,
    createdAt: "2025-12-13T20:00:00Z",
    description: "Where trap meets R&B — Bryson Tiller vibes all night.",
  },
];

// ─── Master map ─────────────────────────────────────────────────

export const ALL_HOST_MIXES: Record<string, HostMix[]> = {
  host_dj_spinwiz: SPINWIZ_MIXES,
  host_dj_rayn: RAYN_MIXES,
  host_dj_tommygee: TOMMYGEE_MIXES,
  host_dj_chuck_t: CHUCK_T_MIXES,
  host_dj_juice: JUICE_MIXES,
  host_dj_wolf: WOLF_MIXES,
  host_dj_swin: SWIN_MIXES,
  host_shorty_corleone: SHORTY_CORLEONE_MIXES,
};

// ─── Helper functions ───────────────────────────────────────────

/** Get all mixes for a given host. Returns empty array if host has no mixes. */
export function getHostMixes(hostId: string): HostMix[] {
  return ALL_HOST_MIXES[hostId] ?? [];
}

/** Lookup a single mix by its ID across all hosts. */
export function getMixById(mixId: string): HostMix | undefined {
  for (const mixes of Object.values(ALL_HOST_MIXES)) {
    const found = mixes.find((m) => m.id === mixId);
    if (found) return found;
  }
  return undefined;
}
