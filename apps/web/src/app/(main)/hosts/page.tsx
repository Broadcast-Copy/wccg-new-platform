import Link from "next/link";
import { Users, Mic2, Radio } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ALL_HOSTS } from "@/data/hosts";

export const metadata = {
  title: "Hosts & DJs | WCCG 104.5 FM",
  description: "Meet the voices and personalities of WCCG 104.5 FM — show hosts, gospel voices, and Mix Squad DJs.",
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

function getLocalHosts(): Host[] {
  return ALL_HOSTS.map((h) => ({
    id: h.id,
    name: h.name,
    slug: h.id,
    bio: h.bio,
    avatarUrl: h.imageUrl,
    email: null,
    isActive: h.isActive,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

async function getHosts(): Promise<Host[]> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
    const res = await fetch(`${apiUrl}/hosts`, { next: { revalidate: 300 } });
    if (!res.ok) return getLocalHosts();
    const data = await res.json();
    return data.length > 0 ? data : getLocalHosts();
  } catch {
    return getLocalHosts();
  }
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function categorizeHosts(hosts: Host[]) {
  const mixSquadIds = hosts.filter((h) => h.id.startsWith("host_dj_"));
  const gospelPrefixes = ["host_apostle_", "host_pastor_", "host_rev_", "host_bishop_", "host_marvin_sapp"];
  const gospelHosts = hosts.filter((h) => gospelPrefixes.some((p) => h.id.startsWith(p)) && !h.id.startsWith("host_dj_"));
  const mainHosts = hosts.filter((h) => !mixSquadIds.includes(h) && !gospelHosts.includes(h));
  return { mainHosts, mixSquadIds, gospelHosts };
}

function HostCard({ host }: { host: Host }) {
  return (
    <Link href={`/hosts/${host.id}`}>
      <Card className="group h-full overflow-hidden rounded-2xl border border-border/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 hover:-translate-y-0.5">
        <CardContent className="flex items-center gap-4 p-5">
          <Avatar className="h-14 w-14 shrink-0 ring-2 ring-border/50 group-hover:ring-primary/30 transition-all">
            {host.avatarUrl ? <AvatarImage src={host.avatarUrl} alt={host.name} /> : null}
            <AvatarFallback className="text-sm font-medium bg-gradient-to-br from-primary/20 to-purple-500/20">{getInitials(host.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold truncate group-hover:text-primary transition-colors">{host.name}</p>
              {!host.isActive && <Badge variant="secondary" className="shrink-0 text-[10px]">Inactive</Badge>}
            </div>
            {host.bio && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{host.bio}</p>}
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
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-indigo-950/50 to-gray-900 border border-border/30">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle at 25% 60%, rgba(99,102,241,0.3) 0%, transparent 50%), radial-gradient(circle at 75% 30%, rgba(20,184,166,0.2) 0%, transparent 50%)` }} />
        </div>
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-xl shadow-indigo-500/20">
              <Users className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">Hosts &amp; DJs</h1>
              <p className="text-base text-white/60 max-w-2xl">Meet the voices and personalities behind WCCG 104.5 FM — show hosts, gospel voices, and Mix Squad DJs.</p>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-black/20 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2"><Mic2 className="h-4 w-4 text-indigo-400" /><span className="text-sm font-medium text-white/70">Show Hosts</span></div>
              <p className="mt-1 text-2xl font-bold text-white">{mainHosts.length}</p>
            </div>
            <div className="rounded-xl bg-black/20 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2"><Radio className="h-4 w-4 text-teal-400" /><span className="text-sm font-medium text-white/70">Mix Squad</span></div>
              <p className="mt-1 text-2xl font-bold text-white">{mixSquadIds.length}</p>
            </div>
            <div className="rounded-xl bg-black/20 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2"><Users className="h-4 w-4 text-amber-400" /><span className="text-sm font-medium text-white/70">Total</span></div>
              <p className="mt-1 text-2xl font-bold text-white">{hosts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {hosts.length === 0 ? (
        <div className="flex flex-col h-48 items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/20">
          <Users className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Host listings will appear once the API is connected.</p>
        </div>
      ) : (
        <>
          {mainHosts.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Show Hosts</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{mainHosts.map((host) => <HostCard key={host.id} host={host} />)}</div>
            </section>
          )}
          {gospelHosts.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Gospel Voices</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{gospelHosts.map((host) => <HostCard key={host.id} host={host} />)}</div>
            </section>
          )}
          {mixSquadIds.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Mix Squad DJs</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{mixSquadIds.map((host) => <HostCard key={host.id} host={host} />)}</div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
