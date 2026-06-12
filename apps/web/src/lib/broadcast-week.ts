/**
 * Broadcast-week date helpers shared by every surface that computes
 * `dj_drops.week_of` keys or "today" highlights (mixshow archive, DJ portal,
 * admin slot/drop pages, studio media manager).
 *
 * THE BUG THIS EXISTS TO PREVENT: building a *local* Date and then calling
 * `.toISOString().slice(0, 10)` converts through UTC — after 8 PM ET the
 * calendar date rolls forward a day, so "this week's Monday" became Tuesday's
 * date, Today badges landed on the wrong column, and a DJ uploading at night
 * would file under the wrong week key. Always format local dates locally.
 */

/** YYYY-MM-DD of a Date's LOCAL calendar day (never UTC). */
export function isoLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** ISO Monday (YYYY-MM-DD) of the current broadcast week, in ET. */
export function isoMondayOfNow(): string {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const offset = (now.getDay() + 6) % 7;
  const mon = new Date(now);
  mon.setDate(now.getDate() - offset);
  return isoLocalDate(mon);
}
