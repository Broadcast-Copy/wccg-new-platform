import { notFound } from "next/navigation";

export default async function ShowDetailPage({
  params,
}: {
  params: Promise<{ showId: string }>;
}) {
  const { showId } = await params;

  if (!showId) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Show Detail</h1>
        <p className="text-muted-foreground">Show ID: {showId}</p>
      </div>
      {/* TODO: Fetch show data, host info, episodes */}
      <div className="rounded-lg border p-6">
        <p className="text-muted-foreground">
          Show detail content will be rendered here.
        </p>
      </div>
    </div>
  );
}
