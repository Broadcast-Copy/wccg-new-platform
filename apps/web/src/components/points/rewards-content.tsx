"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { RewardCard } from "./reward-card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { readPointsBalance } from "@/lib/points-storage";
import { reconcileSessionPoints } from "@/hooks/use-listening-points";

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
  createdAt?: string;
  updatedAt?: string;
}

interface RewardsContentProps {
  rewards: Reward[];
}

const CATEGORY_META: Record<string, { emoji: string; color: string }> = {
  "Food & Drinks": { emoji: "\uD83C\uDF54", color: "#f97316" },
  "Event Tickets": { emoji: "\uD83C\uDFAB", color: "#8b5cf6" },
  "Merch & Gear": { emoji: "\uD83D\uDC55", color: "#3b82f6" },
  "Digital Perks": { emoji: "\u26A1", color: "#06b6d4" },
  "Gift Cards": { emoji: "\uD83D\uDCB3", color: "#10b981" },
  "Experiences": { emoji: "\uD83C\uDF1F", color: "#ec4899" },
  "Community": { emoji: "\u2764\uFE0F", color: "#f59e0b" },
};

export function RewardsContent({ rewards }: RewardsContentProps) {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  useEffect(() => {
    async function fetchBalance() {
      reconcileSessionPoints();
      if (user) {
        try {
          const data = await apiClient<{ balance: number }>("/points/balance");
          setBalance(data.balance);
          return;
        } catch {
          // Fall through to localStorage
        }
      }
      setBalance(readPointsBalance(user?.email));
    }

    fetchBalance();
    const interval = setInterval(fetchBalance, 30_000);
    return () => clearInterval(interval);
  }, [user]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(rewards.map((r) => r.category).filter(Boolean))) as string[];
    return ["All", ...cats];
  }, [rewards]);

  const filtered = useMemo(() => {
    if (selectedCategory === "All") return rewards;
    return rewards.filter((r) => r.category === selectedCategory);
  }, [rewards, selectedCategory]);

  const handleRedeem = async (rewardId: string) => {
    if (!user) {
      toast.error("Please sign in to redeem rewards");
      return;
    }

    try {
      await apiClient("/points/redeem", {
        method: "POST",
        body: JSON.stringify({ rewardId }),
      });
      toast.success("Reward redeemed successfully!");
      const data = await apiClient<{ balance: number }>("/points/balance");
      setBalance(data.balance);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to redeem reward",
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* User points balance */}
      {balance !== null && (
        <div className="flex items-center gap-3 rounded-lg border bg-gradient-to-r from-[#7401df]/5 to-amber-500/5 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7401df]/10">
            <Star className="h-6 w-6 text-[#7401df]" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Your Balance</p>
            <p className="text-2xl font-bold tabular-nums">{balance.toLocaleString()} pts</p>
          </div>
        </div>
      )}

      {/* Category filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const meta = CATEGORY_META[cat];
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#7401df] text-white"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {meta && <span>{meta.emoji}</span>}
              {cat}
            </button>
          );
        })}
      </div>

      {/* Rewards grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((reward) => (
            <RewardCard
              key={reward.id}
              rewardId={reward.id}
              title={reward.name}
              description={reward.description}
              icon={reward.icon}
              pointsCost={reward.pointsCost}
              category={reward.category}
              stockCount={reward.stockCount}
              sponsor={reward.sponsor}
              available={
                reward.isActive &&
                reward.pointsCost > 0 &&
                (balance !== null ? balance >= reward.pointsCost : true)
              }
              onRedeem={handleRedeem}
            />
          ))}
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-lg border bg-muted/50">
          <div className="text-center">
            <Badge variant="secondary" className="mb-2">
              Coming Soon
            </Badge>
            <p className="text-sm text-muted-foreground">
              No rewards in this category yet.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
