/**
 * Complete weekly schedule — single source of truth
 * Updated March 2026 from official WCCG programming schedule
 */

export interface ScheduleBlock {
  showId: string;
  showName: string;
  hostNames: string;
  startTime: string; // "HH:mm" 24hr
  endTime: string;   // "HH:mm" 24hr
  crossesMidnight?: boolean;
  /** Optional sub-show within this block (e.g. Gogo Mix at 5pm within GP) */
  subShow?: {
    name: string;
    hostNames: string;
    time: string; // display time
  };
}

export interface DaySchedule {
  day: string;
  dayShort: string;
  dayIndex: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  blocks: ScheduleBlock[];
  /** Optional daily theme (weekday only) */
  dayPartTheme?: {
    name: string;
    description: string;
    mixShowTimes: string;
  };
}

// ─── Station Programming Notes ──────────────────────────────────────
export const PROGRAMMING_NOTES = {
  accuweather: "ACCUWEATHER — Up to the minute weather forecast at :30 after each hour till 5pm",
  abcNews: "ABC ONE NEWS — Hourly and Breaking News at :55 after each hour till 6pm",
  sundayGospelCaravan: "The Sunday Gospel Caravan — 6:00 AM to 3:00 PM",
};

// ─── Weekday Schedule (Mon-Fri) ──────────────────────────────────

const WEEKDAY_BLOCKS: ScheduleBlock[] = [
  {
    showId: "show_bootleg_kev",
    showName: "Overnights — Bootleg Kev",
    hostNames: "Bootleg Kev",
    startTime: "00:00",
    endTime: "06:00",
  },
  {
    showId: "show_streetz_morning",
    showName: "Young Joc and the Streetz Morning Take Over",
    hostNames: "Yung Joc, Mz Shyneka & Shawty Shawty",
    startTime: "06:00",
    endTime: "10:00",
  },
  {
    showId: "show_way_up_angela_yee",
    showName: "Way Up with Angela Yee",
    hostNames: "Angela Yee",
    startTime: "10:00",
    endTime: "15:00",
  },
  {
    showId: "show_general_programming_weekday",
    showName: "General Programming",
    hostNames: "WCCG",
    startTime: "15:00",
    endTime: "19:00",
  },
  {
    showId: "show_posted_corner",
    showName: "Incognito \"Posted On the Corner\"",
    hostNames: "Incognito",
    startTime: "19:00",
    endTime: "00:00",
    crossesMidnight: true,
  },
];

// ─── Day Part Themes (weekday mix shows at 12pm / 5pm / 10pm) ───

const WEEKDAY_THEMES: Record<number, { name: string; description: string }> = {
  1: { name: "More Music Mondays", description: "Music added from the weekend introduced to the work week." },
  2: { name: "Two for Tuesdays", description: "Two songs by your favorite artist or producer." },
  3: { name: "Women Crush Wednesdays", description: "Female positive and specific programming." },
  4: { name: "Throwback Thursdays", description: "Flashbacks, approximately 10 years back." },
  5: { name: "Free-Fall Fridays", description: "Introduction of new music. Open mix show playlists after 7pm." },
};

// ─── Saturday Schedule ───────────────────────────────────────────

const SATURDAY_BLOCKS: ScheduleBlock[] = [
  {
    showId: "show_general_programming_sat_overnight",
    showName: "Overnights — General Programming",
    hostNames: "WCCG",
    startTime: "00:00",
    endTime: "06:00",
  },
  {
    showId: "show_streetz_weekend_countdown",
    showName: "Yung Joc and the Streetz Weekend Countdown",
    hostNames: "Yung Joc, Mz Shyneka & Shawty Shawty",
    startTime: "06:00",
    endTime: "09:00",
  },
  {
    showId: "show_deja_vu",
    showName: "The Deja Vu Show",
    hostNames: "WCCG",
    startTime: "10:00",
    endTime: "15:00",
  },
  {
    showId: "show_day_party",
    showName: "Day Party Radio: The Weekend Top 50",
    hostNames: "WCCG",
    startTime: "15:00",
    endTime: "19:00",
  },
  {
    showId: "show_riich_villianz",
    showName: "Riich Villianz Radio",
    hostNames: "DJ Ricovelli, Slim & DJ Tony Neal",
    startTime: "19:00",
    endTime: "00:00",
    crossesMidnight: true,
  },
];

// ─── Sunday Schedule ─────────────────────────────────────────────

const SUNDAY_BLOCKS: ScheduleBlock[] = [
  {
    showId: "show_praise_mix",
    showName: "Praise Mix at 6am",
    hostNames: "WCCG",
    startTime: "06:00",
    endTime: "08:00",
  },
  {
    showId: "show_grace_plus_nothing",
    showName: "Grace Plus Nothing Ministries",
    hostNames: "Apostle Anthony Monds",
    startTime: "08:00",
    endTime: "09:00",
  },
  {
    showId: "show_encouraging_moment",
    showName: "The Encouraging Moment",
    hostNames: "Dr. Tony Haire",
    startTime: "09:00",
    endTime: "10:00",
  },
  {
    showId: "show_marvin_sapp",
    showName: "The Marvin Sapp Radio Show",
    hostNames: "Bishop Marvin Sapp",
    startTime: "10:00",
    endTime: "12:00",
  },
  {
    showId: "show_family_fellowship",
    showName: "Family Fellowship Worship Center",
    hostNames: "FFWC",
    startTime: "12:00",
    endTime: "13:00",
  },
  {
    showId: "show_mt_pisgah",
    showName: "Mt. Pisgah Missionary Baptist Church",
    hostNames: "Pastor F. Benard Fuller",
    startTime: "13:00",
    endTime: "14:00",
  },
  {
    showId: "show_lewis_chapel",
    showName: "Lewis Chapel Baptist Church",
    hostNames: "Pastor Christopher Stackhouse",
    startTime: "14:00",
    endTime: "15:00",
  },
  {
    showId: "show_general_programming_sunday",
    showName: "General Programming",
    hostNames: "WCCG",
    startTime: "15:00",
    endTime: "19:00",
    subShow: {
      name: "Shorty Corleone Gogo Mix Show",
      hostNames: "Shorty Corleone",
      time: "5:00 PM",
    },
  },
  {
    showId: "show_sunday_snacks",
    showName: "Sunday Snacks",
    hostNames: "The Wright Brothers",
    startTime: "19:00",
    endTime: "00:00",
    crossesMidnight: true,
  },
];

