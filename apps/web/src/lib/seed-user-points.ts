/**
 * Seed points and listening history for specific users.
 *
 * Called once on app initialization. If the user already has points data,
 * this is a no-op (idempotent). This ensures biggleem@gmail.com has
 * realistic point history and program/show tracking from day one.
 */

const SEEDED_FLAG_PREFIX = "wccg_points_seeded_";

function isSeeded(email: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(`${SEEDED_FLAG_PREFIX}${email}`) === "1";
  } catch {
    return true;
  }
}

function markSeeded(email: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${SEEDED_FLAG_PREFIX}${email}`, "1");
  } catch {
    // ignore
  }
}

interface PointsHistoryEntry {
  points: number;
  reason: string;
  timestamp: string;
  program?: string;
}

interface PointsData {
  totalPoints: number;
  totalListeningMs: number;
  lastAwardedAt: string | null;
  lastShareDate?: string;
  lastBountyDate?: string;
  streak1hAwarded?: boolean;
  streak2hAwarded?: boolean;
  sessionPointsAwarded?: number;
  history: PointsHistoryEntry[];
}

interface ListeningSession {
  id: string;
  type: "live";
  title: string;
  artist: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  tracks: Array<{
    title: string;
    artist: string;
    albumArt: string | null;
    heardAt: string;
  }>;
  streamName: string;
}

/**
 * Seed biggleem@gmail.com with realistic points history and
 * program/show listening sessions.
 */
export function seedUserPoints() {
  if (typeof window === "undefined") return;

  const email = "biggleem@gmail.com";

  // Don't re-seed if already done
  if (isSeeded(email)) return;

  const pointsKey = `wccg_listening_points_${email}`;
  const historyKey = `wccg_listening_history_${email}`;

  // Only seed if no existing data
  try {
    const existing = localStorage.getItem(pointsKey);
    if (existing) {
      const parsed = JSON.parse(existing);
      if (parsed.totalPoints > 0) {
        markSeeded(email);
        return;
      }
    }
  } catch {
    // continue to seed
  }

  // ── Points History ──
  // Realistic history: listening sessions, daily bounties, streaks,
  // shares, and a Duke Game Day 2x session
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  function daysAgo(d: number, hour: number = 12): string {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    date.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
    return date.toISOString();
  }

  const history: PointsHistoryEntry[] = [
    // Today — Duke Game Day listening (2x)
    { points: 4, reason: "LISTENING", timestamp: daysAgo(0, 19), program: "WCCG 104.5 FM (2x Duke Game Day 🏀)" },
    { points: 4, reason: "LISTENING", timestamp: daysAgo(0, 19), program: "WCCG 104.5 FM (2x Duke Game Day 🏀)" },
    { points: 4, reason: "LISTENING", timestamp: daysAgo(0, 18), program: "WCCG 104.5 FM (2x Duke Game Day 🏀)" },
    { points: 3, reason: "DAILY_BOUNTY", timestamp: daysAgo(0, 7), program: "Daily Bonus" },
    // Yesterday — regular listening + Morning Rush 2x
    { points: 2, reason: "LISTENING", timestamp: daysAgo(1, 8), program: "WCCG 104.5 FM (2x McDonald's Morning Rush)" },
    { points: 2, reason: "LISTENING", timestamp: daysAgo(1, 8), program: "WCCG 104.5 FM (2x McDonald's Morning Rush)" },
    { points: 1, reason: "LISTENING", timestamp: daysAgo(1, 12), program: "WCCG 104.5 FM" },
    { points: 1, reason: "LISTENING", timestamp: daysAgo(1, 13), program: "WCCG 104.5 FM" },
    { points: 5, reason: "STREAK_BONUS", timestamp: daysAgo(1, 14), program: "Streak Bonus" },
    { points: 3, reason: "DAILY_BOUNTY", timestamp: daysAgo(1, 7), program: "Daily Bonus" },
    { points: 2, reason: "SHARE_BONUS", timestamp: daysAgo(1, 15), program: "Share" },
    // 2 days ago — Drive Time 2x
    { points: 2, reason: "LISTENING", timestamp: daysAgo(2, 17), program: "WCCG 104.5 FM (2x AutoZone Drive Time)" },
    { points: 2, reason: "LISTENING", timestamp: daysAgo(2, 18), program: "WCCG 104.5 FM (2x AutoZone Drive Time)" },
    { points: 1, reason: "LISTENING", timestamp: daysAgo(2, 10), program: "WCCG 104.5 FM" },
    { points: 3, reason: "DAILY_BOUNTY", timestamp: daysAgo(2, 9), program: "Daily Bonus" },
    // 3 days ago — Lunch Boost 3x
    { points: 3, reason: "LISTENING", timestamp: daysAgo(3, 12), program: "WCCG 104.5 FM (3x Lunch Hour Boost)" },
    { points: 3, reason: "LISTENING", timestamp: daysAgo(3, 12), program: "WCCG 104.5 FM (3x Lunch Hour Boost)" },
    { points: 1, reason: "LISTENING", timestamp: daysAgo(3, 15), program: "WCCG 104.5 FM" },
    { points: 3, reason: "DAILY_BOUNTY", timestamp: daysAgo(3, 8), program: "Daily Bonus" },
    { points: 3, reason: "VIDEO_WATCH", timestamp: daysAgo(3, 20), program: "YouTube" },
    // 4 days ago
    { points: 1, reason: "LISTENING", timestamp: daysAgo(4, 9), program: "WCCG 104.5 FM" },
    { points: 1, reason: "LISTENING", timestamp: daysAgo(4, 10), program: "WCCG 104.5 FM" },
    { points: 1, reason: "LISTENING", timestamp: daysAgo(4, 11), program: "WCCG 104.5 FM" },
    { points: 5, reason: "STREAK_BONUS", timestamp: daysAgo(4, 11), program: "Streak Bonus" },
    { points: 3, reason: "DAILY_BOUNTY", timestamp: daysAgo(4, 9), program: "Daily Bonus" },
    // 5 days ago (Friday night 5x!)
    { points: 5, reason: "LISTENING", timestamp: daysAgo(5, 21), program: "WCCG 104.5 FM (5x Friday Night 5x!)" },
    { points: 5, reason: "LISTENING", timestamp: daysAgo(5, 22), program: "WCCG 104.5 FM (5x Friday Night 5x!)" },
    { points: 3, reason: "DAILY_BOUNTY", timestamp: daysAgo(5, 16), program: "Daily Bonus" },
    // 6 days ago
    { points: 1, reason: "LISTENING", timestamp: daysAgo(6, 14), program: "WCCG 104.5 FM" },
    { points: 1, reason: "LISTENING", timestamp: daysAgo(6, 15), program: "WCCG 104.5 FM" },
    { points: 3, reason: "DAILY_BOUNTY", timestamp: daysAgo(6, 10), program: "Daily Bonus" },
    { points: 2, reason: "SHARE_BONUS", timestamp: daysAgo(6, 16), program: "Share" },
    // 7 days ago (weekend vibes 2x)
    { points: 2, reason: "LISTENING", timestamp: daysAgo(7, 11), program: "WCCG 104.5 FM (2x Weekend Vibes)" },
    { points: 2, reason: "LISTENING", timestamp: daysAgo(7, 12), program: "WCCG 104.5 FM (2x Weekend Vibes)" },
    { points: 2, reason: "LISTENING", timestamp: daysAgo(7, 13), program: "WCCG 104.5 FM (2x Weekend Vibes)" },
    { points: 10, reason: "STREAK_BONUS", timestamp: daysAgo(7, 13), program: "Streak Bonus" },
    { points: 3, reason: "DAILY_BOUNTY", timestamp: daysAgo(7, 10), program: "Daily Bonus" },
  ];

  const totalPoints = history.reduce((sum, h) => sum + h.points, 0);
  const totalListeningMs = history
    .filter((h) => h.reason === "LISTENING")
    .length * 90_000; // 90s per listening point

  const pointsData: PointsData = {
    totalPoints,
    totalListeningMs,
    lastAwardedAt: history[0].timestamp,
    lastBountyDate: today,
    streak1hAwarded: false,
    streak2hAwarded: false,
    sessionPointsAwarded: 0,
    history,
  };

  // ── Listening Sessions (program/show tracking) ──
  const sessions: ListeningSession[] = [
    // Today — Duke vs Virginia game
    {
      id: `ls-seed-${Date.now()}-1`,
      type: "live",
      title: "Duke vs Virginia — ACC Tournament Final",
      artist: "WCCG Sports",
      startedAt: daysAgo(0, 18),
      endedAt: daysAgo(0, 20),
      durationSeconds: 7200,
      tracks: [
        { title: "Duke vs Virginia Pre-Game", artist: "WCCG Sports", albumArt: null, heardAt: daysAgo(0, 18) },
        { title: "Duke vs Virginia — Live", artist: "WCCG Sports", albumArt: null, heardAt: daysAgo(0, 19) },
        { title: "Post-Game Show", artist: "WCCG Sports", albumArt: null, heardAt: daysAgo(0, 20) },
      ],
      streamName: "WCCG 104.5 FM",
    },
    // Yesterday — Morning show
    {
      id: `ls-seed-${Date.now()}-2`,
      type: "live",
      title: "The Morning Vibe",
      artist: "DJ Smooth",
      startedAt: daysAgo(1, 7),
      endedAt: daysAgo(1, 9),
      durationSeconds: 7200,
      tracks: [
        { title: "The Morning Vibe", artist: "DJ Smooth", albumArt: null, heardAt: daysAgo(1, 7) },
        { title: "Community Calendar", artist: "WCCG News", albumArt: null, heardAt: daysAgo(1, 8) },
      ],
      streamName: "WCCG 104.5 FM",
    },
    // Yesterday — Midday mix
    {
      id: `ls-seed-${Date.now()}-3`,
      type: "live",
      title: "Midday Mix",
      artist: "WCCG 104.5 FM",
      startedAt: daysAgo(1, 12),
      endedAt: daysAgo(1, 14),
      durationSeconds: 7200,
      tracks: [
        { title: "Midday Mix", artist: "WCCG 104.5 FM", albumArt: null, heardAt: daysAgo(1, 12) },
      ],
      streamName: "WCCG 104.5 FM",
    },
    // 2 days ago — Drive Time
    {
      id: `ls-seed-${Date.now()}-4`,
      type: "live",
      title: "Drive Time with Big Lee",
      artist: "Big Lee",
      startedAt: daysAgo(2, 17),
      endedAt: daysAgo(2, 19),
      durationSeconds: 7200,
      tracks: [
        { title: "Drive Time with Big Lee", artist: "Big Lee", albumArt: null, heardAt: daysAgo(2, 17) },
        { title: "Traffic & Weather", artist: "WCCG News", albumArt: null, heardAt: daysAgo(2, 18) },
      ],
      streamName: "WCCG 104.5 FM",
    },
    // 3 days ago — Lunch hour
    {
      id: `ls-seed-${Date.now()}-5`,
      type: "live",
      title: "Lunch Hour Jams",
      artist: "WCCG 104.5 FM",
      startedAt: daysAgo(3, 12),
      endedAt: daysAgo(3, 13),
      durationSeconds: 3600,
      tracks: [
        { title: "Lunch Hour Jams", artist: "WCCG 104.5 FM", albumArt: null, heardAt: daysAgo(3, 12) },
      ],
      streamName: "WCCG 104.5 FM",
    },
    // 5 days ago — Friday Night
    {
      id: `ls-seed-${Date.now()}-6`,
      type: "live",
      title: "Friday Night Party Mix",
      artist: "DJ Smooth",
      startedAt: daysAgo(5, 20),
      endedAt: daysAgo(5, 23),
      durationSeconds: 10800,
      tracks: [
        { title: "Friday Night Party Mix", artist: "DJ Smooth", albumArt: null, heardAt: daysAgo(5, 20) },
        { title: "Old School Hour", artist: "DJ Smooth", albumArt: null, heardAt: daysAgo(5, 21) },
        { title: "Request Hour", artist: "DJ Smooth", albumArt: null, heardAt: daysAgo(5, 22) },
      ],
      streamName: "WCCG 104.5 FM",
    },
    // 7 days ago — Weekend Vibes
    {
      id: `ls-seed-${Date.now()}-7`,
      type: "live",
      title: "Weekend Vibes",
      artist: "WCCG 104.5 FM",
      startedAt: daysAgo(7, 10),
      endedAt: daysAgo(7, 14),
      durationSeconds: 14400,
      tracks: [
        { title: "Weekend Vibes", artist: "WCCG 104.5 FM", albumArt: null, heardAt: daysAgo(7, 10) },
        { title: "Gospel Hour", artist: "WCCG 104.5 FM", albumArt: null, heardAt: daysAgo(7, 11) },
        { title: "Community Corner", artist: "WCCG News", albumArt: null, heardAt: daysAgo(7, 12) },
        { title: "R&B Classics", artist: "WCCG 104.5 FM", albumArt: null, heardAt: daysAgo(7, 13) },
      ],
      streamName: "WCCG 104.5 FM",
    },
  ];

  // Save to localStorage — write to both the user-specific key AND the
  // default key so points show immediately regardless of login state
  try {
    localStorage.setItem(pointsKey, JSON.stringify(pointsData));
    localStorage.setItem(historyKey, JSON.stringify(sessions));
    // Also write to default keys so points display before login resolves
    localStorage.setItem("wccg_listening_points", JSON.stringify(pointsData));
    localStorage.setItem("wccg_listening_history", JSON.stringify(sessions));
    markSeeded(email);
  } catch {
    // Storage full or unavailable
  }
}
