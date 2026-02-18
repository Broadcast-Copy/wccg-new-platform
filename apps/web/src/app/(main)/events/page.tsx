export const metadata = {
  title: "Events | WCCG 104.5 FM",
};

export default function EventsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground">
            Discover upcoming events and experiences
          </p>
        </div>
        {/* TODO: Link to event creation for authorized users */}
      </div>
      {/* TODO: Fetch events and render event cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <p className="col-span-full text-center text-muted-foreground">
          Events will appear here.
        </p>
      </div>
    </div>
  );
}
