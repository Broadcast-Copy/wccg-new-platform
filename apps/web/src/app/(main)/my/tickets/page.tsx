export const metadata = {
  title: "My Tickets | WCCG 104.5 FM",
};

export default function MyTicketsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Tickets</h1>
        <p className="text-muted-foreground">
          Your event tickets and reservations
        </p>
      </div>
      {/* TODO: Fetch user tickets and render list */}
      <div className="rounded-lg border p-6">
        <p className="text-center text-muted-foreground">
          You have no tickets yet. Browse{" "}
          <a href="/events" className="underline hover:text-foreground">
            events
          </a>{" "}
          to get started.
        </p>
      </div>
    </div>
  );
}
