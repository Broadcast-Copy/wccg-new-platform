import { Lightbulb, Wifi, Radio, Smartphone, BarChart3, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Innovation Center | WCCG 104.5 FM",
  description: "WCCG 104.5 FM Innovation Center — exploring the future of digital radio, streaming technology, and community engagement.",
};

const innovations = [
  {
    icon: Radio,
    title: "Multi-Channel Streaming",
    description: "Six curated digital streams broadcasting 24/7, from Hip Hop & R&B to Gospel, Lo-Fi, and DJ Mixes. Each channel delivers a unique listening experience powered by our proprietary streaming infrastructure.",
  },
  {
    icon: Smartphone,
    title: "mY1045 Digital Platform",
    description: "Our all-in-one digital platform connects listeners with live radio, events, community businesses, and exclusive rewards. Designed mobile-first for the modern listener.",
  },
  {
    icon: BarChart3,
    title: "Listener Analytics",
    description: "Real-time engagement tracking helps our DJs and hosts understand what resonates with our audience, enabling data-driven programming decisions across all channels.",
  },
  {
    icon: Wifi,
    title: "HD & Digital Broadcasting",
    description: "Combining traditional FM broadcast with cutting-edge digital streaming technology to reach audiences locally and globally without missing a beat.",
  },
  {
    icon: Zap,
    title: "Creator Tools",
    description: "Empowering local artists, podcasters, and content creators with tools to submit music, launch podcasts, and build their brand through the WCCG ecosystem.",
  },
  {
    icon: Lightbulb,
    title: "Community Integration",
    description: "Our digital directory connects listeners with 73+ local businesses across 7 NC counties, strengthening the economic fabric of the communities we serve.",
  },
];

export default function InnovationCenterPage() {
  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-purple-950/50 to-gray-900 border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-xl">
              <Lightbulb className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Innovation Center</h1>
              <p className="text-white/50 mt-1">The future of community radio, powered by technology</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-white mb-3">Our Vision</h2>
        <p className="text-white/50 leading-relaxed">
          At WCCG 104.5 FM, we believe community radio should evolve with the times while staying true to its roots.
          Our Innovation Center showcases the technology and initiatives driving the next generation of broadcast media
          in the Fayetteville-Cumberland County area and beyond.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {innovations.map((item) => (
          <div
            key={item.title}
            className="group rounded-xl border border-white/[0.06] bg-[#141420] p-5 transition-all hover:border-white/[0.12] hover:shadow-lg hover:shadow-black/20"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#7401df] to-[#3b82f6] mb-4">
              <item.icon className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold text-white mb-2">{item.title}</h3>
            <p className="text-sm text-white/40 leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 text-center space-y-3">
        <h2 className="text-lg font-semibold text-white">Have an idea?</h2>
        <p className="text-sm text-white/50 max-w-md mx-auto">
          We&apos;re always looking for new ways to serve our community. If you have an idea for how WCCG can innovate, we want to hear from you.
        </p>
        <Button asChild className="rounded-full bg-[#74ddc7] text-[#0a0a0f] font-bold hover:bg-[#5fc4b0]">
          <Link href="/contact">Share Your Idea</Link>
        </Button>
      </div>
    </div>
  );
}