// ─── Full Week Schedule ──────────────────────────────────────────

export const WEEKLY_SCHEDULE: DaySchedule[] = [
  { day: "Sunday", dayShort: "Sun", dayIndex: 0, blocks: SUNDAY_BLOCKS },
  {
    day: "Monday", dayShort: "Mon", dayIndex: 1, blocks: WEEKDAY_BLOCKS,
    dayPartTheme: { ...WEEKDAY_THEMES[1], mixShowTimes: "12pm / 5pm / 10pm" },
  },
  {
    day: "Tuesday", dayShort: "Tue", dayIndex: 2, blocks: WEEKDAY_BLOCKS,
    dayPartTheme: { ...WEEKDAY_THEMES[2], mixShowTimes: "12pm / 5pm / 10pm" },
  },
  {
    day: "Wednesday", dayShort: "Wed", dayIndex: 3, blocks: WEEKDAY_BLOCKS,
    dayPartTheme: { ...WEEKDAY_THEMES[3], mixShowTimes: "12pm / 5pm / 10pm" },
  },
  {
    day: "Thursday", dayShort: "Thu", dayIndex: 4, blocks: WEEKDAY_BLOCKS,
    dayPartTheme: { ...WEEKDAY_THEMES[4], mixShowTimes: "12pm / 5pm / 10pm" },
  },
  {
    day: "Friday", dayShort: "Fri", dayIndex: 5, blocks: WEEKDAY_BLOCKS,
    dayPartTheme: { ...WEEKDAY_THEMES[5], mixShowTimes: "12pm / 5pm / 10pm" },
  },
  { day: "Saturday", dayShort: "Sat", dayIndex: 6, blocks: SATURDAY_BLOCKS },
];

/**
 * Get what's on now for the main WCCG stream.
 * Uses America/New_York timezone.
 */
export function resolveNowPlaying(): ScheduleBlock | null {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const dayIndex = et.getDay(); // 0 = Sunday
  const hours = et.getHours();
  const minutes = et.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const daySchedule = WEEKLY_SCHEDULE.find((d) => d.dayIndex === dayIndex);
  if (!daySchedule) return null;

  for (const block of daySchedule.blocks) {
    const [sh, sm] = block.startTime.split(":").map(Number);
    const [eh, em] = block.endTime.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;

    if (block.crossesMidnight) {
      // Show crosses midnight — check if we're after start OR before end
      if (currentMinutes >= startMin || currentMinutes < endMin) {
        return block;
      }
    } else {
      if (currentMinutes >= startMin && currentMinutes < endMin) {
        return block;
      }
    }
  }

  return null;
}

/**
 * Get the next N upcoming shows after the current one.
 */
export function getUpNext(limit: number = 3): ScheduleBlock[] {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const dayIndex = et.getDay();
  const hours = et.getHours();
  const minutes = et.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const results: ScheduleBlock[] = [];
  let searchDay = dayIndex;
  let searchMinutes = currentMinutes;
  let daysSearched = 0;

  while (results.length < limit && daysSearched < 7) {
    const daySchedule = WEEKLY_SCHEDULE.find((d) => d.dayIndex === searchDay);
    if (daySchedule) {
      for (const block of daySchedule.blocks) {
        if (results.length >= limit) break;
        const [sh, sm] = block.startTime.split(":").map(Number);
        const startMin = sh * 60 + sm;
        if (startMin > searchMinutes || daysSearched > 0) {
          results.push(block);
        }
      }
    }
    searchDay = (searchDay + 1) % 7;
    searchMinutes = 0;
    daysSearched++;
  }

  return results;
}

/**
 * Get today's day part theme (weekdays only).
 */
export function getTodayTheme(): { name: string; description: string; mixShowTimes: string } | null {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const dayIndex = et.getDay();
  const daySchedule = WEEKLY_SCHEDULE.find((d) => d.dayIndex === dayIndex);
  return daySchedule?.dayPartTheme ?? null;
}

// ─── Station Info ────────────────────────────────────────────────

export const STATION_SOCIAL = {
  facebook: "https://facebook.com/TheRealWCCG1045fm/",
  twitter: "https://x.com/WCCG1045FM",
  instagram: "https://instagram.com/wccg1045fm/",
  tiktok: "https://tiktok.com/@wccg1045fm",
  youtube: "https://youtube.com/@WCCG1045FM",
  spotify: "https://open.spotify.com/artist/wccg1045fm",
};

export const STATION_INFO = {
  name: "WCCG 104.5 FM",
  tagline: "Hip Hop, Sports, Reactions & Podcasts",
  owner: "Carson Communications",
  address: "P.O. Box 53567, Fayetteville, NC 28305",
  phone: "(910) 483-6111",
  email: "info@wccg1045fm.com",
  website: "https://wccg1045fm.com",
  timezone: "America/New_York",
};
