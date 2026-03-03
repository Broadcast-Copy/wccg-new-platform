import ShowDetailPage from "./show-detail-client";
import { ALL_SHOWS } from "@/data/shows";

export async function generateStaticParams() {
  return [
    { showId: "_placeholder" },
    ...ALL_SHOWS.map((s) => ({ showId: s.id })),
  ];
}

export default function Page() {
  return <ShowDetailPage />;
}
