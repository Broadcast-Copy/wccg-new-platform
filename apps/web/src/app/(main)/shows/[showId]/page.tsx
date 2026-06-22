import ShowDetailPage from "./show-detail-client";
import { getShowsFromDb } from "@/lib/content-db";
import { fetchYouTubeVideos } from "@/lib/youtube-rss";

export async function generateStaticParams() {
  // Pre-render every show under BOTH its id and its slug — schedule,
  // podcasts, and gospel-caravan links navigate by slug. Sourced from the DB
  // at build time (falls back to the hardcoded show list inside getShowsFromDb).
  const shows = await getShowsFromDb();
  return [
    { showId: "_placeholder" },
    ...shows.flatMap((s) => [{ showId: s.id }, { showId: s.slug }]),
  ];
}

export default async function Page({
  params,
}: {
  params: Promise<{ showId: string }>;
}) {
  const { showId } = await params;
  const shows = await getShowsFromDb();
  const show =
    shows.find((s) => s.id === showId) ?? shows.find((s) => s.slug === showId);
  const yt = show?.youtube;
  const channelIds = [yt?.channelId, ...(yt?.extraChannelIds ?? [])].filter(
    (id): id is string => !!id,
  );

  // Merge every configured channel (show + host personal), newest first.
  const lists = await Promise.all(channelIds.map((id) => fetchYouTubeVideos(id)));
  const seen = new Set<string>();
  const youtubeVideos = lists
    .flat()
    .filter((v) => !seen.has(v.videoId) && (seen.add(v.videoId), true))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 12);

  return <ShowDetailPage youtubeVideos={youtubeVideos} />;
}
