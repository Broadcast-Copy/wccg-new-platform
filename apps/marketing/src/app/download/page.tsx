import type { Metadata } from "next";
import { PageShell, Panel, Row } from "@/components/page-shell";
import { FLAGSHIP_URL, SITE_URL } from "@/lib/site";

const title = "Download — Broadcast Copy";
const description =
  "AirSuite consoles, the studio agent and the listener apps. Everything a station installs on its own hardware.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/download` },
  openGraph: { title, description, type: "website", url: `${SITE_URL}/download` },
};

export default function DownloadPage() {
  return (
    <PageShell
      eyebrow="Download"
      title="What you install at the station."
      lede="The platform runs in the browser. These are the pieces that live on studio hardware — the consoles your operators sit in front of, and the agent that keeps the rack talking to the platform."
    >
      <Panel title="AirSuite consoles" note="Windows 10/11 · 64-bit">
        <Row
          title="AirSuite On-Air"
          body="The live console: deck control, cart wall, mic logic and the log running against the clock. What the board operator actually drives."
          meta="Beta"
        />
        <Row
          title="AirSuite Production"
          body="Multitrack production and voice tracking, with copy and spots pulled straight from the traffic log."
          meta="Beta"
        />
        <Row
          title="AirSuite Podcast"
          body="Multi-room recording and the podcast publishing chain, wired to the same content library."
          meta="Preview"
        />
        <Row
          title="AirSuite Remote"
          body="The road kit — the same surface on a laptop, for remotes and live events."
          meta="Preview"
        />
      </Panel>

      <Panel title="Studio agent" note="runs headless">
        <Row
          title="Broadcast Copy Studio Agent"
          body="Watches the playout box, reports now-playing and telemetry to the platform, and applies schedule changes without anyone walking into the rack room."
          meta="Beta"
        />
      </Panel>

      <Panel title="Listener apps">
        <Row
          title="Station apps for iOS and Android"
          body="Built per station from your brand kit — stream, schedule, loyalty points and check-ins."
          meta="On request"
        />
        <Row
          title="TV and smart speaker channels"
          body="Roku, Fire TV and Apple TV channels plus Alexa and Google actions, generated from the same content library."
          meta="On request"
        />
      </Panel>

      <Panel title="See it running">
        <Row
          title="The flagship station"
          body="WCCG 104.5 FM in Fayetteville, NC runs on these builds in production. Open it and you are looking at the real thing."
          href={FLAGSHIP_URL}
          meta="Live"
        />
      </Panel>
    </PageShell>
  );
}
