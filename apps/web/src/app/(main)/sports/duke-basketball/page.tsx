import { TeamProfile } from "@/components/sports/team-profile";
import { DUKE_BASKETBALL } from "@/data/sports";
import { fetchYouTubeVideos } from "@/lib/youtube-rss";

export default async function DukeBasketballPage() {
  const youtubeVideos = DUKE_BASKETBALL.youtube.channelId
    ? await fetchYouTubeVideos(DUKE_BASKETBALL.youtube.channelId)
    : [];

  return <TeamProfile team={DUKE_BASKETBALL} youtubeVideos={youtubeVideos} />;
}
