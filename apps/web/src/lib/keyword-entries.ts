/**
 * localStorage helpers for keyword contest entries.
 * Tracks entered keyword IDs to prevent re-entry.
 * Key pattern: wccg_keyword_entries_{email}
 */

const DEFAULT_KEY = "wccg_keyword_entries";

interface KeywordEntryTracker {
  enteredIds: string[];
}

function storageKey(email?: string | null): string {
  return email ? `wccg_keyword_entries_${email}` : DEFAULT_KEY;
}

function loadTracker(email?: string | null): KeywordEntryTracker {
  if (typeof window === "undefined") return { enteredIds: [] };
  try {
    const raw = localStorage.getItem(storageKey(email));
    if (raw) return JSON.parse(raw) as KeywordEntryTracker;
  } catch {
    // ignore
  }
  return { enteredIds: [] };
}

function saveTracker(
  tracker: KeywordEntryTracker,
  email?: string | null,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(email), JSON.stringify(tracker));
  } catch {
    // ignore
  }
}

/**
 * Check if a keyword contest has already been entered.
 */
export function hasEntered(
  keywordId: string,
  email?: string | null,
): boolean {
  const tracker = loadTracker(email);
  return tracker.enteredIds.includes(keywordId);
}

/**
 * Record that a keyword contest has been entered.
 */
export function recordEntry(
  keywordId: string,
  email?: string | null,
): void {
  const tracker = loadTracker(email);
  if (!tracker.enteredIds.includes(keywordId)) {
    tracker.enteredIds.push(keywordId);
    // Keep bounded
    if (tracker.enteredIds.length > 200) {
      tracker.enteredIds = tracker.enteredIds.slice(-200);
    }
    saveTracker(tracker, email);
  }
}
