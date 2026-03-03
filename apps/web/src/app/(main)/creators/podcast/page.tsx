import { Podcast, Mic, Headphones, Upload, BarChart3, Share2, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Podcast & Launch | WCCG 104.5 FM",
  description: "Launch your podcast on the WCCG 104.5 FM platform — hosting, distribution, and promotion support.",
};

const steps = [
  {
    step: "1",
    icon: Mic,
    title: "Apply",
    description: "Submit your podcast concept through the Creator Program. Include your show idea, target audience, and sample content.",
  },
  {
    step: "2",
    icon: Headphones,
    title: "Onboard",
    description: "Our team reviews your submission and works with you on show format, branding, and scheduling.",
  },
  {
    step: "3",
    icon: Upload,
    title: "Produce & Upload",
    description: "Record your episodes and upload them through the mY1045 creator dashboard. We handle hosting and distribution.",
  },
  {
    step: "4",
    icon: Share2,
    title: "Promote & Grow",
    description: "We promote your podcast across our platforms — on-air mentions, social media, and featured placement in the mY1045 app.",
  },
];

const features = [
  "Unlimited episode hosting on the mY1045 platform",
  "Distribution to major podcast directories (Apple, Spotify, Google)",
  "On-air promotion across WCCG's 6 channels",
  "Social media cross-promotion to our audience",
  "Episode analytics and listener demographics",
  "Featured placement in the mY1045 app",
  "Access to WCCG studio space (availability permitting)",
  "Collaboration opportunities with WCCG hosts and DJs",
];

export default function PodcastPage() {
  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-purple-950/50 to-gray-900 border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7401df] to-[#3b82f6] shadow-xl">
              <Podcast className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Podcast & Launch</h1>
              <p className="text-muted-foreground mt-1">Start your podcast with WCCG&apos;s platform and reach</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Launch Your Voice</h2>
        <p className="text-muted-foreground leading-relaxed">
          The WCCG Podcast Program gives local voices a platform to be heard. Whether you&apos;re launching your first show or
          looking for a better home for your existing podcast, we provide the hosting, distribution, and promotion you need to
          reach a wider audience.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">How It Works</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((item) => (
            <div key={item.step} className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7401df] text-white text-sm font-bold">
                  {item.step}
                </span>
                <item.icon className="h-5 w-5 text-muted-foreground/70" />
              </div>
              <h3 className="font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* What You Get */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">What You Get</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-[#74ddc7] mt-0.5 shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Content Guidelines */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Content Guidelines</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Podcasts on the WCCG platform must align with our community values. Content should be original, engaging, and appropriate
          for a general audience. We welcome shows covering music, culture, community, sports, business, faith, lifestyle, and education.
          Explicit content must be clearly labeled. WCCG reserves the right to review and approve all content before publication.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild className="rounded-full bg-[#7401df] text-white font-bold hover:bg-[#5c00b3] px-6">
          <Link href="/creators">
            Apply to Creator Program
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full border-white/20 text-foreground hover:bg-white/5">
          <Link href="/contact">Have Questions?</Link>
        </Button>
      </div>
    </div>
  );
}
