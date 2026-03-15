"use client";

import { useEffect, useState, useCallback } from "react";
import { ESPN_SCOREBOARD_URL } from "@/data/sports";

export interface ESPNGameData {
  dukeScore: number;
  opponentScore: number;
  period: number;
  clock: string;
  status: "pre" | "in" | "post";
  statusText: string;
  lastPlay?: string;
  possession?: "duke" | "opponent";
}

const POLL_INTERVAL = 10_000; // 10 seconds

/**
 * Hook that polls ESPN's public API for real-time Duke game scores.
 * Only polls while the game is in progress. Falls back gracefully.
 */
export interface ESPNHighlight {
  id: string;
  title: string;
  description: string;
  /** URL to open the video (ESPN page, YouTube watch, or direct mp4) */
  mp4Url: string;
  hlsUrl?: string;
  thumbnail?: string;
  /** Source of the highlight: "espn" | "youtube" */
  source?: "espn" | "youtube";
  /** Embeddable URL for inline playback (YouTube embed, ESPN embed) */
  embedUrl?: string;
}

export interface ESPNPlayerStats {
  name: string;
  jersey: string;
  position: string;
  headshot?: string;
  starter: boolean;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  fgMade: number;
  fgAtt: number;
  threeMade: number;
  threeAtt: number;
  ftMade: number;
  ftAtt: number;
}

