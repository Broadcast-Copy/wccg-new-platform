import EventDetailPage from "./event-detail-client";

export async function generateStaticParams() {
  return [{ eventId: "_placeholder" }];
}

export default function Page() {
  return <EventDetailPage />;
}
