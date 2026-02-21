"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  ArrowLeft,
  Mic,
  Mail,
  Radio,
} from "lucide-react";

// ─── Types matching API response (camelCase from NestJS format methods) ───

interface HostShow {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  isPrimary: boolean;
}

interface Host {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatarUrl: string | null;
  email: string | null;
  isActive: boolean;
  shows: HostShow[];
  createdAt: string;
  updatedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Component ───────────────────────────────────────────────────────────

export default function HostBioPage() {
  const params = useParams<{ hostId: string }>();
  const hostId = params.hostId;

  const [host, setHost] = useState<Host | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hostId) return;

    let cancelled = false;
    async function fetchHost() {
      try {
        setLoading(true);
        const data = await apiClient<Host>(`/hosts/${hostId}`);
        if (!cancelled) {
          setHost(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load host",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchHost();
    return () => {
      cancelled = true;
    };
  }, [hostId]);

  // ─── Loading state ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <Link
          href="/shows"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="flex h-64 items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mic className="h-5 w-5 animate-pulse" />
            <span>Loading host profile...</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── Error state ───────────────────────────────────────────────────────

  if (error || !host) {
    return (
      <div className="space-y-6">
        <Link
          href="/shows"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="flex h-64 items-center justify-center rounded-lg border bg-muted/50">
          <p className="text-sm text-muted-foreground">
            {error ?? "Host not found."}
          </p>
        </div>
      </div>
    );
  }

  // ─── Main render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/shows"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      {/* Profile Header */}
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        {/* Large Avatar */}
        <Avatar className="h-28 w-28 text-2xl sm:h-36 sm:w-36">
          {host.avatarUrl ? (
            <AvatarImage src={host.avatarUrl} alt={host.name} />
          ) : null}
          <AvatarFallback className="text-2xl">
            {getInitials(host.name)}
          </AvatarFallback>
        </Avatar>

        {/* Name and meta info */}
        <div className="flex-1 space-y-3 text-center sm:text-left">
          <div>
            <div className="flex flex-col items-center gap-2 sm:flex-row">
              <h1 className="text-3xl font-bold tracking-tight">
                {host.name}
              </h1>
              <Badge variant={host.isActive ? "default" : "secondary"}>
                {host.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>

          {host.email && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground sm:justify-start">
              <Mail className="h-4 w-4" />
              <a
                href={`mailto:${host.email}`}
                className="hover:text-foreground transition-colors"
              >
                {host.email}
              </a>
            </div>
          )}

          {host.bio && (
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line max-w-2xl">
              {host.bio}
            </p>
          )}
        </div>
      </div>

      <Separator />

      {/* Shows Section */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Radio className="h-5 w-5 text-primary" />
          Shows
        </h2>

        {host.shows.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {host.shows.map((show) => (
              <Link key={show.id} href={`/shows/${show.id}`}>
                <Card className="overflow-hidden transition-colors hover:bg-muted/50">
                  {/* Show image or gradient */}
                  {show.imageUrl ? (
                    <div
                      className="h-32 w-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${show.imageUrl})` }}
                    />
                  ) : (
                    <div className="h-32 w-full bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600" />
                  )}
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium truncate">{show.name}</p>
                      {show.isPrimary && (
                        <Badge variant="outline" className="shrink-0 text-xs">
                          Primary
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center rounded-lg border bg-muted/50">
            <p className="text-sm text-muted-foreground">
              This host is not currently assigned to any shows.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
