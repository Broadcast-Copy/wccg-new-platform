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
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Heart, Loader2, Radio, Tv, Trash2, MapPin, ShoppingBag, Calendar } from "lucide-react";

type TargetType = "stream" | "show" | "place" | "product" | "event";

/** Row shape for the `user_favorites` table (migration 006). */
interface UserFavoriteRow {
  id: string;
  user_id: string;
  item_type: string;
  item_id: string;
  title: string | null;
  created_at: string;
}

interface Favorite {
  id: string;
  targetType: TargetType;
  targetId: string;
  name: string;
  createdAt: string;
}

/**
 * Normalize a free-text `item_type` (consumers write "stream", "STREAM",
 * "show", "host", …) into one of the UI's tab categories. Unknown types
 * (e.g. "host", "podcast", "episode") fall back to "show" so they still
 * render under the "All" tab instead of being dropped.
 */
function toTargetType(itemType: string): TargetType {
  switch (itemType.toLowerCase()) {
    case "stream":
      return "stream";
    case "place":
      return "place";
    case "product":
      return "product";
    case "event":
      return "event";
    default:
      return "show";
  }
}

/** Map a raw `user_favorites` row into the view model the UI renders. */
function mapRow(row: UserFavoriteRow): Favorite {
  return {
    id: row.id,
    targetType: toTargetType(row.item_type),
    targetId: row.item_id,
    name: row.title?.trim() || row.item_id,
    createdAt: row.created_at,
  };
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
    place: "from-emerald-500 to-teal-600",
    product: "from-amber-500 to-orange-600",
    event: "from-violet-500 to-purple-600",
  };

  const icons: Record<TargetType, React.ReactNode> = {
    stream: <Radio className="size-10 text-foreground/70" />,
    show: <Tv className="size-10 text-foreground/70" />,
    place: <MapPin className="size-10 text-foreground/70" />,
    product: <ShoppingBag className="size-10 text-foreground/70" />,
    event: <Calendar className="size-10 text-foreground/70" />,
  };

  return (
    <div
      className={`flex aspect-video w-full items-center justify-center rounded-md bg-gradient-to-br ${gradients[type]}`}
    >
      {icons[type]}
    </div>
  );
}

function FavoriteCard({
  favorite,
  onRemoved,
  onRestore,
}: {
  favorite: Favorite;
  onRemoved: (id: string) => void;
  onRestore: (favorite: Favorite) => void;
}) {
  const [removing, setRemoving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const name = favorite.name;
  const slug = favorite.targetId;
  const imageUrl: string | null = null;
  const hrefMap: Record<TargetType, string> = {
    stream: `/shows?stream=${slug}`,
    show: `/shows/${slug}`,
    place: `/community`,
    product: `/marketplace`,
    event: `/events/${slug}`,
  };
  const href = hrefMap[favorite.targetType] || "/";

  const handleRemove = async () => {
    setRemoving(true);
    // Optimistically remove from the list, then delete server-side.
    onRemoved(favorite.id);
    setDialogOpen(false);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const { error } = await supabase
        .from("user_favorites")
        .delete()
        .eq("id", favorite.id)
        .eq("user_id", user.id);
      if (error) throw error;

      toast.success(`Removed ${name} from favorites`);
    } catch {
      // Roll back the optimistic removal and let the user retry.
      onRestore(favorite);
      toast.error(`Could not remove ${name}. Please try again.`);
    } finally {
      setRemoving(false);
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
            <Badge variant="secondary" className="text-xs capitalize">
              {favorite.targetType}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ tab }: { tab: string }) {
  const messages: Record<string, { text: string; link: string; linkText: string }> = {
    all: {
      text: "Your favorites will appear here.",
      link: "/discover",
      linkText: "Start exploring",
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
    places: {
      text: "You haven't saved any places yet.",
      link: "/community",
      linkText: "Browse directory",
    },
    products: {
      text: "You haven't favorited any products yet.",
      link: "/marketplace",
      linkText: "Browse marketplace",
    },
    events: {
      text: "You haven't favorited any events yet.",
      link: "/events",
      linkText: "Browse events",
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
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (active) {
            setFavorites([]);
            setLoading(false);
          }
          return;
        }

        const { data, error: queryError } = await supabase
          .from("user_favorites")
          .select("id, user_id, item_type, item_id, title, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (!active) return;

        if (queryError) {
          setError(true);
          setFavorites([]);
        } else {
          setFavorites(((data ?? []) as UserFavoriteRow[]).map(mapRow));
        }
      } catch {
        if (active) {
          setError(true);
          setFavorites([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const handleRemoved = useCallback((id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleRestore = useCallback((favorite: Favorite) => {
    setFavorites((prev) =>
      prev.some((f) => f.id === favorite.id)
        ? prev
        : [favorite, ...prev].sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt),
          ),
    );
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading favorites...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Heart className="size-10 text-muted-foreground/50" />
          <div>
            <p className="font-medium">We couldn&rsquo;t load your favorites.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Please refresh the page to try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const streams = favorites.filter((f) => f.targetType === "stream");
  const shows = favorites.filter((f) => f.targetType === "show");
  const places = favorites.filter((f) => f.targetType === "place");
  const products = favorites.filter((f) => f.targetType === "product");
  const events = favorites.filter((f) => f.targetType === "event");

  const tabs = [
    { value: "all", label: "All", items: favorites },
    { value: "streams", label: "Streams", items: streams },
    { value: "shows", label: "Shows", items: shows },
    { value: "places", label: "Places", items: places },
    { value: "products", label: "Products", items: products },
    { value: "events", label: "Events", items: events },
  ];

  return (
    <Tabs defaultValue="all" className="space-y-4">
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label} ({tab.items.length})
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          {tab.items.length === 0 ? (
            <EmptyState tab={tab.value} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tab.items.map((fav) => (
                <FavoriteCard
                  key={fav.id}
                  favorite={fav}
                  onRemoved={handleRemoved}
                  onRestore={handleRestore}
                />
              ))}
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
