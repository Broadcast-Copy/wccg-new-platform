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
  hostImageUrl?: string | null;
  heroImageClass?: string;
  youtube?: {
    channelName: string;
    channelUrl: string;
    channelId?: string;
    searchQuery: string;
  };
  podcastRss?: string;
  segments?: string[];
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
  name: "Yung Joc and The Streetz Morning Takeover",
  slug: "streetz-morning-takeover",
  hostNames: "Yung Joc, Mz Shyneka & Shawty Shawty",
  hostIds: ["host_yung_joc", "host_mz_shyneka", "host_shawty_shawty", "host_dj_swin", "host_et_cali"],
  timeSlot: "6:00 AM - 10:00 AM",
  days: "Monday - Friday",
  streamId: "stream_wccg",
  description: "North Carolina's #1 Hip-Hop morning show on WCCG 104.5 FM, hosted by Yung Joc, Mz Shyneka, and Shawty Shawty. It's a high-energy mix of the hottest Hip-Hop & R&B, celebrity gossip, viral trending topics, relationship drama (Date Dilemma), wild news (Shawty's Crazy Report), and non-stop laughs — the unfiltered soundtrack that wakes up the city and the culture every weekday.",
  tagline: "North Carolina's #1 Hip-Hop Morning Show",
  gradient: "from-[#1a0a2e] via-[#16213e] to-[#0f3460]",
  imageUrl: "/images/hosts/yung-joc.png",
  showImageUrl: "https://wccg1045fm.com/wp-content/uploads/2025/09/streetz.png",
  hostImageUrl: "https://wccg1045fm.com/wp-content/uploads/2025/11/attachment-thumbnail_new-streetz-pix.png",
  heroImageClass: "object-cover object-top",
  youtube: {
    channelName: "Streetz Morning Takeover",
    channelUrl: "https://youtube.com/@WCCG1045FM",
    searchQuery: "Streetz Morning Takeover WCCG",
  },
  podcastRss: "https://feeds.simplecast.com/c3z3h1Ug",
  segments: ["Date Dilemma", "Shawty's Crazy Report", "Celebrity Interviews", "Trending Topics"],
  isSyndicated: true,
  isActive: true,
  category: "weekday",
};

export const SHOW_WAY_UP_ANGELA_YEE: ShowData = {
  id: "show_way_up_angela_yee",
  name: "Way Up with Angela Yee",
  slug: "way-up-angela-yee",
  hostNames: "Angela Yee",
  hostIds: ["host_angela_yee"],
  timeSlot: "10:00 AM - 2:00 PM",
  days: "Monday - Friday",
  streamId: "stream_wccg",
  description: "The syndicated midday Hip-Hop and R&B powerhouse featuring witty, empowering vibes with trending topics, relationship advice, anonymous secrets, and A-list interviews. Angela Yee is the ultimate midday motivator for urban listeners nationwide.",
  tagline: "The ultimate midday motivator",
  gradient: "from-[#1a0533] via-[#2d1b69] to-[#1a1a2e]",
  imageUrl: "https://wccg1045fm.com/wp-content/uploads/2025/09/angela-yee-new-2.png",
  showImageUrl: "https://wccg1045fm.com/wp-content/uploads/2025/09/yee-01.png",
  hostImageUrl: "https://wccg1045fm.com/wp-content/uploads/2025/11/angela-yee-tamara-beckwith-ny-post-01.webp",
  youtube: {
    channelName: "Way Up With Angela Yee",
    channelUrl: "https://www.youtube.com/@wayupwithyee",
    channelId: "UCJVR_M2dXZT6uXIapYGHtTA",
    searchQuery: "Way Up With Angela Yee",
  },
  segments: ["Shine a Light on 'Em", "Tell Us a Secret", "Rumor Report", "Ask Yee"],
  isSyndicated: true,
  isActive: true,
  category: "weekday",
};

