import ShowDetailPage from "./show-detail-client";

export async function generateStaticParams() {
  return [{ showId: "_placeholder" }];
}

export default function Page() {
  return <ShowDetailPage />;
}
