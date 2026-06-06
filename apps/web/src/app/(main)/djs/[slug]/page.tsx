import DjProfileClient from "./dj-profile-client";

// Public-by-design fallbacks (mirrors src/lib/supabase/client.ts). The project
// URL ships in every client bundle and sb_publishable_* is Supabase's
// publishable key (protected by RLS), so it is safe to use as a build-time
// fallback when NEXT_PUBLIC_SUPABASE_* aren't wired into the build env.
const FALLBACK_SUPABASE_URL = "https://irjiqbmoohklagdegezz.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "sb_publishable_w9EytFGBM7mEvefmGhsZ9w_bXbmNjQ4";

/**
 * Static-export params. We pre-render the real page for every active DJ so each
 * `/djs/<slug>` builds to static HTML (speed + SEO), while ALWAYS keeping the
 * `_placeholder` entry that the SPA/.htaccess fallback relies on for any slug
 * not known at build time.
 *
 * The real renderer is the client component which reads the slug via
 * useParams() and loads data from Supabase at runtime — that stays untouched;
 * the slugs fetched here are only used to enumerate the static routes.
 *
 * Runs at build (Node). A fetch failure must never fail the build, so it is
 * wrapped in try/catch and degrades to just the placeholder.
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const params: { slug: string }[] = [{ slug: "_placeholder" }];

  try {
    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

    const res = await fetch(
      `${url}/rest/v1/djs?select=slug&is_active=eq.true`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      }
    );

    if (res.ok) {
      const rows: unknown = await res.json();
      if (Array.isArray(rows)) {
        for (const row of rows) {
          const slug = (row as { slug?: unknown }).slug;
          if (typeof slug === "string" && slug.length > 0) {
            params.push({ slug });
          }
        }
      }
    }
  } catch {
    // Build-time fetch failed (network/env). Fall back to just the
    // placeholder so the export still succeeds; direct URLs resolve via the
    // .htaccess SPA fallback and client-side data loading.
  }

  return params;
}

export default function Page() {
  return <DjProfileClient />;
}
