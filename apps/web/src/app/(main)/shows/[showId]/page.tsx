import type { Metadata } from "next";
import ShowDetailPage from "./show-detail-client";
import {
  getShowsFromDb,
  getHostsFromDb,
  getHostsByShowIdFrom,
} from "@/lib/content-db";
import { fetchYouTubeVideos } from "@/lib/youtube-rss";
import { SITE_URL } from "@/lib/site";

export async function generateStaticParams() {
  // Pre-render every show under BOTH its id and its slug — schedule,
  // podcasts, and gospel-caravan links navigate by slug. Sourced from the DB
  // at build time (falls back to the hardcoded show list inside getShowsFromDb).
  const shows = await getShowsFromDb();
  return [
    { showId: "_placeholder" },
    ...shows.flatMap((s) => [{ showId: s.id }, { showId: s.slug }]),
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ showId: string }>;
}): Promise<Metadata> {
  const { showId } = await params;
  if (showId === "_placeholder") return { title: "Shows | WCCG 104.5 FM" };

  const shows = await getShowsFromDb();
  const show =
    shows.find((s) => s.id === showId) ?? shows.find((s) => s.slug === showId);
  if (!show) return { title: "Shows | WCCG 104.5 FM" };

  const title = `${show.name} | WCCG 104.5 FM`;
  const description =
    show.tagline || show.description || `${show.name} on WCCG 104.5 FM.`;
  const rawImage = show.showImageUrl || show.imageUrl;
  const images = rawImage
    ? [rawImage.startsWith("http") ? rawImage : `${SITE_URL}${rawImage}`]
    : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `${SITE_URL}/shows/${show.slug}`,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title,
      description,
      ...(images ? { images } : {}),
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ showId: string }>;
}) {
  const { showId } = await params;
  const [shows, hosts] = await Promise.all([
    getShowsFromDb(),
    getHostsFromDb(),
  ]);
  const show =
    shows.find((s) => s.id === showId) ?? shows.find((s) => s.slug === showId);
  const showHosts = show ? getHostsByShowIdFrom(hosts, show.id) : [];
  const yt = show?.youtube;
  const channelIds = [yt?.channelId, ...(yt?.extraChannelIds ?? [])].filter(
    (id): id is string => !!id,
  );

  // Merge every configured channel (show + host personal), newest first.
  const lists = await Promise.all(channelIds.map((id) => fetchYouTubeVideos(id)));
  const seen = new Set<string>();
  const youtubeVideos = lists
    .flat()
    .filter((v) => !seen.has(v.videoId) && (seen.add(v.videoId), true))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 12);

  return (
    <ShowDetailPage
      showData={show ?? null}
      hosts={showHosts}
      youtubeVideos={youtubeVideos}
    />
  );
}
