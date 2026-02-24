"use client";

import { useEffect, useState } from "react";
import { Hero } from "@/components/home/hero";
import { LiveNowRail } from "@/components/home/live-now-rail";
import { UpNextRail } from "@/components/home/up-next-rail";
import { EventCard } from "@/components/events/event-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppImage } from "@/components/ui/app-image";
import {
  ArrowRight,
  Radio,
  CalendarDays,
  Users2,
  ShoppingBag,
  Gift,
  Megaphone,
  Headphones,
  Music,
  Mic,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface EventItem {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  venue?: string;
  imageUrl?: string;
  isFree?: boolean;
}

const channels = [
  { id: "stream_wccg", name: "WCCG 104.5", tagline: "Hip Hop & R&B", color: "from-[#74ddc7] to-[#0d9488]", logo: "/images/logos/1045fm-logo.png" },
  { id: "stream_soul", name: "Soul 104.5", tagline: "Classic Soul & R&B", color: "from-[#7401df] to-[#4c1d95]", logo: "/images/logos/soul-1045-logo.png" },
  { id: "stream_hot", name: "Hot 104.5", tagline: "Trending Hits", color: "from-[#ef4444] to-[#b91c1c]", logo: "/images/logos/hot-1045-logo.png" },
  { id: "stream_vibe", name: "Vibe 104.5", tagline: "Lo-Fi & Chill", color: "from-[#3b82f6] to-[#1d4ed8]", logo: "/images/logos/the-vibe-logo.png" },
  { id: "stream_yard", name: "The Yard", tagline: "HBCU & Culture", color: "from-[#f59e0b] to-[#d97706]", logo: "/images/logos/yard-riddim-logo.png" },
  { id: "stream_mixsquad", name: "MixSquad", tagline: "DJ Mixes 24/7", color: "from-[#ec4899] to-[#be185d]", logo: "/images/logos/mix-squad-logo.png" },
];

const platformFeatures = [
  {
    href: "/channels",
    icon: Radio,
    title: "6 Live Channels",
    description: "Curated music, talk, and sports \u2014 streaming 24/7",
    color: "from-[#74ddc7] to-[#0d9488]",
  },
  {
    href: "/events",
    icon: CalendarDays,
    title: "Events & Tickets",
    description: "Local events, concerts, and community experiences",
    color: "from-[#f59e0b] to-[#d97706]",
  },
  {
    href: "/community",
    icon: Users2,
    title: "Community Directory",
    description: "73+ local businesses across 7 NC counties",
    color: "from-[#3b82f6] to-[#1d4ed8]",
  },
  {
    href: "/marketplace",
    icon: ShoppingBag,
    title: "Marketplace",
    description: "WCCG merch and local vendor products",
    color: "from-[#ec4899] to-[#be185d]",
  },
  {
    href: "/rewards",
    icon: Gift,
    title: "mY1045 Perks",
    description: "Earn points, unlock exclusive rewards",
    color: "from-[#7401df] to-[#4c1d95]",
  },
  {
    href: "/contact",
    icon: Megaphone,
    title: "Advertise & Promote",
    description: "Reach our audience with your brand",
    color: "from-[#ef4444] to-[#b91c1c]",
  },
];

function UpcomingEventsSection() {
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    apiClient<EventItem[]>("/events?limit=3")
      .then(setEvents)
      .catch(() => setEvents([]));
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">
          Upcoming Events
        </h2>
        <Button variant="ghost" size="sm" asChild className="text-white/40 hover:text-[#74ddc7]">
          <Link href="/events">
            View All
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
      {events.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard
              key={event.id}
              eventId={event.id}
              title={event.title}
              description={event.description}
              date={new Date(event.startDate).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
              venue={event.venue}
              ticketPrice={event.isFree ? "Free" : "Ticketed"}
            />
          ))}
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-xl border border-white/[0.06] bg-[#141420]">
          <p className="text-sm text-white/30">
            No upcoming events at the moment. Check back soon!
          </p>
        </div>
      )}
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="space-y-10">
      {/* Hero Ribbon */}
      <Hero />

      {/* Channel Carousel */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Now Streaming</h2>
            <div className="flex items-center gap-1.5 rounded-full bg-[#74ddc7]/10 border border-[#74ddc7]/20 px-2.5 py-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#74ddc7] opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#74ddc7]" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#74ddc7]">6 Live</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-white/40 hover:text-[#74ddc7]">
            <Link href="/channels">
              View All
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {channels.map((ch) => (
            <Link
              key={ch.id}
              href={`/channels/${ch.id}`}
              className="group flex-shrink-0 w-[160px] overflow-hidden rounded-xl border border-white/[0.06] bg-[#141420] transition-all hover:border-white/[0.12] hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5"
            >
              <div className={`h-24 bg-gradient-to-br ${ch.color} flex items-center justify-center relative overflow-hidden p-4`}>
                <AppImage
                  src={ch.logo}
                  alt={ch.name}
                  width={200}
                  height={200}
                  className="h-16 w-auto object-contain drop-shadow-lg"
                />
              </div>
              <div className="p-3">
                <h3 className="text-sm font-bold text-white truncate">{ch.name}</h3>
                <p className="text-xs text-white/40 mt-0.5">{ch.tagline}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Live Now Rail */}
      <LiveNowRail />

      {/* Up Next Rail */}
      <UpNextRail />

      {/* Platform Features */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white">
          Explore the Platform
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {platformFeatures.map((feature) => (
            <Link
              key={feature.href + feature.title}
              href={feature.href}
              className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#141420] p-5 transition-all hover:border-white/[0.12] hover:shadow-lg hover:shadow-black/20"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color}`}
                >
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-[#74ddc7] transition-colors">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-sm text-white/40">
                    {feature.description}
                  </p>
                </div>
              </div>
              <div className={`absolute -inset-1 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-[0.03] rounded-xl transition-opacity`} />
            </Link>
          ))}
        </div>
      </section>

      {/* Upcoming Events — client-side fetched */}
      <UpcomingEventsSection />

      {/* CTA Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#7401df] to-[#3b82f6] p-8 md:p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 40%)"
          }} />
        </div>
        <div className="relative z-10 flex flex-col items-center text-center gap-4">
          <h2 className="text-2xl md:text-3xl font-black text-white">
            Your Station. Your Community.
          </h2>
          <p className="max-w-md text-white/70 text-sm md:text-base">
            Join thousands of listeners earning rewards, attending exclusive events, and supporting local businesses through WCCG 104.5 FM.
          </p>
          <div className="flex gap-3 mt-2">
            <Button
              size="lg"
              asChild
              className="rounded-full bg-white text-[#7401df] font-bold hover:bg-white/90 shadow-lg px-6"
            >
              <Link href="/register">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="rounded-full border-white/30 text-white hover:bg-white/10 px-6"
            >
              <Link href="/channels">
                Start Listening
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
