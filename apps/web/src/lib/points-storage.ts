/**
 * Shared utility for reading points from localStorage.
 *
 * Reads from both the user-specific key and the default key,
 * summing them together to handle the case where points were
 * earned before login completed (orphaned default key).
 */

const STORAGE_KEY_DEFAULT = "wccg_listening_points";

export interface LocalPointsData {
  balance: number;
  history: Array<{
    id: string;
    amount: number;
    reason: string;
    program: string;
    createdAt: string;
  }>;
}

/**
 * Read the combined points balance and history from localStorage.
 *
 * When email is provided, checks the user-specific key first then sums
 * any orphaned points from the default key.  When email is null (auth
 * still loading), scans all `wccg_listening_points_*` keys as fallback.
 */
export function readAllPoints(
  email: string | null | undefined,
): LocalPointsData {
  if (typeof window === "undefined") return { balance: 0, history: [] };

  const parseRaw = (
    raw: string,
  ): { points: number; history: LocalPointsData["history"] } => {
    const parsed = JSON.parse(raw);
    const totalPoints: number = parsed.totalPoints ?? 0;
    const history: LocalPointsData["history"] = (parsed.history ?? []).map(
      (
        h: {
          points: number;
          reason: string;
          timestamp: string;
          program?: string;
        },
        i: number,
      ) => ({
        id: `local_${h.timestamp}_${i}`,
        amount: h.points,
        reason: h.reason,
        program: h.program || "WCCG 104.5 FM",
        createdAt: h.timestamp,
      }),
    );
    return { points: totalPoints, history };
  };

  try {
    let totalBalance = 0;
    let allHistory: LocalPointsData["history"] = [];

    if (email) {
      // Read user-specific key
      const userRaw = localStorage.getItem(
        `wccg_listening_points_${email}`,
      );
      if (userRaw) {
        const parsed = parseRaw(userRaw);
        totalBalance += parsed.points;
        allHistory = allHistory.concat(parsed.history);
      }

      // Also read default key (orphaned points earned before login)
      const defaultRaw = localStorage.getItem(STORAGE_KEY_DEFAULT);
      if (defaultRaw) {
        const parsed = parseRaw(defaultRaw);
        totalBalance += parsed.points;
        // De-dup by timestamp+reason before merging
        const existingKeys = new Set(
          allHistory.map((h) => `${h.createdAt}_${h.reason}_${h.amount}`),
        );
        for (const h of parsed.history) {
          const key = `${h.createdAt}_${h.reason}_${h.amount}`;
          if (!existingKeys.has(key)) {
            allHistory.push(h);
          }
        }
      }
    } else {
      // No email — check default key first
      const defaultRaw = localStorage.getItem(STORAGE_KEY_DEFAULT);
      if (defaultRaw) {
        const parsed = parseRaw(defaultRaw);
        totalBalance += parsed.points;
        allHistory = allHistory.concat(parsed.history);
      }

      // Scan all user-specific keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          key.startsWith("wccg_listening_points_") &&
          key !== STORAGE_KEY_DEFAULT
        ) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = parseRaw(raw);
            if (parsed.points > totalBalance) {
              // Use the larger user key (don't double-count since we already added default)
              totalBalance =
                parsed.points +
                (totalBalance > 0 ? totalBalance : 0);
              allHistory = allHistory.concat(parsed.history);
            }
          }
        }
      }
    }

    // Sort history newest first
    allHistory.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return { balance: totalBalance, history: allHistory };
  } catch {
    // ignore
  }
  return { balance: 0, history: [] };
}

/**
 * Convenience: just the balance number.
 */
export function readPointsBalance(
  email: string | null | undefined,
): number {
  return readAllPoints(email).balance;
}
