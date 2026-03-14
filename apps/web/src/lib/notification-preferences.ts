/**
 * Notification Preferences — localStorage-backed preference management
 */

export interface NotificationPrefs {
  shows: Record<string, boolean>;
  hosts: Record<string, boolean>;
  categories: {
    contests: boolean;
    points: boolean;
    events: boolean;
    news: boolean;
  };
}

function storageKey(email: string): string {
  return `wccg_notification_prefs_${email}`;
}

export function getDefaultPrefs(): NotificationPrefs {
  return {
    shows: {},
    hosts: {},
    categories: {
      contests: true,
      points: true,
      events: true,
      news: true,
    },
  };
}

export function loadPrefs(email: string): NotificationPrefs {
  if (typeof window === "undefined") return getDefaultPrefs();
  try {
    const raw = localStorage.getItem(storageKey(email));
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...getDefaultPrefs(),
        ...parsed,
        categories: {
          ...getDefaultPrefs().categories,
          ...(parsed.categories || {}),
        },
      };
    }
  } catch {
    // ignore
  }
  return getDefaultPrefs();
}

export function savePrefs(email: string, prefs: NotificationPrefs): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(email), JSON.stringify(prefs));
  } catch {
    // ignore
  }
}
