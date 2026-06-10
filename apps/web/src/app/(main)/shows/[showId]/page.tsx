import ShowDetailPage from "./show-detail-client";
import { ALL_SHOWS, getShowById, getShowBySlug } from "@/data/shows";
import { fetchYouTubeVideos } from "@/lib/youtube-rss";

export async function generateStaticParams() {
  // Pre-render every show under BOTH its id and its slug — schedule,
  // podcasts, and gospel-caravan links navigate by slug.
  return [
    { showId: "_placeholder" },
    ...ALL_SHOWS.flatMap((s) => [{ showId: s.id }, { showId: s.slug }]),
  ];
}

export default async function Page({
  params,
}: {
  params: Promise<{ showId: string }>;
}) {
  const { showId } = await params;
  const show = getShowById(showId) ?? getShowBySlug(showId);
  const channelId = show?.youtube?.channelId;

  const youtubeVideos = channelId
    ? await fetchYouTubeVideos(channelId)
    : [];

  return <ShowDetailPage youtubeVideos={youtubeVideos} />;
}
