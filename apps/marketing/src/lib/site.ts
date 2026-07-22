/** Canonical marketing-site URL. Override per-deploy with NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://broadcastcopy.ai"
).replace(/\/+$/, "");

/** The live flagship station running on Broadcast Copy — our proof. */
export const FLAGSHIP_URL = "https://wccg1045fm.com";

/** Flagship station id — the tenant whose live now-playing we show as proof. */
export const FLAGSHIP_STATION_ID = "station_wccg";
