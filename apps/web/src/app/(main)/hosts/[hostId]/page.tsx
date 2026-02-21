import HostBioPage from "./host-bio-client";

export async function generateStaticParams() {
  return [{ hostId: "_placeholder" }];
}

export default function Page() {
  return <HostBioPage />;
}
