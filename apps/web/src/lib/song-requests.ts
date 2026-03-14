/**
 * localStorage helpers for song requests.
 * Key pattern: wccg_song_requests_{email}
 */

export interface UserSongRequest {
  id: string;
  title: string;
  artist: string;
  isPriority: boolean;
  timestamp: string;
  status: "pending" | "approved" | "playing" | "played";
}

const DEFAULT_KEY = "wccg_song_requests";

function storageKey(email?: string | null): string {
  return email ? `wccg_song_requests_${email}` : DEFAULT_KEY;
}

export function loadRequests(email?: string | null): UserSongRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(email));
    if (raw) return JSON.parse(raw) as UserSongRequest[];
  } catch {
    // ignore
  }
  return [];
}

export function saveRequest(
  title: string,
  artist: string,
  isPriority: boolean,
  email?: string | null,
): UserSongRequest {
  const requests = loadRequests(email);
  const newRequest: UserSongRequest = {
    id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title,
    artist,
    isPriority,
    timestamp: new Date().toISOString(),
    status: "pending",
  };
  requests.unshift(newRequest);
  // Keep only the last 50 requests
  if (requests.length > 50) {
    requests.length = 50;
  }
  try {
    localStorage.setItem(storageKey(email), JSON.stringify(requests));
  } catch {
    // ignore
  }
  return newRequest;
}

export function getUserRequests(email?: string | null): UserSongRequest[] {
  return loadRequests(email);
}
