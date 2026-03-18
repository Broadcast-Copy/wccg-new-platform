import { ChannelRedirect } from "./channel-redirect";

export async function generateStaticParams() {
  return [
    { streamId: "stream_wccg" },
    { streamId: "stream_soul" },
    { streamId: "stream_hot" },
    { streamId: "stream_vibe" },
    { streamId: "stream_yard" },
    { streamId: "stream_mixsquad" },
  ];
}

export default function ChannelDetailPage() {
  return <ChannelRedirect />;
}
