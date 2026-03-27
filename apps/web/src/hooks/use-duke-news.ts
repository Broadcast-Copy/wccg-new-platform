"use client";

import { useEffect, useState } from "react";

export interface DukeNewsItem {
  id: string;
  headline: string;
  description: string;
  thumbnail?: string;
  url: string;
  published: string;
}

const ESPN_NEWS_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/news?team=150&limit=15";

const GODUKE_NEWS_URL =
  "https://goduke.com/api/v2/stories?sport_id=4&per_page=10";

/**
 * Fetches real-time Duke basketball news from both ESPN and GoDuke.com APIs.
 * Merges and deduplicates by headline, sorted by publish date.
 */
export function useDukeNews() {
  const [news, setNews] = useState<DukeNewsItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchESPN(): Promise<DukeNewsItem[]> {
      try {
        const res = await fetch(ESPN_NEWS_URL, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return [];
        const json = await res.json();

        const articles = (json.articles || []) as Array<Record<string, unknown>>;
        const items: DukeNewsItem[] = [];

        for (const a of articles) {
          const headline = String(a.headline || "");
          if (!headline) continue;

          const desc = String(a.description || "");
          const published = String(a.published || "");
          const images = (a.images || []) as Array<Record<string, unknown>>;
          const thumb = images.length > 0 ? String(images[0].url || "") : undefined;
          const links = (a.links as Record<string, unknown>) || {};
          const web = (links.web as Record<string, unknown>) || {};
          const href = String((web as Record<string, unknown>).href || "");

          items.push({
            id: `espn-${a.id || Math.random()}`,
            headline,
            description: desc,
            thumbnail: thumb || undefined,
            url: href || "https://www.espn.com/mens-college-basketball/team/_/id/150/duke-blue-devils",
            published,
          });
        }
        return items;
      } catch {
        return [];
      }
    }

    async function fetchGoDuke(): Promise<DukeNewsItem[]> {
      try {
        const res = await fetch(GODUKE_NEWS_URL, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return [];
        const json = await res.json();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stories = (json.items || []) as any[];
        const items: DukeNewsItem[] = [];

        for (const s of stories) {
          const headline = String(s.title || "");
          if (!headline) continue;

          // Get thumbnail from images
          const images = s.images || [];
          const thumb = images.length > 0 ? String(images[0]?.fullpath || images[0]?.url || "") : undefined;

          items.push({
            id: `goduke-${s.contentId || Math.random()}`,
            headline,
            description: String(s.teaser || s.summary || ""),
            thumbnail: thumb ? (thumb.startsWith("http") ? thumb : `https://goduke.com${thumb}`) : undefined,
            url: s.url ? `https://goduke.com${s.url}` : "https://goduke.com/sports/mens-basketball",
            published: String(s.publishedOn || s.date || ""),
          });
        }
        return items;
      } catch {
        return [];
      }
    }

    async function fetchAll() {
      const [espnItems, godukeItems] = await Promise.all([fetchESPN(), fetchGoDuke()]);

      // Merge and deduplicate by normalized headline
      const seen = new Set<string>();
      const merged: DukeNewsItem[] = [];

      for (const item of [...godukeItems, ...espnItems]) {
        const key = item.headline.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(item);
      }

      // Sort by publish date (newest first)
      merged.sort((a, b) => {
        const da = a.published ? new Date(a.published).getTime() : 0;
        const db = b.published ? new Date(b.published).getTime() : 0;
        return db - da;
      });

      if (!cancelled && merged.length > 0) {
        setNews(merged);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, []);

  return news;
}
