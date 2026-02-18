import { notFound } from "next/navigation";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  if (!eventId) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Event Detail</h1>
        <p className="text-muted-foreground">Event ID: {eventId}</p>
      </div>
      {/* TODO: Fetch event data, ticket info, venue details */}
      <div className="rounded-lg border p-6">
        <p className="text-muted-foreground">
          Event detail content will be rendered here.
        </p>
      </div>
    </div>
  );
}
