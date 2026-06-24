import type { Metadata } from "next";
import HostBioPage from "./host-bio-client";
import { ALL_HOSTS, getHostById } from "@/data/hosts";
import { fetchYouTubeVideos } from "@/lib/youtube-rss";
import { SITE_URL } from "@/lib/site";

export async function generateStaticParams() {
  return [
    { hostId: "_placeholder" },
    ...ALL_HOSTS.map((h) => ({ hostId: h.id })),
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ hostId: string }>;
}): Promise<Metadata> {
  const { hostId } = await params;
  if (hostId === "_placeholder") return { title: "Hosts | WCCG 104.5 FM" };

  const host = getHostById(hostId);
  if (!host) return { title: "Hosts | WCCG 104.5 FM" };

  const title = `${host.name} | WCCG 104.5 FM`;
  const description = host.bio
    ? host.bio.slice(0, 200)
    : `${host.name} — ${host.role} on WCCG 104.5 FM.`;
  const images = host.imageUrl
    ? [
        host.imageUrl.startsWith("http")
          ? host.imageUrl
          : `${SITE_URL}${host.imageUrl}`,
      ]
    : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      url: `${SITE_URL}/hosts/${host.id}`,
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
  params: Promise<{ hostId: string }>;
}) {
  const { hostId } = await params;
  const host = getHostById(hostId);
  const channelId = host?.youtubeChannelId;

  const youtubeVideos = channelId
    ? await fetchYouTubeVideos(channelId)
    : [];

  return <HostBioPage youtubeVideos={youtubeVideos} />;
}
