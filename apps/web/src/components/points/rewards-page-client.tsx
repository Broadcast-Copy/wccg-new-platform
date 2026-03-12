"use client";

import { useState } from "react";
import { RewardsContent } from "./rewards-content";
import { PointsHistory } from "./points-history";
import { ListeningHistory } from "@/components/history/listening-history";
import { Gift, History, Radio, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

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

type Tab = "rewards" | "points" | "history";

const TABS: { value: Tab; label: string; icon: React.ReactNode }[] = [
  { value: "rewards", label: "Rewards", icon: <ShoppingBag className="h-4 w-4" /> },
  { value: "points", label: "Points History", icon: <History className="h-4 w-4" /> },
  { value: "history", label: "Listening History", icon: <Radio className="h-4 w-4" /> },
];

export function RewardsPageClient({ rewards }: { rewards: Reward[] }) {
  const [activeTab, setActiveTab] = useState<Tab>("rewards");

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
        {TABS.map((tab) => (
          <Button
            key={tab.value}
            variant={activeTab === tab.value ? "default" : "ghost"}
            size="sm"
            className={`flex-1 gap-2 ${
              activeTab === tab.value
                ? "bg-[#7401df] hover:bg-[#7401df]/90 text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </Button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "rewards" && <RewardsContent rewards={rewards} />}
      {activeTab === "points" && <PointsHistory />}
      {activeTab === "history" && <ListeningHistory />}
    </div>
  );
}
