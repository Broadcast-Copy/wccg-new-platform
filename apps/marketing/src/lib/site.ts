/** Canonical marketing-site URL. Override per-deploy with NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://broadcastcopy.ai"
).replace(/\/+$/, "");

/** The live flagship station running on Broadcast Copy — our proof. */
export const FLAGSHIP_URL = "https://wccg1045fm.com";

/** Flagship station id — the tenant whose live now-playing we show as proof. */
export const FLAGSHIP_STATION_ID = "station_wccg";

/** Public Supabase Storage origin for release artefacts. */
const RELEASES_ORIGIN =
  "https://irjiqbmoohklagdegezz.supabase.co/storage/v1/object/public/releases";

/**
 * AirSuite Console — the module a station can download and run today.
 *
 * The artefact is served from Supabase Storage, NOT from public/downloads. It is a ~47 MB
 * incompressible zip and this app is a static export, so keeping it in the repo would add
 * that much to git history on every build, permanently. Storage also means publishing a new
 * build does not require a site redeploy, and bc_releases (migration 105) can describe what
 * is current.
 *
 * Bump every field together when a new build goes out: the checksum on the page has to be the
 * checksum of the file the page links to, or it is worse than publishing none. Built by
 * packaging/console/build-console.ps1 in the wccg-airsuite repo, then uploaded with
 * scripts/publish-release.sh.
 */
export const AIRSUITE_CONSOLE = {
  version: "1.0.0",
  size: "46.8 MB",
  installedSize: "115 MB",
  // ?download= is doing real work: the <a download> attribute is IGNORED on cross-origin
  // links, so without it the browser decides on its own what to do with the response. This
  // query param makes Storage send Content-Disposition: attachment with the right filename.
  href: `${RELEASES_ORIGIN}/airsuite-console/AirSuiteConsole-1.0.0.zip?download=AirSuiteConsole-1.0.0.zip`,
  sha256: "bde2006993ab4391540c514ade5a46ed767d9419265ba00012ce67ea7472571b",
  // Left inline on purpose -- this one is meant to be read in the browser, not saved.
  sha256Href: `${RELEASES_ORIGIN}/airsuite-console/AirSuiteConsole-1.0.0.sha256`,
} as const;
