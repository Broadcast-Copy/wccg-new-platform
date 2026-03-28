"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import {
  Gift,
  Dumbbell,
  Coffee,
  Ticket,
  Percent,
  Star,
  CheckCircle2,
  Clock,
  Crown,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Perks data
// ---------------------------------------------------------------------------
interface Perk {
  id: string;
  title: string;
  provider: string;
  description: string;
  icon: React.ElementType;
  category: "fitness" | "food" | "entertainment" | "shopping" | "exclusive";
  tier: "all" | "silver" | "gold" | "platinum";
  pointsCost: number | null;
  status: "available" | "redeemed" | "expired";
}

const PERKS: Perk[] = [
  {
    id: "1",
    title: "TrueFit Gym Membership",
    provider: "TrueFit Fitness",
    description: "Complimentary monthly gym membership for all WCCG DJs and verified creators. Full access to all locations.",
    icon: Dumbbell,
    category: "fitness",
    tier: "all",
    pointsCost: null,
    status: "available",
  },
  {
    id: "2",
    title: "Free Large Coffee",
    provider: "Crown City Coffee",
    description: "One free large coffee per week at any Crown City Coffee location. Show your WCCG listener card.",
    icon: Coffee,
    category: "food",
    tier: "silver",
    pointsCost: 500,
    status: "available",
  },
  {
    id: "3",
    title: "Concert Priority Access",
    provider: "WCCG Events",
    description: "Skip the line at all WCCG-sponsored concerts and events. VIP entry for Gold tier and above.",
    icon: Ticket,
    category: "entertainment",
    tier: "gold",
    pointsCost: 2000,
    status: "available",
  },
  {
    id: "4",
    title: "10% Off Marketplace",
    provider: "WCCG Marketplace",
    description: "Permanent 10% discount on all marketplace purchases. Applied automatically at checkout.",
    icon: Percent,
    category: "shopping",
    tier: "silver",
    pointsCost: 1000,
    status: "available",
  },
  {
    id: "5",
    title: "Meet & Greet Pass",
    provider: "WCCG Events",
    description: "Backstage meet and greet access with featured artists at WCCG events. Limited availability.",
    icon: Star,
    category: "exclusive",
    tier: "platinum",
    pointsCost: 5000,
    status: "available",
  },
  {
    id: "6",
    title: "On-Air Shoutout",
    provider: "WCCG 104.5 FM",
    description: "Get a personalized shoutout during a live show. Perfect for birthdays and special occasions.",
    icon: Crown,
    category: "exclusive",
    tier: "all",
    pointsCost: 750,
    status: "available",
  },
];

const TIER_COLORS: Record<string, string> = {
  all: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  silver: "bg-slate-400/10 text-slate-600 dark:text-slate-300",
  gold: "bg-amber-500/10 text-amber-600",
  platinum: "bg-violet-500/10 text-violet-600",
};

const CATEGORY_FILTER = ["All", "fitness", "food", "entertainment", "shopping", "exclusive"] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function MyPerksPage() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">
          <Link href="/login" className="text-primary underline">Sign in</Link> to view your perks.
        </p>
      </div>
    );
  }

  const filtered = selectedCategory === "All"
    ? PERKS
    : PERKS.filter((p) => p.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Perks</h1>
        <p className="text-muted-foreground">
          Exclusive benefits and rewards for WCCG listeners, creators, and DJs
        </p>
      </div>

      {/* Tier info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { tier: "All Listeners", color: "border-gray-300", icon: "🎧" },
          { tier: "Silver (1k+)", color: "border-slate-400", icon: "🥈" },
          { tier: "Gold (5k+)", color: "border-amber-500", icon: "🥇" },
          { tier: "Platinum (25k+)", color: "border-violet-500", icon: "💎" },
        ].map((t) => (
          <div key={t.tier} className={`rounded-lg border-2 ${t.color} bg-card p-3 text-center`}>
            <span className="text-xl">{t.icon}</span>
            <p className="text-xs font-semibold mt-1">{t.tier}</p>
          </div>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_FILTER.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize ${
              selectedCategory === cat
                ? "bg-[#14b8a6] text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Perks grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((perk) => {
          const Icon = perk.icon;
          return (
            <div
              key={perk.id}
              className="rounded-xl border bg-card p-5 space-y-3 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#14b8a6]/10">
                  <Icon className="h-5 w-5 text-[#14b8a6]" />
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${TIER_COLORS[perk.tier]}`}>
                  {perk.tier === "all" ? "All Listeners" : perk.tier}
                </span>
              </div>
              <div>
                <h3 className="font-semibold">{perk.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">by {perk.provider}</p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{perk.description}</p>
              <div className="flex items-center justify-between pt-1">
                {perk.pointsCost ? (
                  <span className="text-xs font-medium text-[#14b8a6]">
                    <Star className="inline h-3 w-3 mr-0.5" />
                    {perk.pointsCost.toLocaleString()} pts
                  </span>
                ) : (
                  <span className="text-xs font-medium text-emerald-600">
                    <CheckCircle2 className="inline h-3 w-3 mr-0.5" />
                    Included
                  </span>
                )}
                {perk.status === "available" ? (
                  <button className="rounded-lg bg-[#14b8a6] px-3 py-1 text-xs font-semibold text-white hover:bg-[#14b8a6]/90 transition-colors">
                    Redeem
                  </button>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {perk.status}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
