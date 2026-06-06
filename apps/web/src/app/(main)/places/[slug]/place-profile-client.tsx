"use client";

/**
 * Place profile — Phase B3.
 *
 *   - Hero with name, category, address
 *   - Contact details (phone, email, website) + location map
 *   - Check-in (signed-in users; best-effort geolocation; public count via RPC)
 *   - Reviews (public read; signed-in users add/edit/delete their own)
 *   - Wiki link (lazy-resolved to /wiki/<slug>)
 *
 * Data: reads `directory_listings`, `place_reviews`, `place_checkins` directly
 * from Supabase in the browser (no API server). RLS is the real backstop:
 *   • place_reviews   — public SELECT; own INSERT/UPDATE/DELETE; UNIQUE(place_id,user_id)
 *   • place_checkins  — own SELECT + own INSERT
 *   • place_checkin_count(p_place_id text) → bigint (public RPC)
 *
 * There is no FK embed from place_reviews to profiles_public, so reviewer
 * identities are fetched with a second query and joined in JS.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Globe,
  BookOpen,
  Star,
  MapPinCheckInside,
  Loader2,
  Pencil,
  Trash2,
  Check,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
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

// ---------------------------------------------------------------------------
// Reviews + check-ins
// ---------------------------------------------------------------------------

/** A row from `place_reviews` (no FK embed — reviewer is joined in JS). */
interface ReviewRow {
  id: string;
  user_id: string;
  rating: number;
  body: string | null;
  created_at: string;
}

/** A reviewer's public identity, looked up from `profiles_public`. */
interface PublicProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

/** A review joined with its author's public profile (for rendering). */
interface ReviewWithAuthor extends ReviewRow {
  author: PublicProfile | null;
}

/** Display name for a reviewer, with graceful fallbacks. */
function authorName(author: PublicProfile | null): string {
  return author?.display_name?.trim() || author?.username?.trim() || "Anonymous";
}

