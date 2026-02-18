export const metadata = {
  title: "Manage Hosts | WCCG Admin",
};

export default function AdminHostsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Hosts</h1>
        {/* TODO: Add "Create Host" button */}
      </div>
      {/* TODO: Fetch hosts and render CRUD table */}
      <div className="rounded-lg border p-6">
        <p className="text-center text-muted-foreground">
          Hosts management table will appear here.
        </p>
      </div>
    </div>
  );
}
