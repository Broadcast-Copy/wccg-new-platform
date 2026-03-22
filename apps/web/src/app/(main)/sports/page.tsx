import { SportsPageClient } from "@/components/sports/sports-page-client";
import { DUKE_BASKETBALL, DUKE_FOOTBALL, mergeTeamWithESPN } from "@/data/sports";
import { fetchESPNTeamData } from "@/lib/espn-api";

export default async function SportsPage() {
  const [bbData, fbData] = await Promise.all([
    fetchESPNTeamData("mens-college-basketball"),
    fetchESPNTeamData("college-football"),
  ]);

  const teams = [
    mergeTeamWithESPN(DUKE_BASKETBALL, bbData),
    mergeTeamWithESPN(DUKE_FOOTBALL, fbData),
  ];

  return <SportsPageClient teams={teams} />;
}
