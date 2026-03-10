// ---------------------------------------------------------------------------
// WCCG 104.5 FM — Rate Card Data
// Source: WCCG Rate Card (2024-2025) + Remote Fees 2019
// ---------------------------------------------------------------------------

export type DayCategory = "weekday" | "saturday" | "sunday";
export type SpotLength = 15 | 30 | 60;
export type CampaignType =
  | "on_air"
  | "digital"
  | "remote_broadcast"
  | "promotions"
  | "sports_sponsorship";

// ---------------------------------------------------------------------------
// Daypart entry
// ---------------------------------------------------------------------------
export interface RateCardDaypart {
  id: string;
  dayCategory: DayCategory;
  label: string;
  showName: string;
  startHour: number;
  endHour: number;
  ratePerSpot: number;
  description: string;
}

// ---------------------------------------------------------------------------
// Mix show segment
// ---------------------------------------------------------------------------
export interface MixShowRate {
  id: string;
  dayCategory: DayCategory;
  label: string;
  times: string[];
  showName: string;
  ratePerSegment: number;
}

// ---------------------------------------------------------------------------
// Sports sponsorship
// ---------------------------------------------------------------------------
export interface SportsPackage {
  id: string;
  name: string;
  rate: number;
}

export interface SportsSponsorshipRate {
  sport: "football" | "basketball";
  label: string;
  packages: SportsPackage[];
}

// ---------------------------------------------------------------------------
// Political rates
// ---------------------------------------------------------------------------
export interface PoliticalRate {
  type: "direct" | "agency";
  label: string;
  ratePerSpot: number;
}

// ---------------------------------------------------------------------------
// Remote broadcast packages
// ---------------------------------------------------------------------------
export interface RemoteBroadcastPackage {
  id: string;
  name: string;
  baseRate: number;
  personalityFee: number;
  totalWithPersonality: number;
  optionalDjFee: number;
  callbackHours: number;
  spots: number;
  spotLengths: string;
  liveLinerCount: number;
  description: string;
}

// ---------------------------------------------------------------------------
// ROS rate
// ---------------------------------------------------------------------------
export interface ROSRate {
  label: string;
  days: string;
  hours: string;
  startHour: number;
  endHour: number;
  ratePerSpot: number;
}

// =========================================================================
// WEEKDAY DAYPARTS (Monday – Friday)
// =========================================================================
export const WEEKDAY_DAYPARTS: RateCardDaypart[] = [
  {
    id: "wd_morning_drive",
    dayCategory: "weekday",
    label: "Morning Drive",
    showName: "Young Joc and the Streetz Morning Take Over",
    startHour: 6,
    endHour: 10,
    ratePerSpot: 60,
    description: "Peak morning drive — highest listener engagement in the Fayetteville market",
  },
  {
    id: "wd_midday",
    dayCategory: "weekday",
    label: "Mid-Day Vibe",
    showName: "The Mid-Day Vibe",
    startHour: 10,
    endHour: 15,
    ratePerSpot: 50,
    description: "Strong midday reach during lunch breaks and errands",
  },
  {
    id: "wd_afternoon",
    dayCategory: "weekday",
    label: "Afternoon Drive",
    showName: "The Count Up w/ Dee Dowdy",
    startHour: 15,
    endHour: 19,
    ratePerSpot: 40,
    description: "Afternoon commute window with strong advertiser demand",
  },
  {
    id: "wd_evening",
    dayCategory: "weekday",
    label: "Evening",
    showName: "The Kick Back w/ Ki West",
    startHour: 19,
    endHour: 24,
    ratePerSpot: 30,
    description: "Relaxed evening listening for entertainment and lifestyle brands",
  },
  {
    id: "wd_overnight",
    dayCategory: "weekday",
    label: "Overnights",
    showName: "General Programming",
    startHour: 0,
    endHour: 6,
    ratePerSpot: 15,
    description: "Cost-effective overnight slots for brand awareness and frequency",
  },
];

