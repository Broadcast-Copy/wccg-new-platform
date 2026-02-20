import { ShowCard } from "@/components/shows/show-card";
import { Mic2 } from "lucide-react";

export const metadata = {
  title: "Shows | WCCG 104.5 FM",
};

interface ShowHost {
  id: string;
  name: string;
  slug: string;
  avatarUrl?: string;
  isPrimary?: boolean;
}

interface Show {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  hosts: ShowHost[];
  createdAt: string;
  updatedAt: string;
}

async function getShows(): Promise<Show[]> {
  try {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
    const res = await fetch(`${apiUrl}/shows`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function ShowsPage() {
  const shows = await getShows();

  const activeShows = shows.filter((s) => s.isActive);
  const inactiveShows = shows.filter((s) => !s.isActive);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <Mic2 className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Show Directory</h1>
        </div>
        <p className="mt-1 text-muted-foreground">
          Explore all shows on WCCG 104.5 FM
        </p>
      </div>

      {activeShows.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Active Shows</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeShows.map((show) => (
              <ShowCard
                key={show.id}
                showId={show.id}
                title={show.name}
                description={show.description}
                hostName={show.hosts?.find((h) => h.isPrimary)?.name ?? show.hosts?.[0]?.name}
                imageUrl={show.imageUrl}
              />
            ))}
          </div>
        </section>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-lg border bg-muted/50">
          <p className="text-sm text-muted-foreground">
            Show listings will appear once the API is connected.
          </p>
        </div>
      )}

      {inactiveShows.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-muted-foreground">
            Past Shows
          </h2>
          <div className="grid gap-4 opacity-60 sm:grid-cols-2 lg:grid-cols-3">
            {inactiveShows.map((show) => (
              <ShowCard
                key={show.id}
                showId={show.id}
                title={show.name}
                description={show.description}
                hostName={show.hosts?.find((h) => h.isPrimary)?.name ?? show.hosts?.[0]?.name}
                imageUrl={show.imageUrl}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
