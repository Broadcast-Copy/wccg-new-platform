"use client";

import { useEffect, useState } from "react";
import { Hero } from "@/components/home/hero";
import { LiveNowRail } from "@/components/home/live-now-rail";
import { UpNextRail } from "@/components/home/up-next-rail";
import { WeatherWidget } from "@/components/weather/weather-widget";
import { EventCard } from "@/components/events/event-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ArrowDownRight,
  Radio,
  CalendarDays,
  Users2,
  ShoppingBag,
  Gift,
  Trophy,
  Mail,
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

const platformFeatures = [
  {
    href: "/channels",
    icon: Radio,
    title: "6 Live Channels",
    description: "Curated music, talk, and sports — streaming 24/7",
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
    description: "118+ local services across 9 NC counties",
    color: "from-[#3b82f6] to-[#1d4ed8]",
  },
  {
    href: "/contests",
    icon: Trophy,
    title: "Contests & Giveaways",
    description: "Win cash, tickets, merch, and exclusive prizes",
    color: "from-[#dc2626] to-[#b91c1c]",
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

      {/* Platform Headline */}
      <section className="text-center py-4">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
          One Platform. Endless Possibilities.
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-sm sm:text-base text-white/50 leading-relaxed">
          Your hub for tickets, streaming, weather &amp; news updates, community discovery, podcast booking, dynamic advertising, and digital media services, all in one place.
        </p>
      </section>

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

      {/* Live Now Rail */}
      <LiveNowRail />

      {/* Up Next Rail */}
      <UpNextRail />

      {/* Weather + Contests side-by-side */}
      <section className="grid gap-4 lg:grid-cols-3">
        {/* Weather Widget */}
        <div className="lg:col-span-1">
          <h2 className="text-xl font-bold text-white mb-4">Local Weather</h2>
          <WeatherWidget />
        </div>

        {/* Active Contests teaser */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Contests &amp; Giveaways</h2>
              <div className="flex items-center gap-1.5 rounded-full bg-[#dc2626]/10 border border-[#dc2626]/20 px-2.5 py-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#dc2626] opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#dc2626]" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#dc2626]">Live</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-white/40 hover:text-[#74ddc7]">
              <Link href="/contests">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Contest card 1 */}
            <Link
              href="/contests"
              className="group rounded-xl border border-white/[0.06] bg-[#141420] overflow-hidden transition-all hover:border-white/[0.12] hover:-translate-y-0.5"
            >
              <div className="h-2 bg-gradient-to-r from-[#7401df] to-[#3b82f6]" />
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#22c55e] px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                    <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" /></span>
                    Live
                  </span>
                  <span className="text-xs text-white/30">Sweepstakes</span>
                </div>
                <h3 className="font-bold text-white group-hover:text-[#74ddc7] transition-colors">mY1045 Cash Drop</h3>
                <p className="text-sm text-white/40 line-clamp-2">Download the mY1045 app and check in daily for your chance to win $1,045 cash!</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black text-[#74ddc7]">$1,045</span>
                  <span className="text-xs text-white/30">15,320 entries</span>
                </div>
              </div>
            </Link>

            {/* Contest card 2 */}
            <Link
              href="/contests"
              className="group rounded-xl border border-white/[0.06] bg-[#141420] overflow-hidden transition-all hover:border-white/[0.12] hover:-translate-y-0.5"
            >
              <div className="h-2 bg-gradient-to-r from-[#ec4899] to-[#be185d]" />
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#22c55e] px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                    <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" /></span>
                    Live
                  </span>
                  <span className="text-xs text-white/30">Giveaway</span>
                </div>
                <h3 className="font-bold text-white group-hover:text-[#74ddc7] transition-colors">Sneaker Sunday Giveaway</h3>
                <p className="text-sm text-white/40 line-clamp-2">Text KICKS to 104-5 every Sunday for your chance to win limited edition sneakers!</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black text-[#74ddc7]">$250</span>
                  <span className="text-xs text-white/30">4,210 entries</span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Upcoming Events — client-side fetched */}
      <UpcomingEventsSection />

      {/* Email Subscription CTA — matches wccg1045fm.com red banner */}
      <section className="relative overflow-hidden rounded-2xl bg-[#dc2626] p-8 md:p-12">
        <div className="absolute inset-0 opacity-[0.08]">
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle at 30% 40%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(0,0,0,0.2) 0%, transparent 40%)"
          }} />
        </div>
        <div className="relative z-10 flex flex-col items-center text-center gap-5 max-w-2xl mx-auto">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
            <Mail className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">
            Enhance Your Listening Experience Without Sacrificing Quality
          </h2>
          <p className="text-white/70 text-sm md:text-base max-w-lg">
            Get exclusive contest alerts, event invites, new show announcements, and community updates delivered straight to your inbox.
          </p>
          <form
            className="flex w-full max-w-md gap-2 mt-1"
            onSubmit={(e) => {
              e.preventDefault();
              // Email subscription will be handled by API when available
            }}
          >
            <input
              type="email"
              placeholder="Enter your email..."
              required
              className="flex-1 rounded-full bg-white px-5 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/40"
            />
            <Button
              type="submit"
              size="lg"
              className="rounded-full bg-[#0a0a0f] text-white font-bold hover:bg-[#0a0a0f]/80 shadow-lg px-6 shrink-0"
            >
              Subscribe
              <ArrowDownRight className="ml-1.5 h-4 w-4" />
            </Button>
          </form>
          <p className="text-[11px] text-white/40">
            No spam ever. Unsubscribe anytime.
          </p>
        </div>
      </section>

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
