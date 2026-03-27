/**
 * Shared time utility functions.
 * Consolidates parseTime12h which was duplicated across multiple files.
 */

/**
 * Parse a 12-hour time string (e.g., "7:00 PM", "Midnight", "Noon")
 * into minutes since midnight (0–1439).
 * Returns -1 if parsing fails.
 */
export function parseTime12h(timeStr: string): number {
  const trimmed = timeStr.trim().toLowerCase();

  // Special cases
  if (trimmed === "midnight" || trimmed === "12:00 am") return 0;
  if (trimmed === "noon" || trimmed === "12:00 pm") return 720;

  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (!match) return -1;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Get current time in EST/ET as minutes since midnight.
 */
export function getCurrentMinutesEST(): number {
  const now = new Date();
  const estStr = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  const est = new Date(estStr);
  return est.getHours() * 60 + est.getMinutes();
}

/**
 * Get current day of week in EST (0=Sun, 1=Mon, ..., 6=Sat).
 */
export function getCurrentDayEST(): number {
  const now = new Date();
  const estStr = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  return new Date(estStr).getDay();
}
