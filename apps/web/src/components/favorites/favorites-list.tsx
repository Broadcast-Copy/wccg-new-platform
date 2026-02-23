"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AppImage as Image } from "@/components/ui/app-image";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Heart, Loader2, Radio, Tv, Trash2 } from "lucide-react";

type TargetType = "stream" | "show";

interface FavoriteTarget {
  name: string;
  slug: string;
  imageUrl: string | null;
}

interface Favorite {
  id: string;
  userId: string;
  targetType: TargetType;
  targetId: string | null;
  target: FavoriteTarget | null;
  createdAt: string;
}

function FavoriteImage({
  src,
  alt,
  type,
}: {
  src: string | null | undefined;
  alt: string;
  type: TargetType;
}) {
  if (src) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-md">
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>
    );
  }

  // Gradient placeholder
  const gradients: Record<TargetType, string> = {
    stream: "from-blue-600 to-purple-600",
    show: "from-orange-500 to-pink-600",
  };

  return (
    <div
      className={`flex aspect-video w-full items-center justify-center rounded-md bg-gradient-to-br ${gradients[type]}`}
    >
      {type === "stream" ? (
        <Radio className="size-10 text-white/70" />
      ) : (
        <Tv className="size-10 text-white/70" />
      )}
    </div>
  );
}

function FavoriteCard({
  favorite,
  onRemoved,
}: {
  favorite: Favorite;
  onRemoved: (id: string) => void;
}) {
  const [removing, setRemoving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const isStream = favorite.targetType === "stream";
  const name = favorite.target?.name ?? "Unknown";
  const slug = favorite.target?.slug ?? "";
  const imageUrl = favorite.target?.imageUrl ?? null;
  const href = isStream ? `/channels/${slug}` : `/shows/${slug}`;

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await apiClient(`/favorites/${favorite.id}`, { method: "DELETE" });
      onRemoved(favorite.id);
      toast.success(`Removed ${name} from favorites`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove favorite"
      );
    } finally {
      setRemoving(false);
      setDialogOpen(false);
    }
  };

  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="p-0">
        <Link href={href} className="block">
          <FavoriteImage src={imageUrl} alt={name} type={favorite.targetType} />
        </Link>
        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <Link href={href} className="group flex-1">
              <h3 className="font-semibold leading-tight group-hover:underline">
                {name}
              </h3>
            </Link>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  <span className="sr-only">Remove from favorites</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Remove Favorite</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to remove &ldquo;{name}&rdquo; from
                    your favorites?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" disabled={removing}>
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    variant="destructive"
                    onClick={handleRemove}
                    disabled={removing}
                  >
                    {removing ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Removing...
                      </>
                    ) : (
                      "Remove"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="text-xs">
              {isStream ? "Stream" : "Show"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ tab }: { tab: "all" | "streams" | "shows" }) {
  const messages: Record<string, { text: string; link: string; linkText: string }> = {
    all: {
      text: "Your favorite shows and streams will appear here.",
      link: "/channels",
      linkText: "Browse channels",
    },
    streams: {
      text: "You haven't favorited any streams yet.",
      link: "/channels",
      linkText: "Browse channels",
    },
    shows: {
      text: "You haven't favorited any shows yet.",
      link: "/shows",
      linkText: "Browse shows",
    },
  };
  const msg = messages[tab];

  return (
    <div className="rounded-lg border p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Heart className="size-10 text-muted-foreground/50" />
        <div>
          <p className="font-medium">{msg.text}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            <Link href={msg.link} className="underline hover:text-foreground">
              {msg.linkText}
            </Link>{" "}
            to add favorites.
          </p>
        </div>
      </div>
    </div>
  );
}

export function FavoritesList() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient<Favorite[]>("/favorites");
      setFavorites(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load favorites"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const handleRemoved = (id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading favorites...</span>
      </div>
    );
  }

  const streams = favorites.filter((f) => f.targetType === "stream");
  const shows = favorites.filter((f) => f.targetType === "show");

  return (
    <Tabs defaultValue="all" className="space-y-4">
      <TabsList>
        <TabsTrigger value="all">
          All ({favorites.length})
        </TabsTrigger>
        <TabsTrigger value="streams">
          Streams ({streams.length})
        </TabsTrigger>
        <TabsTrigger value="shows">
          Shows ({shows.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all">
        {favorites.length === 0 ? (
          <EmptyState tab="all" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((fav) => (
              <FavoriteCard
                key={fav.id}
                favorite={fav}
                onRemoved={handleRemoved}
              />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="streams">
        {streams.length === 0 ? (
          <EmptyState tab="streams" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {streams.map((fav) => (
              <FavoriteCard
                key={fav.id}
                favorite={fav}
                onRemoved={handleRemoved}
              />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="shows">
        {shows.length === 0 ? (
          <EmptyState tab="shows" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shows.map((fav) => (
              <FavoriteCard
                key={fav.id}
                favorite={fav}
                onRemoved={handleRemoved}
              />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
