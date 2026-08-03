/**
 * The playout box names tracks after their source filenames, so an IceCast
 * title can arrive as `17-george_nooks-on_the_corner-rks` instead of
 * "On The Corner". Titles that already read like titles are returned untouched.
 *
 * The Android app applies the same rules in `NowPlaying.kt` (alldaynight-android)
 * — keep the two in step if the naming on the playout box changes.
 */

const LEADING_TRACK_NUMBER = /^\d{1,3}[-_. ]+/;
const NON_ALPHANUMERIC = /[^a-z0-9]/g;
const WHITESPACE = /\s+/g;

const normalize = (value: string): string =>
  value.toLowerCase().replace(NON_ALPHANUMERIC, "");

export function prettifyTrackTitle(value: string, artist?: string): string {
  const raw = value.trim();
  if (!raw) return raw;
  // Already human-readable — leave it exactly as the station sent it.
  if (raw.includes(" ") && !raw.includes("_")) return raw;

  let parts = raw
    .replace(LEADING_TRACK_NUMBER, "")
    .split("-")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length === 0) return raw;

  // Filenames usually repeat the artist; drop that copy.
  const artistKey = artist ? normalize(artist) : null;
  if (artistKey && parts.length > 1) {
    parts = parts.filter((part) => normalize(part) !== artistKey);
  }

  // Drop the short source tag the playout box appends, e.g. "-rks".
  const last = parts[parts.length - 1];
  if (parts.length > 1 && last !== undefined && last.length <= 4 && !last.includes("_")) {
    parts = parts.slice(0, -1);
  }
  if (parts.length === 0) return raw;

  const words = parts.join(" ").replace(/_/g, " ").replace(WHITESPACE, " ").trim();
  if (!words) return raw;

  return words
    .split(" ")
    .map((word) => (word[0] ?? "").toUpperCase() + word.slice(1))
    .join(" ");
}