/** Two-letter initials for the avatar fallback. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Compact relative time, e.g. "just now", "3h ago", "2d ago". */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const sec = Math.round(diff / 1000);
  if (sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.round(mo / 12)}y ago`;
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

  // Auth: who (if anyone) is signed in. Drives review authoring + check-in.
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Reviews state.
  const [reviews, setReviews] = useState<ReviewWithAuthor[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [reviewsReloadTick, setReviewsReloadTick] = useState(0);

  // Check-in state.
  const [checkinCount, setCheckinCount] = useState<number | null>(null);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [checkinBusy, setCheckinBusy] = useState(false);
  const [checkinError, setCheckinError] = useState<string | null>(null);

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

  // Resolve the current auth user once. setState only fires post-await,
  // behind the `active` guard (react-hooks/set-state-in-effect).
  useEffect(() => {
    let active = true;
    const supabase = createClient();

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      setCurrentUser(data.user ?? null);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Listener fires asynchronously, so this is not a synchronous effect set.
      setCurrentUser(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Load reviews for this place, then resolve reviewer identities with a second
  // query (no FK embed exists) and join in JS. Re-runs on demand via the tick.
  const placeId = place?.id ?? null;
  useEffect(() => {
    if (!placeId) return;
    let active = true;
    const supabase = createClient();

    (async () => {
      setReviewsLoading(true);
      setReviewsError(null);
      const { data, error: qErr } = await supabase
        .from("place_reviews")
        .select("id,user_id,rating,body,created_at")
        .eq("place_id", placeId)
        .order("created_at", { ascending: false });

      if (!active) return;
      if (qErr) {
        setReviews([]);
        setReviewsError(qErr.message);
        setReviewsLoading(false);
        return;
      }

      const rows = (data ?? []) as ReviewRow[];
      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));

      const profileMap = new Map<string, PublicProfile>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles_public")
          .select("id,display_name,avatar_url,username")
          .in("id", userIds);
        if (!active) return;
        for (const p of (profiles ?? []) as PublicProfile[]) {
          profileMap.set(p.id, p);
        }
      }

      setReviews(rows.map((r) => ({ ...r, author: profileMap.get(r.user_id) ?? null })));
      setReviewsLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [placeId, reviewsReloadTick]);

  // Load the public check-in count (RPC) + whether the current user already
  // checked in (own SELECT). Re-runs when the place or the signed-in user changes.
  const currentUserId = currentUser?.id ?? null;
  useEffect(() => {
    if (!placeId) return;
    let active = true;
    const supabase = createClient();

    (async () => {
      const [{ data: count }, ownRes] = await Promise.all([
        supabase.rpc("place_checkin_count", { p_place_id: placeId }),
        currentUserId
          ? supabase
              .from("place_checkins")
              .select("id")
              .eq("place_id", placeId)
              .eq("user_id", currentUserId)
              .limit(1)
          : Promise.resolve({ data: null }),
      ]);

      if (!active) return;
      setCheckinCount(typeof count === "number" ? count : Number(count ?? 0));
      const own = (ownRes as { data: { id: string }[] | null }).data;
      setHasCheckedIn(!!own && own.length > 0);
    })();

    return () => {
      active = false;
    };
  }, [placeId, currentUserId]);

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

  // Derived review stats (client-side average + the signed-in user's own review).
  const ratingCount = reviews.length;
  const ratingAvg = useMemo(
    () => (ratingCount === 0 ? 0 : reviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount),
    [reviews, ratingCount],
  );
  const myReview = useMemo(
    () => (currentUserId ? reviews.find((r) => r.user_id === currentUserId) ?? null : null),
    [reviews, currentUserId],
  );

  function reloadReviews() {
    setReviewsReloadTick((t) => t + 1);
  }

  // Best-effort: resolve the browser's coordinates, but never block on a denial.
  function readGeolocation(): Promise<{ lat: number | null; lng: number | null }> {
    return new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        resolve({ lat: null, lng: null });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: null, lng: null }),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
      );
    });
  }

  async function handleCheckIn() {
    if (!place || !currentUserId || checkinBusy || hasCheckedIn) return;
    setCheckinBusy(true);
    setCheckinError(null);
    try {
      const { lat, lng } = await readGeolocation();
      const supabase = createClient();
      const { error: insErr } = await supabase
        .from("place_checkins")
        .insert({ place_id: place.id, user_id: currentUserId, lat, lng });
      if (insErr) throw insErr;
      setHasCheckedIn(true);
      setCheckinCount((c) => (c ?? 0) + 1); // optimistic increment
    } catch (e) {
      setCheckinError((e as Error).message);
    } finally {
      setCheckinBusy(false);
    }
  }

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

      {/* Check-in */}
      <section className="rounded-2xl border border-border bg-gradient-to-br from-[#0c1f12] to-[#0a1a14] p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Check in here</h2>
            <p className="mt-1 text-sm text-white/70">
              {checkinCount == null
                ? "Let people know you visited this spot."
                : `${checkinCount} ${checkinCount === 1 ? "person has" : "people have"} checked in.`}
            </p>
            {checkinError && <p className="mt-2 text-sm text-red-300">{checkinError}</p>}
          </div>
          {currentUser ? (
            hasCheckedIn ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-[#74ddc7] px-6 py-2.5 text-sm font-bold text-[#0a0a0f]">
                <Check className="h-4 w-4" /> Checked in
              </span>
            ) : (
              <Button
                size="lg"
                onClick={handleCheckIn}
                disabled={checkinBusy}
                className="rounded-full bg-white px-6 font-bold text-black hover:bg-white/90 disabled:opacity-60"
              >
                {checkinBusy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking in…
                  </>
                ) : (
                  <>
                    <MapPinCheckInside className="mr-2 h-4 w-4" /> Check in
                  </>
                )}
              </Button>
            )
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-black hover:bg-white/90"
            >
              Sign in to check in
            </Link>
          )}
        </div>
      </section>

      {/* Reviews */}
      <ReviewsSection
        placeId={place.id}
        reviews={reviews}
        loading={reviewsLoading}
        error={reviewsError}
        ratingAvg={ratingAvg}
        ratingCount={ratingCount}
        currentUser={currentUser}
        myReview={myReview}
        onChanged={reloadReviews}
      />

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

// ---------------------------------------------------------------------------
// Star rating — read-only display, or interactive (when `onSelect` is given)
// ---------------------------------------------------------------------------

function StarRating({
  value,
  size = "sm",
  onSelect,
}: {
  /** Rating to render (supports fractional values when read-only). */
  value: number;
  size?: "sm" | "md";
  /** When provided, the stars become a clickable 1–5 input. */
  onSelect?: (rating: number) => void;
}) {
  const dim = size === "md" ? "h-5 w-5" : "h-4 w-4";
  const interactive = !!onSelect;
  return (
    <div className="inline-flex items-center gap-0.5" role={interactive ? "radiogroup" : undefined}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.round(value);
        const StarIcon = (
          <Star
            className={`${dim} ${filled ? "fill-[#fbbf24] text-[#fbbf24]" : "fill-transparent text-muted-foreground/40"}`}
          />
        );
        if (!interactive) return <span key={star}>{StarIcon}</span>;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === Math.round(value)}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            onClick={() => onSelect(star)}
            className="rounded transition-transform hover:scale-110"
          >
            {StarIcon}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reviews section
// ---------------------------------------------------------------------------

function ReviewsSection({
  placeId,
  reviews,
  loading,
  error,
  ratingAvg,
  ratingCount,
  currentUser,
  myReview,
  onChanged,
}: {
  placeId: string;
  reviews: ReviewWithAuthor[];
  loading: boolean;
  error: string | null;
  ratingAvg: number;
  ratingCount: number;
  currentUser: User | null;
  myReview: ReviewWithAuthor | null;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);

  // Reviews from everyone except the signed-in user (theirs renders in the form area).
  const otherReviews = currentUser
    ? reviews.filter((r) => r.user_id !== currentUser.id)
    : reviews;

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Reviews</h2>
          {ratingCount > 0 ? (
            <div className="mt-1 flex items-center gap-2">
              <StarRating value={ratingAvg} />
              <span className="text-sm font-bold text-foreground">{ratingAvg.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">
                · {ratingCount} {ratingCount === 1 ? "review" : "reviews"}
              </span>
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">No reviews yet.</p>
          )}
        </div>
      </header>

      {/* Authoring area */}
      {currentUser ? (
        myReview && !editing ? (
          <OwnReviewCard review={myReview} onEdit={() => setEditing(true)} onChanged={onChanged} />
        ) : (
          <ReviewForm
            placeId={placeId}
            userId={currentUser.id}
            existing={myReview}
            onCancel={myReview ? () => setEditing(false) : undefined}
            onSaved={() => {
              setEditing(false);
              onChanged();
            }}
          />
        )
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-5 text-center">
          <p className="text-sm text-muted-foreground">
            <Link href="/login" className="font-semibold text-[#74ddc7] hover:underline">
              Sign in
            </Link>{" "}
            to leave a review.
          </p>
        </div>
      )}

      {/* Error / loading / list */}
      {error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading reviews…
        </div>
      ) : otherReviews.length === 0 ? (
        ratingCount === 0 && (
          <p className="text-sm text-muted-foreground">Be the first to review this place.</p>
        )
      ) : (
        <div className="space-y-3">
          {otherReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// A single review card (other people's reviews)
// ---------------------------------------------------------------------------

function ReviewAvatar({ author }: { author: PublicProfile | null }) {
  const name = authorName(author);
  if (author?.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={author.avatar_url}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full border border-border object-cover"
      />
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7401df]/30 to-[#74ddc7]/20 text-xs font-bold text-[#74ddc7]">
      {initials(name)}
    </div>
  );
}

function ReviewCard({ review }: { review: ReviewWithAuthor }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <ReviewAvatar author={review.author} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-sm font-bold text-foreground">
              {authorName(review.author)}
            </span>
            <span className="text-xs text-muted-foreground">{relativeTime(review.created_at)}</span>
          </div>
          <div className="mt-0.5">
            <StarRating value={review.rating} />
          </div>
          {review.body && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{review.body}</p>
          )}
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// The signed-in user's own review (with edit / delete controls)
// ---------------------------------------------------------------------------

function OwnReviewCard({
  review,
  onEdit,
  onChanged,
}: {
  review: ReviewWithAuthor;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm("Delete your review?")) return;
    setDeleting(true);
    setErr(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("place_reviews").delete().eq("id", review.id);
      if (error) throw error;
      onChanged();
    } catch (e) {
      setErr((e as Error).message);
      setDeleting(false);
    }
  }

  return (
    <article className="rounded-2xl border border-[#74ddc7]/40 bg-[#74ddc7]/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#74ddc7]">
            Your review
          </p>
          <div className="mt-1">
            <StarRating value={review.rating} />
          </div>
          {review.body && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{review.body}</p>
          )}
          {err && <p className="mt-2 text-xs text-red-500">{err}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            title="Edit"
            aria-label="Edit your review"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.08] hover:text-foreground"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            title="Delete"
            aria-label="Delete your review"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400/70 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Add / edit review form (upsert on place_id,user_id)
// ---------------------------------------------------------------------------

function ReviewForm({
  placeId,
  userId,
  existing,
  onCancel,
  onSaved,
}: {
  placeId: string;
  userId: string;
  existing: ReviewWithAuthor | null;
  /** Provided only when editing an existing review (lets the user back out). */
  onCancel?: () => void;
  onSaved: () => void;
}) {
  const [rating, setRating] = useState<number>(existing?.rating ?? 0);
  const [body, setBody] = useState<string>(existing?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (rating < 1 || rating > 5) {
      setErr("Pick a rating from 1 to 5 stars.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("place_reviews").upsert(
        { place_id: placeId, user_id: userId, rating, body: body.trim() || null },
        { onConflict: "place_id,user_id" },
      );
      if (error) throw error;
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {existing ? "Edit your review" : "Add your review"}
      </p>
      <div className="mt-3 space-y-3">
        <div className="flex items-center gap-3">
          <StarRating value={rating} size="md" onSelect={setRating} />
          {rating > 0 && <span className="text-sm text-muted-foreground">{rating}/5</span>}
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share a few words (optional)"
          rows={3}
          className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
        />
        {err && <p className="text-xs text-red-500">{err}</p>}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={save}
            disabled={busy}
            className="rounded-full bg-[#74ddc7] font-bold text-[#0a0a0f] hover:bg-[#74ddc7]/90 disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
              </>
            ) : existing ? (
              "Save changes"
            ) : (
              "Post review"
            )}
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={busy}
              className="rounded-full"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
