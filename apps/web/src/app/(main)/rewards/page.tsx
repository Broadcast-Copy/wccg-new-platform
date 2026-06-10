import { RewardsArcade } from "@/components/rewards/rewards-arcade";

export const metadata = {
  title: "Rewards Arcade | WCCG 104.5 FM",
  description:
    "Earn mY1045 points by listening, climb the weekly leaderboard, unlock badges, and redeem exclusive rewards, merchandise, and experiences at WCCG 104.5 FM.",
};

/**
 * /rewards — the Rewards Arcade.
 *
 * Static-export shell: all data (leaderboards, live reward catalog, listener
 * spotlight, milestones, balance) loads client-side, Supabase-direct. The
 * old build-time fetch to the retired API server (with its hardcoded demo
 * catalog fallback) is gone — the catalog now comes from `reward_catalog`.
 */
export default function RewardsPage() {
  return <RewardsArcade />;
}
