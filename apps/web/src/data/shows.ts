/**
 * Centralized Show/Program data — single source of truth
 * Updated March 2026 from official WCCG programming schedule
 */

export interface ShowData {
  id: string;
  name: string;
  slug: string;
  hostNames: string;
  hostIds: string[];
  timeSlot: string;
  days: string;
  streamId: string;
  description: string;
  tagline: string;
  gradient: string;
  imageUrl: string | null;
  showImageUrl: string | null;
  youtube?: {
    channelName: string;
    channelUrl: string;
    searchQuery: string;
  };
  isSyndicated: boolean;
  isActive: boolean;
  category: "weekday" | "saturday" | "sunday" | "gospel" | "mixsquad";
}

// ─── Day Part Themes (Weekday Mix Shows at 12pm / 5pm / 10pm) ──────
export interface DayPartTheme {
  day: string;
  dayIndex: number; // 1=Mon ... 5=Fri
  name: string;
  description: string;
}

export const DAY_PART_THEMES: DayPartTheme[] = [
  {
    day: "Monday",
    dayIndex: 1,
    name: "More Music Mondays",
    description: "Music added from the weekend introduced to the work week.",
  },
  {
    day: "Tuesday",
    dayIndex: 2,
    name: "Two for Tuesdays",
    description: "Two songs by your favorite artist or producer.",
  },
  {
    day: "Wednesday",
    dayIndex: 3,
    name: "Women Crush Wednesdays",
    description: "Female positive and specific programming.",
  },
  {
    day: "Thursday",
    dayIndex: 4,
    name: "Throwback Thursdays",
    description: "Flashbacks, approximately 10 years back.",
  },
  {
    day: "Friday",
    dayIndex: 5,
    name: "Free-Fall Fridays",
    description: "Introduction of new music. Open mix show playlists after 7pm.",
  },
];

/** Weekend mix show times: 12pm / 6pm / 9pm */
export const MIX_SHOW_TIMES = {
  weekday: ["12:00 PM", "5:00 PM", "10:00 PM"],
  weekend: ["12:00 PM", "6:00 PM", "9:00 PM"],
};

// ─── Weekday Shows ──────────────────────────────────────────────────

export const SHOW_STREETZ_MORNING: ShowData = {
  id: "show_streetz_morning",
  name: "Young Joc and the Streetz Morning Take Over",
  slug: "streetz-morning-takeover",
  hostNames: "Yung Joc, Mz Shyneka & Shawty Shawty",
  hostIds: ["host_yung_joc", "host_mz_shyneka", "host_shawty_shawty", "host_dj_swin", "host_et_cali"],
  timeSlot: "6:00 AM - 10:00 AM",
  days: "Monday - Friday",
  streamId: "stream_wccg",
  description: "Start your morning with the hottest conversations, celebrity interviews, and the best mix of hip hop and R&B. Yung Joc, Mz Shyneka, and Shawty Shawty bring the energy every weekday morning with their unfiltered take on pop culture, entertainment news, and community topics that matter to Fayetteville and beyond.",
  tagline: "Wake up and take over the streets every weekday morning",
  gradient: "from-[#1a0a2e] via-[#16213e] to-[#0f3460]",
  imageUrl: "/images/hosts/yung-joc.png",
  showImageUrl: "https://wccg1045fm.com/wp-content/uploads/2025/09/smtw.jpg",
  youtube: {
    channelName: "WCCG 104.5 FM",
    channelUrl: "https://youtube.com/@WCCG1045FM",
    searchQuery: "Streetz Morning Takeover WCCG",
  },
  isSyndicated: true,
  isActive: true,
  category: "weekday",
};

export const SHOW_IN_IT_BIG_A: ShowData = {
  id: "show_in_it_big_a",
  name: "In It w/ Big A",
  slug: "in-it-big-a",
  hostNames: "Big A",
  hostIds: ["host_big_a"],
  timeSlot: "10:00 AM - 3:00 PM",
  days: "Monday - Friday",
  streamId: "stream_wccg",
  description: "Big A keeps you company through the midday hours with the best mix of hip hop, R&B, and real talk. From trending topics to community happenings, In It delivers the perfect soundtrack for your workday.",
  tagline: "Midday vibes and real talk with Big A",
  gradient: "from-[#1a0533] via-[#2d1b69] to-[#1a1a2e]",
  imageUrl: null,
  showImageUrl: "https://wccg1045fm.com/wp-content/uploads/2025/09/yee-01.png",
  isSyndicated: false,
  isActive: true,
  category: "weekday",
};

