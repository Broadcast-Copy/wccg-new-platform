import { TeamProfile } from "@/components/sports/team-profile";
import { DUKE_FOOTBALL, mergeTeamWithESPN } from "@/data/sports";
import { fetchESPNTeamData } from "@/lib/espn-api";
import { fetchYouTubeVideos } from "@/lib/youtube-rss";

export default async function DukeFootballPage() {
  const [espnData, youtubeVideos] = await Promise.all([
    fetchESPNTeamData("college-football"),
    DUKE_FOOTBALL.youtube.channelId
      ? fetchYouTubeVideos(DUKE_FOOTBALL.youtube.channelId)
      : Promise.resolve([]),
  ]);

  const team = mergeTeamWithESPN(DUKE_FOOTBALL, espnData);

  return <TeamProfile team={team} youtubeVideos={youtubeVideos} />;
}
