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
  CheckCircle2,
  Gamepad2,
  PlusCircle,
  Building2,
  Users2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
const services = [
  {
    icon: Mic,
    title: "Podcast & Launch Services",
    description:
      "High-quality podcast and interview production transforms your ideas into broadcast-ready content for listeners across multiple platforms.",
    href: "/creators/podcast",
    cta: "Podcast & Launch",
    color: "from-[#7401df] to-[#4c1d95]",
  },
  {
    icon: Radio,
    title: "Live & On-Site Services",
    description:
      "Professional live and on-site broadcast services capture your events, interviews, and productions and deliver them directly to radio and digital audiences in real time.",
    href: "/studio/live-on-site",
    cta: "Schedule On-Site",
    color: "from-[#dc2626] to-[#b91c1c]",
  },
  {
    icon: Palette,
    title: "Social Content Creation",
    description:
      "Creative social media production delivers polished, platform-ready content that enhances your brand and drives engagement.",
    href: "/studio/social-content",
    cta: "Content Creation",
    color: "from-[#ec4899] to-[#be185d]",
  },
  {
    icon: Video,
    title: "Video Production",
    description:
      "Full-service video production handles everything from shooting to post-production to create compelling broadcast quality (4K) visual stories and engaging content ready for any platform.",
    href: "/studio/video-production",
    cta: "Schedule Video Production",
    color: "from-[#f59e0b] to-[#d97706]",
  },
  {
    icon: Headphones,
    title: "Voice Over & Narration",
    description:
      "Expert voice narration provides smooth, engaging delivery for video projects, commercials, and complete audiobook recordings — turn your written content into immersive audio experiences.",
    href: "/studio/voice-over",
    cta: "Schedule Narration",
    color: "from-[#3b82f6] to-[#1d4ed8]",
  },
];

const studios = [
  {
    icon: MonitorPlay,
    name: "Production Studio",
    features: [
      "Virtual Audio Control",
      "Dual Monitor Setup",
      "1 HD Webcam",
      "Adobe Software",
      "OBS Podcast Software",
      "1 Host Broadcast Mic (with host audio dynamics)",
      "2 Shure Guest Mics (Expandable)",
      "1 Auxiliary Input (For Instruments, DJ, or Expandable Mixer)",
      "2 Yamaha HS4 Monitors (for professional mixing)",
      "Standing Desk for Standing or Seated Podcasts",
      "Multi-Telephone Inputs (Hardline + Bluetooth)",
      "65in Branding Monitor",
    ],
    color: "from-[#7401df] to-[#4c1d95]",
  },
  {
    icon: Radio,
    name: "On-Air Studio",
    features: [
      "Virtual Audio Control",
      "Quad Monitor Setup",
      "1 HD Webcam",
      "Adobe Software",
      "DJB Radio Broadcast Software",
      "OBS Podcast Software",
      "1 Host Broadcast Mic (with host audio dynamics)",
      "2 Shure Guest Mics (Expandable)",
      "1 Auxiliary Input (For Instruments, DJ, or Expandable Mixer)",
      "2 Yamaha HS4 Monitors (for professional mixing)",
      "Standing Desk for Standing or Seated Podcasts",
      "Multi-Telephone Inputs (Hardline + Bluetooth)",
      "65in Branding Monitor",
    ],
    color: "from-[#74ddc7] to-[#0d9488]",
  },
  {
    icon: Gamepad2,
    name: "Gaming / Reaction Studio",
    features: [
      "Tri Monitor Setup (w/ 2 Curved Gaming Monitors)",
      "1 HD Webcam",
      "Adobe Software",
      "HD Capture Card for Gaming (XBox, PS5, PC compatible)",
      "OBS Podcast Software",
      "1 Host Broadcast Mic",
      "Green Screen Chromakey Background",
      "Basic PC Speakers",
      "Standing Desk for Standing or Seated Podcasts",
      "Mini Expansion Studio w/ 65in Branding Monitor",
    ],
    color: "from-[#22c55e] to-[#15803d]",
  },
  {
    icon: PlusCircle,
    name: "Expansion Studio",
    note: "Expand your project into the On-Air Studio, Production Studio, or a dedicated Stand-Alone Studio — or combine all three for a full multi-studio experience.",
    requirement:
      "Expansion Studio must include The On-Air or Production Studio.",
    features: [
      "1 Host Broadcast Mic (with host audio dynamics)",
      "2 Shure Guest Mics (Expandable)",
      "1 Auxiliary Input (For Instruments, DJ, or Expandable Mixer)",
      "Standing Desk for Standing or Seated Podcasts (optional)",
    ],
    color: "from-[#f59e0b] to-[#d97706]",
  },
  {
    icon: Building2,
    name: "Public Facing Studio",
    sections: [
      {
        subtitle: "Window Podcast Studio",
        features: [
          "Broadcast Live from Downtown Fayetteville",
          "Audience can view from the window for true fan experience content",
          "Up to 4 Lavalier Mics",
          "75in Branding Monitor",
        ],
      },
      {
        subtitle: "Production Studio",
        features: [
          "Dual Monitor Setup",
          "Adobe Software",
          "OBS Podcast Software",
          "1 Host Broadcast Mic (with host audio dynamics)",
          "Standing Desk for Standing or Seated Podcasts",
          "Basic PC Speakers",
        ],
      },
    ],
    color: "from-[#ec4899] to-[#be185d]",
  },
  {
    icon: Users2,
    name: "Conference Studio",
    features: [
      "1 Host Broadcast Mic (with host audio dynamics)",
      "4 Shure Guest Mics (Expandable)",
      "1 Auxiliary Input (For Instruments, DJ, or Expandable Mixer)",
      "Large Conference Table",
      "55in Branding Monitor",
    ],
    color: "from-[#3b82f6] to-[#1d4ed8]",
  },
];

