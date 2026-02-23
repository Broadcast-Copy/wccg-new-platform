"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { getHostById, type HostData } from "@/data/hosts";
import { getShowById } from "@/data/shows";
import { YouTubeGrid } from "@/components/youtube/youtube-grid";
import { MixCard } from "@/components/mixes/mix-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Youtube,
  Disc3,
  ExternalLink,
  Clock,
} from "lucide-react";

// ─── Social Icon Components ─────────────────────────────────────────────

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

// ─── Types matching API response ───────────────────────────────────────

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

interface Mix {
  id: string;
  title: string;
  hostName: string;
  genre: string;
  duration: number;
  playCount: number;
  coverImageUrl?: string;
  audioUrl?: string;
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

// ─── Social Links Bar ──────────────────────────────────────────────────

function SocialLinksBar({ hostData }: { hostData: HostData }) {
  const links = hostData.socialLinks ?? [];

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    twitter: TwitterIcon,
    instagram: InstagramIcon,
    facebook: FacebookIcon,
    tiktok: TikTokIcon,
    youtube: Youtube,
  };

  // Build socials array from the host's social links
  const socials = links.map((link) => ({
    key: link.platform,
    url: link.url,
    icon: iconMap[link.platform] ?? ExternalLink,
    label: link.label,
  }));

  // Add YouTube channel if present and not already in social links
  if (hostData.youtubeChannel && !links.some((l) => l.platform === "youtube")) {
    socials.push({
      key: "youtube",
      url: `https://youtube.com/${hostData.youtubeChannel}`,
      icon: Youtube,
      label: hostData.youtubeChannel,
    });
  }

  if (socials.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {socials.map((social) => (
        <a
          key={social.key}
          href={social.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 transition-all hover:bg-[#74ddc7]/20 hover:text-[#74ddc7] hover:border-[#74ddc7]/30"
          title={social.label}
        >
          <social.icon className="h-4 w-4" />
        </a>
      ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────

export default function HostBioPage() {
  const params = useParams<{ hostId: string }>();
  const hostId = params.hostId;

  const [host, setHost] = useState<Host | null>(null);
  const [mixes, setMixes] = useState<Mix[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get local data from constants
  const hostData = hostId ? getHostById(hostId) : null;

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
          // Fall back to local data if API fails
          if (hostData) {
            setHost({
              id: hostData.id,
              name: hostData.name,
              slug: hostData.id,
              bio: hostData.bio,
              avatarUrl: hostData.imageUrl ?? null,
              email: null,
              isActive: hostData.isActive,
              shows: hostData.showIds.map((sid) => {
                const show = getShowById(sid);
                return {
                  id: sid,
                  name: show?.name ?? sid,
                  slug: sid,
                  imageUrl: show?.imageUrl ?? null,
                  isPrimary: hostData.showIds[0] === sid,
                };
              }),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            setError(null);
          } else {
            setError(
              err instanceof Error ? err.message : "Failed to load host",
            );
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchHost();
    return () => {
      cancelled = true;
    };
  }, [hostId, hostData]);

  // Fetch mixes for this host
  useEffect(() => {
    if (!hostId) return;
    let cancelled = false;
    async function fetchMixes() {
      try {
        const data = await apiClient<Mix[]>(`/mixes?hostId=${hostId}`);
        if (!cancelled) setMixes(data);
      } catch {
        // Mixes API not ready yet - that's fine
      }
    }
    fetchMixes();
    return () => { cancelled = true; };
  }, [hostId]);

  // ─── Loading state ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <Link
          href="/hosts"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Hosts
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
          href="/hosts"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Hosts
        </Link>
        <div className="flex h-64 items-center justify-center rounded-lg border bg-muted/50">
          <p className="text-sm text-muted-foreground">
            {error ?? "Host not found."}
          </p>
        </div>
      </div>
    );
  }

  // Merge API host with local data for extra fields (bio, social, YouTube)
  const bio = host.bio || hostData?.bio;
  const avatarUrl = host.avatarUrl || hostData?.imageUrl;
  const role = hostData?.role;

  // ─── Main render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/hosts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Hosts
      </Link>

      {/* Profile Header */}
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        {/* Large Avatar */}
        <Avatar className="h-28 w-28 text-2xl sm:h-36 sm:w-36">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={host.name} />
          ) : null}
          <AvatarFallback className="text-2xl bg-gradient-to-br from-[#74ddc7] to-[#7401df] text-white">
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
            {role && (
              <p className="text-sm text-[#74ddc7] font-medium mt-1">{role}</p>
            )}
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

          {bio && (
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line max-w-2xl">
              {bio}
            </p>
          )}

          {/* Social links */}
          {hostData && (
            <div className="pt-2">
              <SocialLinksBar hostData={hostData} />
            </div>
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
            {host.shows.map((show) => {
              const showData = getShowById(show.id);
              return (
                <Link key={show.id} href={`/shows/${show.id}`}>
                  <Card className="overflow-hidden transition-colors hover:bg-muted/50">
                    {/* Show image or gradient */}
                    {show.imageUrl || showData?.imageUrl ? (
                      <div
                        className="h-32 w-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${show.imageUrl || showData?.imageUrl})` }}
                      />
                    ) : (
                      <div className={`h-32 w-full ${showData?.gradient || "bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600"}`} />
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
                      {showData?.timeSlot && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {showData.timeSlot}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center rounded-lg border bg-muted/50">
            <p className="text-sm text-muted-foreground">
              This host is not currently assigned to any shows.
            </p>
          </div>
        )}
      </section>

      {/* YouTube Videos Section */}
      {hostData?.youtubeChannel && (
        <>
          <Separator />
          <section className="space-y-4">
            <YouTubeGrid
              channelUrl={`https://youtube.com/${hostData.youtubeChannel}`}
              searchQuery={`${host.name} WCCG`}
              title="Videos"
              maxVideos={6}
            />
          </section>
        </>
      )}

      {/* DJ Mixes Section */}
      {mixes.length > 0 && (
        <>
          <Separator />
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <Disc3 className="h-5 w-5 text-primary" />
                Latest Mixes
              </h2>
              <Link href={`/mixes?host=${hostId}`}>
                <Button variant="ghost" size="sm" className="text-[#74ddc7]">
                  View All
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mixes.slice(0, 6).map((mix) => (
                <MixCard
                  key={mix.id}
                  id={mix.id}
                  title={mix.title}
                  hostName={mix.hostName}
                  genre={mix.genre}
                  duration={mix.duration}
                  playCount={mix.playCount}
                  coverImageUrl={mix.coverImageUrl}
                  audioUrl={mix.audioUrl}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