// =========================================================================
// SATURDAY DAYPARTS
// =========================================================================
export const SATURDAY_DAYPARTS: RateCardDaypart[] = [
  {
    id: "sat_morning",
    dayCategory: "saturday",
    label: "Saturday Morning",
    showName: "Young Joc and the Streetz Morning Take Over",
    startHour: 6,
    endHour: 10,
    ratePerSpot: 30,
    description: "Weekend morning with the Streetz crew",
  },
  {
    id: "sat_midday",
    dayCategory: "saturday",
    label: "The Hangover",
    showName: "The Hangover",
    startHour: 10,
    endHour: 14,
    ratePerSpot: 25,
    description: "Late morning weekend vibes",
  },
  {
    id: "sat_afternoon",
    dayCategory: "saturday",
    label: "Day Party Radio",
    showName: "Day Party Radio",
    startHour: 14,
    endHour: 19,
    ratePerSpot: 25,
    description: "Weekend afternoon party atmosphere",
  },
  {
    id: "sat_evening",
    dayCategory: "saturday",
    label: "Saturday Pre-Game",
    showName: "The Saturday Pre-Game",
    startHour: 19,
    endHour: 24,
    ratePerSpot: 25,
    description: "Saturday night pre-game energy",
  },
  {
    id: "sat_overnight",
    dayCategory: "saturday",
    label: "Sat Overnights",
    showName: "General Programming",
    startHour: 0,
    endHour: 6,
    ratePerSpot: 15,
    description: "Saturday overnight programming",
  },
];

// =========================================================================
// SUNDAY DAYPARTS
// =========================================================================
export const SUNDAY_DAYPARTS: RateCardDaypart[] = [
  {
    id: "sun_gospel",
    dayCategory: "sunday",
    label: "Sunday Gospel Caravan",
    showName: "The Sunday Gospel Caravan",
    startHour: 6,
    endHour: 15,
    ratePerSpot: 30,
    description: "Faith and community — the Sunday Gospel Caravan block",
  },
  {
    id: "sun_afternoon",
    dayCategory: "sunday",
    label: "The Session",
    showName: "The Session",
    startHour: 15,
    endHour: 19,
    ratePerSpot: 25,
    description: "Sunday afternoon relaxation programming",
  },
  {
    id: "sun_evening",
    dayCategory: "sunday",
    label: "Sunday Snacks",
    showName: "Sunday Snacks",
    startHour: 19,
    endHour: 24,
    ratePerSpot: 25,
    description: "Wind-down Sunday evening listening",
  },
  {
    id: "sun_overnight",
    dayCategory: "sunday",
    label: "Sun Overnights",
    showName: "General Programming",
    startHour: 0,
    endHour: 6,
    ratePerSpot: 15,
    description: "Sunday overnight programming",
  },
];

// =========================================================================
// ALL DAYPARTS (combined)
// =========================================================================
export const ALL_DAYPARTS: RateCardDaypart[] = [
  ...WEEKDAY_DAYPARTS,
  ...SATURDAY_DAYPARTS,
  ...SUNDAY_DAYPARTS,
];

// =========================================================================
// MIX SHOW RATES
// =========================================================================
export const MIX_SHOW_RATES: MixShowRate[] = [
  {
    id: "mix_weekday",
    dayCategory: "weekday",
    label: "Weekday Mix Shows",
    times: ["12pm", "5pm", "10pm"],
    showName: "WCCG Mix Squad",
    ratePerSegment: 40,
  },
  {
    id: "mix_saturday",
    dayCategory: "saturday",
    label: "Saturday Mix Shows",
    times: ["9am", "1pm", "9pm-12am"],
    showName: "WCCG Mix Squad",
    ratePerSegment: 30,
  },
  {
    id: "mix_sunday",
    dayCategory: "sunday",
    label: "Sunday Mix Shows",
    times: ["6pm", "9pm-12am"],
    showName: "WCCG Mix Squad",
    ratePerSegment: 20,
  },
];

// =========================================================================
// RUN OF SCHEDULE (ROS)
// =========================================================================
export const ROS_RATE: ROSRate = {
  label: "Run of Schedule (ROS)",
  days: "Monday – Sunday",
  hours: "6am – Midnight",
  startHour: 6,
  endHour: 24,
  ratePerSpot: 25,
};

