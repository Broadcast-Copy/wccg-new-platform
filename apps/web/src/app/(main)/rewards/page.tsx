import { RewardsContent } from "@/components/points/rewards-content";
import { Gift } from "lucide-react";

export const metadata = {
  title: "Rewards | WCCG 104.5 FM",
};

interface Reward {
  id: string;
  title: string;
  description?: string;
  points_cost: number;
  image_url?: string;
  is_available: boolean;
}

async function getRewards(): Promise<Reward[]> {
  try {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
    const res = await fetch(`${apiUrl}/rewards`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function RewardsPage() {
  const rewards = await getRewards();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Gift className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">
            Rewards Catalog
          </h1>
        </div>
        <p className="mt-1 text-muted-foreground">
          Redeem your points for exclusive rewards and experiences
        </p>
      </div>

      <RewardsContent rewards={rewards} />
    </div>
  );
}
