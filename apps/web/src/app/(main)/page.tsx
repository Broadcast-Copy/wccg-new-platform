import HomePageContent from "./home-page-content";
import { getShowsFromDb } from "@/lib/content-db";
import { HERO_SHOWS, type ShowData } from "@/data/shows";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

const description = "Listen live to WCCG 104.5 FM, Fayetteville’s hip hop and R&B station. Music, personalities, Duke sports and local connections. Free listening in your browser.";
export const metadata: Metadata = {
  title: "WCCG 104.5 FM | Listen Live — Fayetteville Hip Hop & R&B",
  description,
  alternates: { canonical: "/" },
  openGraph: { title: "Your city. Your music. Your 104.5.", description, url: "/", type: "website", siteName: "WCCG 104.5 FM", images: [{ url: "/images/logos/wccg-logo.png", alt: "WCCG 104.5 FM — Fayetteville’s Hip Hop Station", width: 500, height: 324 }] },
  twitter: { card: "summary_large_image", title: "WCCG 104.5 FM | Listen Live", description, images: ["/images/logos/wccg-logo.png"] },
};

export default async function HomePage() {
  // Hero carousel shows come from the DB at build time. HERO_SHOWS (the curated
  // TS list) defines WHICH shows appear and in what order; we resolve each by id
  // against the DB result so the carousel uses live DB content, and fall back to
  // the TS entry for any id the DB doesn't return (content-db already falls back
  // to ALL_SHOWS on error/empty, so this is belt-and-braces).
  const dbShows = await getShowsFromDb();
  const byId = new Map(dbShows.map((s) => [s.id, s]));
  const heroShows: ShowData[] = HERO_SHOWS.map(
    (curated) => byId.get(curated.id) ?? curated,
  );

  const station = {
    "@context": "https://schema.org",
    "@type": "RadioStation",
    "@id": `${SITE_URL}/#station`,
    name: "WCCG 104.5 FM",
    url: SITE_URL,
    description,
    logo: `${SITE_URL}/images/logos/wccg-logo.png`,
    areaServed: { "@type": "City", name: "Fayetteville", address: { "@type": "PostalAddress", addressRegion: "NC", addressCountry: "US" } },
  };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(station).replace(/</g, "\\u003c") }} /><HomePageContent heroShows={heroShows} /></>;
}
