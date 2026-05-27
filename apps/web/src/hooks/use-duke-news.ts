"use client";

import { useEffect, useState } from "react";

export interface DukeNewsItem {
  id: string;
  headline: string;
  description: string;
  thumbnail?: string;
  url: string;
  published: string;
  sport: "basketball" | "football";
}

// ESPN team news endpoints — separate sport namespaces.
const ESPN_BASKETBALL_NEWS_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/news?team=150&limit=15";
const ESPN_FOOTBALL_NEWS_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/college-football/news?team=150&limit=15";

// GoDuke's CMS — sport_id 1 = football, sport_id 4 = men's basketball
// (per https://goduke.com/api/v2/sports/{id} when probed in 2024–2026).
// GoDuke sometimes leaks non-sport-specific stories into a per-sport feed,
// so we URL-filter below as a belt-and-suspenders check.
const GODUKE_BASKETBALL_URL =
  "https://goduke.com/api/v2/stories?sport_id=4&per_page=10";
const GODUKE_FOOTBALL_URL =
  "https://goduke.com/api/v2/stories?sport_id=1&per_page=10";

/**
 * Classify a story as basketball, football, or "other" by inspecting its
 * URL + headline. We REJECT stories that don't clearly belong to one of
 * the two target sports — that's the fix for the prior tile bleeding
 * track/baseball/general-athletics stories into a feed labelled DUKE
 * BASKETBALL.
 */
function classify(url: string, headline: string): "basketball" | "football" | null {
  const u = (url || "").toLowerCase();
  const h = (headline || "").toLowerCase();

  // URL is the strongest signal — GoDuke and ESPN both put the sport
  // in the path.
  if (u.includes("/mens-basketball") || u.includes("mens-college-basketball")) {
    return "basketball";
  }
  if (u.includes("/football") || u.includes("college-football")) {
    return "football";
  }

  // Fallback: headline keywords (catches general "Duke Athletics" wrappers).
  if (/basketball|hoops|coach k|jon scheyer|cameron crazies|cameron indoor/i.test(h)) {
    return "basketball";
  }
  if (/football|gridiron|quarterback|wallace wade|manny diaz/i.test(h)) {
    return "football";
  }

  // Anything else (track, baseball, lacrosse, golf, etc.) gets rejected.
  return null;
}

/**
 * Fetch real-time Duke basketball + football news from both ESPN and
 * GoDuke.com APIs. Merged + de-duplicated by headline, sorted newest
 * first. Non-basketball/football stories are filtered OUT.
 */
export function useDukeNews() {
  const [news, setNews] = useState<DukeNewsItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchEspn(url: string, fallback: string): Promise<DukeNewsItem[]> {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
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
          const finalUrl = href || fallback;

          const sport = classify(finalUrl, headline);
          if (!sport) continue;

          items.push({
            id: `espn-${a.id || Math.random()}`,
            headline,
            description: desc,
            thumbnail: thumb || undefined,
            url: finalUrl,
            published,
            sport,
          });
        }
        return items;
      } catch {
        return [];
      }
    }

    async function fetchGoDuke(url: string, fallback: string): Promise<DukeNewsItem[]> {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return [];
        const json = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stories = (json.items || []) as any[];
        const items: DukeNewsItem[] = [];

        for (const s of stories) {
          const headline = String(s.title || "");
          if (!headline) continue;

          const images = s.images || [];
          const thumb = images.length > 0 ? String(images[0]?.fullpath || images[0]?.url || "") : undefined;
          const finalUrl = s.url
            ? (s.url.startsWith("http") ? s.url : `https://goduke.com${s.url}`)
            : fallback;

          const sport = classify(finalUrl, headline);
          if (!sport) continue;

          items.push({
            id: `goduke-${s.contentId || Math.random()}`,
            headline,
            description: String(s.teaser || s.summary || ""),
            thumbnail: thumb ? (thumb.startsWith("http") ? thumb : `https://goduke.com${thumb}`) : undefined,
            url: finalUrl,
            published: String(s.publishedOn || s.date || ""),
            sport,
          });
        }
        return items;
      } catch {
        return [];
      }
    }

    async function fetchAll() {
      const [espnB, espnF, godukeB, godukeF] = await Promise.all([
        fetchEspn(ESPN_BASKETBALL_NEWS_URL, "https://www.espn.com/mens-college-basketball/team/_/id/150/duke-blue-devils"),
        fetchEspn(ESPN_FOOTBALL_NEWS_URL,   "https://www.espn.com/college-football/team/_/id/150/duke-blue-devils"),
        fetchGoDuke(GODUKE_BASKETBALL_URL,  "https://goduke.com/sports/mens-basketball"),
        fetchGoDuke(GODUKE_FOOTBALL_URL,    "https://goduke.com/sports/football"),
      ]);

      const seen = new Set<string>();
      const merged: DukeNewsItem[] = [];
      // GoDuke first so its richer stories win on de-dup ties.
      for (const item of [...godukeB, ...godukeF, ...espnB, ...espnF]) {
        const key = item.headline.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(item);
      }

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
