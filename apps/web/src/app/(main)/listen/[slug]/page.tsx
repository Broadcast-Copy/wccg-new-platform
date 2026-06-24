import type { Metadata } from "next";
import { STATIONS, stationBySlug } from "@/lib/stations";
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const station = stationBySlug(slug);
  if (!station) return { title: "Listen Live | WCCG 104.5 FM" };
  return {
    title: `${station.name} — Listen Live | WCCG 104.5 FM`,
    description: station.description,
  };
}

export default function Page() {
  return <StationPlayerClient />;
}
