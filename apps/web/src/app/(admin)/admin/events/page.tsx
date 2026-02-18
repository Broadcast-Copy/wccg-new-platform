export const metadata = {
  title: "Manage Events | WCCG Admin",
};

export default function AdminEventsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Events</h1>
        {/* TODO: Add "Create Event" button */}
      </div>
      {/* TODO: Fetch events and render management table */}
      <div className="rounded-lg border p-6">
        <p className="text-center text-muted-foreground">
          Event management table will appear here.
        </p>
      </div>
    </div>
  );
}
