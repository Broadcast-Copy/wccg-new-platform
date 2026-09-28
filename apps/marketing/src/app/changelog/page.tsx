import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
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

/** Reached from the footer on every page and from the home page's "New" line. */
export default function ChangelogPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pt-10 pb-16 sm:pt-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-signal/30 bg-signal/10 px-3.5 py-1.5 text-xs font-medium tracking-wide text-signal-ink uppercase">
          <span className="bc-pulse h-1.5 w-1.5 rounded-full bg-signal" aria-hidden />
          Updated in real time
        </span>
        <h1 className="mt-5 text-[2rem] leading-tight font-semibold tracking-tight sm:text-4xl">
          Changelog
        </h1>
        <p className="mt-3 max-w-xl text-base text-dim text-pretty sm:text-lg">
          Every release of Broadcast Copy. The flagship, WCCG 104.5 FM, runs on
          the same builds — so what ships to air shows up here, versioned.
        </p>

        <ChangelogList />
      </main>

      <SiteFooter />
    </div>
  );
}
