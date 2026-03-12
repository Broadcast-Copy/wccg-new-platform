import HostBioPage from "./host-bio-client";
import { ALL_HOSTS, getHostById } from "@/data/hosts";
import { fetchYouTubeVideos } from "@/lib/youtube-rss";

export async function generateStaticParams() {
  return [
    { hostId: "_placeholder" },
    ...ALL_HOSTS.map((h) => ({ hostId: h.id })),
  ];
}

export default async function Page({
  params,
}: {
  params: Promise<{ hostId: string }>;
}) {
  const { hostId } = await params;
  const host = getHostById(hostId);
  const channelId = host?.youtubeChannelId;

  const youtubeVideos = channelId
    ? await fetchYouTubeVideos(channelId)
    : [];

  return <HostBioPage youtubeVideos={youtubeVideos} />;
}
