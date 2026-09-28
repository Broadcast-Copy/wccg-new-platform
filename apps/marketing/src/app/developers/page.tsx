import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { PageShell, Panel, Row } from "@/components/page-shell";
import { FeatureShots } from "@/components/feature-shots";
import { WAITLIST_HREF } from "@/lib/nav";
import { BROADCAST_COPY_MANAGER, SITE_URL } from "@/lib/site";

const title = "Developers — Broadcast Copy";
const description =
  "How Broadcast Copy is built, installed and audited: native Windows studio apps, services on your own network, a checksummed release registry with headless installs, append-only change records, and the exports that exist today.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/developers` },
  openGraph: { title, description, type: "website", url: `${SITE_URL}/developers` },
};

/**
 * For technical buyers - the station's engineer, an integrator, IT. Every line
 * here was checked against the code on 2026-09-27 (this repo's migrations and
 * the AirSuite repo's services, installer and Manager). The page used to
 * promise a REST API with station-scoped keys, webhooks and API docs; none of
 * those exist, so it now says so plainly (Jev 0.98) and names the one that is
 * on the roadmap. Do not add an API, SDK or webhook claim here until it ships.
 */

const manager = BROADCAST_COPY_MANAGER;

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-ink px-4 py-3 font-mono text-[13px] leading-relaxed text-fg">
      <code>{children}</code>
    </pre>
  );
}

