import { MULTIPLIER_SCHEDULE, type MultiplierWindow } from "@/data/multipliers";

const DAY_MAP: Record<number, string> = {
  0: "sun",
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
};

// ── Duke Game Day dynamic multiplier ──
let _isDukeGameLive = false;

/**
 * Set whether a Duke game is currently live.
 * When true, a 2x "Duke Game Day" multiplier is applied
 * (stacks: uses whichever multiplier is higher).
 */
export function setDukeGameLive(isLive: boolean) {
  _isDukeGameLive = isLive;
}

/** Check whether the Duke Game Day multiplier is currently active */
export function isDukeGameLive(): boolean {
  return _isDukeGameLive;
}

/** Get the current date/time in Eastern Time */
function nowET(): Date {
  const str = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  return new Date(str);
}

export interface ActiveMultiplier {
  multiplier: number;
  label: string;
  sponsorName?: string;
  endsAt: Date;
}

/**
 * Checks the current time (ET) against the multiplier schedule
 * and the Duke Game Day dynamic flag.
 * Returns the active multiplier info or null if none is active.
 * When multiple multipliers overlap, the highest one wins.
 */
export function getCurrentMultiplier(): ActiveMultiplier | null {
  const now = nowET();
  const dayKey = DAY_MAP[now.getDay()];
  const hour = now.getHours();

  let best: ActiveMultiplier | null = null;

  for (const window of MULTIPLIER_SCHEDULE) {
    if (window.days.includes(dayKey) && hour >= window.startHour && hour < window.endHour) {
      const endsAt = new Date(now);
      endsAt.setHours(window.endHour, 0, 0, 0);
      if (!best || window.multiplier > best.multiplier) {
        best = {
          multiplier: window.multiplier,
          label: window.label,
          sponsorName: window.sponsorName,
          endsAt,
        };
      }
    }
  }

  // Duke Game Day: 2x when a Duke game is live
  if (_isDukeGameLive) {
    const dukeMultiplier = 2;
    if (!best || dukeMultiplier > best.multiplier) {
      const endsAt = new Date(now);
      endsAt.setHours(23, 59, 59, 999); // Game end time unknown, use end of day
      best = {
        multiplier: dukeMultiplier,
        label: "Duke Game Day 🏀",
        sponsorName: undefined,
        endsAt,
      };
    }
  }

  return best;
}

export interface UpcomingMultiplier {
  window: MultiplierWindow;
  startsAt: Date;
}

/**
 * Returns the next N upcoming multiplier windows from the schedule.
 */
export function getUpcomingMultipliers(limit: number = 5): UpcomingMultiplier[] {
  const now = nowET();
  const dayKey = DAY_MAP[now.getDay()];
  const hour = now.getHours();
  const results: UpcomingMultiplier[] = [];

  // Look up to 7 days ahead
  for (let dayOffset = 0; dayOffset < 7 && results.length < limit; dayOffset++) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + dayOffset);
    const targetDay = DAY_MAP[targetDate.getDay()];

    for (const window of MULTIPLIER_SCHEDULE) {
      if (results.length >= limit) break;
      if (!window.days.includes(targetDay)) continue;

      // Skip if it's today and already past or currently active
      if (dayOffset === 0 && window.endHour <= hour) continue;
      // Skip if it's the currently active window
      if (dayOffset === 0 && window.days.includes(dayKey) && hour >= window.startHour && hour < window.endHour) continue;

      const startsAt = new Date(targetDate);
      startsAt.setHours(window.startHour, 0, 0, 0);

      results.push({ window, startsAt });
    }
  }

  return results;
}

/** Boolean shortcut: is any multiplier currently active? */
export function isMultiplierActive(): boolean {
  return getCurrentMultiplier() !== null;
}
