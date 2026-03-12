"use client";

import { useEffect, useState } from "react";
import { MapPin, Heart, ExternalLink } from "lucide-react";
import Link from "next/link";

interface SavedPlace {
  id: string;
  name: string;
  category: string;
  address?: string;
  savedAt: string;
}

const PLACES_STORAGE_KEY = "wccg_favorites";

export default function MyPlacesPage() {
  const [places, setPlaces] = useState<SavedPlace[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PLACES_STORAGE_KEY);
      if (raw) {
        const favorites = JSON.parse(raw);
        const placeIds: string[] = favorites["place"] || [];
        setPlaces(
          placeIds.map((id) => ({
            id,
            name: id.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
            category: "Local Business",
            savedAt: new Date().toISOString(),
          })),
        );
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Places</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your saved businesses and locations from the WCCG directory.
        </p>
      </div>

      {/* Places List */}
      {places.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {places.map((place) => (
            <div
              key={place.id}
              className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-foreground/20 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {place.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {place.category}
                    </p>
                    {place.address && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {place.address}
                      </p>
                    )}
                  </div>
                </div>
                <Heart className="h-4 w-4 fill-red-500 text-red-500" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-16">
          <MapPin className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-1">
            No saved places yet
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Browse the{" "}
            <Link
              href="/directory"
              className="text-primary underline underline-offset-2"
            >
              local directory
            </Link>{" "}
            and tap the heart icon to save your favorite businesses and
            locations.
          </p>
        </div>
      )}
    </div>
  );
}
