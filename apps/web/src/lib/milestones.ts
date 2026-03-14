/**
 * Listening milestones — tracks achievements based on cumulative listening stats.
 * Stores unlocked milestones in localStorage per-user.
 */

import { markDirty } from "@/lib/user-sync";

export interface Milestone {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  category: "listening" | "sessions";
  threshold: number;
  unit: string; // "minutes" or "sessions"
}

export const MILESTONES: Milestone[] = [
  // Listening time milestones
  { id: "listen_1h", name: "First Hour", description: "Listened for 1 hour total", icon: "\uD83C\uDFA7", category: "listening", threshold: 60, unit: "minutes" },
  { id: "listen_10h", name: "Dedicated Listener", description: "10 hours of listening", icon: "\uD83C\uDFB5", category: "listening", threshold: 600, unit: "minutes" },
  { id: "listen_50h", name: "Super Fan", description: "50 hours of listening", icon: "\u2B50", category: "listening", threshold: 3000, unit: "minutes" },
  { id: "listen_100h", name: "Centurion", description: "100 hours of listening", icon: "\uD83D\uDCAF", category: "listening", threshold: 6000, unit: "minutes" },
  { id: "listen_500h", name: "Legend", description: "500 hours of listening", icon: "\uD83D\uDC51", category: "listening", threshold: 30000, unit: "minutes" },
  // Session count milestones
  { id: "sessions_10", name: "Regular", description: "10 listening sessions", icon: "\uD83D\uDD04", category: "sessions", threshold: 10, unit: "sessions" },
  { id: "sessions_50", name: "Loyal Listener", description: "50 listening sessions", icon: "\uD83C\uDFC5", category: "sessions", threshold: 50, unit: "sessions" },
  { id: "sessions_100", name: "Platinum Listener", description: "100 listening sessions", icon: "\uD83D\uDC8E", category: "sessions", threshold: 100, unit: "sessions" },
];

const MILESTONES_KEY = "wccg_milestones";

function getKey(): string {
  // Check if user email is available via the points system's convention
  if (typeof window === "undefined") return MILESTONES_KEY;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("wccg_listening_points_") && key !== "wccg_listening_points") {
      const email = key.replace("wccg_listening_points_", "");
      if (email) return `${MILESTONES_KEY}_${email}`;
    }
  }
  return MILESTONES_KEY;
}

export function loadUnlockedMilestones(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getKey());
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    // ignore
  }
  return [];
}

function saveMilestones(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getKey(), JSON.stringify(ids));
    markDirty(); // trigger cross-device sync
  } catch {
    // ignore
  }
}

/**
 * Check listening stats against milestone thresholds.
 * Returns only NEWLY unlocked milestones (not previously saved).
 */
export function checkMilestones(stats: {
  totalMinutes: number;
  totalSessions: number;
}): Milestone[] {
  const unlocked = loadUnlockedMilestones();
  const newlyUnlocked: Milestone[] = [];

  for (const milestone of MILESTONES) {
    if (unlocked.includes(milestone.id)) continue;

    const value =
      milestone.unit === "minutes" ? stats.totalMinutes : stats.totalSessions;

    if (value >= milestone.threshold) {
      newlyUnlocked.push(milestone);
      unlocked.push(milestone.id);
    }
  }

  if (newlyUnlocked.length > 0) {
    saveMilestones(unlocked);
  }

  return newlyUnlocked;
}
