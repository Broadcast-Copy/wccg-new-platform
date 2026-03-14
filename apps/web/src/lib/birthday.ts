/**
 * Birthday Club — localStorage-backed birthday management
 * Awards 50 bonus points on the user's birthday (once per year).
 */

import { awardCustomBounty } from "@/hooks/use-listening-points";

export interface BirthdayData {
  month: number; // 1-12
  day: number; // 1-31
  shoutoutRequested: boolean;
  shoutoutName: string;
  lastAwardedYear: number;
}

function storageKey(email: string): string {
  return `wccg_birthday_${email}`;
}

export function loadBirthday(email: string): BirthdayData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(email));
    if (raw) return JSON.parse(raw) as BirthdayData;
  } catch {
    // ignore
  }
  return null;
}

export function saveBirthday(email: string, data: BirthdayData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(email), JSON.stringify(data));
  } catch {
    // ignore
  }
}

/**
 * Check if today is the user's birthday in ET timezone.
 */
export function isBirthdayToday(email: string): boolean {
  const data = loadBirthday(email);
  if (!data) return false;

  const now = new Date();
  const et = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
  return et.getMonth() + 1 === data.month && et.getDate() === data.day;
}

/**
 * Award 50 birthday bonus points (once per year).
 * Uses bounty ID `birthday_${year}` to prevent double-claiming.
 * Returns true if points were awarded.
 */
export function awardBirthdayPoints(email: string): boolean {
  const data = loadBirthday(email);
  if (!data) return false;

  const now = new Date();
  const et = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
  const year = et.getFullYear();
  const bountyId = `birthday_${year}`;

  const awarded = awardCustomBounty(
    bountyId,
    50,
    "BIRTHDAY_BONUS",
    "Birthday Club",
  );

  if (awarded) {
    data.lastAwardedYear = year;
    saveBirthday(email, data);
  }

  return awarded;
}

/**
 * Format a birthday as a readable string like "March 14".
 */
export function formatBirthday(month: number, day: number): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[month - 1]} ${day}`;
}
