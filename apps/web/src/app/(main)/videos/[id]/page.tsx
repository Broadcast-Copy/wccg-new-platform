import type { Metadata } from "next";
import WatchClient from "./watch-client";
import { SITE_URL } from "@/lib/site";

// Public-by-design fallbacks (mirror src/lib/supabase/client.ts). The project URL
// + sb_publishable_* key ship in every client bundle and are RLS-protected, so
// they're safe as a build-time fallback when NEXT_PUBLIC_SUPABASE_* aren't set.
const FALLBACK_SUPABASE_URL = "https://irjiqbmoohklagdegezz.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "sb_publishable_w9EytFGBM7mEvefmGhsZ9w_bXbmNjQ4";

/**
 * Static-export params. We pre-render a real page for every published, public
 * video so `/videos/<id>` builds to static HTML — which makes the thumbnail link
 * a normal client navigation AND makes a hard load / refresh resolve correctly
 * (the `_placeholder`-only approach made useParams() return "_placeholder", so
 * the page showed "No video"). The `_placeholder` entry is always kept so the
 * .htaccess SPA fallback still covers any video published after the last build —
 * those resolve client-side via usePathname() in the client component.
 *
 * Runs at build (Node). A fetch failure must never fail the build, so it's
 * wrapped in try/catch and degrades to just the placeholder.
 */
export async function generateStaticParams(): Promise<{ id: string }[]> {
  const params: { id: string }[] = [{ id: "_placeholder" }];

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

    // PostgREST caps a single response at ~1000 rows, so an UNPAGINATED fetch
    // silently strands every video past the first page. That left 549 of 1549
    // published videos with no static page — a hard 404 on any shared
    // /videos/<id> link. Page explicitly until a short page comes back.
    const PAGE = 1000;
    const MAX_PAGES = 50; // hard stop so a misbehaving response can't spin forever
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await fetch(
        `${url}/rest/v1/videos?select=id&status=eq.published&visibility=eq.public` +
          `&order=id.asc&limit=${PAGE}&offset=${page * PAGE}`,
        {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
        },
      );
      if (!res.ok) break;

      const rows: unknown = await res.json();
      if (!Array.isArray(rows) || rows.length === 0) break;

      for (const row of rows) {
        const id = (row as { id?: unknown }).id;
        if (typeof id === "string" && id.length > 0) {
          params.push({ id });
        }
      }

      if (rows.length < PAGE) break; // last page
    }
  } catch {
    // Build-time fetch failed (network/env). Fall back to just the placeholder;
    // any real video still resolves client-side via the SPA fallback.
  }

  return params;
}

/**
 * Per-video social metadata. Fetches the single video at build time (same
 * public REST pattern as generateStaticParams) so a shared `/videos/<id>` link
 * shows the video's title + thumbnail in social previews instead of the generic
 * station card. Videos published after the last build fall back to the generic
 * title (they resolve client-side via the SPA fallback).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (id === "_placeholder") return { title: "Watch | WCCG 104.5 FM" };

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;
    const res = await fetch(
      `${url}/rest/v1/videos?id=eq.${id}&select=title,description,thumbnail_url&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (res.ok) {
      const rows: unknown = await res.json();
      const row = Array.isArray(rows) ? rows[0] : undefined;
      if (row && typeof row === "object") {
        const v = row as {
          title?: string;
          description?: string;
          thumbnail_url?: string;
        };
        const title = v.title
          ? `${v.title} | WCCG 104.5 FM`
          : "Watch | WCCG 104.5 FM";
        const description = v.description?.slice(0, 200) || "Watch on WCCG 104.5 FM.";
        const images = v.thumbnail_url ? [v.thumbnail_url] : undefined;
        return {
          title,
          description,
          openGraph: {
            title,
            description,
            type: "video.other",
            url: `${SITE_URL}/videos/${id}`,
            ...(images ? { images } : {}),
          },
          twitter: {
            card: "summary_large_image",
            title,
            description,
            ...(images ? { images } : {}),
          },
        };
      }
    }
  } catch {
    // Build-time fetch failed — fall back to the generic station card.
  }
  return { title: "Watch | WCCG 104.5 FM" };
}

export default function Page() {
  return <WatchClient />;
}
