"use client";

/**
 * Place profile — Phase B3.
 *
 *   - Hero with name, category, address
 *   - Contact details (phone, email, website) + location map
 *   - Check-in CTA (coming soon — no check-in table yet)
 *   - Wiki link (lazy-resolved to /wiki/<slug>)
 *
 * Data: reads `directory_listings` directly from Supabase in the browser
 * (no API server). Reviews and check-ins are disabled because the backing
 * `place_reviews` / `place_check_ins` tables do not exist yet.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, MapPin, Phone, Mail, Globe, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface Place {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  imageUrl: string | null;
  lat: number | null;
  lng: number | null;
}

/** Shape of the columns we read from `directory_listings`. */
interface DirectoryRow {
  id: string;
  slug: string | null;
  name: string | null;
  category: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  image_url: string | null;
  lat: number | null;
  lng: number | null;
}

function mapRow(row: DirectoryRow): Place {
  return {
    id: row.id,
    slug: row.slug ?? row.id,
    name: row.name ?? "Untitled",
    category: row.category,
    description: row.description,
    address: row.address,
    city: row.city,
    state: row.state,
    zipCode: row.zip_code,
    phone: row.phone,
    email: row.email,
    website: row.website,
    imageUrl: row.image_url,
    lat: row.lat,
    lng: row.lng,
  };
}

function formatLocality(place: Place): string {
  const cityState = [place.city, place.state].filter(Boolean).join(", ");
  return [cityState, place.zipCode].filter(Boolean).join(" ").trim();
}

export default function PlaceProfileClient() {
  const params = useParams();
  const slug = (Array.isArray(params?.slug) ? params.slug[0] : (params?.slug as string)) ?? "";
  const [place, setPlace] = useState<Place | null>(null);
  // Lazy init: start in the loading state only when there is a slug to fetch.
  const [loading, setLoading] = useState(() => slug !== "");
  const [error, setError] = useState<string | null>(null);
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);

  // Fetch the listing by slug. Every setState runs post-await behind an
  // `active` guard — never synchronously in the effect body.
  useEffect(() => {
    if (!slug) return;
    let active = true;
    const supabase = createClient();

    (async () => {
      const { data, error: queryError } = await supabase
        .from("directory_listings")
        .select(
          "id, slug, name, category, description, address, city, state, zip_code, phone, email, website, image_url, lat, lng",
        )
        .eq("slug", slug)
        .eq("status", "ACTIVE")
        .maybeSingle();

      if (!active) return;
      if (queryError) {
        setError(queryError.message);
        setPlace(null);
      } else {
        setPlace(data ? mapRow(data as DirectoryRow) : null);
      }
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [slug]);

  // Lazy-load MapLibre GL from CDN and drop a marker once we have coordinates.
  useEffect(() => {
    if (typeof window === "undefined" || !mapDivRef.current) return;
    if (!place || place.lat == null || place.lng == null) return;
    const lat = place.lat;
    const lng = place.lng;
    let cancelled = false;

    (async () => {
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
        center: [lng, lat],
        zoom: 14,
      });
      new ml.Marker({ color: "#dc2626" }).setLngLat([lng, lat]).addTo(map);
      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      // @ts-expect-error — runtime ref
      mapRef.current?.remove?.();
      mapRef.current = null;
    };
  }, [place]);

  if (loading) {
    return <div className="py-8 text-sm text-muted-foreground">Loading…</div>;
  }

  if (error && !place) {
    return (
      <div className="space-y-4 py-8">
        <p className="text-sm text-red-500">{error}</p>
        <Link href="/places" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to places
        </Link>
      </div>
    );
  }

  if (!place) {
    return (
      <div className="space-y-4 py-8">
        <h1 className="text-2xl font-bold text-foreground">Place not found</h1>
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t find a listing for “{slug}”. It may have been removed.
        </p>
        <Link href="/places" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to places
        </Link>
      </div>
    );
  }

  const wikiHref = `/wiki/${slug}`;
  const locality = formatLocality(place);
  const hasCoords = place.lat != null && place.lng != null;
  const websiteHref = place.website
    ? /^https?:\/\//i.test(place.website)
      ? place.website
      : `https://${place.website}`
    : null;

  return (
    <article className="space-y-8">
      <Link
        href="/places"
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All places
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {place.category && <span>{place.category}</span>}
        </div>
        <h1 className="text-3xl font-black tracking-tight text-foreground md:text-5xl">
          {place.name}
        </h1>
        {place.description && (
          <p className="max-w-3xl text-base text-muted-foreground">{place.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {(place.address || locality) && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {[place.address, locality].filter(Boolean).join(", ")}
            </span>
          )}
        </div>
      </header>

      {/* Hero image */}
      {place.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={place.imageUrl}
          alt={place.name}
          className="h-64 w-full rounded-2xl border border-border object-cover md:h-80"
        />
      )}

      {/* Contact details */}
      {(place.phone || place.email || websiteHref) && (
        <section className="grid gap-3 rounded-2xl border border-border bg-card p-6 sm:grid-cols-3">
          {place.phone && (
            <a
              href={`tel:${place.phone}`}
              className="inline-flex items-center gap-2 text-sm text-foreground hover:text-[#74ddc7]"
            >
              <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{place.phone}</span>
            </a>
          )}
          {place.email && (
            <a
              href={`mailto:${place.email}`}
              className="inline-flex items-center gap-2 text-sm text-foreground hover:text-[#74ddc7]"
            >
              <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{place.email}</span>
            </a>
          )}
          {websiteHref && (
            <a
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-foreground hover:text-[#74ddc7]"
            >
              <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{place.website}</span>
            </a>
          )}
        </section>
      )}

      {/* Location map */}
      {hasCoords && (
        <section className="space-y-2">
          <h2 className="text-xl font-bold">Location</h2>
          <div
            ref={mapDivRef}
            className="h-64 w-full overflow-hidden rounded-2xl border border-border bg-muted"
          />
        </section>
      )}

      {/* Check-in CTA — coming soon (no check-in table yet). */}
      <section className="rounded-2xl border border-border bg-gradient-to-br from-[#0c1f12] to-[#0a1a14] p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Check in for +50 WP</h2>
            <p className="mt-1 text-sm text-white/70">
              Geo-validated check-ins are coming soon. You&apos;ll earn Watt Points for
              visiting verified local spots.
            </p>
          </div>
          <Button
            size="lg"
            disabled
            className="rounded-full bg-white px-6 font-bold text-black disabled:opacity-60"
          >
            Coming soon
          </Button>
        </div>
      </section>

      {/* Wiki link */}
      <section>
        <Link
          href={wikiHref}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground hover:border-input"
        >
          <BookOpen className="h-4 w-4 text-[#74ddc7]" />
          Read the {place.name} wiki entry →
        </Link>
      </section>
    </article>
  );
}
