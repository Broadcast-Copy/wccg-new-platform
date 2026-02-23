/**
 * Centralized DJ/Host data — single source of truth
 * Sourced from wccg1045fm.com research (Feb 2026)
 */

export interface HostData {
  id: string;
  name: string;
  role: "Host" | "Co-Host" | "DJ" | "Fill-In" | "Pastor" | "Bishop";
  showIds: string[];
  bio: string;
  imageUrl: string | null;
  socialLinks: { platform: string; url: string; label: string }[];
  youtubeChannel?: string;
  isSyndicated?: boolean;
  isActive: boolean;
  category: "main" | "gospel" | "mixsquad" | "weekend" | "sunday";
}

// ─── Weekday Main Hosts ────────────────────────────────────────────
export const HOST_YUNG_JOC: HostData = {
  id: "host_yung_joc",
  name: "Yung Joc",
  role: "Host",
  showIds: ["show_streetz_morning", "show_streetz_weekend_countdown"],
  bio: "Rapper, DJ, and radio personality Yung Joc brings high energy and unfiltered takes to the Streetz Morning Takeover. Known for his hit 'It's Goin' Down' and his dynamic presence on Love & Hip Hop Atlanta, Joc delivers the hottest conversations, celebrity interviews, and the best morning mix of hip hop and R&B every weekday.",
  imageUrl: "/images/hosts/yung-joc.png",
  socialLinks: [
    { platform: "instagram", url: "https://instagram.com/jaborafaeldavismcintyre", label: "@jaborafaeldavismcintyre" },
    { platform: "twitter", url: "https://x.com/IBLOCKYOU", label: "@IBLOCKYOU" },
  ],
  isSyndicated: true,
  isActive: true,
  category: "main",
};

export const HOST_MZ_SHYNEKA: HostData = {
  id: "host_mz_shyneka",
  name: "Mz. Shyneka",
  role: "Co-Host",
  showIds: ["show_streetz_morning", "show_streetz_weekend_countdown"],
  bio: "Mz. Shyneka is the co-host of the Streetz Morning Takeover, bringing her witty personality, sharp commentary, and undeniable chemistry with the crew. She keeps the conversation real and the energy high every morning.",
  imageUrl: null,
  socialLinks: [
    { platform: "instagram", url: "https://instagram.com/mikiamz.shyneka", label: "@mikiamz.shyneka" },
  ],
  isSyndicated: true,
  isActive: true,
  category: "main",
};

export const HOST_SHAWTY_SHAWTY: HostData = {
  id: "host_shawty_shawty",
  name: "Shawty Shawty",
  role: "Co-Host",
  showIds: ["show_streetz_morning", "show_streetz_weekend_countdown"],
  bio: "Shawty Shawty rounds out the Streetz Morning Takeover crew with his unique perspective and humor. Together with Yung Joc and Mz. Shyneka, he helps deliver the morning show that wakes up the streets.",
  imageUrl: null,
  socialLinks: [],
  isSyndicated: true,
  isActive: true,
  category: "main",
};

export const HOST_DJ_SWIN: HostData = {
  id: "host_dj_swin",
  name: "DJ Swin",
  role: "DJ",
  showIds: ["show_streetz_morning"],
  bio: "DJ Swin keeps the music flowing as the official DJ of the Streetz Morning Takeover. His mixes set the tone every morning with the perfect blend of hip hop, R&B, and trending tracks.",
  imageUrl: null,
  socialLinks: [],
  isSyndicated: true,
  isActive: true,
  category: "main",
};

export const HOST_ET_CALI: HostData = {
  id: "host_et_cali",
  name: "ET Cali",
  role: "Fill-In",
  showIds: ["show_streetz_morning"],
  bio: "ET Cali serves as a fill-in host for the Streetz Morning Takeover, stepping in with his own brand of energy and entertainment when the crew needs backup.",
  imageUrl: null,
  socialLinks: [],
  isSyndicated: true,
  isActive: true,
  category: "main",
};

