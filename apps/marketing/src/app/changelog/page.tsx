import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ChangelogList } from "@/components/changelog-list";
import { SITE_URL } from "@/lib/site";

const title = "Changelog — Broadcast Copy";
const description =
  "Every release of Broadcast Copy, the operating system for modern radio. Updated in real time — each flagship update ships as a versioned changelog entry.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/changelog` },
  openGraph: { title, description, type: "website", url: `${SITE_URL}/changelog` },
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-5 py-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-signal/30 bg-signal/10 px-3.5 py-1.5 text-xs font-medium tracking-wide text-signal-soft uppercase">
          <span className="bc-pulse h-1.5 w-1.5 rounded-full bg-signal" aria-hidden />
          Updated in real time
        </span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">Changelog</h1>
        <p className="mt-3 max-w-xl text-lg text-dim text-pretty">
          Every release of Broadcast Copy. The flagship, WCCG 104.5 FM, runs on
          the same builds — so what ships to air shows up here, versioned.
        </p>

        <ChangelogList />
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-8 text-sm text-faint">
          <Link href="/" className="transition hover:text-fg">
            ← Back to broadcastcopy.ai
          </Link>
          <a
            href="https://wccg1045fm.com"
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-fg"
          >
            See it live
          </a>
        </div>
      </footer>
    </div>
  );
}
