import type { Metadata } from "next";
import { PageShell, Panel, Row } from "@/components/page-shell";
import { SITE_URL } from "@/lib/site";

const title = "Developers — Broadcast Copy";
const description =
  "The API, webhooks and SDKs behind Broadcast Copy — the same surface the platform itself is built on.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/developers` },
  openGraph: { title, description, type: "website", url: `${SITE_URL}/developers` },
};

export default function DevelopersPage() {
  return (
    <PageShell
      eyebrow="Developers"
      title="Every room has an API."
      lede="Nothing in the platform is behind a private door. The schedule, the log, the library, the loyalty ledger and the compliance file are all reachable over the same API the product uses — scoped to your station."
    >
      <Panel title="Core API" note="REST · station-scoped keys">
        <Row
          title="Programming"
          body="Shows, hosts, the weekly grid and the clock. Write a schedule change and the air chain picks it up."
        />
        <Row
          title="Traffic and billing"
          body="Orders, spots, flights and affidavits. Post an order, read proof of play back."
        />
        <Row
          title="Content library"
          body="Audio, video, podcast episodes and imaging, with the same metadata the apps and TV channels read."
        />
        <Row
          title="Listeners and loyalty"
          body="Accounts, points, check-ins and rewards. Points are server-authoritative — the ledger is the source of truth."
        />
        <Row
          title="Compliance"
          body="The public file, EAS logs and the FCC paperwork trail, queryable and exportable."
        />
      </Panel>

      <Panel title="Events" note="webhooks">
        <Row
          title="Now playing"
          body="Fires on every element change from the playout engine — what the dashboards and the dashboards in cars read."
        />
        <Row
          title="Log and schedule"
          body="Spot aired, break completed, show started, schedule amended."
        />
        <Row
          title="Listener activity"
          body="Check-ins, point awards and redemptions, as they happen."
        />
      </Panel>

      <Panel title="Getting started">
        <Row
          title="Keys and scopes"
          body="Keys are issued per station and scoped per surface, so an integration that reads the log cannot touch the loyalty ledger."
        />
        <Row
          title="Documentation"
          body="Endpoint reference, webhook payloads and the data model."
          href="/documentation"
        />
        <Row
          title="Changelog"
          body="Every release, versioned. API changes land here first."
          href="/changelog"
        />
      </Panel>

      <Panel title="Access">
        <Row
          title="Ask for a key"
          body="API access ships with every licensed station. Tell us what you are building and we will scope the keys with you."
          href="/platform#early-access"
          meta="Early access"
        />
      </Panel>
    </PageShell>
  );
}
