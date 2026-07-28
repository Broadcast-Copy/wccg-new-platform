import type { Metadata } from "next";
import { StationTour } from "@/components/station-tour";
import { SITE_URL } from "@/lib/site";

const title = "Broadcast Copy — the operating system for modern radio";
const description =
  "Walk a full-power radio station floor by floor and see exactly what Broadcast Copy runs in every room — studios, operations, front office and the field kit.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: SITE_URL },
  openGraph: { title, description, type: "website", url: SITE_URL },
};

export default function Page() {
  return <StationTour />;
}