export const SHOW_GENERAL_PROGRAMMING_WEEKDAY: ShowData = {
  id: "show_general_programming_weekday",
  name: "General Programming",
  slug: "general-programming-afternoon",
  hostNames: "WCCG",
  hostIds: [],
  timeSlot: "3:00 PM - 7:00 PM",
  days: "Monday - Friday",
  streamId: "stream_wccg",
  description: "WCCG 104.5 FM brings you the best in hip hop and R&B during the afternoon drive. Featuring today's daily mix show theme and the hottest tracks to power your commute home.",
  tagline: "Afternoon drive with the best hip hop and R&B",
  gradient: "from-[#0f0c29] via-[#302b63] to-[#24243e]",
  imageUrl: null,
  showImageUrl: null,
  isSyndicated: false,
  isActive: true,
  category: "weekday",
};

export const SHOW_POSTED_CORNER: ShowData = {
  id: "show_posted_corner",
  name: "Posted On the Corner",
  slug: "posted-on-the-corner",
  hostNames: "Incognito",
  hostIds: ["host_incognito"],
  timeSlot: "7:00 PM - Midnight",
  days: "Monday - Friday",
  streamId: "stream_wccg",
  description: "Incognito holds it down every evening with the hardest hip hop, exclusive freestyles, and raw takes on the culture. Posted on the Corner is where the streets meet the airwaves. From new music drops to local happenings, tune in for unfiltered commentary and certified heat.",
  tagline: "Evening heat with the hardest hip hop and unfiltered commentary",
  gradient: "from-[#0a1628] via-[#1a0a2e] to-[#162447]",
  imageUrl: "/images/hosts/incognito.png",
  showImageUrl: "https://wccg1045fm.com/wp-content/uploads/2025/10/27e86769d0fecd2b17374095975a3091.png",
  youtube: {
    channelName: "WCCG 104.5 FM",
    channelUrl: "https://youtube.com/@WCCG1045FM",
    searchQuery: "Posted on The Corner Incognito",
  },
  isSyndicated: true,
  isActive: true,
  category: "weekday",
};

export const SHOW_BOOTLEG_KEV: ShowData = {
  id: "show_bootleg_kev",
  name: "Overnights with Bootleg Kev",
  slug: "bootleg-kev-show",
  hostNames: "Bootleg Kev",
  hostIds: ["host_bootleg_kev"],
  timeSlot: "Midnight - 6:00 AM",
  days: "Monday - Friday",
  streamId: "stream_wccg",
  description: "Bootleg Kev connects you with the biggest names in hip hop through exclusive interviews, first-listen sessions, and behind-the-scenes industry stories. Syndicated through Premiere Networks with 468K+ YouTube subscribers, tune in for new music and authentic conversations every night.",
  tagline: "Exclusive interviews and breaking music from the West Coast king",
  gradient: "from-[#1a0533] via-[#0d1b2a] to-[#1b2838]",
  imageUrl: null,
  showImageUrl: "/images/shows/bootleg-kev-show.png",
  youtube: {
    channelName: "Bootleg Kev",
    channelUrl: "https://youtube.com/@bootlegkev",
    searchQuery: "Bootleg Kev interview",
  },
  isSyndicated: true,
  isActive: true,
  category: "weekday",
};

// ─── Saturday Shows ──────────────────────────────────────────────────

export const SHOW_STREETZ_WEEKEND: ShowData = {
  id: "show_streetz_weekend_countdown",
  name: "Yung Joc and the Streetz Weekend Countdown",
  slug: "streetz-weekend-countdown",
  hostNames: "Yung Joc, Mz Shyneka & Shawty Shawty",
  hostIds: ["host_yung_joc", "host_mz_shyneka", "host_shawty_shawty"],
  timeSlot: "6:00 AM - 9:00 AM",
  days: "Saturday",
  streamId: "stream_wccg",
  description: "The Streetz Morning Takeover crew brings the same high energy to Saturday mornings with the Streetz Weekend Countdown. Top tracks, celebrity moments, and the best recaps of the week.",
  tagline: "Saturday morning countdown of the week's hottest tracks",
  gradient: "from-[#1a0a2e] via-[#16213e] to-[#0f3460]",
  imageUrl: "/images/hosts/yung-joc.png",
  showImageUrl: "/images/shows/streetz-morning-takeover.png",
  isSyndicated: true,
  isActive: true,
  category: "saturday",
};

