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

const DUKE_NEWS_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/news?team=150&limit=15";

/**
 * Fetches real-time Duke basketball news from ESPN's public API.
 */
export function useDukeNews() {
  const [news, setNews] = useState<DukeNewsItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchNews() {
      try {
        const res = await fetch(DUKE_NEWS_URL, {
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return;
        const json = await res.json();

        const articles = (json.articles || []) as Array<Record<string, unknown>>;
        const items: DukeNewsItem[] = [];

        for (const a of articles) {
          const headline = String(a.headline || "");
          if (!headline) continue;

          const desc = String(a.description || "");
          const published = String(a.published || "");

          // Get thumbnail from images array
          const images = (a.images || []) as Array<Record<string, unknown>>;
          const thumb = images.length > 0 ? String(images[0].url || "") : undefined;

          // Get link
          const links = (a.links as Record<string, unknown>) || {};
          const web = (links.web as Record<string, unknown>) || {};
          const href = String((web as Record<string, unknown>).href || "");

          items.push({
            id: String(a.id || Math.random()),
            headline,
            description: desc,
            thumbnail: thumb || undefined,
            url: href || `https://www.espn.com/mens-college-basketball/team/_/id/150/duke-blue-devils`,
            published,
          });
        }

        if (!cancelled && items.length > 0) {
          setNews(items);
        }
      } catch {
        // silent fail
      }
    }

    fetchNews();
    return () => { cancelled = true; };
  }, []);

  return news;
}
