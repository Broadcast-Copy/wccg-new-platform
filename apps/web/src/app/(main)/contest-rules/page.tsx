import { Trophy, AlertCircle } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Contest Rules | WCCG 104.5 FM",
  description: "Official contest rules and regulations for WCCG 104.5 FM contests, sweepstakes, and giveaways.",
};

const rules = [
  {
    title: "Eligibility",
    content: "Contests are open to legal residents of North Carolina, aged 18 or older, unless otherwise specified. Employees of Carson Communications, WCCG 104.5 FM, their affiliates, subsidiaries, advertising and promotion agencies, and immediate family members are not eligible to participate.",
  },
  {
    title: "How to Enter",
    content: "Entry methods vary by contest and will be specified in the individual contest announcement. Common entry methods include calling the studio, online entry through the mY1045 platform, texting a keyword, or in-person entry at designated events. No purchase is necessary to enter or win.",
  },
  {
    title: "Winner Selection",
    content: "Winners are selected as specified in individual contest rules. For call-in contests, the designated caller (e.g., 'caller number 10') will be the winner. For sweepstakes, winners are chosen by random drawing. All decisions by WCCG 104.5 FM are final.",
  },
  {
    title: "Prizes",
    content: "Prizes are as described in each contest announcement. Prize values are approximate retail values. Prizes are non-transferable and cannot be substituted or redeemed for cash, except at the sole discretion of WCCG 104.5 FM. Winners are responsible for all applicable taxes on prizes.",
  },
  {
    title: "Winner Notification",
    content: "Winners will be notified by the method specified in each contest's rules (phone, email, or on-air announcement). Winners must claim prizes within 30 days of notification unless otherwise specified. Unclaimed prizes will be forfeited.",
  },
  {
    title: "One Entry Per Person",
    content: "Unless otherwise stated, each person may enter a contest only once per day. Multiple entries from the same person, email address, phone number, or household may result in disqualification.",
  },
  {
    title: "Identification Required",
    content: "Prize winners may be required to present valid photo identification and sign an affidavit of eligibility, liability release, and (where legal) publicity release before receiving prizes.",
  },
  {
    title: "Limitation of Liability",
    content: "By entering a contest, participants agree to release Carson Communications, WCCG 104.5 FM, and their respective officers, directors, employees, and agents from any and all liability for injuries, losses, or damages of any kind arising from the contest or the use of any prize.",
  },
  {
    title: "General Conditions",
    content: "WCCG 104.5 FM reserves the right to cancel, suspend, or modify any contest if fraud or technical failures compromise the integrity of the contest. Any attempt to tamper with the entry process or violate these rules will result in disqualification.",
  },
  {
    title: "Governing Law",
    content: "All contests are governed by the laws of the State of North Carolina and applicable federal law. Any disputes will be resolved in Cumberland County, North Carolina.",
  },
];

export default function ContestRulesPage() {
  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-amber-950/50 to-gray-900 border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-xl">
              <Trophy className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Official Contest Rules</h1>
              <p className="text-white/50 mt-1">General rules for all WCCG 104.5 FM contests</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-200/70">
          These are the general contest rules for WCCG 104.5 FM. Individual contests may have additional specific rules
          that supplement or modify these general rules. Always refer to the specific contest announcement for complete details.
        </p>
      </div>

      <div className="space-y-4">
        {rules.map((rule, index) => (
          <div key={rule.title} className="rounded-xl border border-white/[0.06] bg-[#141420] p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#74ddc7]/10 text-[#74ddc7] text-xs font-bold">
                {index + 1}
              </span>
              <div>
                <h3 className="font-semibold text-white mb-1">{rule.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{rule.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 text-center space-y-2">
        <p className="text-white/50 text-sm">
          Questions about contest rules?{" "}
          <Link href="/contact" className="text-[#74ddc7] hover:underline">Contact us</Link>
          {" "}or call (910) 484-4932.
        </p>
        <p className="text-xs text-white/25">
          Last updated: January 2026
        </p>
      </div>
    </div>
  );
}
