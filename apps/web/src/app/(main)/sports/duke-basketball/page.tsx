import { TeamProfile } from "@/components/sports/team-profile";
import { DUKE_BASKETBALL, mergeTeamWithESPN } from "@/data/sports";
import { fetchESPNTeamData } from "@/lib/espn-api";
import { fetchYouTubeVideos } from "@/lib/youtube-rss";

export default async function DukeBasketballPage() {
  const [espnData, youtubeVideos] = await Promise.all([
    fetchESPNTeamData("mens-college-basketball"),
    DUKE_BASKETBALL.youtube.channelId
      ? fetchYouTubeVideos(DUKE_BASKETBALL.youtube.channelId)
      : Promise.resolve([]),
  ]);

  const team = mergeTeamWithESPN(DUKE_BASKETBALL, espnData);

  return <TeamProfile team={team} youtubeVideos={youtubeVideos} />;
}