export default function DevelopersPage() {
  return (
    <PageShell
      wide
      eyebrow="Developers"
      title="Built to be checked, not taken on trust."
      lede="What a station's engineer asks before anything touches air: what runs where, how it installs, how data is kept apart, and what gets recorded. Everything on this page is how the software works today — including what it does not do yet."
    >
      {/* ------------------------------------------------ API status, first */}
      <section
        aria-labelledby="api-status"
        className="rounded-2xl border border-line bg-surface p-5 sm:p-6"
      >
        <div className="flex items-center gap-2.5">
          <Info className="h-5 w-5 flex-none text-signal-ink" aria-hidden />
          <h2 id="api-status" className="text-base font-semibold">
            API status
          </h2>
        </div>
        <ul className="mt-3 grid grid-cols-1 gap-2 text-sm leading-relaxed text-dim sm:grid-cols-3 sm:gap-6">
          <li>
            <b className="font-semibold text-fg">Public API:</b> not available yet. An open API
            for integrations is on the roadmap.
          </li>
          <li>
            <b className="font-semibold text-fg">Webhooks and SDKs:</b> none today.
          </li>
          <li>
            <b className="font-semibold text-fg">Need to connect something?</b> Tell us what.
            <Link
              href={WAITLIST_HREF}
              className="flex min-h-11 items-center gap-1.5 font-semibold text-signal-ink underline-offset-2 hover:underline"
            >
              The waitlist form <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </li>
        </ul>
      </section>

      {/* ------------------------------------------------ real screens */}
      <section aria-labelledby="screens" className="mt-14">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 id="screens" className="text-sm font-semibold tracking-[0.14em] uppercase">
            What it does, on the real screens
          </h2>
          <span className="hidden h-px flex-1 bg-line sm:block" />
          <span className="text-xs text-dim">test data; private details blurred</span>
        </div>
        <FeatureShots />
      </section>

      <Panel title="How it is built">
        <Row
          title="Native studio apps"
          body="The studio applications — the Broadcast Copy Manager, the Production app, traffic — are native Windows programs built on .NET (WPF) with no third-party packages."
        />
        <Row
          title="Services on your own network"
          body="The apps are clients of services that run on the station's own machines: Node.js with no third-party dependencies, keeping their data in SQLite. The on-air player pulls each published day from them."
        />
        <Row
          title="Cloud control plane"
          body="Accounts, organizations, stations, the release registry and the public sites run on Postgres (Supabase) with row-level security and Deno edge functions. The websites, this one included, are static exports with no server of their own."
        />
        <Row
          title="Stations kept apart"
          body="Every station-scoped table carries a station id and a restrictive row-level-security policy, so the database backs up the app's own scoping. The decided design goes further: one isolated database per station behind a shared control plane."
          meta="Isolated databases planned"
        />
      </Panel>

      <Panel title="Installs and updates">
        <Row
          title="One download, installed per user"
          body="The Broadcast Copy Manager installs into the user's own programs folder with an entry in Settings › Apps. It never asks for administrator rights and adds no services, scheduled tasks or firewall rules; it starts with Windows only if you ask for that, through a Startup shortcut you can see and delete."
        />
        <Row
          title="A checksum on every artifact"
          body="Each module release is a row in the release registry: package, version, channel, size, address and SHA-256. The Manager refuses an artifact whose row has no checksum or whose download does not match it, and nothing installs itself — a person asks, or a script does."
        />
        <Row
          title="Headless installs for scripted rollouts"
          body={
            <>
              The same pipeline as the Updates window — registry, SHA-256, installer — from a
              command line or a scheduled job. It exits 0 when the module installed and verified,
              1 when it did not.
              <Code>{`BroadcastCopySuiteManager.exe --install <package> --log install.log`}</Code>
            </>
          }
        />
        <Row
          title="Check a download yourself"
          body={
            <>
              Every file on the Download page has its SHA-256 published beside it. In
              PowerShell:
              <Code>{`Get-FileHash .\\BroadcastCopyManager-${manager.version}.zip -Algorithm SHA256`}</Code>
              <Link
                href="/download/"
                className="mt-1 inline-flex min-h-11 items-center gap-1.5 font-semibold text-signal-ink underline-offset-2 hover:underline"
              >
                Download page and checksums <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </>
          }
        />
      </Panel>

      <Panel title="What gets recorded">
        <Row
          title="Every log edit, append-only"
          body="A change to a future day's log is recorded against the signed-in profile with its reason. The audit table is append-only in the database itself: an update or a delete is refused."
        />
        <Row
          title="Sign-ins, the same way"
          body="The sign-in audit of the station's services is append-only at the database level too."
        />
        <Row
          title="A gate before anything publishes"
          body="Tomorrow's log publishes only after it passes named checks — structure, hours, hard times, restrictions, silence, traffic and network — and it publishes as a numbered revision with its SHA-256. A day that fails a check is not published, and the report says which check and where."
        />
        <Row
          title="AI that only drafts"
          body="The optional imaging script writer fills a script box and nothing more: nothing is saved until a person saves it, and it is sent the station's facts and the request — no listener or personal data."
          meta="Optional"
        />
      </Panel>

      <Panel title="Getting data out today">
        <Row
          title="Reports as CSV"
          body="As-run, affidavits and spot logs export as CSV from the station's reports."
        />
        <Row
          title="Word documents"
          body="Promotions calendars export to Word (.docx) in their own layout."
        />
        <Row
          title="Podcast feeds"
          body="RSS 2.0 with iTunes tags for every show marked published, served by the station's own service."
        />
        <Row
          title="Now playing, outbound"
          body="An exporter can send each change as XML over TCP or as an HTTP POST — to an RDS encoder or a listening service. It ships switched off; a station turns it on."
          meta="Off by default"
        />
        <Row
          title="Stream status, inbound"
          body="Reads Icecast, Shoutcast and Centova status for the station's streams."
        />
      </Panel>

      <section className="mt-14 flex flex-col gap-4 rounded-2xl border border-line bg-elevated p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Evaluating it for a station?</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-dim">
            Tell us about your plant and what it has to connect to. Pricing is on request.
          </p>
        </div>
        <Link
          href={WAITLIST_HREF}
          className="inline-flex min-h-12 flex-none items-center justify-center gap-2 rounded-lg bg-signal px-6 text-sm font-semibold text-fg transition hover:bg-signal-soft"
        >
          Join the waitlist <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>
    </PageShell>
  );
}
