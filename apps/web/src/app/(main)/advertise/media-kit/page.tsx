import { FileText, Radio, Users, MapPin, BarChart3, Headphones } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Media Kit | WCCG 104.5 FM",
  description: "WCCG 104.5 FM media kit — audience demographics, coverage area, advertising rates, and partnership opportunities.",
};

const stats = [
  { value: "104.5", label: "FM Frequency", icon: Radio },
  { value: "6", label: "Digital Streams", icon: Headphones },
  { value: "7", label: "Counties Reached", icon: MapPin },
  { value: "24/7", label: "Broadcasting", icon: BarChart3 },
];

const demographics = [
  { label: "Primary Age", value: "18-49" },
  { label: "Gender Split", value: "52% Female / 48% Male" },
  { label: "Format", value: "Urban Contemporary (Hip Hop & R&B)" },
  { label: "Market", value: "Fayetteville, NC (Arbitron Market #131)" },
  { label: "Coverage", value: "Cumberland, Hoke, Robeson, Harnett, Sampson, Bladen, Lee Counties" },
  { label: "Signal", value: "Class C3, covering 50+ mile radius" },
];

const adProducts = [
  {
    title: "On-Air Spots",
    description: "Traditional radio commercials (:15, :30, :60 sec) aired during your target daypart.",
    features: ["Morning Drive (6-10am)", "Midday (10am-3pm)", "Afternoon Drive (3-7pm)", "Evening (7pm-Midnight)", "Overnight (Midnight-6am)"],
  },
  {
    title: "Live Reads & Endorsements",
    description: "DJ-delivered reads and personality endorsements for maximum listener trust and engagement.",
    features: ["Personalized by on-air talent", "Organic feel, high recall", "Available on all shows"],
  },
  {
    title: "Digital Advertising",
    description: "Banner ads, pre-roll audio, and sponsored content across our digital platforms.",
    features: ["Website banners", "Stream pre-roll audio", "Newsletter sponsorship", "Social media promotion"],
  },
  {
    title: "Event Sponsorship",
    description: "Title or presenting sponsorships for WCCG concerts, community events, and promotions.",
    features: ["On-site branding", "On-air mentions", "Social media coverage", "Community visibility"],
  },
  {
    title: "Community Directory",
    description: "Featured listing in our 7-county community business directory on mY1045.",
    features: ["Premium listing placement", "Business profile page", "Category sponsorship", "Featured badge"],
  },
];

export default function MediaKitPage() {
  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-red-950/50 to-gray-900 border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 shadow-xl">
              <FileText className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">WCCG Media Kit</h1>
              <p className="text-muted-foreground mt-1">Everything you need to partner with us</p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-5 text-center">
            <stat.icon className="h-6 w-6 text-[#74ddc7] mx-auto mb-2" />
            <div className="text-2xl font-black text-foreground">{stat.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Demographics */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[#74ddc7]" />
          <h2 className="text-xl font-semibold text-foreground">Audience Demographics</h2>
        </div>
        <div className="grid gap-2">
          {demographics.map((item) => (
            <div key={item.label} className="flex justify-between items-center py-2 border-b border-white/[0.04]">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className="text-sm text-foreground font-medium text-right">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Advertising Products */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Advertising Products</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {adProducts.map((product) => (
            <div key={product.title} className="rounded-xl border border-border bg-card p-5 space-y-3">
              <h3 className="font-semibold text-foreground">{product.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
              <ul className="space-y-1">
                {product.features.map((f, i) => (
                  <li key={i} className="text-xs text-muted-foreground/70 flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-[#74ddc7]" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#dc2626] to-[#b91c1c] p-8 text-center">
        <h2 className="text-2xl font-black text-white mb-2">Ready to Get Started?</h2>
        <p className="text-white/70 text-sm max-w-md mx-auto mb-4">
          Contact our advertising team to discuss a custom campaign that fits your goals and budget.
        </p>
        <div className="flex justify-center gap-3">
          <Button asChild className="rounded-full bg-white text-[#dc2626] font-bold hover:bg-white/90 px-6">
            <Link href="/advertise">Request a Proposal</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full border-white/30 text-white hover:bg-foreground/10 px-6">
            <Link href="/advertise/guidelines">View Ad Specs</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
