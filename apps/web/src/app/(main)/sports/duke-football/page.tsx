import { TeamProfile } from "@/components/sports/team-profile";
import { DUKE_FOOTBALL } from "@/data/sports";
import { fetchYouTubeVideos } from "@/lib/youtube-rss";

export default async function DukeFootballPage() {
  const youtubeVideos = DUKE_FOOTBALL.youtube.channelId
    ? await fetchYouTubeVideos(DUKE_FOOTBALL.youtube.channelId)
    : [];

  return <TeamProfile team={DUKE_FOOTBALL} youtubeVideos={youtubeVideos} />;
}
