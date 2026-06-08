import WatchClient from "./watch-client";

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

    const res = await fetch(
      `${url}/rest/v1/videos?select=id&status=eq.published&visibility=eq.public`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      },
    );

    if (res.ok) {
      const rows: unknown = await res.json();
      if (Array.isArray(rows)) {
        for (const row of rows) {
          const id = (row as { id?: unknown }).id;
          if (typeof id === "string" && id.length > 0) {
            params.push({ id });
          }
        }
      }
    }
  } catch {
    // Build-time fetch failed (network/env). Fall back to just the placeholder;
    // any real video still resolves client-side via the SPA fallback.
  }

  return params;
}

export default function Page() {
  return <WatchClient />;
}
