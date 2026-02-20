import Link from "next/link";
import { Users } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Hosts & DJs | WCCG 104.5 FM",
};

interface Host {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatarUrl: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

async function getHosts(): Promise<Host[]> {
  try {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
    const res = await fetch(`${apiUrl}/hosts`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Categorize hosts by ID prefix patterns from migration data */
function categorizeHosts(hosts: Host[]) {
  const mixSquadIds = hosts.filter((h) => h.id.startsWith("host_dj_"));
  const gospelPrefixes = [
    "host_apostle_",
    "host_pastor_",
    "host_rev_",
    "host_bishop_",
    "host_marvin_sapp",
  ];
  const gospelHosts = hosts.filter(
    (h) =>
      gospelPrefixes.some((p) => h.id.startsWith(p)) &&
      !h.id.startsWith("host_dj_"),
  );
  const mainHosts = hosts.filter(
    (h) =>
      !mixSquadIds.includes(h) && !gospelHosts.includes(h),
  );

  return { mainHosts, mixSquadIds, gospelHosts };
}

function HostCard({ host }: { host: Host }) {
  return (
    <Link href={`/hosts/${host.id}`}>
      <Card className="h-full transition-all hover:shadow-md hover:bg-muted/50">
        <CardContent className="flex items-center gap-4 p-4">
          <Avatar className="h-14 w-14 shrink-0">
            {host.avatarUrl ? (
              <AvatarImage src={host.avatarUrl} alt={host.name} />
            ) : null}
            <AvatarFallback className="text-sm font-medium">
              {getInitials(host.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{host.name}</p>
              {!host.isActive && (
                <Badge variant="secondary" className="shrink-0 text-xs">
                  Inactive
                </Badge>
              )}
            </div>
            {host.bio && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {host.bio}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function HostsPage() {
  const hosts = await getHosts();
  const { mainHosts, mixSquadIds, gospelHosts } = categorizeHosts(hosts);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">
            Hosts &amp; DJs
          </h1>
        </div>
        <p className="mt-1 text-muted-foreground">
          Meet the voices and personalities of WCCG 104.5 FM
        </p>
      </div>

      {hosts.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-lg border bg-muted/50">
          <p className="text-sm text-muted-foreground">
            Host listings will appear once the API is connected.
          </p>
        </div>
      ) : (
        <>
          {/* Main Show Hosts */}
          {mainHosts.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Show Hosts</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {mainHosts.map((host) => (
                  <HostCard key={host.id} host={host} />
                ))}
              </div>
            </section>
          )}

          {/* Gospel Hosts */}
          {gospelHosts.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Gospel Voices</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {gospelHosts.map((host) => (
                  <HostCard key={host.id} host={host} />
                ))}
              </div>
            </section>
          )}

          {/* Mix Squad DJs */}
          {mixSquadIds.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Mix Squad DJs</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {mixSquadIds.map((host) => (
                  <HostCard key={host.id} host={host} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
