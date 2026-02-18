export const metadata = {
  title: "Manage Shows | WCCG Admin",
};

export default function AdminShowsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Shows</h1>
        {/* TODO: Add "Create Show" button */}
      </div>
      {/* TODO: Fetch shows and render CRUD table */}
      <div className="rounded-lg border p-6">
        <p className="text-center text-muted-foreground">
          Shows management table will appear here.
        </p>
      </div>
    </div>
  );
}
