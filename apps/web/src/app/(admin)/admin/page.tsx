export const metadata = {
  title: "Admin Dashboard | WCCG 104.5 FM",
};

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-6">
          <p className="text-sm text-muted-foreground">Active Streams</p>
          <p className="text-2xl font-bold">--</p>
        </div>
        <div className="rounded-lg border p-6">
          <p className="text-sm text-muted-foreground">Total Users</p>
          <p className="text-2xl font-bold">--</p>
        </div>
        <div className="rounded-lg border p-6">
          <p className="text-sm text-muted-foreground">Upcoming Events</p>
          <p className="text-2xl font-bold">--</p>
        </div>
        <div className="rounded-lg border p-6">
          <p className="text-sm text-muted-foreground">Points Awarded Today</p>
          <p className="text-2xl font-bold">--</p>
        </div>
      </div>
    </div>
  );
}
