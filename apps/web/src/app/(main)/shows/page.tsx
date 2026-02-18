export const metadata = {
  title: "Shows | WCCG 104.5 FM",
};

export default function ShowsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Show Directory</h1>
        <p className="text-muted-foreground">
          Explore all shows on WCCG 104.5 FM
        </p>
      </div>
      {/* TODO: Fetch shows and render show cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <p className="col-span-full text-center text-muted-foreground">
          Shows will appear here.
        </p>
      </div>
    </div>
  );
}
