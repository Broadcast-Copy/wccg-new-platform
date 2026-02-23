import ManageEventClient from "./manage-event-client";

export async function generateStaticParams() {
  return [{ eventId: "_placeholder" }];
}

export default function Page() {
  return <ManageEventClient />;
}
