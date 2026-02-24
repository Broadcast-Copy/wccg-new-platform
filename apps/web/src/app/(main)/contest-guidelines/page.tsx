import { Trophy, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Contest Guidelines | WCCG 104.5 FM",
  description: "Guidelines for participating in WCCG 104.5 FM contests, giveaways, and promotions.",
};

const dos = [
  "Listen to WCCG 104.5 FM or our digital streams for contest announcements",
  "Follow contest-specific instructions provided by the DJ or on-air personality",
  "Have valid photo ID ready when claiming prizes",
  "Claim prizes within the specified timeframe (usually 30 days)",
  "Be respectful to station staff and other participants",
  "Follow all applicable local, state, and federal laws",
  "Check the mY1045 platform for online contest opportunities",
  "Read the official contest rules before entering",
];

const donts = [
  "Use automated systems, bots, or speed-dial to enter call-in contests",
  "Enter the same contest more than once per day (unless stated otherwise)",
  "Misrepresent your identity or eligibility",
  "Harass station staff, DJs, or other contestants",
  "Attempt to trade, sell, or transfer prizes without authorization",
  "Violate any specific rules outlined in individual contest announcements",
  "Use profane or offensive language when calling in",
];

export default function ContestGuidelinesPage() {
  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-amber-950/50 to-gray-900 border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-xl">
              <Trophy className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Contest Guidelines</h1>
              <p className="text-white/50 mt-1">How to participate in WCCG 104.5 FM contests</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-white">Getting Started</h2>
        <p className="text-white/50 leading-relaxed">
          WCCG 104.5 FM regularly hosts contests, giveaways, and promotions for our listeners.
          Follow these guidelines to participate fairly and maximize your chances of winning.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Do's */}
        <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 space-y-3">
          <h2 className="text-xl font-semibold text-[#74ddc7] flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Do&apos;s
          </h2>
          <ul className="space-y-2">
            {dos.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white/50">
                <CheckCircle2 className="h-4 w-4 text-[#74ddc7] mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Don'ts */}
        <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 space-y-3">
          <h2 className="text-xl font-semibold text-red-400 flex items-center gap-2">
            <XCircle className="h-5 w-5" />
            Don&apos;ts
          </h2>
          <ul className="space-y-2">
            {donts.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white/50">
                <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-white">Types of Contests</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { title: "Call-In", description: "Listen for the cue to call, then dial (910) 484-4932. Designated caller wins!" },
            { title: "Online", description: "Enter through the mY1045 platform or our social media channels." },
            { title: "In-Person", description: "Visit WCCG events and promotions for on-site contest opportunities." },
          ].map((type) => (
            <div key={type.title} className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-4">
              <h3 className="font-semibold text-white mb-1">{type.title}</h3>
              <p className="text-xs text-white/40">{type.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild className="rounded-full bg-[#74ddc7] text-[#0a0a0f] font-bold hover:bg-[#5fc4b0]">
          <Link href="/contest-rules">Official Contest Rules</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full border-white/20 text-white hover:bg-white/5">
          <Link href="/contact">Contact Us</Link>
        </Button>
      </div>
    </div>
  );
}
