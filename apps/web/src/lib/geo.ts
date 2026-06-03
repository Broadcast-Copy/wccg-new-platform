import type { SupabaseClient } from "@supabase/supabase-js";

const OPT_IN_KEY = "wccg_geo_rewards";
const LAST_KEY = "wccg_geo_last";
const THROTTLE_MS = 2 * 60 * 60 * 1000; // capture at most once / 2h

/** Travel badges (DB badge_key → display meta). */
export const GEO_BADGES: Record<string, { label: string; emoji: string; desc: string }> = {
  on_the_map: { label: "On the Map", emoji: "📍", desc: "Listened with location on" },
  across_state_lines: { label: "Across State Lines", emoji: "🚙", desc: "Listened from 2+ states" },
  road_warrior: { label: "Road Warrior", emoji: "🛣️", desc: "Listened from 5+ cities" },
  nomad: { label: "Nomad", emoji: "🌎", desc: "Listened from 3+ states" },
};

export function geoRewardsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem(OPT_IN_KEY) === "on"; } catch { return false; }
}

export function setGeoRewardsEnabled(on: boolean): void {
  try { localStorage.setItem(OPT_IN_KEY, on ? "on" : "off"); } catch { /* noop */ }
}

interface RevGeo { city: string; state: string; country: string }

/** Reverse-geocode lat/lng to city/state via BigDataCloud's free, key-less,
 *  CORS-enabled client endpoint (works in a static export, no API server). */
export async function reverseGeocode(lat: number, lng: number): Promise<RevGeo> {
  try {
    const r = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
    );
    if (r.ok) {
      const d = await r.json();
      return {
        city: d.city || d.locality || d.principalSubdivision || "Unknown",
        state: d.principalSubdivision || "",
        country: d.countryName || d.countryCode || "",
      };
    }
  } catch { /* fall through */ }
  return { city: "Unknown", state: "", country: "" };
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 60 * 60 * 1000,
    });
  });
}

export interface GeoAward {
  awarded: { type: "city" | "state"; label: string; points: number }[];
  new_badges: string[];
  cities: number;
  states: number;
}

/**
 * Capture the listener's location and record it. Awards bonus points the first
 * time they listen from a new city (+20) or state (+50) and unlocks travel
 * badges. Throttled to once / 2h unless `force`. Returns null on
 * denial/throttle/error (caller toasts on a non-null result with awards).
 */
export async function captureListeningLocation(
  supabase: SupabaseClient,
  opts?: { force?: boolean },
): Promise<GeoAward | null> {
  if (typeof window === "undefined") return null;
  if (!opts?.force) {
    try {
      const last = Number(localStorage.getItem(LAST_KEY) || 0);
      if (Date.now() - last < THROTTLE_MS) return null;
    } catch { /* noop */ }
  }

  let pos: GeolocationPosition;
  try {
    pos = await getPosition();
  } catch {
    return null; // permission denied / unavailable — skip silently
  }

  const { latitude, longitude } = pos.coords;
  const geo = await reverseGeocode(latitude, longitude);
  const { data, error } = await supabase.rpc("record_listening_location", {
    p_city: geo.city,
    p_state: geo.state,
    p_country: geo.country,
    p_lat: latitude,
    p_lng: longitude,
  });
  if (error) return null;
  try { localStorage.setItem(LAST_KEY, String(Date.now())); } catch { /* noop */ }
  return data as GeoAward;
}
