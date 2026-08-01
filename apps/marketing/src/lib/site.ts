/** Canonical marketing-site URL. Override per-deploy with NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://broadcastcopy.ai"
).replace(/\/+$/, "");

/** The live flagship station running on Broadcast Copy — our proof. */
export const FLAGSHIP_URL = "https://wccg1045fm.com";

/** Flagship station id — the tenant whose live now-playing we show as proof. */
export const FLAGSHIP_STATION_ID = "station_wccg";

/**
 * AirSuite Console — the module a station can download and run today.
 *
 * The zip lives in public/downloads, so it ships with the static export and the existing
 * deploy. Bump every field together when a new build goes out: the checksum on the page has
 * to be the checksum of the file the page links to, or it is worse than not publishing one.
 * Built by packaging/console/build-console.ps1 in the wccg-airsuite repo.
 */
export const AIRSUITE_CONSOLE = {
  version: "1.0.0",
  size: "46.8 MB",
  installedSize: "115 MB",
  href: "/downloads/AirSuiteConsole-1.0.0.zip",
  sha256: "bde2006993ab4391540c514ade5a46ed767d9419265ba00012ce67ea7472571b",
  sha256Href: "/downloads/AirSuiteConsole-1.0.0.sha256",
} as const;