export const SHOW_DEJA_VU: ShowData = {
  id: "show_deja_vu",
  name: "The Deja Vu Show",
  slug: "deja-vu-show",
  hostNames: "WCCG",
  hostIds: [],
  timeSlot: "10:00 AM - 3:00 PM",
  days: "Saturday",
  streamId: "stream_wccg",
  description: "Take a trip down memory lane with The Deja Vu Show. Featuring classic hip hop, R&B throwbacks, and nostalgic hits that bring the good vibes every Saturday.",
  tagline: "Classic throwbacks and nostalgic vibes every Saturday",
  gradient: "from-[#1a1a2e] via-[#2d1b69] to-[#1a0533]",
  imageUrl: null,
  showImageUrl: null,
  isSyndicated: false,
  isActive: true,
  category: "saturday",
};

export const SHOW_DAY_PARTY: ShowData = {
  id: "show_day_party",
  name: "Day Party Radio: The Weekend Top 50",
  slug: "day-party-radio",
  hostNames: "WCCG",
  hostIds: [],
  timeSlot: "3:00 PM - 7:00 PM",
  days: "Saturday",
  streamId: "stream_wccg",
  description: "Get the party started early with Day Party Radio featuring The Weekend Top 50 countdown. High-energy mixes and the hottest tracks of the week to kick off your Saturday night.",
  tagline: "The Weekend Top 50 — get the party started before the sun goes down",
  gradient: "from-[#0f3460] via-[#16213e] to-[#162447]",
  imageUrl: null,
  showImageUrl: null,
  isSyndicated: false,
  isActive: true,
  category: "saturday",
};

export const SHOW_RIICH_VILLIANZ: ShowData = {
  id: "show_riich_villianz",
  name: "Riich Villianz Radio",
  slug: "riich-villianz-radio",
  hostNames: "DJ Ricovelli, Slim & DJ Tony Neal",
  hostIds: ["host_dj_ricovelli", "host_dj_tony_neal"],
  timeSlot: "7:00 PM - Midnight",
  days: "Saturday",
  streamId: "stream_wccg",
  description: "DJ Ricovelli, Slim, and the legendary DJ Tony Neal (founder of Core DJs) take over Saturday nights with Riich Villianz Radio. The hottest mixes, exclusive drops, and non-stop party energy.",
  tagline: "Saturday night takeover with the hottest DJ mixes",
  gradient: "from-[#1a0533] via-[#0f0c29] to-[#302b63]",
  imageUrl: null,
  showImageUrl: null,
  isSyndicated: false,
  isActive: true,
  category: "saturday",
};

export const SHOW_GENERAL_PROGRAMMING_SAT_OVERNIGHT: ShowData = {
  id: "show_general_programming_sat_overnight",
  name: "Overnights",
  slug: "saturday-overnights",
  hostNames: "WCCG",
  hostIds: [],
  timeSlot: "Midnight - 6:00 AM",
  days: "Saturday",
  streamId: "stream_wccg",
  description: "General programming through the early Saturday morning hours featuring the best in hip hop and R&B.",
  tagline: "Late night general programming",
  gradient: "from-[#0f0c29] via-[#1a0533] to-[#24243e]",
  imageUrl: null,
  showImageUrl: null,
  isSyndicated: false,
  isActive: true,
  category: "saturday",
};

// ─── Sunday Shows ─────────────────────────────────────────────────

export const SHOW_PRAISE_MIX: ShowData = {
  id: "show_praise_mix",
  name: "Praise Mix at 6am",
  slug: "praise-mix",
  hostNames: "WCCG",
  hostIds: [],
  timeSlot: "6:00 AM - 8:00 AM",
  days: "Sunday",
  streamId: "stream_wccg",
  description: "Start your Sunday morning with an uplifting mix of gospel music, praise and worship, and inspirational tracks. Part of The Sunday Gospel Caravan on WCCG 104.5 FM.",
  tagline: "Start your Sunday with praise and worship",
  gradient: "from-[#1a1a2e] via-[#16213e] to-[#0d1b2a]",
  imageUrl: null,
  showImageUrl: "https://wccg1045fm.com/wp-content/uploads/2025/12/praisemix-6.png",
  isSyndicated: false,
  isActive: true,
  category: "gospel",
};