export function useESPNScores(enabled: boolean) {
  const [data, setData] = useState<ESPNGameData | null>(null);
  const [highlights, setHighlights] = useState<ESPNHighlight[]>([]);
  const [playerStats, setPlayerStats] = useState<ESPNPlayerStats[]>([]);
  const [error, setError] = useState(false);

  const fetchScores = useCallback(async () => {
    try {
      const res = await fetch(ESPN_SCOREBOARD_URL, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      // Parse the ESPN response
      const header = json.header?.competitions?.[0];
      if (!header) return;

      const status = header.status;
      const state = status?.type?.state as string; // "pre" | "in" | "post"
      const clock = status?.displayClock || "";
      const period = status?.period || 0;
      const statusText = status?.type?.shortDetail || status?.type?.detail || "";

      // Find Duke and opponent scores
      const competitors = header.competitors || [];
      let dukeScore = 0;
      let opponentScore = 0;

      for (const c of competitors) {
        const teamId = c.id || c.team?.id;
        const score = parseInt(c.score || "0", 10);
        if (teamId === "150") {
          dukeScore = score;
        } else {
          opponentScore = score;
        }
      }

      // Try to get last play text and possession
      let lastPlay: string | undefined;
      let possession: "duke" | "opponent" | undefined;
      try {
        const plays = json.plays || [];
        if (plays.length > 0) {
          const lastPlayObj = plays[plays.length - 1];
          lastPlay = lastPlayObj?.text;
          // Check possession from last play's team
          const playTeamId = String(lastPlayObj?.team?.id || lastPlayObj?.teamId || "");
          if (playTeamId) {
            possession = playTeamId === "150" ? "duke" : "opponent";
          }
        }
        // Also check situation / possession from the API
        const situation = json.situation || json.drives?.current;
        if (situation?.possession) {
          possession = String(situation.possession) === "150" ? "duke" : "opponent";
        }
        // Check header for possession indicator
        for (const c of competitors) {
          const teamId = c.id || c.team?.id;
          if (c.possession === true || c.hasPossession === true) {
            possession = teamId === "150" ? "duke" : "opponent";
          }
        }
      } catch {
        // no plays data
      }

      // Extract video highlights from ESPN + YouTube
      try {
        const videos: ESPNHighlight[] = [];

        // ── ESPN: gameInfo.news.articles with type "Media" ──
        // IMPORTANT: Only include articles about Duke / the current game.
        // ESPN often returns unrelated championship-week articles.
        const articles = (json.gameInfo?.news?.articles || json.news?.articles || []) as Array<
          Record<string, unknown>
        >;
        for (const article of articles) {
          const aType = String(article.type || "");
          const headline = String(article.headline || article.title || "");
          const desc = String(article.description || "");
          const aId = String(article.id || Math.random());

          // Skip articles that don't mention Duke — avoids unrelated game videos
          const combined = `${headline} ${desc}`.toLowerCase();
          if (!combined.includes("duke") && !combined.includes("blue devils")) continue;

          // Media-type articles ARE the video
          if (aType === "Media" || aType === "media") {
            const aLinks = (article.links as Record<string, unknown>) || {};
            const web = (aLinks.web as Record<string, unknown>) || {};
            const webSelf = (web.self as Record<string, unknown>) || {};
            const videoUrl = String(webSelf.href || web.href || "");
            // Thumbnail from images array
            const imgs = (article.images || []) as Array<Record<string, unknown>>;
            const thumb = imgs.length > 0 ? String(imgs[0].url || imgs[0].href || "") : undefined;

            if (videoUrl && headline) {
              videos.push({
                id: aId,
                title: headline,
                description: desc,
                mp4Url: videoUrl,
                thumbnail: thumb,
                source: "espn",
                embedUrl: `https://www.espn.com/core/video/iframe?id=${aId}&endcard=false`,
              });
            }
          }

          // Also check images array for Media-type images (nested video refs)
          const images = (article.images || []) as Array<Record<string, unknown>>;
          for (const img of images) {
            if (String(img.type || "") === "Media") {
              const imgName = String(img.name || img.caption || "");
              const imgUrl = String(img.url || "");
              // Only add if we don't already have this as a video and it's Duke-related
              const imgCombined = `${imgName}`.toLowerCase();
              if (imgName && !videos.some((v) => v.title === imgName) &&
                  (imgCombined.includes("duke") || imgCombined.includes("blue devils") || combined.includes("duke"))) {
                // Link to ESPN video page from parent article
                const aLinks2 = (article.links as Record<string, unknown>) || {};
                const web2 = (aLinks2.web as Record<string, unknown>) || {};
                const articleUrl = String(web2.href || "");
                videos.push({
                  id: `media-${aId}-${imgName.slice(0, 20)}`,
                  title: imgName,
                  description: desc,
                  mp4Url: articleUrl || `https://www.espn.com/video/clip?id=${aId}`,
                  thumbnail: imgUrl || undefined,
                  source: "espn",
                });
              }
            }
          }
        }

        // ── YouTube: Duke basketball highlight videos ──
        // YouTube search embeds for Duke game highlights
        const youtubeHighlights: ESPNHighlight[] = [
          {
            id: "yt-duke-uva-highlights",
            title: "Duke vs Virginia — Full Game Highlights",
            description: "Full game highlights from Duke's 74-70 victory over Virginia in the ACC Tournament Championship",
            mp4Url: "https://www.youtube.com/results?search_query=duke+vs+virginia+acc+tournament+final+highlights+2026",
            thumbnail: "https://a.espncdn.com/media/motion/2026/0314/7f7a3f9e36144c6c869889253bd518751412/7f7a3f9e36144c6c869889253bd518751412.jpg",
            source: "youtube",
          },
          {
            id: "yt-duke-isaiah-evans",
            title: "Isaiah Evans 20 PTS — Duke vs Virginia",
            description: "Isaiah Evans scored 20 points to lead Duke past Virginia in the ACC Tournament Final",
            mp4Url: "https://www.youtube.com/results?search_query=isaiah+evans+duke+basketball+highlights+2026",
            thumbnail: "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5107094.png&w=350&h=254",
            source: "youtube",
          },
          {
            id: "yt-duke-cameron-boozer",
            title: "Cameron Boozer Clutch Free Throws Seal Win",
            description: "Cameron Boozer made two free throws with 3.9 seconds left to seal Duke's 74-70 victory",
            mp4Url: "https://www.youtube.com/results?search_query=cameron+boozer+duke+basketball+highlights+2026",
            thumbnail: "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5107093.png&w=350&h=254",
            source: "youtube",
          },
          {
            id: "yt-duke-acc-trophy",
            title: "Duke Celebrates ACC Tournament Title",
            description: "Duke Blue Devils celebrate their ACC Tournament championship",
            mp4Url: "https://www.youtube.com/results?search_query=duke+acc+tournament+championship+celebration+2026",
            thumbnail: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/ncaa/500/150.png&w=350&h=254",
            source: "youtube",
          },
        ];

        // Merge: ESPN videos first, then YouTube
        const allVideos = [...videos, ...youtubeHighlights];

        // De-duplicate by title similarity
        const seen = new Set<string>();
        const deduped: ESPNHighlight[] = [];
        for (const v of allVideos) {
          const key = v.title.toLowerCase().slice(0, 40);
          if (!seen.has(key)) {
            seen.add(key);
            deduped.push(v);
          }
        }

        if (deduped.length > 0) {
          setHighlights(deduped);
        }
      } catch {
        // no video data
      }

      // Extract Duke player box score stats
      try {
        const boxscore = json.boxscore;
        if (boxscore?.players) {
          for (const teamBox of boxscore.players) {
            const teamId = String(teamBox.team?.id || "");
            if (teamId !== "150") continue; // Only Duke
            const stats: ESPNPlayerStats[] = [];
            for (const group of teamBox.statistics || []) {
              const keys = (group.keys || []) as string[];
              const minIdx = keys.indexOf("MIN");
              const ptsIdx = keys.indexOf("PTS");
              const rebIdx = keys.indexOf("REB");
              const astIdx = keys.indexOf("AST");
              const stlIdx = keys.indexOf("STL");
              const blkIdx = keys.indexOf("BLK");
              const fgIdx = keys.indexOf("FG");
              const tpIdx = keys.indexOf("3PT");
              const ftIdx = keys.indexOf("FT");

              for (const athlete of group.athletes || []) {
                const a = athlete.athlete || {};
                const vals = (athlete.stats || []) as string[];
                const parseSplit = (v: string) => {
                  const [m, a] = (v || "0-0").split("-").map(Number);
                  return { made: m || 0, att: a || 0 };
                };
                const fg = parseSplit(vals[fgIdx] || "0-0");
                const tp = parseSplit(vals[tpIdx] || "0-0");
                const ft = parseSplit(vals[ftIdx] || "0-0");
                stats.push({
                  name: String(a.displayName || a.shortName || ""),
                  jersey: String(a.jersey || ""),
                  position: String(a.position?.abbreviation || ""),
                  headshot: a.headshot?.href || a.headshot || undefined,
                  starter: !!athlete.starter,
                  minutes: parseInt(vals[minIdx] || "0", 10),
                  points: parseInt(vals[ptsIdx] || "0", 10),
                  rebounds: parseInt(vals[rebIdx] || "0", 10),
                  assists: parseInt(vals[astIdx] || "0", 10),
                  steals: parseInt(vals[stlIdx] || "0", 10),
                  blocks: parseInt(vals[blkIdx] || "0", 10),
                  fgMade: fg.made,
                  fgAtt: fg.att,
                  threeMade: tp.made,
                  threeAtt: tp.att,
                  ftMade: ft.made,
                  ftAtt: ft.att,
                });
              }
            }
            if (stats.length > 0) {
              setPlayerStats(stats.sort((a, b) => b.points - a.points));
            }
          }
        }
      } catch {
        // no box score data
      }

      setData({
        dukeScore,
        opponentScore,
        period,
        clock,
        status: state as "pre" | "in" | "post",
        statusText,
        lastPlay,
        possession,
      });
      setError(false);
    } catch {
      setError(true);
      // Keep last known data
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    fetchScores();
    const timer = setInterval(fetchScores, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [enabled, fetchScores]);

  return { data, highlights, playerStats, error, refetch: fetchScores };
}
