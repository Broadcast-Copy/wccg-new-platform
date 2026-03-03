import HostBioPage from "./host-bio-client";
import { ALL_HOSTS } from "@/data/hosts";

export async function generateStaticParams() {
  return [
    { hostId: "_placeholder" },
    ...ALL_HOSTS.map((h) => ({ hostId: h.id })),
  ];
}

export default function Page() {
  return <HostBioPage />;
}
