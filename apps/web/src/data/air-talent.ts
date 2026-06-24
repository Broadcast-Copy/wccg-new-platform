/**
 * Air-talent imagery — maps the weekly schedule's host names and show ids to
 * the headshot / show-art assets that already ship in `public/images`.
 *
 * Used by the global player to show WHO is on the air (DJ headshot) and WHAT
 * program is running (show artwork) alongside the now-playing song.
 *
 * Keep these keyed to the exact `hostNames` substrings and `showId`s used in
 * `src/data/schedule.ts`.
 */

import type { ScheduleBlock } from "@/data/schedule";

/** Default art when a show has no specific host/program image (network programming). */
export const DEFAULT_SHOW_ART = "/images/channels/wccg-badge.png";

/**
 * Host name → headshot. Keys are matched as case-insensitive substrings against
 * a block's `hostNames`, so "Yung Joc, Mz Shyneka & Shawty Shawty" resolves via
 * the "Yung Joc" key. Order matters: the first key found in the string wins.
 */
export const HOST_IMAGES: Record<string, string> = {
  "Yung Joc": "/images/hosts/yung-joc.png",
  "Angela Yee": "/images/hosts/angela-yee.png",
  "Incognito": "/images/hosts/incognito.png",
  "DJ Ricovelli": "/images/hosts/dj-ricoveli.png",
  "DJ Tony Neal": "/images/hosts/dj-tony-neal.png",
  "Shorty Corleone": "/images/hosts/shorty-corleone.png",
  "Marvin Sapp": "/images/marvin-sapp-banner.png",
  "Wright Brothers": "/images/WRIGHT-BROS.png",
};

/** Show id → program artwork. Falls back to the host headshot, then DEFAULT_SHOW_ART. */
export const SHOW_IMAGES: Record<string, string> = {
  show_bootleg_kev: "/images/shows/bootleg-kev-show.png",
  show_streetz_morning: "/images/shows/streetz-morning-takeover.png",
  show_streetz_weekend_countdown: "/images/shows/streetz-morning-takeover.png",
  show_way_up_angela_yee: "/images/hosts/angela-yee.png",
  show_posted_corner: "/images/hosts/incognito.png",
  show_riich_villianz: "/images/hosts/dj-ricoveli.png",
  show_marvin_sapp: "/images/marvin-sapp-banner.png",
  show_general_programming_sunday: "/images/shows/crank-corleone.png",
  show_sunday_snacks: "/images/WRIGHT-BROS.png",
};

export interface AirTalent {
  /** DJ / host headshot, or null when it's automated/network programming. */
  hostImage: string | null;
  /** Program artwork (always non-null — falls back to the station badge). */
  showImage: string;
  /** Primary host display name (first matched), or null. */
  hostName: string | null;
}

/**
 * Resolve the on-air talent imagery for a schedule block.
 * A "WCCG" host (automated/network programming) yields no headshot.
 */
export function resolveAirTalent(block: ScheduleBlock | null): AirTalent | null {
  if (!block) return null;

  // Find the first known host name present in the block's hostNames string.
  let hostImage: string | null = null;
  let hostName: string | null = null;
  const names = block.hostNames || "";
  for (const key of Object.keys(HOST_IMAGES)) {
    if (names.toLowerCase().includes(key.toLowerCase())) {
      hostImage = HOST_IMAGES[key];
      hostName = key;
      break;
    }
  }

  const showImage =
    SHOW_IMAGES[block.showId] ?? hostImage ?? DEFAULT_SHOW_ART;

  return { hostImage, showImage, hostName };
}
