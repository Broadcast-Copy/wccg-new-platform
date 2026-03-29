"use client";

import { FileText, Tag, Calendar } from "lucide-react";

// ---------------------------------------------------------------------------
// Changelog Data
// ---------------------------------------------------------------------------
interface ChangelogEntry {
  version: string;
  date: string;
  tag: "beta" | "stable" | "alpha";
  changes: string[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.1.0-beta",
    date: "March 2026",
    tag: "beta",
    changes: [
      "Initial platform launch",
      "Streaming: 5 channels, show schedule, host profiles",
      "Marketplace: vendor products, bookings, events",
      "Creator Hub, Vendor Hub, Listener Hub with social feeds",
      "Points & rewards system",
      "Community directory with interactive map",
      "Admin operations: master control, FCC compliance, traffic",
      "Studio tools: podcast, audio/video editor, booking",
      "Advertiser self-service portal",
      "Gift card system",
      "Marketing wizard for vendors/creators",
    ],
  },
];

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

        {CHANGELOG.map((entry) => (
          <div key={entry.version} className="relative pl-10">
            {/* Timeline dot */}
            <div className="absolute left-0 top-1 flex h-[31px] w-[31px] items-center justify-center rounded-full border-2 border-[#74ddc7] bg-card">
              <Tag className="h-3.5 w-3.5 text-[#74ddc7]" />
            </div>

            {/* Version Card */}
            <div className="rounded-2xl border border-border bg-card p-6">
              {/* Header */}
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-bold">v{entry.version}</h2>
                <TagBadge tag={entry.tag} />
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {entry.date}
                </div>
              </div>

              {/* Changes */}
              <ul className="space-y-2.5">
                {entry.changes.map((change) => (
                  <li key={change} className="flex items-start gap-3">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#74ddc7]" />
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