// =========================================================================
// DUKE SPORTS SPONSORSHIPS
// =========================================================================
export const DUKE_SPORTS: SportsSponsorshipRate[] = [
  {
    sport: "football",
    label: "Duke Football",
    packages: [
      { id: "fb_season", name: "12-Game Season", rate: 3000 },
      { id: "fb_per_game", name: "Per Game", rate: 250 },
      { id: "fb_bowl", name: "Bowl Games", rate: 200 },
      { id: "fb_unc_duke", name: "UNC vs. Duke", rate: 800 },
      { id: "fb_all_sponsor", name: "All Games Sponsor", rate: 13000 },
    ],
  },
  {
    sport: "basketball",
    label: "Duke Basketball",
    packages: [
      { id: "bb_season", name: "12-Game Season", rate: 4200 },
      { id: "bb_per_game", name: "Per Game", rate: 350 },
      { id: "bb_acc", name: "ACC Tournament", rate: 2500 },
      { id: "bb_ncaa", name: "NCAA Tournament", rate: 3000 },
      { id: "bb_unc_duke", name: "UNC vs. Duke", rate: 1000 },
      { id: "bb_all_sponsor", name: "All Games Sponsor", rate: 13000 },
    ],
  },
];

// =========================================================================
// POLITICAL RATES
// =========================================================================
export const POLITICAL_RATES: PoliticalRate[] = [
  { type: "direct", label: "Direct (paid by politician)", ratePerSpot: 35 },
  { type: "agency", label: "Agency (party / affiliate)", ratePerSpot: 42.5 },
];

// =========================================================================
// REMOTE BROADCAST PACKAGES
// =========================================================================
export const REMOTE_PACKAGES: RemoteBroadcastPackage[] = [
  {
    id: "remote_650",
    name: "$650 Package",
    baseRate: 650,
    personalityFee: 150,
    totalWithPersonality: 800,
    optionalDjFee: 200,
    callbackHours: 3,
    spots: 50,
    spotLengths: "60/30 second",
    liveLinerCount: 12,
    description: "Callbacks from remote location, 3 hours in length. 50 commercials (60/30s), 12 live liners.",
  },
  {
    id: "remote_500",
    name: "$500 Package",
    baseRate: 500,
    personalityFee: 150,
    totalWithPersonality: 650,
    optionalDjFee: 200,
    callbackHours: 2,
    spots: 30,
    spotLengths: "60/30 second",
    liveLinerCount: 8,
    description: "Callbacks from remote location, 2 per hour minimum. 30 commercials (60/30s), 8 live liners.",
  },
];

// =========================================================================
// CAMPAIGN TYPE METADATA (for the builder UI)
// =========================================================================
export const CAMPAIGN_TYPES: {
  value: CampaignType;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: "on_air",
    label: "On-Air (Terrestrial)",
    description: "Standard radio spots placed in daypart rotations across the WCCG broadcast schedule.",
    icon: "Radio",
  },
  {
    value: "digital",
    label: "Digital Campaign",
    description: "Website banners, streaming pre-roll ads, and social media advertising.",
    icon: "Globe",
  },
  {
    value: "remote_broadcast",
    label: "Remote Broadcast",
    description: "Live on-location remote with callbacks, commercials, and live liners.",
    icon: "MapPin",
  },
  {
    value: "promotions",
    label: "Promotions",
    description: "Contests, giveaways, on-air mentions, and promotional campaigns.",
    icon: "Gift",
  },
  {
    value: "sports_sponsorship",
    label: "Sports Sponsorship",
    description: "Duke Football and Basketball game sponsorship packages.",
    icon: "Trophy",
  },
];

// =========================================================================
// Helpers
// =========================================================================

export function getDaypartsForDay(day: DayCategory): RateCardDaypart[] {
  switch (day) {
    case "weekday":
      return WEEKDAY_DAYPARTS;
    case "saturday":
      return SATURDAY_DAYPARTS;
    case "sunday":
      return SUNDAY_DAYPARTS;
  }
}

export function getRateForDaypart(id: string): number | undefined {
  return ALL_DAYPARTS.find((d) => d.id === id)?.ratePerSpot;
}

export function getMixShowForDay(day: DayCategory): MixShowRate | undefined {
  return MIX_SHOW_RATES.find((m) => m.dayCategory === day);
}

export function formatHourRange(start: number, end: number): string {
  const fmt = (h: number) => {
    if (h === 0 || h === 24) return "12am";
    if (h === 12) return "12pm";
    return h < 12 ? `${h}am` : `${h - 12}pm`;
  };
  return `${fmt(start)} – ${fmt(end)}`;
}
