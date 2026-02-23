/**
 * Complete weekly schedule — single source of truth
 * Sourced from wccg1045fm.com research (Feb 2026)
 */

export interface ScheduleBlock {
  showId: string;
  showName: string;
  hostNames: string;
  startTime: string; // "HH:mm" 24hr
  endTime: string;   // "HH:mm" 24hr
  crossesMidnight?: boolean;
}

export interface DaySchedule {
  day: string;
  dayShort: string;
  dayIndex: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  blocks: ScheduleBlock[];
}

// ─── Weekday Schedule (Mon-Fri) ──────────────────────────────────

const WEEKDAY_BLOCKS: ScheduleBlock[] = [
  {
    showId: "show_bootleg_kev",
    showName: "The Bootleg Kev Show",
    hostNames: "Bootleg Kev",
    startTime: "00:00",
    endTime: "06:00",
  },
  {
    showId: "show_streetz_morning",
    showName: "Streetz Morning Takeover",
    hostNames: "Yung Joc, Mz Shyneka & Shawty Shawty",
    startTime: "06:00",
    endTime: "10:00",
  },
  {
    showId: "show_angela_yee",
    showName: "Way Up with Angela Yee",
    hostNames: "Angela Yee",
    startTime: "10:00",
    endTime: "15:00",
  },
  {
    showId: "show_crank_corleone",
    showName: "Crank with Shorty Corleone",
    hostNames: "Shorty Corleone",
    startTime: "15:00",
    endTime: "19:00",
  },
  {
    showId: "show_posted_corner",
    showName: "Posted on The Corner",
    hostNames: "Incognito & DJ Misses",
    startTime: "19:00",
    endTime: "00:00",
    crossesMidnight: true,
  },
];

// ─── Saturday Schedule ───────────────────────────────────────────

const SATURDAY_BLOCKS: ScheduleBlock[] = [
  {
    showId: "show_mixtape_radio",
    showName: "Mixtape Radio",
    hostNames: "WCCG",
    startTime: "00:00",
    endTime: "06:00",
  },
  {
    showId: "show_streetz_weekend_countdown",
    showName: "Streetz Weekend Countdown",
    hostNames: "Yung Joc, Mz Shyneka & Shawty Shawty",
    startTime: "06:00",
    endTime: "10:00",
  },
  {
    showId: "show_weekend_brunch",
    showName: "Weekend Brunch Show",
    hostNames: "WCCG",
    startTime: "10:00",
    endTime: "15:00",
  },
  {
    showId: "show_day_party",
    showName: "Day Party Radio",
    hostNames: "WCCG",
    startTime: "15:00",
    endTime: "19:00",
  },
  {
    showId: "show_rich_villianz",
    showName: "Rich Villianz Radio",
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
    showName: "The Praise Mix at 6",
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
    showId: "show_encouraging_moments",
    showName: "Encouraging Moments",
    hostNames: "Dr. Anthony Haire",
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
    hostNames: "Pastor Dr. T.L. Davenport",
    startTime: "12:00",
    endTime: "13:00",
  },
  {
    showId: "show_progressive_mbc",
    showName: "Progressive Missionary Baptist Church",
    hostNames: "Rev. F. Bernard Fuller",
    startTime: "13:00",
    endTime: "14:00",
  },
  {
    showId: "show_lewis_chapel",
    showName: "Lewis Chapel Missionary Baptist Church",
    hostNames: "Dr. Christopher Stackhouse, Sr.",
    startTime: "14:00",
    endTime: "15:00",
  },
  {
    showId: "show_weekend_wrapup",
    showName: "The Weekend Wrap-Up",
    hostNames: "WCCG",
    startTime: "15:00",
    endTime: "19:00",
  },
  {
    showId: "show_sunday_snacks",
    showName: "Sunday Snacks",
    hostNames: "Carolina Trendsetter, DJ Ike GDA & DJ Izzynice",
    startTime: "19:00",
    endTime: "00:00",
    crossesMidnight: true,
  },
];

// ─── Full Week Schedule ──────────────────────────────────────────

export const WEEKLY_SCHEDULE: DaySchedule[] = [
  { day: "Sunday", dayShort: "Sun", dayIndex: 0, blocks: SUNDAY_BLOCKS },
  { day: "Monday", dayShort: "Mon", dayIndex: 1, blocks: WEEKDAY_BLOCKS },
  { day: "Tuesday", dayShort: "Tue", dayIndex: 2, blocks: WEEKDAY_BLOCKS },
  { day: "Wednesday", dayShort: "Wed", dayIndex: 3, blocks: WEEKDAY_BLOCKS },
  { day: "Thursday", dayShort: "Thu", dayIndex: 4, blocks: WEEKDAY_BLOCKS },
  { day: "Friday", dayShort: "Fri", dayIndex: 5, blocks: WEEKDAY_BLOCKS },
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
