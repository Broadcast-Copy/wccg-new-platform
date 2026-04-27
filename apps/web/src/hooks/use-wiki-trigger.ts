"use client";

/**
 * useWikiTrigger — Phase C4.
 *
 * Watches the now-playing artist and, when it changes to one we haven't seen
 * recently, fires a fire-and-forget call to /wiki/:slug/research to enqueue
 * an auto-research run. Server dedupes per (slug, trigger, hour) so this is
 * safe even on rapid track changes.
 *
 * Mount this once near the player. Cheap to import — no UI.
 */

import { useEffect, useRef } from "react";
import { useNowPlaying } from "@/hooks/use-now-playing";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { apiClient } from "@/lib/api-client";
import { slugify } from "@/lib/slug";

const SEEN_KEY = "wccg_wiki_triggered";
const SEEN_TTL_HOURS = 24;

interface SeenMap {
  // slug → ISO timestamp of last trigger
  [slug: string]: string;
}

function loadSeen(): SeenMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return {};
    const map = JSON.parse(raw) as SeenMap;
    // Garbage-collect old entries.
    const cutoff = Date.now() - SEEN_TTL_HOURS * 3600 * 1000;
    const fresh: SeenMap = {};
    for (const [slug, ts] of Object.entries(map)) {
      if (new Date(ts).getTime() > cutoff) fresh[slug] = ts;
    }
    return fresh;
  } catch {
    return {};
  }
}

function saveSeen(map: SeenMap) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function useWikiTrigger() {
  const { isPlaying } = useAudioPlayer();
  const { data } = useNowPlaying(isPlaying);
  const lastTriggeredRef = useRef<string>("");

  useEffect(() => {
    const artist = data?.artist?.trim();
    if (!artist) return;
    const slug = slugify(artist);
    if (!slug) return;
    if (lastTriggeredRef.current === slug) return;

    const seen = loadSeen();
    if (seen[slug]) {
      // Triggered for this artist within TTL — skip.
      lastTriggeredRef.current = slug;
      return;
    }

    lastTriggeredRef.current = slug;
    seen[slug] = new Date().toISOString();
    saveSeen(seen);

    // Fire-and-forget. 401 (unauthed) is fine — server dedupes.
    apiClient(`/wiki/${slug}/research`, {
      method: "POST",
      body: JSON.stringify({ type: "artist", displayName: artist }),
    }).catch(() => {
      // No-op — this is best-effort.
    });
  }, [data?.artist]);
}