export const HOST_ANGELA_YEE: HostData = {
  id: "host_angela_yee",
  name: "Angela Yee",
  role: "Host",
  showIds: ["show_angela_yee"],
  bio: "Angela Yee is a media mogul, entrepreneur, and the host of Way Up with Angela Yee, syndicated nationally through Premiere Networks/iHeartRadio. Previously co-hosting the legendary Breakfast Club for over a decade, Angela brings celebrity interviews, relationship advice, trending topics, and cultural commentary to midday radio.",
  imageUrl: "/images/hosts/angela-yee.png",
  socialLinks: [
    { platform: "instagram", url: "https://instagram.com/angelayee", label: "@angelayee" },
    { platform: "twitter", url: "https://x.com/angelayee", label: "@angelayee" },
    { platform: "youtube", url: "https://youtube.com/@WayUpWithAngelaYee", label: "@WayUpWithAngelaYee" },
  ],
  youtubeChannel: "@WayUpWithAngelaYee",
  isSyndicated: true,
  isActive: true,
  category: "main",
};

export const HOST_INCOGNITO: HostData = {
  id: "host_incognito",
  name: "Incognito",
  role: "Host",
  showIds: ["show_posted_corner"],
  bio: "Incognito is the voice of Posted on the Corner, syndicated in 20+ markets nationwide. Known as Ncognito on some platforms, he delivers the hardest hip hop, exclusive freestyles, and unfiltered commentary every evening. From new music drops to street culture, The Corner is where the streets meet the airwaves.",
  imageUrl: "/images/hosts/incognito.png",
  socialLinks: [
    { platform: "instagram", url: "https://instagram.com/ncognito", label: "@ncognito" },
    { platform: "twitter", url: "https://x.com/ncognito", label: "@ncognito" },
  ],
  isSyndicated: true,
  isActive: true,
  category: "main",
};

export const HOST_DJ_MISSES: HostData = {
  id: "host_dj_misses",
  name: "DJ Misses",
  role: "Co-Host",
  showIds: ["show_posted_corner"],
  bio: "DJ Misses co-hosts Posted on the Corner alongside Incognito, keeping the mixes fresh and the energy up every evening. Her skills behind the decks complement the raw takes and conversation.",
  imageUrl: null,
  socialLinks: [],
  isSyndicated: true,
  isActive: true,
  category: "main",
};

export const HOST_BOOTLEG_KEV: HostData = {
  id: "host_bootleg_kev",
  name: "Bootleg Kev",
  role: "Host",
  showIds: ["show_bootleg_kev"],
  bio: "Bootleg Kev is a nationally syndicated radio host through Premiere Networks, known for his exclusive interviews with the biggest names in hip hop. With 468K+ YouTube subscribers, Kev connects listeners with first-listen sessions, behind-the-scenes industry stories, and breaking music from coast to coast.",
  imageUrl: null,
  socialLinks: [
    { platform: "youtube", url: "https://youtube.com/@bootlegkev", label: "@bootlegkev" },
    { platform: "instagram", url: "https://instagram.com/bootlegkev", label: "@bootlegkev" },
    { platform: "twitter", url: "https://x.com/bootlegkev", label: "@bootlegkev" },
  ],
  youtubeChannel: "@bootlegkev",
  isSyndicated: true,
  isActive: true,
  category: "main",
};

// ─── Weekend Hosts ────────────────────────────────────────────────

export const HOST_SHORTY_CORLEONE: HostData = {
  id: "host_shorty_corleone",
  name: "Shorty Corleone",
  role: "Host",
  showIds: ["show_crank_corleone"],
  bio: "Shorty Corleone brings certified bangers, underground hip hop, and the best in Southern rap every weeknight on Crank. From trap classics to new fire, Crank is the soundtrack for the late night.",
  imageUrl: "/images/hosts/shorty-corleone.png",
  socialLinks: [],
  isActive: true,
  category: "main",
};

export const HOST_DJ_RICOVELLI: HostData = {
  id: "host_dj_ricovelli",
  name: "DJ Ricovelli",
  role: "DJ",
  showIds: ["show_rich_villianz", "show_mixsquad_radio"],
  bio: "DJ Ricovelli is a core member of both Rich Villianz Radio and MixxSquadd Radio. As one of the featured Saturday night DJs, he brings high-energy sets blending hip hop, trap, and club tracks to keep the party going all night.",
  imageUrl: null,
  socialLinks: [],
  isActive: true,
  category: "weekend",
};

export const HOST_DJ_TONY_NEAL: HostData = {
  id: "host_dj_tony_neal",
  name: "DJ Tony Neal",
  role: "DJ",
  showIds: ["show_rich_villianz"],
  bio: "DJ Tony Neal is the founder of Core DJs, one of the most influential DJ coalitions in the industry. He brings his legendary mixing skills and deep industry connections to Rich Villianz Radio every Saturday night.",
  imageUrl: null,
  socialLinks: [
    { platform: "website", url: "https://djtonyneal.com", label: "djtonyneal.com" },
    { platform: "instagram", url: "https://instagram.com/djtonyneal", label: "@djtonyneal" },
  ],
  isActive: true,
  category: "weekend",
};

