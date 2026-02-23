/**
 * Centralized Show/Program data — single source of truth
 * Sourced from wccg1045fm.com research (Feb 2026)
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

// ─── Weekday Shows ──────────────────────────────────────────────────

export const SHOW_STREETZ_MORNING: ShowData = {
  id: "show_streetz_morning",
  name: "Streetz Morning Takeover",
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
  showImageUrl: "/images/shows/streetz-morning-takeover.png",
  youtube: {
    channelName: "WCCG 104.5 FM",
    channelUrl: "https://youtube.com/@WCCG1045FM",
    searchQuery: "Streetz Morning Takeover WCCG",
  },
  isSyndicated: true,
  isActive: true,
  category: "weekday",
};

export const SHOW_ANGELA_YEE: ShowData = {
  id: "show_angela_yee",
  name: "Way Up with Angela Yee",
  slug: "way-up-angela-yee",
  hostNames: "Angela Yee",
  hostIds: ["host_angela_yee"],
  timeSlot: "10:00 AM - 3:00 PM",
  days: "Monday - Friday",
  streamId: "stream_wccg",
  description: "Angela Yee brings you the best in midday entertainment with celebrity interviews, relationship advice, trending topics, and the smoothest mix of R&B and hip hop. Syndicated nationally through Premiere Networks and iHeartRadio, Way Up keeps your afternoon flowing.",
  tagline: "Real talk, celebrity interviews, and the culture \u2014 midday vibes",
  gradient: "from-[#1a0533] via-[#2d1b69] to-[#1a1a2e]",
  imageUrl: "/images/hosts/angela-yee.png",
  showImageUrl: null,
  youtube: {
    channelName: "Way Up with Angela Yee",
    channelUrl: "https://youtube.com/@WayUpWithAngelaYee",
    searchQuery: "Way Up Angela Yee",
  },
  isSyndicated: true,
  isActive: true,
  category: "weekday",
};

export const SHOW_POSTED_CORNER: ShowData = {
  id: "show_posted_corner",
  name: "Posted on The Corner",
  slug: "posted-on-the-corner",
  hostNames: "Incognito & DJ Misses",
  hostIds: ["host_incognito", "host_dj_misses"],
  timeSlot: "7:00 PM - Midnight",
  days: "Monday - Friday",
  streamId: "stream_wccg",
  description: "Incognito and DJ Misses hold it down every evening with the hardest hip hop, exclusive freestyles, and raw takes on the culture. Syndicated in 20+ markets, Posted on the Corner is where the streets meet the airwaves. From new music drops to local happenings, tune in for unfiltered commentary and certified heat.",
  tagline: "Evening heat with the hardest hip hop and unfiltered commentary",
  gradient: "from-[#0a1628] via-[#1a0a2e] to-[#162447]",
  imageUrl: "/images/hosts/incognito.png",
  showImageUrl: null,
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
  name: "The Bootleg Kev Show",
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

export const SHOW_CRANK_CORLEONE: ShowData = {
  id: "show_crank_corleone",
  name: "Crank with Shorty Corleone",
  slug: "crank-shorty-corleone",
  hostNames: "Shorty Corleone",
  hostIds: ["host_shorty_corleone"],
  timeSlot: "3:00 PM - 7:00 PM",
  days: "Monday - Friday",
  streamId: "stream_wccg",
  description: "Shorty Corleone turns up the heat every afternoon with certified bangers, underground hip hop, and the best in Southern rap. From trap classics to new fire, Crank is the soundtrack for your drive home.",
  tagline: "Afternoon certified bangers and the best in underground hip hop",
  gradient: "from-[#0f0c29] via-[#302b63] to-[#24243e]",
  imageUrl: "/images/hosts/shorty-corleone.png",
  showImageUrl: "/images/shows/crank-corleone.png",
  isSyndicated: false,
  isActive: true,
  category: "weekday",
};

// ─── Saturday Shows ──────────────────────────────────────────────────

export const SHOW_STREETZ_WEEKEND: ShowData = {
  id: "show_streetz_weekend_countdown",
  name: "Streetz Weekend Countdown",
  slug: "streetz-weekend-countdown",
  hostNames: "Yung Joc, Mz Shyneka & Shawty Shawty",
  hostIds: ["host_yung_joc", "host_mz_shyneka", "host_shawty_shawty"],
  timeSlot: "6:00 AM - 10:00 AM",
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

export const SHOW_WEEKEND_BRUNCH: ShowData = {
  id: "show_weekend_brunch",
  name: "Weekend Brunch Show",
  slug: "weekend-brunch",
  hostNames: "WCCG",
  hostIds: [],
  timeSlot: "10:00 AM - 3:00 PM",
  days: "Saturday",
  streamId: "stream_wccg",
  description: "The perfect Saturday vibe with a curated mix of R&B, soul, and smooth hip hop to soundtrack your weekend brunch.",
  tagline: "Smooth Saturday vibes for your weekend brunch",
  gradient: "from-[#1a1a2e] via-[#2d1b69] to-[#1a0533]",
  imageUrl: null,
  showImageUrl: null,
  isSyndicated: false,
  isActive: true,
  category: "saturday",
};

export const SHOW_DAY_PARTY: ShowData = {
  id: "show_day_party",
  name: "Day Party Radio",
  slug: "day-party-radio",
  hostNames: "WCCG",
  hostIds: [],
  timeSlot: "3:00 PM - 7:00 PM",
  days: "Saturday",
  streamId: "stream_wccg",
  description: "Get the party started early with Day Party Radio. High-energy mixes and party anthems to kick off your Saturday night.",
  tagline: "Get the party started before the sun goes down",
  gradient: "from-[#0f3460] via-[#16213e] to-[#162447]",
  imageUrl: null,
  showImageUrl: null,
  isSyndicated: false,
  isActive: true,
  category: "saturday",
};

export const SHOW_RICH_VILLIANZ: ShowData = {
  id: "show_rich_villianz",
  name: "Rich Villianz Radio",
  slug: "rich-villianz-radio",
  hostNames: "DJ Ricovelli, Slim & DJ Tony Neal",
  hostIds: ["host_dj_ricovelli", "host_dj_tony_neal"],
  timeSlot: "7:00 PM - Midnight",
  days: "Saturday",
  streamId: "stream_wccg",
  description: "DJ Ricovelli, Slim, and the legendary DJ Tony Neal (founder of Core DJs) take over Saturday nights with Rich Villianz Radio. The hottest mixes, exclusive drops, and non-stop party energy.",
  tagline: "Saturday night takeover with the hottest DJ mixes",
  gradient: "from-[#1a0533] via-[#0f0c29] to-[#302b63]",
  imageUrl: null,
  showImageUrl: null,
  isSyndicated: false,
  isActive: true,
  category: "saturday",
};

// ─── Sunday Shows ─────────────────────────────────────────────────

export const SHOW_PRAISE_MIX: ShowData = {
  id: "show_praise_mix",
  name: "The Praise Mix at 6",
  slug: "praise-mix",
  hostNames: "WCCG",
  hostIds: [],
  timeSlot: "6:00 AM - 8:00 AM",
  days: "Sunday",
  streamId: "stream_wccg",
  description: "Start your Sunday morning with an uplifting mix of gospel music, praise and worship, and inspirational tracks.",
  tagline: "Start your Sunday with praise and worship",
  gradient: "from-[#1a1a2e] via-[#16213e] to-[#0d1b2a]",
  imageUrl: null,
  showImageUrl: null,
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
  showImageUrl: null,
  isSyndicated: false,
  isActive: true,
  category: "gospel",
};

export const SHOW_ENCOURAGING_MOMENTS: ShowData = {
  id: "show_encouraging_moments",
  name: "Encouraging Moments",
  slug: "encouraging-moments",
  hostNames: "Dr. Anthony Haire",
  hostIds: ["host_dr_haire"],
  timeSlot: "9:00 AM - 10:00 AM",
  days: "Sunday",
  streamId: "stream_wccg",
  description: "Dr. Anthony Haire provides spiritual encouragement, biblical teaching, and hope to the Fayetteville community and beyond every Sunday morning.",
  tagline: "Spiritual encouragement and biblical teaching",
  gradient: "from-[#16213e] via-[#1a1a2e] to-[#0d1b2a]",
  imageUrl: null,
  showImageUrl: null,
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
  showImageUrl: null,
  isSyndicated: true,
  isActive: true,
  category: "gospel",
};

export const SHOW_FAMILY_FELLOWSHIP: ShowData = {
  id: "show_family_fellowship",
  name: "Family Fellowship Worship Center",
  slug: "family-fellowship",
  hostNames: "Pastor Dr. T.L. Davenport",
  hostIds: ["host_pastor_davenport"],
  timeSlot: "12:00 PM - 1:00 PM",
  days: "Sunday",
  streamId: "stream_wccg",
  description: "Pastor Dr. T.L. Davenport leads the Family Fellowship Worship Center broadcast with powerful sermons and spiritual guidance.",
  tagline: "Powerful sermons and spiritual guidance",
  gradient: "from-[#0d1b2a] via-[#1a1a2e] to-[#16213e]",
  imageUrl: null,
  showImageUrl: null,
  isSyndicated: false,
  isActive: true,
  category: "gospel",
};

export const SHOW_PROGRESSIVE_MBC: ShowData = {
  id: "show_progressive_mbc",
  name: "Progressive Missionary Baptist Church",
  slug: "progressive-mbc",
  hostNames: "Rev. F. Bernard Fuller",
  hostIds: ["host_rev_fuller"],
  timeSlot: "1:00 PM - 2:00 PM",
  days: "Sunday",
  streamId: "stream_wccg",
  description: "Rev. F. Bernard Fuller brings the Sunday service from Progressive Missionary Baptist Church to the airwaves.",
  tagline: "Faith-based Sunday service broadcast",
  gradient: "from-[#16213e] via-[#0d1b2a] to-[#1a1a2e]",
  imageUrl: null,
  showImageUrl: null,
  isSyndicated: false,
  isActive: true,
  category: "gospel",
};

export const SHOW_LEWIS_CHAPEL: ShowData = {
  id: "show_lewis_chapel",
  name: "Lewis Chapel Missionary Baptist Church",
  slug: "lewis-chapel",
  hostNames: "Dr. Christopher Stackhouse, Sr.",
  hostIds: ["host_dr_stackhouse"],
  timeSlot: "2:00 PM - 3:00 PM",
  days: "Sunday",
  streamId: "stream_wccg",
  description: "Dr. Christopher Stackhouse, Sr. leads the Lewis Chapel Missionary Baptist Church broadcast every Sunday afternoon.",
  tagline: "Inspirational Sunday afternoon messages",
  gradient: "from-[#1a1a2e] via-[#16213e] to-[#0d1b2a]",
  imageUrl: null,
  showImageUrl: null,
  isSyndicated: false,
  isActive: true,
  category: "gospel",
};

export const SHOW_WEEKEND_WRAPUP: ShowData = {
  id: "show_weekend_wrapup",
  name: "The Weekend Wrap-Up",
  slug: "weekend-wrapup",
  hostNames: "WCCG",
  hostIds: [],
  timeSlot: "3:00 PM - 7:00 PM",
  days: "Sunday",
  streamId: "stream_wccg",
  description: "Wind down the weekend with the best in R&B and hip hop as we wrap up Sunday and get you ready for the week ahead.",
  tagline: "Wrapping up the weekend with the best music",
  gradient: "from-[#0f3460] via-[#16213e] to-[#1a1a2e]",
  imageUrl: null,
  showImageUrl: null,
  isSyndicated: false,
  isActive: true,
  category: "sunday",
};

export const SHOW_SUNDAY_SNACKS: ShowData = {
  id: "show_sunday_snacks",
  name: "Sunday Snacks",
  slug: "sunday-snacks",
  hostNames: "Carolina Trendsetter, DJ Ike GDA & DJ Izzynice",
  hostIds: ["host_carolina_trendsetter", "host_dj_ike_gda", "host_dj_izzynice"],
  timeSlot: "7:00 PM - Midnight",
  days: "Sunday",
  streamId: "stream_wccg",
  description: "Carolina Trendsetter, DJ Ike GDA, and DJ Izzynice close out the weekend with Sunday Snacks. The best in regional hip hop, DJ mixes, and party vibes to end your Sunday right.",
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

export const SHOW_MIXTAPE_RADIO: ShowData = {
  id: "show_mixtape_radio",
  name: "Mixtape Radio",
  slug: "mixtape-radio",
  hostNames: "WCCG",
  hostIds: [],
  timeSlot: "Midnight - 6:00 AM",
  days: "Saturday",
  streamId: "stream_wccg",
  description: "Late night Saturday vibes with the best mixtape selections and underground tracks to keep the party going until dawn.",
  tagline: "Late night mixtape sessions",
  gradient: "from-[#0f0c29] via-[#1a0533] to-[#24243e]",
  imageUrl: null,
  showImageUrl: null,
  isSyndicated: false,
  isActive: true,
  category: "saturday",
};

// ─── All Shows ────────────────────────────────────────────────────

export const ALL_SHOWS: ShowData[] = [
  SHOW_STREETZ_MORNING,
  SHOW_ANGELA_YEE,
  SHOW_CRANK_CORLEONE,
  SHOW_POSTED_CORNER,
  SHOW_BOOTLEG_KEV,
  SHOW_STREETZ_WEEKEND,
  SHOW_WEEKEND_BRUNCH,
  SHOW_DAY_PARTY,
  SHOW_RICH_VILLIANZ,
  SHOW_MIXTAPE_RADIO,
  SHOW_PRAISE_MIX,
  SHOW_GRACE_PLUS_NOTHING,
  SHOW_ENCOURAGING_MOMENTS,
  SHOW_MARVIN_SAPP,
  SHOW_FAMILY_FELLOWSHIP,
  SHOW_PROGRESSIVE_MBC,
  SHOW_LEWIS_CHAPEL,
  SHOW_WEEKEND_WRAPUP,
  SHOW_SUNDAY_SNACKS,
  SHOW_MIXSQUAD_RADIO,
];

/** Hero slides — the main featured shows for the homepage carousel */
export const HERO_SHOWS: ShowData[] = [
  SHOW_STREETZ_MORNING,
  SHOW_ANGELA_YEE,
  SHOW_CRANK_CORLEONE,
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
