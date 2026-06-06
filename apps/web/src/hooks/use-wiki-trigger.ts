"use client";

/**
 * useWikiTrigger — Supabase-direct (no API server).
 *
 * Watches the now-playing artist and, when it changes to one we haven't seen
 * recently, enqueues a wiki entry by inserting a `requested` row into
 * `wiki_entities`. RLS allows any authenticated user to insert status
 * 'requested'; a unique slug means duplicate inserts fail with 23505, which
 * we ignore (already queued). This is strictly best-effort — it never blocks
 * playback and never calls the research edge function (research is admin-
 * triggered from the staff review queue).
 *
 * Mount this once near the player. Cheap to import — no UI. The localStorage
 * dedupe keeps us from spamming inserts on rapid track changes.
 */

import { useEffect, useRef } from "react";
import { useNowPlaying } from "@/hooks/use-now-playing";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/slug";

const supabase = createClient();

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

    let active = true;

    void (async () => {
      // Only signed-in listeners may enqueue (RLS requires auth for INSERT).
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active || !user) return;

      // Mark as seen only once we know we'll attempt the insert, so a logged-
      // out listener can still trigger it later after signing in.
      lastTriggeredRef.current = slug;
      seen[slug] = new Date().toISOString();
      saveSeen(seen);

      // Best-effort enqueue. 23505 (duplicate slug) means it's already queued.
      await supabase.from("wiki_entities").insert({
        slug,
        name: artist,
        entity_type: "artist",
        status: "requested",
        created_by: user.id,
      });
      // Any error (incl. 23505) is intentionally ignored — fire-and-forget.
    })();

    return () => {
      active = false;
    };
  }, [data?.artist]);
}
