/**
 * Build-time YouTube RSS feed fetcher.
 * Fetches recent videos from a YouTube channel via their public RSS feed.
 * No API key required — uses the public Atom feed endpoint.
 */
import { XMLParser } from "fast-xml-parser";

export interface YouTubeVideo {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

export async function fetchYouTubeVideos(
  channelId: string,
  maxResults = 12
): Promise<YouTubeVideo[]> {
  try {
    const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];

    const xml = await res.text();
    const parsed = parser.parse(xml);
    const feed = parsed?.feed;
    if (!feed?.entry) return [];

    const entries = Array.isArray(feed.entry) ? feed.entry : [feed.entry];

    return entries.slice(0, maxResults).map((entry: Record<string, unknown>) => {
      const videoId =
        (entry["yt:videoId"] as string) ??
        ((entry.link as Record<string, string>)?.["@_href"] ?? "")
          .split("v=")[1]
          ?.split("&")[0] ??
        "";

      return {
        videoId,
        title: (entry.title as string) ?? "Untitled",
        publishedAt: (entry.published as string) ?? "",
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      };
    });
  } catch {
    return [];
  }
}
