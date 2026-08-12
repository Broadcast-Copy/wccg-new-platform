/** Canonical marketing-site URL. Override per-deploy with NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://broadcastcopy.ai"
).replace(/\/+$/, "");

/** The live flagship station running on Broadcast Copy — our proof. */
export const FLAGSHIP_URL = "https://wccg1045fm.com";

/** Flagship station id — the tenant whose live now-playing we show as proof. */
export const FLAGSHIP_STATION_ID = "station_wccg";

/**
 * On-Air clips — short loops of the console, one per capability.
 *
 * Storage, not public/, for the same reason the console zip is: this app is a
 * static export, so a video in the repo is incompressible binary in git history
 * permanently, on every re-render. Storage also means a recut clip does not need
 * a site redeploy.
 *
 * Rendered by dev/broadcastcopy-video and uploaded with its publish-clips.sh.
 * `square` is the 1080 crop for social; both are the same composition.
 */
const MARKETING_ORIGIN =
  "https://irjiqbmoohklagdegezz.supabase.co/storage/v1/object/public/marketing";

export type ClipId =
  | "segue" | "log" | "hotkeys" | "liners"
  | "talkset" | "capture" | "imaging" | "shadow";

export const clipUrl = (id: ClipId, square = false): string =>
  `${MARKETING_ORIGIN}/clips/on-air/${id}${square ? "-square" : ""}.mp4`;

/** What each clip argues, for captions and alt text. */
export const CLIP_CAPTIONS: Record<ClipId, string> = {
  segue: "Deck A hands to deck B, both meters on one crossfade curve.",
  log: "Air time projected from what is actually playing.",
  hotkeys: "Pads found by colour, and one firing.",
  liners: "Live copy arriving on its cue, with the pacing gutter.",
  talkset: "A break assembled beat by beat, with its running time.",
  capture: "A show-prep story captured straight into a break, as a draft.",
  imaging: "An imaging effect imported and placed on a hotkey pad.",
  shadow: "Muted shadow beside your automation, then the cutover.",
};

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

/**
 * Broadcast Copy Manager — THE download. A native Windows dashboard that launches the
 * suite, and installs/updates modules from bc_releases with sha256 verification of every
 * artifact. Built by packaging/manager/build-manager.ps1 in the wccg-airsuite repo; same
 * bump-every-field-together rule as the console above.
 */
export const BROADCAST_COPY_MANAGER = {
  version: "0.2.0",
  size: "58.3 MB",
  installedSize: "134 MB",
  href: `${RELEASES_ORIGIN}/broadcast-copy-manager/BroadcastCopyManager-0.2.0.zip?download=BroadcastCopyManager-0.2.0.zip`,
  sha256: "2b96ac78014164621c43a6d35547aec57d2d412e4fc4a0c0472df88af8f0a54b",
  sha256Href: `${RELEASES_ORIGIN}/broadcast-copy-manager/BroadcastCopyManager-0.2.0.sha256`,
} as const;
