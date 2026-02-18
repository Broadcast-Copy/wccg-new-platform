export const metadata = {
  title: "Points Management | WCCG Admin",
};

export default function AdminPointsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Points Management</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Points Rules</h2>
          {/* TODO: Points rules configuration */}
          <div className="rounded-lg border p-6">
            <p className="text-muted-foreground">
              Points rules configuration will appear here.
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Points Ledger</h2>
          {/* TODO: Points ledger / transaction log */}
          <div className="rounded-lg border p-6">
            <p className="text-muted-foreground">
              Points ledger will appear here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
