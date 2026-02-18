export const metadata = {
  title: "Manage Streams | WCCG Admin",
};

export default function AdminStreamsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Streams</h1>
        {/* TODO: Add "Create Stream" button */}
      </div>
      {/* TODO: Fetch streams and render CRUD table */}
      <div className="rounded-lg border p-6">
        <p className="text-center text-muted-foreground">
          Streams management table will appear here.
        </p>
      </div>
    </div>
  );
}
