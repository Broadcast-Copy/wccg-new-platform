"use client";

import { FileText, Tag, Calendar } from "lucide-react";

// ---------------------------------------------------------------------------
// Changelog Data — update after every push
// ---------------------------------------------------------------------------
interface ChangelogEntry {
  version: string;
  date: string;
  tag: "beta" | "stable" | "alpha";
  changes: string[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.4.0-beta",
    date: "March 29, 2026",
    tag: "beta",
    changes: [
      "Nice-to-haves: product reviews with star ratings, vendor analytics dashboard",
      "Bulk gift card admin tool — generate 1-100 codes at any denomination",
      "Become a Vendor application form (/become-vendor)",
      "PWA manifest — install WCCG as an app on mobile",
      "Duke countdown card: theme-aware (light/dark), bigger logos, broadcast logo support",
    ],
  },
  {
    version: "0.3.0-beta",
    date: "March 29, 2026",
    tag: "beta",
    changes: [
      "E-commerce: checkout page, order system, order tracking for buyers and vendors",
      "Vendor payouts/withdrawals with $25 minimum and balance tracking",
      "Vendor shipping settings (flat rate, free threshold, processing days)",
      "Onboarding wizard — 3-step welcome flow for listeners, creators, vendors",
      "Account security page — change password, 2FA coming soon",
      "Admin: user management with verification toggles and role editing",
      "Admin: platform fee configuration (8% products, 5% bookings, 3% events)",
      "Admin: content moderation queue for hub posts and productions",
      "Admin: audit log viewer with filters and date range",
      "Changelog page with version timeline",
    ],
  },
  {
    version: "0.2.0-beta",
    date: "March 28, 2026",
    tag: "beta",
    changes: [
      "Creator Hub, Vendor Hub, Listener Hub — social feeds with posts, likes, YouTube embeds",
      "Public marketplace with hero slider, hot categories, 18 products from wccg1045fm.com",
      "Downloaded 28 product images from live marketplace",
      "Universal gift card system — tables, vendor opt-in toggle, gift card badges",
      "Vendor marketing portal — 5-step wizard (promote item → campaign type → details → preview → launch)",
      "Community Local Directory — search-first with Supabase, renamed from My Directory",
      "Public vendor storefront (/vendors?id=) with inline booking form",
      "My Perks page — TrueFit gym membership, coffee, concert priority, marketplace discounts",
      "Mobile nav overhaul: Home, Events, Discover, Market, Directory with dynamic badges",
      "Live stream red dot on Listen tab, new product count badge on Shop",
      "Version ribbon in user menu dropdown linking to changelog",
      "Password eye toggle on login form",
      "Favorites expanded: 6 tabs (Streams, Shows, Places, Products, Events)",
      "Media manager: DJ folders for all DJs, grid default, back button, compact file cards",
      "10+ light mode color fixes across the platform",
    ],
  },
  {
    version: "0.1.0-beta",
    date: "March 28, 2026",
    tag: "beta",
    changes: [
      "Initial platform launch — 190+ pages",
      "Streaming: 5 channels, show schedule, host profiles with social links",
      "19 Supabase migrations applied — full database schema",
      "9 pages refactored from mock data to Supabase CRUD",
      "File upload system with Supabase Storage (audio, images, media buckets)",
      "Production queue with approve/reject workflow",
      "Blog manager with publish/draft and featured image upload",
      "Vendor products, bookings, events, tokens, customers — all connected to Supabase",
      "Real-time admin notification badges (pending productions, upcoming events)",
      "Points & rewards system with listener points tracking",
      "Community directory with 72 local business listings and interactive map",
      "Admin operations: master control, FCC compliance, equipment, engineering, shifts",
      "Studio tools: podcast, audio/video editor, studio booking, live-on-site, voice-over",
      "Advertiser self-service portal with campaigns, creatives, billing, performance",
      "Duke basketball integration with ESPN scores, countdown timer, play-by-play",
      "Sports hub with Duke basketball and football coverage",
    ],
  },
];

// Current version (shown in user menu)
export const CURRENT_VERSION = CHANGELOG[0].version;

// ---------------------------------------------------------------------------
// Tag Badge
// ---------------------------------------------------------------------------
function TagBadge({ tag }: { tag: ChangelogEntry["tag"] }) {
  const styles = {
    beta: "bg-[#f59e0b]/10 text-[#f59e0b]",
    stable: "bg-emerald-500/10 text-emerald-400",
    alpha: "bg-purple-500/10 text-purple-400",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${styles[tag]}`}
    >
      {tag}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#74ddc7]/10">
          <FileText className="h-5 w-5 text-[#74ddc7]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Changelog</h1>
          <p className="text-sm text-muted-foreground">
            What&apos;s new in the WCCG platform
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative space-y-8">
        {/* Timeline line */}
        <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border" />

        {CHANGELOG.map((entry, idx) => (
          <div key={entry.version} className="relative pl-10">
            {/* Timeline dot */}
            <div className={`absolute left-0 top-1 flex h-[31px] w-[31px] items-center justify-center rounded-full border-2 bg-card ${
              idx === 0 ? "border-[#74ddc7]" : "border-border"
            }`}>
              <Tag className={`h-3.5 w-3.5 ${idx === 0 ? "text-[#74ddc7]" : "text-muted-foreground"}`} />
            </div>

            {/* Version Card */}
            <div className={`rounded-2xl border bg-card p-6 ${idx === 0 ? "border-[#74ddc7]/30" : "border-border"}`}>
              {/* Header */}
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-bold">v{entry.version}</h2>
                <TagBadge tag={entry.tag} />
                {idx === 0 && (
                  <span className="rounded-full bg-[#74ddc7]/10 px-2 py-0.5 text-[10px] font-bold text-[#74ddc7]">
                    LATEST
                  </span>
                )}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {entry.date}
                </div>
              </div>

              {/* Changes */}
              <ul className="space-y-2.5">
                {entry.changes.map((change) => (
                  <li key={change} className="flex items-start gap-3">
                    <div className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${idx === 0 ? "bg-[#74ddc7]" : "bg-muted-foreground/30"}`} />
                    <span className="text-sm text-foreground/80">{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom spacer */}
      <div className="h-8" />
    </div>
  );
}
