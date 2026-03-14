/**
 * Wake-Up Alarm — localStorage persistence for device-specific alarm settings.
 *
 * Stores alarm config in `wccg_alarm` (not per-user, device-specific).
 * The alarm triggers auto-play of the WCCG stream at the configured time.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AlarmConfig {
  enabled: boolean;
  /** Time in HH:MM format (24-hour) */
  time: string;
  /** Days of the week: ["mon","tue",...] or ["daily"] for every day */
  days: string[];
  /** Optional show ID to tune into */
  showId?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "wccg_alarm";
const TRIGGERED_KEY = "wccg_alarm_triggered";

const DAY_MAP: Record<number, string> = {
  0: "sun",
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
};

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/** Load the saved alarm config from localStorage */
export function loadAlarm(): AlarmConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AlarmConfig;
  } catch {
    // ignore
  }
  return null;
}

/** Save an alarm config to localStorage */
export function saveAlarm(config: AlarmConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    // Clear triggered flag when saving new config
    localStorage.removeItem(TRIGGERED_KEY);
  } catch {
    // ignore
  }
}

/** Clear the alarm config entirely */
export function clearAlarm(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TRIGGERED_KEY);
  } catch {
    // ignore
  }
}

/**
 * Check whether the alarm should fire right now.
 *
 * Compares current ET time against the alarm time and configured days.
 * Returns true only if:
 * - Alarm is enabled
 * - Current day matches configured days
 * - Current time matches alarm time (within a 1-minute window)
 * - Alarm hasn't already been triggered today
 */
export function isAlarmDue(): boolean {
  const config = loadAlarm();
  if (!config || !config.enabled) return false;

  // Get current time in Eastern Time
  const now = new Date();
  const etString = now.toLocaleString("en-US", {
    timeZone: "America/New_York",
  });
  const etDate = new Date(etString);

  const currentHour = etDate.getHours();
  const currentMinute = etDate.getMinutes();
  const currentDay = DAY_MAP[etDate.getDay()];

  // Parse alarm time
  const [alarmHour, alarmMinute] = config.time.split(":").map(Number);

  // Check if the day matches
  const dayMatches =
    config.days.includes("daily") || config.days.includes(currentDay);
  if (!dayMatches) return false;

  // Check if the time matches (within the current minute)
  if (currentHour !== alarmHour || currentMinute !== alarmMinute) return false;

  // Check if already triggered today
  const todayKey = `${etDate.getFullYear()}-${etDate.getMonth()}-${etDate.getDate()}`;
  try {
    const triggered = localStorage.getItem(TRIGGERED_KEY);
    if (triggered === todayKey) return false;
  } catch {
    // ignore
  }

  return true;
}

/** Mark the alarm as triggered for today so it doesn't fire again */
export function markAlarmTriggered(): void {
  if (typeof window === "undefined") return;
  try {
    const now = new Date();
    const etString = now.toLocaleString("en-US", {
      timeZone: "America/New_York",
    });
    const etDate = new Date(etString);
    const todayKey = `${etDate.getFullYear()}-${etDate.getMonth()}-${etDate.getDate()}`;
    localStorage.setItem(TRIGGERED_KEY, todayKey);
  } catch {
    // ignore
  }
}
