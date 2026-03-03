"use client";

import { useEffect, useState } from "react";
import { Hero } from "@/components/home/hero";
import { LiveNowRail } from "@/components/home/live-now-rail";
import { UpNextRail } from "@/components/home/up-next-rail";
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
  CloudSun,
  Clapperboard,
  Megaphone,
  Sparkles,
  Music,
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
    href: "/community",
    icon: Users2,
    title: "Community Directory",
    description:
      "Connects listeners with essential local services, housing, jobs, and support programs, all in one easy-to-access directory.",
    color: "from-[#3b82f6] to-[#1d4ed8]",
  },
  {
    href: "/weather",
    icon: CloudSun,
    title: "Realtime Weather Forecast",
    description:
      "Stay ahead with real-time weather forecasts helping you plan your day or event with confidence.",
    color: "from-[#f59e0b] to-[#d97706]",
  },
  {
    href: "/channels",
    icon: Radio,
    title: "Stream Guide",
    description:
      "Explore legacy streams and fresh new channels, find the perfect soundtrack anytime, anywhere.",
    color: "from-[#74ddc7] to-[#0d9488]",
  },
  {
    href: "/studio",
    icon: Clapperboard,
    title: "Studio & Production Services",
    description:
      "Empowers creators with a full suite of studio production services that deliver professional quality from concept to completion.",
    color: "from-[#7401df] to-[#4c1d95]",
  },
  {
    href: "/events",
    icon: CalendarDays,
    title: "Local Events & Tickets",
    description:
      "Discover local concerts, community gatherings, and exclusive events — get your tickets before they're gone.",
    color: "from-[#ec4899] to-[#be185d]",
  },
  {
    href: "/advertise",
    icon: Megaphone,
    title: "Advertise & Promotions",
    description:
      "We drive brand visibility through dynamic advertising and promotions that connect businesses with their audience.",
    color: "from-[#dc2626] to-[#b91c1c]",
  },
  {
    href: "/rewards",
    icon: Sparkles,
    title: "Join The mY1045 Network",
    description:
      "Earn rewards, join listener groups, and unlock exclusive perks with the mY1045 Network — where community all comes together.",
    color: "from-[#8b5cf6] to-[#6d28d9]",
  },
  {
    href: "/marketplace",
    icon: ShoppingBag,
    title: "The Hub for Local Vendors & Deals",
    description:
      "Your Marketplace for Local Deals, Vendors, and Exclusive WCCG Perks, all in one place.",
    color: "from-[#f472b6] to-[#be185d]",
  },
  {
    href: "/creators",
    icon: Music,
    title: "Made for Musicians. Built for Creators.",
    description:
      "Showcase your music, build your audience, and connect with fans and brands all in one powerful platform.",
    color: "from-[#22c55e] to-[#15803d]",
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
        <h2 className="text-xl font-bold text-foreground">
          Upcoming Events
        </h2>
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-[#74ddc7]">
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
        <div className="flex h-32 items-center justify-center rounded-xl border border-border bg-card">
          <p className="text-sm text-muted-foreground/70">
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
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight">
          One Platform. Endless Possibilities.
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-sm sm:text-base text-muted-foreground leading-relaxed">
          Your hub for tickets, streaming, weather &amp; news updates, community discovery, podcast booking, dynamic advertising, and digital media services, all in one place.
        </p>
      </section>

      {/* Platform Features */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">
          Explore the Platform
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {platformFeatures.map((feature) => (
            <Link
              key={feature.href + feature.title}
              href={feature.href}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:border-input hover:shadow-lg hover:shadow-black/20"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color}`}
                >
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-[#74ddc7] transition-colors">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
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
              className="flex-1 rounded-full bg-white px-5 py-3 text-sm text-gray-900 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/40"
            />
            <Button
              type="submit"
              size="lg"
              className="rounded-full bg-background text-white font-bold hover:bg-background/80 shadow-lg px-6 shrink-0"
            >
              Subscribe
              <ArrowDownRight className="ml-1.5 h-4 w-4" />
            </Button>
          </form>
          <p className="text-[11px] text-white/50">
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
              className="rounded-full border-white/30 text-white hover:bg-foreground/10 px-6"
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