export const SHOW_GRACE_PLUS_NOTHING: ShowData = {
  id: "show_grace_plus_nothing",
  name: "Grace Plus Nothing Ministries",
  slug: "grace-plus-nothing",
  hostNames: "Apostle Anthony Monds",
  hostIds: ["host_apostle_monds"],
  timeSlot: "8:00 AM - 9:00 AM",
  days: "Sunday",
  streamId: "stream_wccg",
  description: "Apostle Anthony Monds brings messages of faith, grace, and community as part of the Sunday Gospel Caravan on WCCG 104.5 FM.",
  tagline: "Messages of faith, grace, and community",
  gradient: "from-[#1a1a2e] via-[#0d1b2a] to-[#16213e]",
  imageUrl: null,
  showImageUrl: "https://wccg1045fm.com/wp-content/uploads/2025/10/gpn-1-1024x743-1.png",
  isSyndicated: false,
  isActive: true,
  category: "gospel",
};

export const SHOW_ENCOURAGING_MOMENT: ShowData = {
  id: "show_encouraging_moment",
  name: "The Encouraging Moment",
  slug: "encouraging-moment",
  hostNames: "Dr. Tony Haire",
  hostIds: ["host_dr_haire"],
  timeSlot: "9:00 AM - 10:00 AM",
  days: "Sunday",
  streamId: "stream_wccg",
  description: "Dr. Tony Haire provides spiritual encouragement, biblical teaching, and hope to the Fayetteville community and beyond every Sunday morning as part of The Sunday Gospel Caravan.",
  tagline: "Spiritual encouragement and biblical teaching",
  gradient: "from-[#16213e] via-[#1a1a2e] to-[#0d1b2a]",
  imageUrl: null,
  showImageUrl: "https://wccg1045fm.com/wp-content/uploads/2025/10/thm-main-1024x743-1.png",
  isSyndicated: false,
  isActive: true,
  category: "gospel",
};

export const SHOW_MARVIN_SAPP: ShowData = {
  id: "show_marvin_sapp",
  name: "The Marvin Sapp Radio Show",
  slug: "marvin-sapp-radio-show",
  hostNames: "Bishop Marvin Sapp",
  hostIds: ["host_marvin_sapp"],
  timeSlot: "10:00 AM - 12:00 PM",
  days: "Sunday",
  streamId: "stream_wccg",
  description: "Multi-Grammy nominated gospel artist and pastor Bishop Marvin Sapp brings inspirational conversation, the best in gospel music, and uplifting messages every Sunday morning.",
  tagline: "Inspirational gospel from a Grammy-nominated artist",
  gradient: "from-[#1a0533] via-[#2d1b69] to-[#1a1a2e]",
  imageUrl: null,
  showImageUrl: "https://wccg1045fm.com/wp-content/uploads/2025/10/marvin-sapp12.jpg",
  isSyndicated: true,
  isActive: true,
  category: "gospel",
};

export const SHOW_FAMILY_FELLOWSHIP: ShowData = {
  id: "show_family_fellowship",
  name: "Family Fellowship Worship Center",
  slug: "family-fellowship",
  hostNames: "FFWC",
  hostIds: [],
  timeSlot: "12:00 PM - 1:00 PM",
  days: "Sunday",
  streamId: "stream_wccg",
  description: "Family Fellowship Worship Center brings their Sunday service to the airwaves with powerful sermons and spiritual guidance.",
  tagline: "Powerful sermons and spiritual guidance",
  gradient: "from-[#0d1b2a] via-[#1a1a2e] to-[#16213e]",
  imageUrl: null,
  showImageUrl: "https://wccg1045fm.com/wp-content/uploads/2025/10/ffwc-1024x743-1.png",
  isSyndicated: false,
  isActive: true,
  category: "gospel",
};

