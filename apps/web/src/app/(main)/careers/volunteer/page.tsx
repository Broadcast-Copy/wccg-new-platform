import { Heart, Users, Calendar, MapPin, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Volunteer | WCCG 104.5 FM",
  description: "Volunteer opportunities at WCCG 104.5 FM — give back to your community through radio and events.",
};

const opportunities = [
  {
    title: "Event Support",
    description: "Help with setup, coordination, and execution at WCCG concerts, festivals, and community events.",
  },
  {
    title: "Community Outreach",
    description: "Represent WCCG at local fairs, school events, and community gatherings.",
  },
  {
    title: "Fundraising & Charity Drives",
    description: "Support our charitable initiatives including food drives, toy drives, and community benefit events.",
  },
  {
    title: "Street Team",
    description: "Distribute promotional materials, engage with listeners in the community, and represent the WCCG brand.",
  },
  {
    title: "Digital Content",
    description: "Assist with photography, video content, and social media coverage at live events.",
  },
  {
    title: "Studio Support",
    description: "Help with general studio operations, guest coordination, and administrative tasks.",
  },
];

export default function VolunteerPage() {
  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-pink-950/50 to-gray-900 border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-xl">
              <Heart className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Volunteer with WCCG</h1>
              <p className="text-muted-foreground mt-1">Make an impact in your community</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Why Volunteer?</h2>
        <p className="text-muted-foreground leading-relaxed">
          WCCG 104.5 FM is more than a radio station — we&apos;re a community hub. Our volunteers play a vital role
          in connecting Fayetteville and surrounding communities through music, events, and outreach programs.
          Whether you can give a few hours or a few days, your contribution makes a difference.
        </p>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-[#74ddc7]" />
            All ages welcome (16+ for most roles)
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-[#74ddc7]" />
            Flexible scheduling
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-[#74ddc7]" />
            Fayetteville area events
          </div>
        </div>
      </div>

      {/* Opportunities */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Volunteer Opportunities</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {opportunities.map((opp) => (
            <div key={opp.title} className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold text-foreground mb-2">{opp.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{opp.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Volunteer Perks</h2>
        <ul className="space-y-2">
          {[
            "WCCG volunteer T-shirt and lanyard",
            "Free admission to WCCG events",
            "mY1045 Perks points for volunteer hours",
            "Community service hours documentation",
            "Networking with media professionals",
            "Letters of recommendation (after 50+ hours)",
          ].map((perk, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-[#74ddc7] shrink-0" />
              {perk}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild className="rounded-full bg-[#74ddc7] text-[#0a0a0f] font-bold hover:bg-[#5fc4b0] px-6">
          <Link href="/contact">
            Sign Up to Volunteer
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full border-white/20 text-foreground hover:bg-white/5">
          <Link href="/careers">View Career Openings</Link>
        </Button>
      </div>
    </div>
  );
}
