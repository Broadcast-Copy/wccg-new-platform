import type { Metadata } from "next";
import { StationTour } from "@/components/station-tour";
import { SITE_URL } from "@/lib/site";

const title = "Station tour — Broadcast Copy";
const description =
  "Walk a full-power radio station floor by floor and see exactly what Broadcast Copy runs in every room — studios, operations, front office and the field kit.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/tour` },
  openGraph: { title, description, type: "website", url: `${SITE_URL}/tour` },
};

/** kept so links to /tour still land somewhere; the model is now the home page */
export default function TourPage() {
  return <StationTour />;
}
