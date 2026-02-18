import { notFound } from "next/navigation";

export default async function HostBioPage({
  params,
}: {
  params: Promise<{ hostId: string }>;
}) {
  const { hostId } = await params;

  if (!hostId) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Host Bio</h1>
        <p className="text-muted-foreground">Host ID: {hostId}</p>
      </div>
      {/* TODO: Fetch host data, shows, social links */}
      <div className="rounded-lg border p-6">
        <p className="text-muted-foreground">
          Host biography and show list will be rendered here.
        </p>
      </div>
    </div>
  );
}
