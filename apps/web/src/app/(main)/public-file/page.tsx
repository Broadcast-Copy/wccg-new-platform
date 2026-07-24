import { FileText, ExternalLink, FolderOpen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getPublicFileFromDb } from "@/lib/content-db";

export const metadata = {
  title: "Public Inspection File | WCCG 104.5 FM",
  description: "Access the WCCG 104.5 FM public inspection file as required by the FCC.",
};

const STATION_INFO = [
  { label: "Call Sign", value: "WCCG" },
  { label: "Frequency", value: "104.5 FM" },
  { label: "Facility ID", value: "55226" },
  { label: "Licensee", value: "Carson Communications" },
  { label: "City of License", value: "Fayetteville, NC" },
  { label: "Service Area", value: "Cumberland County & surrounding areas" },
];

export default async function PublicFilePage() {
  // Build-time fetch (static export). Falls back to [] -> the FCC-website link
  // still covers access if the DB is unavailable.
  const categories = await getPublicFileFromDb();

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-slate-950/50 to-gray-900 border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-500 to-slate-700 shadow-xl">
              <FileText className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Public Inspection File</h1>
              <p className="text-muted-foreground mt-1">FCC-required public file for WCCG 104.5 FM</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">About the Public Inspection File</h2>
        <p className="text-muted-foreground leading-relaxed">
          The Federal Communications Commission (FCC) requires all broadcast stations to maintain a public inspection file.
          This file contains information about the station&apos;s operations, programming, and compliance with FCC regulations.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          WCCG 104.5 FM&apos;s public inspection file is available online through the FCC&apos;s website. You may also visit our
          studio at 115 Gillespie Street, Fayetteville, NC 28301 during regular business hours to review the file in person.
        </p>
      </div>

      {categories.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <FolderOpen className="h-5 w-5 text-[#74ddc7]" />
            <h2 className="text-xl font-semibold text-foreground">File Contents</h2>
          </div>
          <div className="space-y-6">
            {categories.map((cat) => (
              <div key={cat.key} className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {cat.label}
                </h3>
                <ul className="space-y-2">
                  {cat.docs.map((doc) => (
                    <li key={doc.title} className="rounded-lg border border-border bg-background/40 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-foreground">{doc.title}</span>
                            {doc.periodLabel && (
                              <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs text-muted-foreground">
                                {doc.periodLabel}
                              </span>
                            )}
                          </div>
                          {doc.description && (
                            <p className="mt-1 text-sm text-muted-foreground">{doc.description}</p>
                          )}
                        </div>
                        {doc.url && (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex shrink-0 items-center gap-1 text-sm text-[#74ddc7] hover:underline"
                          >
                            View
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Access Our Public File</h2>
        <p className="text-muted-foreground leading-relaxed">
          The authoritative, always-current file is hosted by the FCC. Use the link below, or contact us for help finding a
          specific document.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild className="rounded-full bg-[#74ddc7] text-[#0a0a0f] font-bold hover:bg-[#5fc4b0]">
            <a href="https://publicfiles.fcc.gov/fm-profile/wccg" target="_blank" rel="noopener noreferrer">
              View on FCC Website
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="outline" className="rounded-full border-white/20 text-foreground hover:bg-white/5">
            <Link href="/public-file-help">Need Help?</Link>
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Station Information</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {STATION_INFO.map((item) => (
            <div key={item.label} className="flex justify-between items-center py-2 border-b border-white/[0.04]">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className="text-sm text-foreground font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
