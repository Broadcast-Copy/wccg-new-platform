import PlaceProfileClient from "./place-profile-client";

export async function generateStaticParams() {
  return [{ slug: "_placeholder" }];
}

export default function Page() {
  return <PlaceProfileClient />;
}
