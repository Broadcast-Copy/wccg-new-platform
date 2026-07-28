import type { Metadata } from "next";
import { PageShell, Panel, Row } from "@/components/page-shell";
import { SITE_URL } from "@/lib/site";

const title = "Documentation — Broadcast Copy";
const description =
  "How to run a station on Broadcast Copy: setup, the air chain, traffic, compliance, the API and the release changelog.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/documentation` },
  openGraph: { title, description, type: "website", url: `${SITE_URL}/documentation` },
};

export default function DocumentationPage() {
  return (
    <PageShell
      eyebrow="Documentation"
      title="How the station runs itself."
      lede="Start with provisioning, then follow the signal: programming into the log, the log into the air chain, the air chain into the public file. Each section covers what the platform does on its own and what still wants a human."
    >
      <Panel title="Start here">
        <Row
          title="Provisioning a station"
          body="Organization, licensed station record, your domain, and the team invited as GM, OM, staff and DJs."
        />
        <Row
          title="Bringing your streams"
          body="Point us at existing mounts. Nothing about your encoder chain has to change on day one."
        />
        <Row
          title="Importing programming"
          body="Shows, hosts and the weekly grid. Your schedule becomes the source of truth for everything downstream."
        />
      </Panel>

      <Panel title="Running the air chain">
        <Row
          title="The clock and the log"
          body="How the hour is built, how spots land in breaks, and what the agent does when a break runs short."
        />
        <Row
          title="Studios and consoles"
          body="AirSuite On-Air, Production, Podcast and Remote — what each surface controls and how it talks to the platform."
          href="/download"
        />
        <Row
          title="DJ operations"
          body="Drops, voice tracks, mix uploads and the reminders that keep a volunteer roster on schedule."
        />
      </Panel>

      <Panel title="Business and compliance">
        <Row
          title="Traffic and billing"
          body="Orders to flights to affidavits, and where proof of play comes from."
        />
        <Row
          title="Loyalty and listeners"
          body="The points ledger, check-ins and rewards. Points are server-authoritative by design."
        />
        <Row
          title="The public file"
          body="What the platform files for you, what it reminds you about, and what it will not sign on your behalf."
        />
      </Panel>

      <Panel title="Build on it">
        <Row
          title="API and webhooks"
          body="The same surface the product is built on, scoped per station."
          href="/developers"
        />
        <Row
          title="Changelog"
          body="Every release of Broadcast Copy, versioned and updated in real time — the flagship runs the same builds, so what ships to air shows up here."
          href="/changelog"
          meta="Live"
        />
      </Panel>
    </PageShell>
  );
}
