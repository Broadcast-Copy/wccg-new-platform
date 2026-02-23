"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Radio,
  Clock,
  ExternalLink,
  Loader2,
  Waves,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";

interface Show {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
  timeSlot?: string;
  stream?: {
    id: string;
    name: string;
  };
}

export default function DashboardShowsPage() {
  const { isLoading: authLoading } = useAuth();
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    async function fetchShows() {
      try {
        const data = await apiClient<Show[]>("/shows?hostId=me");
        setShows(Array.isArray(data) ? data : []);
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }

    fetchShows();
  }, [authLoading]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          My Shows
        </h1>
        <p className="text-muted-foreground">
          Shows you are assigned to as a DJ/Host
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-white/10 bg-[#12121a]">
              <CardHeader>
                <div className="h-5 w-40 animate-pulse rounded bg-white/10" />
                <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 w-full animate-pulse rounded bg-white/10" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
                <div className="h-8 w-28 animate-pulse rounded bg-white/10" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : shows.length === 0 ? (
        <Card className="border-white/10 bg-[#12121a]">
          <CardContent className="flex h-48 flex-col items-center justify-center">
            <Radio className="mb-3 size-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              You are not assigned to any shows yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Contact an administrator to get assigned to a show.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shows.map((show) => (
            <Card
              key={show.id}
              className="border-white/10 bg-[#12121a] transition-shadow hover:shadow-md hover:shadow-[#74ddc7]/5"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-[#7401df]/20">
                      <Radio className="size-4 text-[#7401df]" />
                    </div>
                    <div>
                      <CardTitle className="text-base text-white">
                        {show.name}
                      </CardTitle>
                    </div>
                  </div>
                  {show.isActive !== undefined && (
                    <Badge
                      variant="outline"
                      className={
                        show.isActive
                          ? "border-[#74ddc7]/30 text-[#74ddc7]"
                          : "border-white/20 text-muted-foreground"
                      }
                    >
                      {show.isActive ? "Active" : "Inactive"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {show.timeSlot && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="size-4" />
                    <span>{show.timeSlot}</span>
                  </div>
                )}

                {show.stream && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Waves className="size-4" />
                    <span>{show.stream.name}</span>
                  </div>
                )}

                {show.description && (
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {show.description}
                  </p>
                )}

                {show.slug && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 border-white/10 bg-white/5 text-[#74ddc7] hover:bg-[#74ddc7]/10 hover:border-[#74ddc7]/30"
                    asChild
                  >
                    <Link href={`/shows/${show.slug}`}>
                      <ExternalLink className="mr-2 size-3" />
                      View Public Page
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