// ─── Sunday Hosts ─────────────────────────────────────────────────

export const HOST_CAROLINA_TRENDSETTER: HostData = {
  id: "host_carolina_trendsetter",
  name: "Carolina Trendsetter",
  role: "DJ",
  showIds: ["show_sunday_snacks"],
  bio: "Carolina Trendsetter anchors Sunday Snacks alongside DJ Ike GDA and DJ Izzynice, bringing the best in regional hip hop and DJ mixes every Sunday night to close out the weekend.",
  imageUrl: null,
  socialLinks: [],
  isActive: true,
  category: "sunday",
};

export const HOST_DJ_IKE_GDA: HostData = {
  id: "host_dj_ike_gda",
  name: "DJ Ike GDA",
  role: "DJ",
  showIds: ["show_sunday_snacks"],
  bio: "DJ Ike GDA is part of the Sunday Snacks crew, delivering club-ready mixes and the hottest tracks to wrap up the weekend right.",
  imageUrl: null,
  socialLinks: [],
  isActive: true,
  category: "sunday",
};

export const HOST_DJ_IZZYNICE: HostData = {
  id: "host_dj_izzynice",
  name: "DJ Izzynice",
  role: "DJ",
  showIds: ["show_sunday_snacks"],
  bio: "DJ Izzynice rounds out the Sunday Snacks team, bringing smooth transitions and eclectic selections to the Sunday night mix.",
  imageUrl: null,
  socialLinks: [],
  isActive: true,
  category: "sunday",
};

// ─── Gospel Hosts ──────────────────────────────────────────────────

export const HOST_MARVIN_SAPP: HostData = {
  id: "host_marvin_sapp",
  name: "Bishop Marvin Sapp",
  role: "Bishop",
  showIds: ["show_marvin_sapp"],
  bio: "Bishop Marvin Sapp is a multi-Grammy nominated gospel artist and pastor. The Marvin Sapp Radio Show blends inspirational conversation, gospel music, and uplifting messages every Sunday morning. Known worldwide for his timeless hit 'Never Would Have Made It.'",
  imageUrl: null,
  socialLinks: [
    { platform: "instagram", url: "https://instagram.com/bishopmarvinlsapp", label: "@bishopmarvinlsapp" },
  ],
  isSyndicated: true,
  isActive: true,
  category: "gospel",
};

export const HOST_APOSTLE_MONDS: HostData = {
  id: "host_apostle_monds",
  name: "Apostle Anthony Monds",
  role: "Pastor",
  showIds: ["show_grace_plus_nothing"],
  bio: "Apostle Anthony Monds leads the Grace Plus Nothing Ministries broadcast every Sunday morning, sharing messages of faith, grace, and community as part of the Sunday Gospel Caravan on WCCG.",
  imageUrl: null,
  socialLinks: [],
  isActive: true,
  category: "gospel",
};

export const HOST_DR_HAIRE: HostData = {
  id: "host_dr_haire",
  name: "Dr. Anthony Haire",
  role: "Pastor",
  showIds: ["show_encouraging_moments"],
  bio: "Dr. Anthony Haire hosts Encouraging Moments, a Sunday morning broadcast that provides spiritual encouragement, biblical teaching, and hope to the Fayetteville community and beyond.",
  imageUrl: null,
  socialLinks: [],
  isActive: true,
  category: "gospel",
};

export const HOST_PASTOR_DAVENPORT: HostData = {
  id: "host_pastor_davenport",
  name: "Pastor Dr. T.L. Davenport",
  role: "Pastor",
  showIds: ["show_family_fellowship"],
  bio: "Pastor Dr. T.L. Davenport leads the Family Fellowship Worship Center broadcast, bringing powerful Sunday sermons and spiritual guidance to the WCCG 104.5 FM audience.",
  imageUrl: null,
  socialLinks: [],
  isActive: true,
  category: "gospel",
};

export const HOST_REV_FULLER: HostData = {
  id: "host_rev_fuller",
  name: "Rev. F. Bernard Fuller",
  role: "Pastor",
  showIds: ["show_progressive_mbc"],
  bio: "Rev. F. Bernard Fuller brings the Sunday service from Progressive Missionary Baptist Church to the airwaves, reaching the community with faith-based programming each week.",
  imageUrl: null,
  socialLinks: [],
  isActive: true,
  category: "gospel",
};

