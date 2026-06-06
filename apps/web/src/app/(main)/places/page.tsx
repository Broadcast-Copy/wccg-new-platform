"use client";

/**
 * Places — directory map + list. Phase B3.
 *
 * Data: reads `directory_listings` directly from Supabase in the browser
 * (no API server; RLS-protected anon key). Static-export friendly.
 *
 * Map: MapLibre GL via CDN (loaded lazily) on top of OSM raster tiles to
 * skip an npm dep + an API key for v1. Upgrade path: vector tiles + Mapbox.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MapPin, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Place {
  id: string;
  slug: string;
  name: string;
  category: string;
  city: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  imageUrl: string | null;
  featured: boolean;
}

/** Shape of the columns we read from `directory_listings`. */
interface DirectoryRow {
  id: string;
  slug: string | null;
  name: string | null;
  category: string | null;
  city: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  image_url: string | null;
  featured: boolean | null;
}

const CATEGORIES = [
  "All",
  "Restaurants",
  "Beauty & Barber",
  "Churches",
  "Health & Wellness",
  "Home Services",
  "Auto Services",
  "Education",
  "Entertainment",
  "Legal Services",
  "Real Estate",
  "Government & Services",
];

function mapRow(row: DirectoryRow): Place {
  return {
    id: row.id,
    slug: row.slug ?? row.id,
    name: row.name ?? "Untitled",
    category: row.category ?? "",
    city: row.city,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    imageUrl: row.image_url,
    featured: row.featured ?? false,
  };
}

export default function PlacesPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);

  // Fetch list whenever filters change. setState happens post-await behind an
  // `active` guard — never synchronously in the effect body. The loading flag
  // is raised in the filter-change handlers (event handlers), not here.
  useEffect(() => {
    let active = true;
    const supabase = createClient();
    const term = search.trim();

    (async () => {
      let query = supabase
        .from("directory_listings")
        .select(
          "id, slug, name, category, city, address, lat, lng, image_url, featured",
        )
        .eq("status", "ACTIVE")
        .order("featured", { ascending: false })
        .order("name", { ascending: true })
        .limit(150);

      if (category !== "All") query = query.eq("category", category);
      if (term) {
        query = query.or(
          `name.ilike.%${term}%,description.ilike.%${term}%,city.ilike.%${term}%`,
        );
      }

      const { data, error } = await query;
      if (!active) return;
      if (error || !data) {
        setPlaces([]);
      } else {
        setPlaces((data as DirectoryRow[]).map(mapRow));
      }
      setLoading(false);
    })();

    return () => {
      active = false;
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
    const map = mapRef.current as {
      _wccgMarkers?: Array<{ remove: () => void }>;
    } | null;
    if (!map) return;
    const existing = map._wccgMarkers ?? [];
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
            onChange={(e) => {
              setLoading(true);
              setSearch(e.target.value);
            }}
            placeholder="Search places…"
            className="w-full rounded-full border border-border bg-card px-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-full bg-muted p-0.5 text-xs">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setLoading(true);
                setCategory(c);
              }}
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
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="h-12 w-12 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8]">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-foreground">{p.name}</h3>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.category ? `${p.category} · ` : ""}
                    {p.city ?? p.address ?? "Address pending"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