export const SHOW_MT_PISGAH: ShowData = {
  id: "show_mt_pisgah",
  name: "Mt. Pisgah Missionary Baptist Church",
  slug: "mt-pisgah-mbc",
  hostNames: "Pastor F. Benard Fuller",
  hostIds: ["host_pastor_fuller"],
  timeSlot: "1:00 PM - 2:00 PM",
  days: "Sunday",
  streamId: "stream_wccg",
  description: "Pastor F. Benard Fuller brings the Sunday service from Mt. Pisgah Missionary Baptist Church to the airwaves as part of The Sunday Gospel Caravan.",
  tagline: "Faith-based Sunday service broadcast",
  gradient: "from-[#16213e] via-[#0d1b2a] to-[#1a1a2e]",
  imageUrl: null,
  showImageUrl: "https://wccg1045fm.com/wp-content/uploads/2025/10/progressive-1024x743-1.png",
  isSyndicated: false,
  isActive: true,
  category: "gospel",
};

export const SHOW_LEWIS_CHAPEL: ShowData = {
  id: "show_lewis_chapel",
  name: "Lewis Chapel Baptist Church",
  slug: "lewis-chapel",
  hostNames: "Pastor Christopher Stackhouse",
  hostIds: ["host_pastor_stackhouse"],
  timeSlot: "2:00 PM - 3:00 PM",
  days: "Sunday",
  streamId: "stream_wccg",
  description: "Pastor Christopher Stackhouse leads the Lewis Chapel Baptist Church broadcast every Sunday afternoon as part of The Sunday Gospel Caravan.",
  tagline: "Inspirational Sunday afternoon messages",
  gradient: "from-[#1a1a2e] via-[#16213e] to-[#0d1b2a]",
  imageUrl: null,
  showImageUrl: "https://wccg1045fm.com/wp-content/uploads/2025/10/lewis-chapel-1024x743-1.png",
  isSyndicated: false,
  isActive: true,
  category: "gospel",
};

export const SHOW_GENERAL_PROGRAMMING_SUNDAY: ShowData = {
  id: "show_general_programming_sunday",
  name: "General Programming",
  slug: "general-programming-sunday",
  hostNames: "WCCG",
  hostIds: [],
  timeSlot: "3:00 PM - 7:00 PM",
  days: "Sunday",
  streamId: "stream_wccg",
  description: "Wind down the weekend with the best in R&B and hip hop as we wrap up Sunday and get you ready for the week ahead. Featuring the Shorty Corleone Gogo Mix Show at 5pm.",
  tagline: "Wrapping up the weekend with the best music",
  gradient: "from-[#0f3460] via-[#16213e] to-[#1a1a2e]",
  imageUrl: null,
  showImageUrl: null,
  isSyndicated: false,
  isActive: true,
  category: "sunday",
};

export const SHOW_GOGO_MIX: ShowData = {
  id: "show_gogo_mix",
  name: "Shorty Corleone Gogo Mix Show",
  slug: "gogo-mix-show",
  hostNames: "Shorty Corleone",
  hostIds: ["host_shorty_corleone"],
  timeSlot: "5:00 PM",
  days: "Sunday",
  streamId: "stream_wccg",
  description: "Shorty Corleone brings the Gogo Mix Show every Sunday at 5pm, blending go-go rhythms with hip hop and R&B for a unique listening experience.",
  tagline: "Go-go meets hip hop every Sunday evening",
  gradient: "from-[#302b63] via-[#0f0c29] to-[#1a0533]",
  imageUrl: "/images/hosts/shorty-corleone.png",
  showImageUrl: null,
  isSyndicated: false,
  isActive: true,
  category: "sunday",
};

export const SHOW_SUNDAY_SNACKS: ShowData = {
  id: "show_sunday_snacks",
  name: "Sunday Snacks",
  slug: "sunday-snacks",
  hostNames: "The Wright Brothers",
  hostIds: ["host_wright_brothers"],
  timeSlot: "7:00 PM - Midnight",
  days: "Sunday",
  streamId: "stream_wccg",
  description: "The Wright Brothers close out the weekend with Sunday Snacks. The best in regional hip hop, DJ mixes, and party vibes to end your Sunday right.",
  tagline: "Close out the weekend with the hottest DJ mixes",
  gradient: "from-[#302b63] via-[#0f0c29] to-[#24243e]",
  imageUrl: null,
  showImageUrl: null,
  isSyndicated: false,
  isActive: true,
  category: "sunday",
};

