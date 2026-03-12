import { RewardsContent } from "@/components/points/rewards-content";
import { Gift, Star, Trophy, Coins } from "lucide-react";

export const metadata = {
  title: "Rewards | WCCG 104.5 FM",
  description: "Redeem your mY1045 points for exclusive rewards, merchandise, and experiences at WCCG 104.5 FM.",
};

interface Reward {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  pointsCost: number;
  category?: string;
  stockCount?: number;
  isActive: boolean;
}

const LOCAL_REWARDS: Reward[] = [
  { id: "reward_tshirt", name: "WCCG T-Shirt", description: "Official WCCG 104.5 FM branded t-shirt. Available in S-XXL.", pointsCost: 500, category: "Merchandise", isActive: true },
  { id: "reward_hat", name: "WCCG Snapback Hat", description: "Premium snapback cap with embroidered WCCG logo.", pointsCost: 350, category: "Merchandise", isActive: true },
  { id: "reward_sticker_pack", name: "Sticker Pack", description: "Set of 5 WCCG vinyl stickers for your laptop, car, or water bottle.", pointsCost: 100, category: "Merchandise", isActive: true },
  { id: "reward_concert_ticket", name: "Concert Ticket", description: "General admission to a WCCG-sponsored live event.", pointsCost: 2000, category: "Experiences", isActive: true },
  { id: "reward_meet_greet", name: "Meet & Greet Pass", description: "Exclusive meet & greet with a WCCG host or visiting artist.", pointsCost: 5000, category: "Experiences", isActive: true },
  { id: "reward_shoutout", name: "On-Air Shoutout", description: "Get a personalized shoutout during your favorite show.", pointsCost: 250, category: "Experiences", isActive: true },
  { id: "reward_studio_tour", name: "Studio Tour", description: "Behind-the-scenes tour of the WCCG studio with a host.", pointsCost: 3000, category: "Experiences", isActive: true },
  { id: "reward_gift_card_25", name: "$25 Gift Card", description: "Digital gift card redeemable at select local businesses.", pointsCost: 1500, category: "Gift Cards", isActive: true },
  { id: "reward_share_bonus", name: "Share Player Bonus", description: "Share the WCCG player with friends to earn 2 bonus points.", pointsCost: 0, category: "Point Bounties", isActive: true },
  { id: "reward_referral_bonus", name: "Referral Code Bonus", description: "Earn 5 points when someone uses your referral code to sign up.", pointsCost: 0, category: "Point Bounties", isActive: true },
];

async function getRewards(): Promise<Reward[]> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
    const res = await fetch(`${apiUrl}/rewards`, { next: { revalidate: 300 } });
    if (!res.ok) return LOCAL_REWARDS;
    const data = await res.json();
    return data.length > 0 ? data : LOCAL_REWARDS;
  } catch {
    return LOCAL_REWARDS;
  }
}

export default async function RewardsPage() {
  const rewards = await getRewards();
  const activeRewards = rewards.filter((r) => r.isActive);
  const categories = new Set(rewards.map((r) => r.category).filter(Boolean));

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-amber-950/50 to-gray-900 border border-border/30">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle at 30% 50%, rgba(245,158,11,0.3) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(168,85,247,0.2) 0%, transparent 50%)` }} />
        </div>
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-xl shadow-amber-500/20">
              <Gift className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">Rewards Catalog</h1>
              <p className="text-base text-white/60 max-w-2xl">Redeem your mY1045 points for exclusive rewards, merchandise, concert tickets, and VIP experiences.</p>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2"><Star className="h-4 w-4 text-amber-400" /><span className="text-sm font-medium text-white/60">Available</span></div>
              <p className="mt-1 text-2xl font-bold text-white">{activeRewards.length}</p>
            </div>
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-purple-400" /><span className="text-sm font-medium text-white/60">Categories</span></div>
              <p className="mt-1 text-2xl font-bold text-white">{categories.size || "—"}</p>
            </div>
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2"><Coins className="h-4 w-4 text-teal-400" /><span className="text-sm font-medium text-white/60">Earn By</span></div>
              <p className="mt-1 text-2xl font-bold text-white">Listening</p>
            </div>
          </div>
        </div>
      </div>

      {rewards.length > 0 ? (
        <RewardsContent rewards={rewards} />
      ) : (
        <div className="flex flex-col h-48 items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/20">
          <Gift className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Rewards will appear once the catalog is loaded.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Listen to earn mY1045 points and unlock exclusive rewards</p>
        </div>
      )}
    </div>
  );
}
