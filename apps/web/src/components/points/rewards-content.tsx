"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { RewardCard } from "./reward-card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { toast } from "sonner";

interface Reward {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  pointsCost: number;
  category?: string;
  stockCount?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface RewardsContentProps {
  rewards: Reward[];
}

export function RewardsContent({ rewards }: RewardsContentProps) {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;

    async function fetchBalance() {
      try {
        const data = await apiClient<{ balance: number }>("/points/balance");
        setBalance(data.balance);
      } catch {
        setBalance(0);
      }
    }

    fetchBalance();
  }, [user]);

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
      // Refresh balance
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
      {user && balance !== null && (
        <div className="flex items-center gap-3 rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Star className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Your Balance</p>
            <p className="text-2xl font-bold">{balance.toLocaleString()} pts</p>
          </div>
        </div>
      )}

      {/* Rewards grid */}
      {rewards.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rewards.map((reward) => (
            <RewardCard
              key={reward.id}
              rewardId={reward.id}
              title={reward.name}
              description={reward.description}
              pointsCost={reward.pointsCost}
              available={
                reward.isActive &&
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
              Rewards catalog will appear once the API is connected.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
