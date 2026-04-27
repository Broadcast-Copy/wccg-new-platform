"use client";

/**
 * Places — directory map + list. Phase B3.
 *
 * Map: MapLibre GL via CDN (loaded lazily) on top of OSM raster tiles to
 * skip an npm dep + an API key for v1. Upgrade path: vector tiles + Mapbox.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MapPin, Search, Star } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface Place {
  id: string;
  slug: string;
  name: string;
  category: string;
  subcategory: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  coverUrl: string | null;
  ratingAvg: number | null;
  ratingCount: number;
  checkInCount: number;
}

const CATEGORIES = [
  "All",
  "Restaurant",
  "Bar",
  "Cafe",
  "Music Venue",
  "Shop",
  "Service",
  "Park",
  "Community",
];

export default function PlacesPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);

  // Fetch list whenever filters change.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (category !== "All") params.set("category", category);
    if (search.trim()) params.set("search", search.trim());
    params.set("limit", "150");
    apiClient<Place[]>(`/places?${params}`)
      .then((r) => {
        if (!cancelled) setPlaces(r);
      })
      .catch(() => {
        if (!cancelled) setPlaces([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, search]);

  // Lazy-load MapLibre GL from CDN once on mount.
  useEffect(() => {
    if (typeof window === "undefined" || !mapDivRef.current) return;
    let cancelled = false;
    (async () => {
      // Inject the MapLibre CSS + JS via CDN if not already present.
      if (!document.getElementById("maplibre-css")) {
        const link = document.createElement("link");
        link.id = "maplibre-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css";
        document.head.appendChild(link);
      }
      // @ts-expect-error — global injection via CDN
      if (!window.maplibregl) {
        await new Promise<void>((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.js";
          s.onload = () => res();
          s.onerror = () => rej(new Error("maplibre load failed"));
          document.head.appendChild(s);
        });
      }
      if (cancelled || !mapDivRef.current) return;
      // @ts-expect-error — CDN global
      const ml = window.maplibregl;
      const map = new ml.Map({
        container: mapDivRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors",
            },
          },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        },
        center: [-78.879, 35.054], // Fayetteville, NC
        zoom: 11,
      });
      mapRef.current = map;
    })();
    return () => {
      cancelled = true;
      // @ts-expect-error — runtime ref
      mapRef.current?.remove?.();
    };
  }, []);

  // Re-paint markers when places change.
  useEffect(() => {
    const map = mapRef.current as any;
    if (!map) return;
    const existing = (map._wccgMarkers ?? []) as Array<{ remove: () => void }>;
    existing.forEach((m) => m.remove());
    // @ts-expect-error — CDN global
    const ml = window.maplibregl;
    const fresh: Array<{ remove: () => void }> = [];
    for (const p of places) {
      if (p.lat == null || p.lng == null) continue;
      const el = document.createElement("a");
      el.href = `/places/${p.slug}`;
      el.className =
        "block h-7 w-7 rounded-full bg-[#dc2626] ring-2 ring-white shadow-lg shadow-red-500/30 transition-transform hover:scale-110";
      el.title = p.name;
      const marker = new ml.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map);
      fresh.push(marker);
    }
    map._wccgMarkers = fresh;
  }, [places]);

  const filteredCount = useMemo(() => places.length, [places]);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
          Places in our footprint
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          Eat, drink, listen, shop. {filteredCount} verified local spots — check in for +50 WP.
        </p>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search places…"
            className="w-full rounded-full border border-border bg-card px-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-full bg-muted p-0.5 text-xs">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full px-3 py-1.5 font-semibold transition-colors ${
                c === category ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Map + list */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div
          ref={mapDivRef}
          className="h-[480px] overflow-hidden rounded-2xl border border-border bg-muted"
        />
        <ul className="max-h-[480px] space-y-2 overflow-y-auto rounded-2xl border border-border bg-card p-2">
          {loading && (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">Loading…</li>
          )}
          {!loading && places.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">
              No places match. Try a different filter.
            </li>
          )}
          {places.map((p) => (
            <li key={p.id}>
              <Link
                href={`/places/${p.slug}`}
                className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-foreground/[0.04]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8]">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-foreground">{p.name}</h3>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.subcategory ? `${p.subcategory} · ` : ""}
                    {p.address ?? "Address pending"}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                    {p.ratingAvg ? (
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3 w-3 fill-[#f59e0b] text-[#f59e0b]" />
                        {p.ratingAvg.toFixed(1)} ({p.ratingCount})
                      </span>
                    ) : (
                      <span>No reviews yet</span>
                    )}
                    {p.checkInCount > 0 && <span>· {p.checkInCount} check-ins</span>}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
