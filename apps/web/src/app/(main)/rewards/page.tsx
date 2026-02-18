export const metadata = {
  title: "Rewards | WCCG 104.5 FM",
};

export default function RewardsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rewards Catalog</h1>
        <p className="text-muted-foreground">
          Redeem your points for exclusive rewards
        </p>
      </div>
      {/* TODO: Fetch rewards catalog and render reward cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <p className="col-span-full text-center text-muted-foreground">
          Rewards catalog will appear here.
        </p>
      </div>
    </div>
  );
}
