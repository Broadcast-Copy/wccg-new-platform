/** Check-in radius in meters */
export const CHECK_IN_RADIUS_METERS = 200;

interface CheckInRecord {
  eventId: string;
  timestamp: string;
  pointsAwarded: number;
}

interface CheckInData {
  checkins: CheckInRecord[];
}

function storageKey(email: string): string {
  return `wccg_checkins_${email}`;
}

export function loadCheckins(email: string): CheckInRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(email));
    if (!raw) return [];
    const data: CheckInData = JSON.parse(raw);
    return data.checkins || [];
  } catch {
    return [];
  }
}

export function hasCheckedIn(email: string, eventId: string): boolean {
  const checkins = loadCheckins(email);
  return checkins.some((c) => c.eventId === eventId);
}

export function recordCheckIn(
  email: string,
  eventId: string,
  points: number,
): CheckInRecord {
  const checkins = loadCheckins(email);
  const record: CheckInRecord = {
    eventId,
    timestamp: new Date().toISOString(),
    pointsAwarded: points,
  };
  checkins.push(record);
  if (typeof window !== "undefined") {
    localStorage.setItem(
      storageKey(email),
      JSON.stringify({ checkins } satisfies CheckInData),
    );
  }
  return record;
}