export const metadata = {
  title: "Studio & Production Services | WCCG 104.5 FM",
  description:
    "Professional studio and production services from Carson Communications — podcast production, video, live broadcasts, social content, voice over, and more.",
};

export default function StudioPage() {
  return (
    <div className="space-y-10">
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
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-2">
                Studio &amp; Production Services
              </h1>
              <p className="text-base text-muted-foreground max-w-2xl">
                Empowers creators with a full suite of studio production
                services that deliver professional quality from concept to
                completion.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Service Media Solutions */}
      <section className="space-y-5">
        <h2 className="text-xl font-bold text-foreground">
          Full-Service Media Solutions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.title}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:border-input hover:shadow-lg hover:shadow-black/20"
            >
              <div className="flex items-start gap-4 flex-1">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${service.color}`}
                >
                  <service.icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground group-hover:text-[#74ddc7] transition-colors">
                    {service.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {service.description}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <Button
                  size="sm"
                  asChild
                  className={`w-full rounded-lg bg-gradient-to-r ${service.color} text-white font-semibold hover:opacity-90`}
                >
                  <Link href={service.href}>
                    {service.cta}
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
              <div
                className={`pointer-events-none absolute -inset-1 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-[0.03] rounded-xl transition-opacity`}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Professional Studios */}
      <section className="space-y-5">
        <h2 className="text-xl font-bold text-foreground">
          Professional Studios for Every Project
        </h2>
        <div className="grid gap-5 lg:grid-cols-2">
          {studios.map((studio) => (
            <div
              key={studio.name}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all hover:border-input"
            >
              {/* Studio Header */}
              <div className="flex items-center gap-4 mb-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${studio.color}`}
                >
                  <studio.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-foreground">{studio.name}</h3>
              </div>

              {/* Note / Description */}
              {"note" in studio && studio.note && (
                <p className="text-sm text-muted-foreground mb-3 italic">
                  {studio.note}
                </p>
              )}

              {/* Requirement badge */}
              {"requirement" in studio && studio.requirement && (
                <div className="mb-3 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/20 px-3 py-2">
                  <p className="text-xs font-semibold text-[#f59e0b]">
                    {studio.requirement}
                  </p>
                </div>
              )}

              {/* Sections (for Public Facing Studio) */}
              {"sections" in studio && studio.sections ? (
                <div className="space-y-4">
                  {studio.sections.map(
                    (section: { subtitle: string; features: string[] }) => (
                      <div key={section.subtitle}>
                        <h4 className="text-sm font-semibold text-[#74ddc7] mb-2">
                          {section.subtitle}
                        </h4>
                        <ul className="space-y-1.5">
                          {section.features.map((feature: string) => (
                            <li
                              key={feature}
                              className="flex items-start gap-2 text-sm text-foreground/60"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#74ddc7]" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  )}
                </div>
              ) : (
                /* Standard features list */
                <ul className="space-y-1.5">
                  {"features" in studio &&
                    (studio.features as string[]).map((feature: string) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm text-foreground/60"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#74ddc7]" />
                        {feature}
                      </li>
                    ))}
                </ul>
              )}

              {/* Book CTA */}
              <div className="mt-5 pt-4 border-t border-border">
                <Button
                  size="sm"
                  asChild
                  className={`w-full rounded-lg bg-gradient-to-r ${studio.color} text-white font-semibold hover:opacity-90`}
                >
                  <Link href="/studio/booking">
                    Book The {studio.name}
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>

              <div
                className={`pointer-events-none absolute -inset-1 bg-gradient-to-br ${studio.color} opacity-0 group-hover:opacity-[0.03] rounded-xl transition-opacity`}
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
              <Link href="/studio/booking">
                Book a Studio
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="rounded-full border-white/30 text-white hover:bg-foreground/10 px-6"
            >
              <Link href="/creators">For Creators</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Info footer */}
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Carson Communications Studio · 115 Gillespie Street, Fayetteville, NC
          28301
          <br />
          (910) 484-4932 · info@wccg1045fm.com
        </p>
      </div>
    </div>
  );
}
