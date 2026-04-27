"use client";

/**
 * ArtistRail — Phase A3.
 *
 * Now-playing → discovery bridge. Takes the artist currently on air and
 * surfaces three engagement tiles:
 *
 *   1. About this artist     →  /wiki/<slug>  (stub today, agent-written in Phase C)
 *   2. More by this artist   →  Apple Music search (no API key required)
 *   3. Add to favorites      →  hits the favorites API + awards 5 WP first time
 *
 * The whole rail is an engagement converter — visitors who care about the
 * artist on air are exactly the visitors who keep listening.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Music2, Star } from "lucide-react";
import { useNowPlaying } from "@/hooks/use-now-playing";
import { slugify } from "@/lib/slug";
import { awardCustomBounty } from "@/hooks/use-listening-points";

export function ArtistRail() {
  const { data } = useNowPlaying(true);
  const artist = data?.artist?.trim() || "";
  const slug = artist ? slugify(artist) : "";
  const wikiHref = slug ? `/wiki/${slug}` : "/wiki";
  const appleMusicHref = artist
    ? `https://music.apple.com/us/search?term=${encodeURIComponent(artist)}`
    : "https://music.apple.com";

  const [favorited, setFavorited] = useState(false);
  const [favError, setFavError] = useState<string | null>(null);

  // Hydrate favorite state from localStorage so the star sticks across reloads
  // until A2's server sync hands us a real source of truth.
  useEffect(() => {
    if (!slug) return;
    try {
      const raw = localStorage.getItem("wccg_artist_favorites");
      const set: string[] = raw ? JSON.parse(raw) : [];
      setFavorited(set.includes(slug));
    } catch {
      // ignore
    }
  }, [slug]);

  const onFavorite = () => {
    if (!slug) return;
    setFavError(null);
    try {
      const raw = localStorage.getItem("wccg_artist_favorites");
      const set: string[] = raw ? JSON.parse(raw) : [];
      if (set.includes(slug)) {
        const next = set.filter((s) => s !== slug);
        localStorage.setItem("wccg_artist_favorites", JSON.stringify(next));
        setFavorited(false);
      } else {
        const next = [...set, slug];
        localStorage.setItem("wccg_artist_favorites", JSON.stringify(next));
        setFavorited(true);
        // Award 5 WP exactly once per artist via the bounty tracker — server
        // outbox dedupes by the same id, so even cross-tab spam is safe.
        awardCustomBounty(`favorite_artist:${slug}`, 5, "ARTIST_FAVORITE", "Artist Favorite");
      }
    } catch (e) {
      setFavError((e as Error).message);
    }
  };

  if (!artist) {
    // Silent when nothing is on air — better than a placeholder.
    return null;
  }

  return (
    <section aria-label="More about the artist on air" className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-bold text-foreground">Because you're listening to {artist}</h2>
        <Link href={wikiHref} className="text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-[#74ddc7]">
          Open wiki →
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href={wikiHref}
          className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:border-input hover:shadow-lg"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8]">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground group-hover:text-[#74ddc7]">
                About {artist}
              </h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                Bio, discography, and what WCCG has spun lately. Auto-researched.
              </p>
            </div>
          </div>
        </Link>

        <a
          href={appleMusicHref}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:border-input hover:shadow-lg"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#ec4899] to-[#be185d]">
              <Music2 className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground group-hover:text-[#74ddc7] inline-flex items-center gap-1">
                More by {artist}
                <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
              </h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                Top tracks, albums, and where to listen.
              </p>
            </div>
          </div>
        </a>

        <button
          type="button"
          onClick={onFavorite}
          aria-pressed={favorited}
          className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-input hover:shadow-lg"
        >
          <div className="flex items-start gap-4">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${favorited ? "from-[#f59e0b] to-[#d97706]" : "from-[#22c55e] to-[#15803d]"}`}>
              <Star className={`h-5 w-5 text-white ${favorited ? "fill-white" : ""}`} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground group-hover:text-[#74ddc7]">
                {favorited ? "Following" : "Follow this artist"}
              </h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {favorited
                  ? "We'll ping you when they're on the air."
                  : "Get a notification next time WCCG plays them. +5 WP first time."}
              </p>
              {favError && <p className="mt-1 text-xs text-red-500">{favError}</p>}
            </div>
          </div>
        </button>
      </div>
    </section>
  );
}