export const SHOW_MIXSQUAD_RADIO: ShowData = {
  id: "show_mixsquad_radio",
  name: "MixxSquadd Radio",
  slug: "mixsquad-radio",
  hostNames: "DJ Ricovelli, DJ SpinWiz, DJ Rayn, DJ TommyGee Mixx & DJ Yodo",
  hostIds: ["host_dj_ricovelli", "host_dj_spinwiz", "host_dj_rayn", "host_dj_tommygee", "host_dj_yodo"],
  timeSlot: "24/7",
  days: "Every Day",
  streamId: "stream_mixsquad",
  description: "MixxSquadd Radio delivers non-stop DJ mixes 24/7 on its own dedicated stream. Featuring DJ Ricovelli, DJ SpinWiz, DJ Rayn, DJ TommyGee Mixx, and DJ Yodo with the best in hip hop, R&B, dancehall, and club mixes.",
  tagline: "24/7 non-stop DJ mixes on a dedicated stream",
  gradient: "from-[#ec4899] via-[#be185d] to-[#831843]",
  imageUrl: null,
  showImageUrl: null,
  isSyndicated: false,
  isActive: true,
  category: "mixsquad",
};

// ─── All Shows ────────────────────────────────────────────────────

export const ALL_SHOWS: ShowData[] = [
  // Weekday
  SHOW_STREETZ_MORNING,
  SHOW_IN_IT_BIG_A,
  SHOW_GENERAL_PROGRAMMING_WEEKDAY,
  SHOW_POSTED_CORNER,
  SHOW_BOOTLEG_KEV,
  // Saturday
  SHOW_STREETZ_WEEKEND,
  SHOW_DEJA_VU,
  SHOW_DAY_PARTY,
  SHOW_RIICH_VILLIANZ,
  SHOW_GENERAL_PROGRAMMING_SAT_OVERNIGHT,
  // Sunday – Gospel Caravan (6am-3pm)
  SHOW_PRAISE_MIX,
  SHOW_GRACE_PLUS_NOTHING,
  SHOW_ENCOURAGING_MOMENT,
  SHOW_MARVIN_SAPP,
  SHOW_FAMILY_FELLOWSHIP,
  SHOW_MT_PISGAH,
  SHOW_LEWIS_CHAPEL,
  // Sunday – Afternoon/Evening
  SHOW_GENERAL_PROGRAMMING_SUNDAY,
  SHOW_GOGO_MIX,
  SHOW_SUNDAY_SNACKS,
  // 24/7 Stream
  SHOW_MIXSQUAD_RADIO,
];

/** Hero slides — the main featured shows for the homepage carousel */
export const HERO_SHOWS: ShowData[] = [
  SHOW_STREETZ_MORNING,
  SHOW_IN_IT_BIG_A,
  SHOW_POSTED_CORNER,
  SHOW_BOOTLEG_KEV,
  SHOW_SUNDAY_SNACKS,
];

export const WEEKDAY_SHOWS = ALL_SHOWS.filter((s) => s.category === "weekday");
export const SATURDAY_SHOWS = ALL_SHOWS.filter((s) => s.category === "saturday");
export const SUNDAY_SHOWS = ALL_SHOWS.filter((s) => s.category === "sunday");
export const GOSPEL_SHOWS = ALL_SHOWS.filter((s) => s.category === "gospel");

/** Lookup show by ID */
export function getShowById(id: string): ShowData | undefined {
  return ALL_SHOWS.find((s) => s.id === id);
}

/** Lookup show by slug */
export function getShowBySlug(slug: string): ShowData | undefined {
  return ALL_SHOWS.find((s) => s.slug === slug);
}

/**
 * Derive the day-part label from a show's timeSlot and category.
 * Used for badges on show cards and schedule displays.
 */
export function getDayPart(show: ShowData): string {
  if (show.category === "gospel") return "Gospel";
  if (show.category === "mixsquad") return "Mix Show";

  const slot = show.timeSlot.toLowerCase();
  // Check for keyword-based matches first
  if (slot.includes("midnight") && slot.startsWith("midnight")) return "Overnights";
  if (slot.includes("midnight") && !slot.startsWith("midnight")) return "Evening";

  // Parse start hour
  const match = slot.match(/^(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (!match) return show.category === "saturday" ? "Weekend" : "General";

  let hour = parseInt(match[1], 10);
  const ampm = match[3].toLowerCase();
  if (ampm === "pm" && hour !== 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;

  if (hour < 6) return "Overnights";
  if (hour < 10) return "Morning Drive";
  if (hour < 15) return "Midday";
  if (hour < 19) return "Afternoon Drive";
  return "Evening";
}
