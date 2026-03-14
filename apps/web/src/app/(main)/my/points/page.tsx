import Link from "next/link";
import { Gift, ChevronRight } from "lucide-react";
import { PointsHistory } from "@/components/points/points-history";

export const metadata = {
  title: "Points History | WCCG 104.5 FM",
};

export default function MyPointsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Points History</h1>
        <p className="text-muted-foreground">
          Your points balance and transaction history
        </p>
      </div>
      <PointsHistory />
      <div className="flex justify-center">
        <Link
          href="/rewards"
          className="inline-flex items-center gap-2 rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/5 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[#f59e0b]/10"
        >
          <Gift className="h-4 w-4 text-[#f59e0b]" />
          View Rewards Store
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}
