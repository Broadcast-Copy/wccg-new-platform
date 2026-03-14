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
 * Checks the current time (ET) against the multiplier schedule.
 * Returns the active multiplier info or null if none is active.
 */
export function getCurrentMultiplier(): ActiveMultiplier | null {
  const now = nowET();
  const dayKey = DAY_MAP[now.getDay()];
  const hour = now.getHours();

  for (const window of MULTIPLIER_SCHEDULE) {
    if (window.days.includes(dayKey) && hour >= window.startHour && hour < window.endHour) {
      const endsAt = new Date(now);
      endsAt.setHours(window.endHour, 0, 0, 0);
      return {
        multiplier: window.multiplier,
        label: window.label,
        sponsorName: window.sponsorName,
        endsAt,
      };
    }
  }

  return null;
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
