import HomePageContent from "./home-page-content";
import { getShowsFromDb } from "@/lib/content-db";
import { HERO_SHOWS, type ShowData } from "@/data/shows";

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

  return <HomePageContent heroShows={heroShows} />;
}
