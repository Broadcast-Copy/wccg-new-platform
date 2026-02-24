import { FileText, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "FCC Applications | WCCG 104.5 FM",
  description: "FCC application and licensing information for WCCG 104.5 FM, Fayetteville, NC.",
};

export default function FCCApplicationsPage() {
  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-slate-950/50 to-gray-900 border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-500 to-slate-700 shadow-xl">
              <FileText className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">FCC Applications</h1>
              <p className="text-white/50 mt-1">Federal Communications Commission filings for WCCG</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-white">About FCC Applications</h2>
        <p className="text-white/50 leading-relaxed">
          WCCG 104.5 FM is licensed by the Federal Communications Commission (FCC) to serve Fayetteville, North Carolina and surrounding areas.
          All FCC applications, filings, and related documents are publicly available through the FCC&apos;s online database systems.
        </p>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-white">Station License Information</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "Call Sign", value: "WCCG" },
            { label: "Frequency", value: "104.5 MHz FM" },
            { label: "Facility ID", value: "55226" },
            { label: "Licensee", value: "Carson Communications" },
            { label: "City of License", value: "Fayetteville, NC" },
            { label: "Channel", value: "283" },
            { label: "Class", value: "C3" },
            { label: "Status", value: "Licensed" },
          ].map((item) => (
            <div key={item.label} className="flex justify-between items-center py-2 border-b border-white/[0.04]">
              <span className="text-sm text-white/40">{item.label}</span>
              <span className="text-sm text-white font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-white">FCC Resources</h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild className="rounded-full bg-[#74ddc7] text-[#0a0a0f] font-bold hover:bg-[#5fc4b0]">
            <a href="https://publicfiles.fcc.gov/fm-profile/wccg" target="_blank" rel="noopener noreferrer">
              Public Inspection File
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="outline" className="rounded-full border-white/20 text-white hover:bg-white/5">
            <a href="https://www.fcc.gov/media/radio/fm-query" target="_blank" rel="noopener noreferrer">
              FCC FM Query
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="outline" className="rounded-full border-white/20 text-white hover:bg-white/5">
            <a href="https://apps.fcc.gov/cgi-bin/ws.exe/prod/cdbs/pubacc/prod/call_search.pl" target="_blank" rel="noopener noreferrer">
              CDBS Search
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 text-center">
        <p className="text-white/50 text-sm">
          Questions about our FCC filings?{" "}
          <Link href="/contact" className="text-[#74ddc7] hover:underline">Contact us</Link>
          {" "}or call (910) 484-4932.
        </p>
      </div>
    </div>
  );
}