export const SHOW_IN_IT_BIG_A: ShowData = {
  id: "show_in_it_big_a",
  name: "In It with Big A",
  slug: "in-it-with-big-a",
  hostNames: "Big A",
  hostIds: ["host_big_a"],
  timeSlot: "On Demand",
  days: "Weekly",
  streamId: "stream_wccg",
  description: "Big A keeps it real with unfiltered conversations, community topics, and the kind of talk that hits different. In It with Big A is the podcast where real life meets real talk.",
  tagline: "Real life meets real talk",
  gradient: "from-[#1a0533] via-[#2d1b69] to-[#1a1a2e]",
  imageUrl: null,
  showImageUrl: null,
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
  timeSlot: "2:00 PM - 7:00 PM",
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
  name: "Posted on The Corner",
  slug: "posted-on-the-corner",
  hostNames: "Incognito & DJ Misses",
  hostIds: ["host_incognito", "host_dj_misses"],
  timeSlot: "7:00 PM - Midnight",
  days: "Monday - Friday",
  streamId: "stream_wccg",
  description: "The syndicated weeknight Hip-Hop and R&B party show featuring high-energy vibes, exclusive celebrity interviews, fan-voted Top 7 Countdowns, wild Trending on the Timeline segments, and interactive trivia that turns listeners into the real stars of the show. Airing in over 20 markets including Atlanta, Houston, Dallas, Cleveland, Baltimore, Detroit, Indianapolis, and Raleigh.",
  tagline: "The syndicated weeknight Hip-Hop party in 20+ markets",
  gradient: "from-[#0a1628] via-[#1a0a2e] to-[#162447]",
  imageUrl: "/images/incognito-new.png",
  showImageUrl: "/images/incognito-new.png",
  hostImageUrl: "/images/incognito-new.png",
  youtube: {
    channelName: "Posted On The Corner",
    channelUrl: "https://www.youtube.com/@PostedOnTheCorner",
    channelId: "UCB4JlD2jIkXanFehab9CbDw",
    searchQuery: "Posted on The Corner",
  },
  segments: ["Top 7 Countdown", "Posted on The Corner Trivia", "Trending on the Timeline", "Celebrity Interviews"],
  isSyndicated: true,
  isActive: true,
  category: "weekday",
};

export const SHOW_BOOTLEG_KEV: ShowData = {
  id: "show_bootleg_kev",
  name: "The Bootleg Kev Show",
  slug: "bootleg-kev-show",
  hostNames: "Bootleg Kev, James Andre Jefferson Jr. & DJ Sam I Am",
  hostIds: ["host_bootleg_kev"],
  timeSlot: "Midnight - 6:00 AM",
  days: "Monday - Friday",
  streamId: "stream_wccg",
  description: "A nationally syndicated hip-hop overnight program featuring exclusive artist interviews, viral freestyles, No Cap News, wild caller roasts, and non-stop bangers. Bootleg Kev, James Andre Jefferson Jr., and DJ Sam I Am target night-shift workers, insomniacs, and late-night culture enthusiasts across 80+ stations with raw, unfiltered hip-hop culture and celebrity access.",
  tagline: "Overnight hip-hop across 80+ stations",
  gradient: "from-[#1a0533] via-[#0d1b2a] to-[#1b2838]",
  imageUrl: "https://wccg1045fm.com/wp-content/uploads/2025/09/bootleg-kev-new1.png",
  showImageUrl: "https://wccg1045fm.com/wp-content/uploads/2025/09/bootleg-kev-new1.png",
  hostImageUrl: "https://wccg1045fm.com/wp-content/uploads/2025/11/GAxhqlAXcAAPZOQ.jpg",
  youtube: {
    channelName: "Bootleg Kev",
    channelUrl: "https://www.youtube.com/@BootlegKev",
    channelId: "UCBgOGeH-NL4o2WGutwverqQ",
    searchQuery: "Bootleg Kev",
  },
  segments: ["No Cap News", "Artist Freestyles", "Pop Culture Debates", "Listener Call-ins"],
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
  youtube: {
    channelName: "Grace Plus Nothing",
    channelUrl: "https://www.youtube.com/@anthonymonds3736",
    channelId: "UCRqRVNSRMdIQqZw60bAgN1w",
    searchQuery: "Grace Plus Nothing Ministries",
  },
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
  youtube: {
    channelName: "Encouraging Moments",
    channelUrl: "https://www.youtube.com/@encouraging1moment",
    channelId: "UCvxWyn4rfcI2H9APhfUIB1Q",
    searchQuery: "Encouraging Moments Dr Anthony Haire",
  },
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
  youtube: {
    channelName: "Family Fellowship Worship Center",
    channelUrl: "https://www.youtube.com/@weareffwc",
    channelId: "UCxTzK_2da5bZag5WTAbiVzQ",
    searchQuery: "Family Fellowship Worship Center",
  },
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
  youtube: {
    channelName: "Progressive Missionary Baptist Church",
    channelUrl: "https://www.youtube.com/@progressivemissionarybapti7744",
    channelId: "UCavo4QHyzuMM2FED2W6PwEg",
    searchQuery: "Progressive Missionary Baptist Church",
  },
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
  youtube: {
    channelName: "Lewis Chapel Missionary Baptist Church",
    channelUrl: "https://www.youtube.com/@lewischapelmissionarybapti4024",
    channelId: "UCOe1fQxFPHNf3N7Rb55ySTA",
    searchQuery: "Lewis Chapel Missionary Baptist Church",
  },
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
  name: "Crank with Shorty Corleone",
  slug: "crank-shorty-corleone",
  hostNames: "Shorty Corleone",
  hostIds: ["host_shorty_corleone"],
  timeSlot: "5:00 PM - 6:00 PM",
  days: "Sunday",
  streamId: "stream_wccg",
  description: "Go-Go legend Shorty Corleone cranks up Fayetteville with one hour of pure DMV fire — blending D.C.'s pocket-heavy classics from Rare Essence and Chuck Brown with fresh Hip-Hop remixes, live scratches, and call-in shoutouts. A Rare Essence alumnus with a Warner Bros. publishing deal at age 14, Corleone also co-hosts Sirius XM's syndicated Crank Radio on H.U.R. Voices.",
  tagline: "One hour of pure DMV fire every Sunday",
  gradient: "from-[#302b63] via-[#0f0c29] to-[#1a0533]",
  imageUrl: "https://wccg1045fm.com/wp-content/uploads/2025/11/shorty-corleone-new.png",
  showImageUrl: "https://wccg1045fm.com/wp-content/uploads/2025/11/shorty-corleone-new.png",
  hostImageUrl: "https://wccg1045fm.com/wp-content/uploads/2025/11/shorty-corleone.png",
  isSyndicated: false,
  isActive: true,
  category: "sunday",
};

