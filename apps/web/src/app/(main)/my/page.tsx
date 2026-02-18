import Link from "next/link";

export const metadata = {
  title: "My Dashboard | WCCG 104.5 FM",
};

export default function UserDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Dashboard</h1>
        <p className="text-muted-foreground">
          Your WCCG activity at a glance
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/my/points"
          className="rounded-lg border p-6 transition-colors hover:bg-muted/50"
        >
          <h2 className="font-semibold">Points History</h2>
          <p className="text-sm text-muted-foreground">
            View your points balance and transactions
          </p>
        </Link>
        <Link
          href="/my/tickets"
          className="rounded-lg border p-6 transition-colors hover:bg-muted/50"
        >
          <h2 className="font-semibold">My Tickets</h2>
          <p className="text-sm text-muted-foreground">
            Manage your event tickets
          </p>
        </Link>
        <Link
          href="/my/favorites"
          className="rounded-lg border p-6 transition-colors hover:bg-muted/50"
        >
          <h2 className="font-semibold">Favorites</h2>
          <p className="text-sm text-muted-foreground">
            Your favorited shows and streams
          </p>
        </Link>
      </div>
    </div>
  );
}
