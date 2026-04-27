"use client";

/**
 * Place profile — Phase B3.
 *
 *   - Hero with name, category, rating
 *   - Geo-validated check-in CTA (+50 WP, server-enforced)
 *   - Reviews list
 *   - Wiki link (lazy-resolved to /wiki/<slug>)
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, MapPin, Star, BookOpen } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface Place {
  id: string;
  slug: string;
  name: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  coverUrl: string | null;
  ratingAvg: number | null;
  ratingCount: number;
  checkInCount: number;
  priceTier: number | null;
  hours: Record<string, { open: string; close: string }> | null;
  wikiSlug: string | null;
}

interface Review {
  id: string;
  rating: number;
  body: string | null;
  photo_urls: string[] | null;
  created_at: string;
  user_id: string;
}

export default function PlaceProfileClient() {
  const params = useParams();
  const slug = (Array.isArray(params?.slug) ? params.slug[0] : (params?.slug as string)) ?? "";
  const [place, setPlace] = useState<Place | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkInResult, setCheckInResult] = useState<string | null>(null);

  useEffect(() => {
    apiClient<Place>(`/places/${slug}`).then(setPlace).catch((e) => setError(e.message));
    apiClient<Review[]>(`/places/${slug}/reviews`).then(setReviews).catch(() => {});
  }, [slug]);

  const onCheckIn = () => {
    if (!navigator?.geolocation) {
      setError("Your browser doesn't support geolocation.");
      return;
    }
    setBusy(true);
    setError(null);
    setCheckInResult(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await apiClient<{
            ok: boolean;
            pointsAwarded: number;
            distanceMeters: number;
          }>(`/places/${slug}/check-in`, {
            method: "POST",
            body: JSON.stringify({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }),
          });
          setCheckInResult(`✓ Checked in. +${r.pointsAwarded} WP. (${r.distanceMeters}m away)`);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      },
      (err) => {
        setBusy(false);
        setError(err.message);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

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
    return <div className="py-8 text-sm text-muted-foreground">Loading…</div>;
  }

  const wikiHref = place.wikiSlug ? `/wiki/${place.wikiSlug}` : `/wiki/${slug}`;

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
          <span>{place.category}</span>
          {place.subcategory && <span>· {place.subcategory}</span>}
          {place.priceTier && <span>· {"$".repeat(place.priceTier)}</span>}
        </div>
        <h1 className="text-3xl font-black tracking-tight text-foreground md:text-5xl">
          {place.name}
        </h1>
        {place.description && (
          <p className="max-w-3xl text-base text-muted-foreground">{place.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {place.address && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {place.address}
              {place.city ? `, ${place.city}` : ""}
            </span>
          )}
          {place.ratingAvg ? (
            <span className="inline-flex items-center gap-1 text-foreground">
              <Star className="h-3.5 w-3.5 fill-[#f59e0b] text-[#f59e0b]" />
              <span className="font-semibold">{place.ratingAvg.toFixed(1)}</span>
              <span className="text-muted-foreground">({place.ratingCount} reviews)</span>
            </span>
          ) : null}
        </div>
      </header>

      {/* Check-in CTA */}
      <section className="rounded-2xl border border-border bg-gradient-to-br from-[#0c1f12] to-[#0a1a14] p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Check in for +50 WP</h2>
            <p className="mt-1 text-sm text-white/70">
              You need to be within 150 meters. Up to 3 check-ins per day.
            </p>
            {checkInResult && (
              <p className="mt-2 text-sm font-semibold text-[#74ddc7]">{checkInResult}</p>
            )}
            {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
          </div>
          <Button
            size="lg"
            onClick={onCheckIn}
            disabled={busy}
            className="rounded-full bg-white px-6 font-bold text-black hover:bg-white/90 disabled:opacity-60"
          >
            {busy ? "Locating…" : "Check in here"}
          </Button>
        </div>
      </section>

      {/* Reviews */}
      <section className="space-y-3">
        <header className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Reviews</h2>
          <span className="text-xs text-muted-foreground">{reviews.length} total</span>
        </header>
        {reviews.length === 0 && (
          <p className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
            Be the first to review this place — earn +20 WP.
          </p>
        )}
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${
                      i < r.rating ? "fill-[#f59e0b] text-[#f59e0b]" : "text-muted-foreground/30"
                    }`}
                  />
                ))}
                <span className="ml-2 text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
              {r.body && <p className="mt-2 text-sm text-foreground">{r.body}</p>}
            </li>
          ))}
        </ul>
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