export const HOST_DR_STACKHOUSE: HostData = {
  id: "host_dr_stackhouse",
  name: "Dr. Christopher Stackhouse, Sr.",
  role: "Pastor",
  showIds: ["show_lewis_chapel"],
  bio: "Dr. Christopher Stackhouse, Sr. leads the Lewis Chapel Missionary Baptist Church broadcast every Sunday afternoon, providing inspirational messages and worship to the Fayetteville area.",
  imageUrl: null,
  socialLinks: [],
  isActive: true,
  category: "gospel",
};

// ─── MixxSquadd DJs ───────────────────────────────────────────────

export const HOST_DJ_SPINWIZ: HostData = {
  id: "host_dj_spinwiz",
  name: "DJ SpinWiz",
  role: "DJ",
  showIds: ["show_mixsquad_radio"],
  bio: "DJ SpinWiz is part of the MixxSquadd Radio roster, contributing to the 24/7 DJ mix stream with high-energy sets and creative blends.",
  imageUrl: null,
  socialLinks: [],
  isActive: true,
  category: "mixsquad",
};

export const HOST_DJ_RAYN: HostData = {
  id: "host_dj_rayn",
  name: "DJ Rayn",
  role: "DJ",
  showIds: ["show_mixsquad_radio"],
  bio: "DJ Rayn brings smooth transitions and diverse track selections to the MixxSquadd Radio 24/7 stream.",
  imageUrl: null,
  socialLinks: [],
  isActive: true,
  category: "mixsquad",
};

export const HOST_DJ_TOMMYGEE: HostData = {
  id: "host_dj_tommygee",
  name: "DJ TommyGee Mixx",
  role: "DJ",
  showIds: ["show_mixsquad_radio"],
  bio: "DJ TommyGee Mixx is a featured DJ on MixxSquadd Radio, known for his party-rocking mixes that keep the energy going around the clock.",
  imageUrl: null,
  socialLinks: [],
  isActive: true,
  category: "mixsquad",
};

export const HOST_DJ_YODO: HostData = {
  id: "host_dj_yodo",
  name: "DJ Yodo",
  role: "DJ",
  showIds: ["show_mixsquad_radio"],
  bio: "DJ Yodo rounds out the MixxSquadd Radio lineup, delivering non-stop mixes that span hip hop, R&B, dancehall, and more.",
  imageUrl: null,
  socialLinks: [],
  isActive: true,
  category: "mixsquad",
};

// ─── All Hosts Array ──────────────────────────────────────────────

export const ALL_HOSTS: HostData[] = [
  HOST_YUNG_JOC,
  HOST_MZ_SHYNEKA,
  HOST_SHAWTY_SHAWTY,
  HOST_DJ_SWIN,
  HOST_ET_CALI,
  HOST_ANGELA_YEE,
  HOST_INCOGNITO,
  HOST_DJ_MISSES,
  HOST_BOOTLEG_KEV,
  HOST_SHORTY_CORLEONE,
  HOST_DJ_RICOVELLI,
  HOST_DJ_TONY_NEAL,
  HOST_CAROLINA_TRENDSETTER,
  HOST_DJ_IKE_GDA,
  HOST_DJ_IZZYNICE,
  HOST_MARVIN_SAPP,
  HOST_APOSTLE_MONDS,
  HOST_DR_HAIRE,
  HOST_PASTOR_DAVENPORT,
  HOST_REV_FULLER,
  HOST_DR_STACKHOUSE,
  HOST_DJ_SPINWIZ,
  HOST_DJ_RAYN,
  HOST_DJ_TOMMYGEE,
  HOST_DJ_YODO,
];

export const MAIN_HOSTS = ALL_HOSTS.filter((h) => h.category === "main");
export const GOSPEL_HOSTS = ALL_HOSTS.filter((h) => h.category === "gospel");
export const MIXSQUAD_HOSTS = ALL_HOSTS.filter((h) => h.category === "mixsquad");
export const WEEKEND_HOSTS = ALL_HOSTS.filter((h) => h.category === "weekend");
export const SUNDAY_HOSTS = ALL_HOSTS.filter((h) => h.category === "sunday");

/** Lookup host by ID */
export function getHostById(id: string): HostData | undefined {
  return ALL_HOSTS.find((h) => h.id === id);
}

/** Get all hosts for a given show */
export function getHostsByShowId(showId: string): HostData[] {
  return ALL_HOSTS.filter((h) => h.showIds.includes(showId));
}
