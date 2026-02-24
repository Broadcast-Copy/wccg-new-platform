import { Users, FileText, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "EEO | WCCG 104.5 FM",
  description: "Equal Employment Opportunity information and reports for WCCG 104.5 FM, Carson Communications.",
};

export default function EEOPage() {
  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-blue-950/50 to-gray-900 border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl">
              <Users className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Equal Employment Opportunity</h1>
              <p className="text-white/50 mt-1">Our commitment to equal opportunity employment</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-white">EEO Policy Statement</h2>
        <p className="text-white/50 leading-relaxed">
          Carson Communications / WCCG 104.5 FM is an Equal Opportunity Employer. We are committed to providing equal employment
          opportunities to all qualified individuals regardless of race, color, religion, sex, national origin, age, disability,
          sexual orientation, gender identity, veteran status, or any other protected class under applicable law.
        </p>
        <p className="text-white/50 leading-relaxed">
          Our EEO policy applies to all aspects of employment, including recruitment, hiring, training, promotion, compensation,
          benefits, transfers, and termination.
        </p>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-white">EEO Public File Report</h2>
        <p className="text-white/50 leading-relaxed">
          In accordance with FCC regulations, WCCG 104.5 FM files an annual EEO Public File Report that details our station&apos;s
          efforts to ensure equal employment opportunity. This report is available in our public inspection file.
        </p>
        <p className="text-white/50 leading-relaxed">
          The report includes information about:
        </p>
        <ul className="list-disc list-inside text-white/50 space-y-1 text-sm pl-2">
          <li>Job vacancies filled during the reporting period</li>
          <li>Recruitment sources used for each vacancy</li>
          <li>Number of interviewees from each source</li>
          <li>Outreach initiatives and activities conducted</li>
          <li>Community organizations contacted for recruitment</li>
        </ul>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-white">View Our EEO Reports</h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild className="rounded-full bg-[#74ddc7] text-[#0a0a0f] font-bold hover:bg-[#5fc4b0]">
            <a href="https://publicfiles.fcc.gov/fm-profile/wccg" target="_blank" rel="noopener noreferrer">
              View EEO Report on FCC.gov
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="outline" className="rounded-full border-white/20 text-white hover:bg-white/5">
            <Link href="/careers">Current Openings</Link>
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 text-center">
        <p className="text-white/50 text-sm">
          For questions about our EEO policies, contact us at{" "}
          <a href="mailto:info@wccg1045fm.com" className="text-[#74ddc7] hover:underline">info@wccg1045fm.com</a>
          {" "}or call (910) 484-4932.
        </p>
      </div>
    </div>
  );
}
