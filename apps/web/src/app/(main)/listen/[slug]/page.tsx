import { STATIONS } from "@/lib/stations";
import StationPlayerClient from "./station-player-client";

/**
 * Static-export params. The station set is a closed, build-time-known list
 * (lib/stations.ts), so we pre-render a real page for every station — no
 * `_placeholder` shim or .htaccess SPA fallback needed (unlike the
 * Supabase-backed dynamic routes). Unknown slugs simply 404.
 */
export function generateStaticParams(): { slug: string }[] {
  return STATIONS.map((s) => ({ slug: s.slug }));
}

export default function Page() {
  return <StationPlayerClient />;
}
