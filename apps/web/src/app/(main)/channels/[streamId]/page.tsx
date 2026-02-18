import { notFound } from "next/navigation";

export default async function StreamDetailPage({
  params,
}: {
  params: Promise<{ streamId: string }>;
}) {
  const { streamId } = await params;

  if (!streamId) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stream Detail</h1>
        <p className="text-muted-foreground">Stream ID: {streamId}</p>
      </div>
      {/* TODO: Fetch stream data and render detail view */}
      <div className="rounded-lg border p-6">
        <p className="text-muted-foreground">
          Stream detail content will be rendered here.
        </p>
      </div>
    </div>
  );
}
