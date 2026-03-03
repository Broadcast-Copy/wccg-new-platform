import {
  Clapperboard,
  Mic,
  Video,
  Music,
  Headphones,
  Radio,
  Palette,
  MonitorPlay,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const services = [
  {
    icon: Mic,
    title: "Podcast Production",
    description:
      "Professional podcast recording, editing, mixing, and publishing — from concept to distribution on all major platforms.",
    color: "from-[#7401df] to-[#4c1d95]",
  },
  {
    icon: Video,
    title: "Video Production",
    description:
      "Full-service video production including music videos, interviews, live event coverage, and social media content.",
    color: "from-[#dc2626] to-[#b91c1c]",
  },
  {
    icon: Music,
    title: "Music Recording & Mixing",
    description:
      "State-of-the-art music recording, mixing, and mastering services for artists and producers at every level.",
    color: "from-[#22c55e] to-[#15803d]",
  },
  {
    icon: Radio,
    title: "Radio Commercial Production",
    description:
      "Custom radio spots, jingles, and commercial voiceovers crafted to captivate your target audience on air.",
    color: "from-[#f59e0b] to-[#d97706]",
  },
  {
    icon: Headphones,
    title: "Audio Engineering",
    description:
      "Expert audio engineering, sound design, and post-production for broadcast, streaming, and digital media projects.",
    color: "from-[#3b82f6] to-[#1d4ed8]",
  },
  {
    icon: Palette,
    title: "Graphic Design & Branding",
    description:
      "Album art, show branding, social media graphics, and visual identity packages for artists and businesses.",
    color: "from-[#ec4899] to-[#be185d]",
  },
  {
    icon: MonitorPlay,
    title: "Live Streaming",
    description:
      "Professional live stream production for concerts, events, church services, and special broadcasts.",
    color: "from-[#74ddc7] to-[#0d9488]",
  },
];

export const metadata = {
  title: "Studio & Production Services | WCCG 104.5 FM",
  description:
    "Professional studio and production services from Carson Communications — podcast production, video, music recording, radio commercials, and more.",
};

export default function StudioPage() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-purple-950/50 to-gray-900 border border-border/30">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, rgba(116,1,223,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 30%, rgba(116,221,199,0.2) 0%, transparent 50%)`,
            }}
          />
        </div>
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7401df] to-[#4c1d95] shadow-xl shadow-purple-500/20">
              <Clapperboard className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
                Studio &amp; Production Services
              </h1>
              <p className="text-base text-gray-400 max-w-2xl">
                Empowers creators with a full suite of studio production services
                that deliver professional quality from concept to completion.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white">Our Services</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.title}
              className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#141420] p-5 transition-all hover:border-white/[0.12] hover:shadow-lg hover:shadow-black/20"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${service.color}`}
                >
                  <service.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-[#74ddc7] transition-colors">
                    {service.title}
                  </h3>
                  <p className="mt-1 text-sm text-white/40">
                    {service.description}
                  </p>
                </div>
              </div>
              <div
                className={`absolute -inset-1 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-[0.03] rounded-xl transition-opacity`}
              />
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#7401df] to-[#3b82f6] p-8 md:p-12">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 40%)",
            }}
          />
        </div>
        <div className="relative z-10 flex flex-col items-center text-center gap-4">
          <h2 className="text-2xl md:text-3xl font-black text-white">
            Ready to Create Something Amazing?
          </h2>
          <p className="max-w-md text-white/70 text-sm md:text-base">
            Contact our production team to discuss your project. From indie
            artists to established brands, we bring your vision to life.
          </p>
          <div className="flex gap-3 mt-2">
            <Button
              size="lg"
              asChild
              className="rounded-full bg-white text-[#7401df] font-bold hover:bg-white/90 shadow-lg px-6"
            >
              <Link href="/contact">
                Get a Quote
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="rounded-full border-white/30 text-white hover:bg-white/10 px-6"
            >
              <Link href="/creators">For Creators</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Info footer */}
      <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 text-center">
        <p className="text-sm text-white/40">
          Carson Communications Studio · 115 Gillespie Street, Fayetteville, NC 28301
          <br />
          (910) 484-4932 · info@wccg1045fm.com
        </p>
      </div>
    </div>
  );
}
