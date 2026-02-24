import { FileText, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Public Inspection File | WCCG 104.5 FM",
  description: "Access the WCCG 104.5 FM public inspection file as required by the FCC.",
};

export default function PublicFilePage() {
  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-slate-950/50 to-gray-900 border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-500 to-slate-700 shadow-xl">
              <FileText className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Public Inspection File</h1>
              <p className="text-white/50 mt-1">FCC-required public file for WCCG 104.5 FM</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-white">About the Public Inspection File</h2>
        <p className="text-white/50 leading-relaxed">
          The Federal Communications Commission (FCC) requires all broadcast stations to maintain a public inspection file.
          This file contains information about the station&apos;s operations, programming, and compliance with FCC regulations.
        </p>
        <p className="text-white/50 leading-relaxed">
          WCCG 104.5 FM&apos;s public inspection file is available online through the FCC&apos;s website. You may also visit our
          studio at 115 Gillespie Street, Fayetteville, NC 28301 during regular business hours to review the file in person.
        </p>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-white">Access Our Public File</h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild className="rounded-full bg-[#74ddc7] text-[#0a0a0f] font-bold hover:bg-[#5fc4b0]">
            <a href="https://publicfiles.fcc.gov/fm-profile/wccg" target="_blank" rel="noopener noreferrer">
              View on FCC Website
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="outline" className="rounded-full border-white/20 text-white hover:bg-white/5">
            <Link href="/public-file-help">Need Help?</Link>
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-white">Station Information</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "Call Sign", value: "WCCG" },
            { label: "Frequency", value: "104.5 FM" },
            { label: "Facility ID", value: "55226" },
            { label: "Licensee", value: "Carson Communications" },
            { label: "City of License", value: "Fayetteville, NC" },
            { label: "Service Area", value: "Cumberland County & surrounding areas" },
          ].map((item) => (
            <div key={item.label} className="flex justify-between items-center py-2 border-b border-white/[0.04]">
              <span className="text-sm text-white/40">{item.label}</span>
              <span className="text-sm text-white font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