export const SHOW_SUNDAY_SNACKS: ShowData = {
  id: "show_sunday_snacks",
  name: "Sunday Snacks",
  slug: "sunday-snacks",
  hostNames: "DJ Ike GDA & DJ IzzyNice",
  hostIds: ["host_dj_ike_gda", "host_dj_izzynice"],
  timeSlot: "7:00 PM - Midnight",
  days: "Sunday",
  streamId: "stream_wccg",
  description: "The Wright Brothers of the turntables deliver five straight hours of soul food for your speakers: classic throwbacks, brand-new heat, exclusive remixes, and live scratches that make the subs knock. DJ Ike GDA, a veteran turntablist and Carolina Trendsetter with three decades in Southern hip-hop, teams with DJ IzzyNice, a high-octane mixer with 20+ years in Carolina nightlife.",
  tagline: "Five hours of soul food for your speakers",
  gradient: "from-[#302b63] via-[#0f0c29] to-[#24243e]",
  imageUrl: "/images/WRIGHT-BROS.png",
  showImageUrl: "/images/WRIGHT-BROS.png",
  hostImageUrl: "/images/WRIGHT-BROS.png",
  heroImageClass: "object-cover object-center",
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

export const SHOW_ISLAND_FREQUENCY: ShowData = {
  id: "show_island_frequency",
  name: "The Island Frequency Podcast",
  slug: "island-frequency-podcast",
  hostNames: "DJ Daffie",
  hostIds: ["host_dj_daffie"],
  timeSlot: "Sunday Evenings",
  days: "Sunday",
  streamId: "stream_wccg",
  description: "DJ Daffie brings Caribbean and island vibes to the airwaves with The Island Frequency Podcast. A DJ and performer from Queens/Long Island, New York, Daffie blends dancehall, soca, reggae, and Afrobeats with hip-hop for a unique island-urban fusion.",
  tagline: "Caribbean vibes and island-urban fusion",
  gradient: "from-[#0f3460] via-[#16213e] to-[#1a0533]",
  imageUrl: "https://wccg1045fm.com/wp-content/uploads/2026/02/island-freq.png",
  showImageUrl: "https://wccg1045fm.com/wp-content/uploads/2026/02/island-freq.png",
  hostImageUrl: "https://wccg1045fm.com/wp-content/uploads/2026/02/IMG_5248-5-scaled.jpg",
  isSyndicated: false,
  isActive: true,
  category: "sunday",
};

export const SHOW_ABC_NEWS: ShowData = {
  id: "show_abc_news",
  name: "ABC News Updates",
  slug: "abc-news",
  hostNames: "ABC News",
  hostIds: [],
  timeSlot: "Hourly",
  days: "Monday - Friday",
  streamId: "stream_wccg",
  description: "Stay informed with ABC News updates airing throughout the day on WCCG 104.5 FM. National and world news coverage keeping you connected to breaking stories and trending topics.",
  tagline: "National news updates throughout the day",
  gradient: "from-[#0a0a1a] via-[#1a1a2e] to-[#16213e]",
  imageUrl: null,
  showImageUrl: null,
  youtube: {
    channelName: "ABC News",
    channelUrl: "https://www.youtube.com/@ABCNews",
    channelId: "UCBi2mrWuNuyYy4gbM6fU18Q",
    searchQuery: "ABC News",
  },
  isSyndicated: true,
  isActive: true,
  category: "weekday",
};

// ─── Podcast-Only Shows ──────────────────────────────────────────

export const SHOW_CAROLINA_EFFECT: ShowData = {
  id: "show_carolina_effect",
  name: "The Carolina Effect with J. Reid",
  slug: "carolina-effect",
  hostNames: "J. Reid",
  hostIds: ["host_j_reid"],
  timeSlot: "On Demand",
  days: "Weekly",
  streamId: "stream_wccg",
  description: "J. Reid takes listeners on a deep dive into Carolina culture — music, sports, lifestyle, and the people shaping the Carolinas. Real conversations with local influencers, artists, and community leaders.",
  tagline: "The pulse of Carolina culture",
  gradient: "from-[#1e3a5f] via-[#0d2137] to-[#0a0a0f]",
  imageUrl: null,
  showImageUrl: null,
  isSyndicated: false,
  isActive: true,
  category: "weekday",
};

export const SHOW_INSIDE_THE_LINES: ShowData = {
  id: "show_inside_the_lines",
  name: "Inside The Lines with James Sanders III",
  slug: "inside-the-lines",
  hostNames: "James Sanders III",
  hostIds: ["host_james_sanders"],
  timeSlot: "On Demand",
  days: "Weekly",
  streamId: "stream_wccg",
  description: "Sports analyst James Sanders III goes beyond the box scores to bring listeners the stories, strategy, and culture behind the games. From college hoops to the NFL, Inside The Lines delivers expert analysis with a Carolina perspective.",
  tagline: "Beyond the box scores",
  gradient: "from-[#003087] via-[#001f5c] to-[#0a0a0f]",
  imageUrl: null,
  showImageUrl: null,
  isSyndicated: false,
  isActive: true,
  category: "weekday",
};

export const SHOW_FRIDAY_NIGHT_SHOCKWAVE: ShowData = {
  id: "show_friday_night_shockwave",
  name: "Friday Night Shockwave",
  slug: "friday-night-shockwave",
  hostNames: "WCCG",
  hostIds: [],
  timeSlot: "Friday Nights",
  days: "Friday",
  streamId: "stream_wccg",
  description: "The ultimate Friday night experience — non-stop bangers, exclusive mixes, and high-voltage energy to kick off your weekend. Friday Night Shockwave delivers the hardest-hitting playlist on Carolina radio.",
  tagline: "High-voltage Friday nights",
  gradient: "from-[#dc2626] via-[#7401df] to-[#0a0a0f]",
  imageUrl: null,
  showImageUrl: null,
  isSyndicated: false,
  isActive: true,
  category: "weekday",
};

// ─── All Shows ────────────────────────────────────────────────────

export const ALL_SHOWS: ShowData[] = [
  // Weekday
  SHOW_STREETZ_MORNING,
  SHOW_WAY_UP_ANGELA_YEE,
  SHOW_GENERAL_PROGRAMMING_WEEKDAY,
  SHOW_POSTED_CORNER,
  SHOW_BOOTLEG_KEV,
  SHOW_ABC_NEWS,
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
  SHOW_ISLAND_FREQUENCY,
  // 24/7 Stream
  SHOW_MIXSQUAD_RADIO,
  // Podcast-Only
  SHOW_IN_IT_BIG_A,
  SHOW_CAROLINA_EFFECT,
  SHOW_INSIDE_THE_LINES,
  SHOW_FRIDAY_NIGHT_SHOCKWAVE,
];

/** Hero slides — the main featured shows for the homepage carousel */
export const HERO_SHOWS: ShowData[] = [
  SHOW_STREETZ_MORNING,
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
