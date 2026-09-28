import type { Metadata } from "next";
import { GuideTeaser, guideMetadata } from "@/components/guide";

// Public teaser only: the full guide is members-only (bc_docs, read at
// platform.broadcastcopy.ai/docs after sign-in). Keep guide text out of here.
export const metadata: Metadata = guideMetadata("build-and-publish-a-days-log");

export default function Page() {
  return <GuideTeaser slug="build-and-publish-a-days-log" />;
}
