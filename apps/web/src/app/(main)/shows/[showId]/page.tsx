import ShowDetailPage from "./show-detail-client";
import { ALL_SHOWS, getShowById } from "@/data/shows";
import { fetchYouTubeVideos } from "@/lib/youtube-rss";

export async function generateStaticParams() {
  return [
    { showId: "_placeholder" },
    ...ALL_SHOWS.map((s) => ({ showId: s.id })),
  ];
}

export default async function Page({
  params,
}: {
  params: Promise<{ showId: string }>;
}) {
  const { showId } = await params;
  const show = getShowById(showId);
  const channelId = show?.youtube?.channelId;

  const youtubeVideos = channelId
    ? await fetchYouTubeVideos(channelId)
    : [];

  return <ShowDetailPage youtubeVideos={youtubeVideos} />;
}
