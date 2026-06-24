import CheckInClient from "./check-in-client";
import { getCheckInLocationsFromDb } from "@/lib/content-db";

export const metadata = {
  title: "Street Team Check-In | WCCG 104.5 FM",
  description:
    "Visit WCCG events around Fayetteville and check in to earn bonus points.",
};

export default async function CheckInPage() {
  // Check-in locations come from the DB at build time (content-db falls back
  // to the hardcoded TS list on error/empty), passed down to the client.
  const locations = await getCheckInLocationsFromDb();
  return <CheckInClient locations={locations} />;
}
