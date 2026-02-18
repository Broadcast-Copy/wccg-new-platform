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
    </div>
  );
}
