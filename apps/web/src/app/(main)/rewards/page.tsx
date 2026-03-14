import { RewardsPageClient } from "@/components/points/rewards-page-client";
import { MultiplierSchedule } from "@/components/points/multiplier-schedule";
import { MultiplierBanner } from "@/components/player/multiplier-banner";
import { Gift, Star, Trophy, Headphones, Zap, ShoppingBag, Sparkles } from "lucide-react";

export const metadata = {
  title: "Points & Rewards | WCCG 104.5 FM",
  description: "Earn mY1045 points by listening and redeem for exclusive rewards, merchandise, and experiences at WCCG 104.5 FM.",
};

interface Reward {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  imageUrl?: string;
  pointsCost: number;
  category?: string;
  stockCount?: number;
  isActive: boolean;
  sponsor?: { name: string; logo?: string };
}

const LOCAL_REWARDS: Reward[] = [
  // ── Food & Drinks ──
  { id: "reward_coffee", name: "Free Coffee", description: "Complimentary coffee at a WCCG partner cafe. Show your redemption code at pickup.", icon: "\u2615", pointsCost: 150, category: "Food & Drinks", isActive: true, sponsor: { name: "Biscuitville" } },
  { id: "reward_lunch", name: "Lunch Voucher", description: "$10 lunch credit at participating Charlotte restaurants.", icon: "\uD83C\uDF54", pointsCost: 500, category: "Food & Drinks", isActive: true, sponsor: { name: "Golden Corral" } },
  { id: "reward_pizza", name: "Pizza Night", description: "Large pizza from a local partner pizzeria. Perfect for game night.", icon: "\uD83C\uDF55", pointsCost: 600, category: "Food & Drinks", isActive: true },
  { id: "reward_soulfood", name: "Soul Food Plate", description: "Full soul food plate at a WCCG partner restaurant in Charlotte.", icon: "\uD83C\uDF57", pointsCost: 800, category: "Food & Drinks", isActive: true },
  { id: "reward_smoothie", name: "Smoothie Bowl", description: "Fresh smoothie bowl from a local health bar. Fuel your day.", icon: "\uD83E\uDD64", pointsCost: 200, category: "Food & Drinks", isActive: true },

  // ── Event Tickets ──
  { id: "reward_friday_concert", name: "Friday Night Concert", description: "GA ticket to a WCCG Friday Night Live event. Music, vibes, community.", icon: "\uD83C\uDFB6", pointsCost: 1000, category: "Event Tickets", isActive: true, sponsor: { name: "Crown Complex" } },
  { id: "reward_gospel_brunch", name: "Gospel Brunch", description: "Ticket to WCCG's monthly Gospel Brunch — food, fellowship, and live worship.", icon: "\uD83C\uDF1E", pointsCost: 800, category: "Event Tickets", isActive: true },
  { id: "reward_comedy", name: "Comedy Night", description: "Admission to a WCCG-sponsored comedy show. Laughs on us.", icon: "\uD83C\uDFAD", pointsCost: 750, category: "Event Tickets", isActive: true },
  { id: "reward_watch_party", name: "Sports Watch Party", description: "VIP section at a WCCG sports watch party with food and drinks.", icon: "\uD83C\uDFC8", pointsCost: 500, category: "Event Tickets", isActive: true },
  { id: "reward_meet_greet", name: "VIP Meet & Greet", description: "Exclusive meet & greet with a WCCG host or visiting artist.", icon: "\uD83C\uDF1F", pointsCost: 5000, category: "Event Tickets", isActive: true, stockCount: 5 },

  // ── Merch & Gear ──
  { id: "reward_tshirt", name: "WCCG Classic Tee", description: "Official WCCG 104.5 FM branded t-shirt. Available in S-XXL.", icon: "\uD83D\uDC55", pointsCost: 500, category: "Merch & Gear", isActive: true, sponsor: { name: "Street Wear NC" } },
  { id: "reward_hoodie", name: "WCCG Hoodie", description: "Premium pullover hoodie with embroidered WCCG logo.", icon: "\uD83E\uDDE5", pointsCost: 1500, category: "Merch & Gear", isActive: true },
  { id: "reward_hat", name: "Snapback Hat", description: "Premium snapback cap with embroidered WCCG logo.", icon: "\uD83E\uDDE2", pointsCost: 350, category: "Merch & Gear", isActive: true },
  { id: "reward_stickers", name: "Sticker Pack", description: "Set of 5 WCCG vinyl stickers for your laptop, car, or water bottle.", icon: "\uD83C\uDFF7\uFE0F", pointsCost: 100, category: "Merch & Gear", isActive: true },
  { id: "reward_bottle", name: "Water Bottle", description: "Insulated WCCG water bottle. Stay hydrated, stay blessed.", icon: "\uD83E\uDEE7", pointsCost: 400, category: "Merch & Gear", isActive: true },
  { id: "reward_tote", name: "Tote Bag", description: "Canvas WCCG tote bag. Carry your essentials in style.", icon: "\uD83D\uDC5C", pointsCost: 300, category: "Merch & Gear", isActive: true },

  // ── Digital Perks ──
  { id: "reward_adfree", name: "Ad-Free Hour", description: "One hour of uninterrupted listening — no ads, just music.", icon: "\uD83D\uDD07", pointsCost: 50, category: "Digital Perks", isActive: true, sponsor: { name: "WCCG Digital" } },
  { id: "reward_shoutout", name: "Custom Shoutout", description: "Get a personalized on-air shoutout during your favorite show.", icon: "\uD83D\uDCE2", pointsCost: 250, category: "Digital Perks", isActive: true },
  { id: "reward_song_request", name: "Song Request Priority", description: "Jump the queue — your song request gets played next.", icon: "\u23ED\uFE0F", pointsCost: 150, category: "Digital Perks", isActive: true },
  { id: "reward_dj_mix", name: "DJ Mix Download", description: "Download an exclusive DJ mix curated by WCCG's resident DJs.", icon: "\uD83C\uDFA7", pointsCost: 200, category: "Digital Perks", isActive: true },
  { id: "reward_playlist", name: "Exclusive Playlist", description: "Access a members-only curated playlist updated weekly.", icon: "\uD83D\uDCCB", pointsCost: 100, category: "Digital Perks", isActive: true },

  // ── Gift Cards ──
  { id: "reward_gc_10", name: "$10 Gift Card", description: "Digital gift card redeemable at select local Charlotte businesses.", icon: "\uD83D\uDCB3", pointsCost: 600, category: "Gift Cards", isActive: true },
  { id: "reward_gc_25", name: "$25 Gift Card", description: "Digital gift card redeemable at select local Charlotte businesses.", icon: "\uD83D\uDCB3", pointsCost: 1500, category: "Gift Cards", isActive: true },
  { id: "reward_gc_50", name: "$50 Gift Card", description: "Digital gift card redeemable at select local Charlotte businesses.", icon: "\uD83D\uDCB3", pointsCost: 3000, category: "Gift Cards", isActive: true },

  // ── Experiences ──
  { id: "reward_studio_tour", name: "Studio Tour", description: "Behind-the-scenes tour of the WCCG studio with a host.", icon: "\uD83C\uDFD9\uFE0F", pointsCost: 1500, category: "Experiences", isActive: true, sponsor: { name: "iHeartMedia" } },
  { id: "reward_cohost", name: "On-Air Co-Host Slot", description: "Co-host a 15-minute segment on your favorite WCCG show.", icon: "\uD83C\uDF99\uFE0F", pointsCost: 8000, category: "Experiences", isActive: true, stockCount: 2 },
  { id: "reward_private_dj", name: "Private DJ Set", description: "A WCCG DJ spins a 1-hour private set for your event.", icon: "\uD83C\uDFB5", pointsCost: 10000, category: "Experiences", isActive: true, stockCount: 3 },
  { id: "reward_backstage", name: "Backstage Pass", description: "Backstage access at a WCCG-sponsored concert.", icon: "\uD83C\uDF9F\uFE0F", pointsCost: 4000, category: "Experiences", isActive: true, stockCount: 10 },

  // ── Community ──
  { id: "reward_spotlight", name: "Listener Spotlight", description: "Get featured as WCCG Listener of the Week on air and social media.", icon: "\uD83D\uDCA1", pointsCost: 750, category: "Community", isActive: true },
  { id: "reward_birthday", name: "Birthday Shoutout", description: "A special on-air birthday shoutout from the morning show crew.", icon: "\uD83C\uDF82", pointsCost: 200, category: "Community", isActive: true },
  { id: "reward_dedication", name: "Song Dedication", description: "Dedicate a song to someone special during any live show.", icon: "\u2764\uFE0F", pointsCost: 100, category: "Community", isActive: true },
  { id: "reward_wall_of_fame", name: "Wall of Fame Badge", description: "Earn a permanent badge on the WCCG digital Wall of Fame.", icon: "\uD83C\uDFC6", pointsCost: 500, category: "Community", isActive: true },
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
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">Points & Rewards</h1>
              <p className="text-base text-white/60 max-w-2xl">Your loyalty pays off — literally. Use your mY1045 points for food, event tickets, merch, digital perks, and exclusive experiences.</p>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2"><Star className="h-4 w-4 text-amber-400" /><span className="text-sm font-medium text-white/60">Rewards</span></div>
              <p className="mt-1 text-2xl font-bold text-white">{activeRewards.length}</p>
            </div>
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-purple-400" /><span className="text-sm font-medium text-white/60">Categories</span></div>
              <p className="mt-1 text-2xl font-bold text-white">{categories.size || "\u2014"}</p>
            </div>
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2"><Headphones className="h-4 w-4 text-teal-400" /><span className="text-sm font-medium text-white/60">Starting At</span></div>
              <p className="mt-1 text-2xl font-bold text-white">50 pts</p>
            </div>
          </div>
        </div>
      </div>

      {/* How Points Work */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#74ddc7]/10">
            <Headphones className="h-5 w-5 text-[#74ddc7]" />
          </div>
          <div>
            <p className="text-sm font-semibold">Earn</p>
            <p className="text-[11px] text-muted-foreground">1 pt every 90s of listening</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#7401df]/10">
            <Zap className="h-5 w-5 text-[#7401df]" />
          </div>
          <div>
            <p className="text-sm font-semibold">Bonus</p>
            <p className="text-[11px] text-muted-foreground">Daily bounty, streaks, sharing</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
            <ShoppingBag className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-semibold">Spend</p>
            <p className="text-[11px] text-muted-foreground">Food, events, merch & more</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/10">
            <Sparkles className="h-5 w-5 text-rose-500" />
          </div>
          <div>
            <p className="text-sm font-semibold">Enjoy</p>
            <p className="text-[11px] text-muted-foreground">Pick up at station or digitally</p>
          </div>
        </div>
      </div>

      {/* Multiplier Banner — shows when active */}
      <MultiplierBanner />

      {/* Point Multiplier Schedule */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Zap className="h-5 w-5 text-amber-400" />
          Point Multiplier Schedule
        </h2>
        <MultiplierSchedule />
      </div>

      <RewardsPageClient rewards={rewards} />
    </div>
  );
}
