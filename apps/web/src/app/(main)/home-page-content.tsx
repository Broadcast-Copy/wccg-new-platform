"use client";

import { useEffect, useRef, useState } from "react";
import { Hero } from "@/components/home/hero";
import type { ShowData } from "@/data/shows";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";

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
  MapPin,
  CloudSun,
  Clapperboard,
  Megaphone,
  Sparkles,
  Music,
  Mail,
  type LucideIcon,
} from "lucide-react";
import { DukeGameTile } from "@/components/sports/duke-game-tile";
import { STATIONS } from "@/lib/stations";
import { getListeningPoints, usePointsSync } from "@/hooks/use-listening-points";

interface EventItem {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  venue?: string;
  imageUrl?: string;
  isFree?: boolean;
}

// Weather-code → emoji / label (WMO codes from Open-Meteo). Mirrors the
// player's WeatherStrip so the home cards read the same source.
function weatherEmoji(code: number): string {
  if (code === 0 || code === 1) return "☀️";
  if (code === 2) return "⛅";
  if (code === 3) return "☁️";
  if (code >= 45 && code <= 48) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 65) return "🌧️";
  if (code >= 66 && code <= 67) return "🌨️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 80 && code <= 82) return "🌧️";
  if (code >= 85 && code <= 86) return "❄️";
  if (code >= 95) return "⛈️";
  return "☁️";
}

function weatherCondition(code: number): string {
  if (code === 0) return "Clear";
  if (code === 1) return "Mostly Clear";
  if (code === 2) return "Partly Cloudy";
  if (code === 3) return "Overcast";
  if (code >= 45 && code <= 48) return "Foggy";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 65) return "Rain";
  if (code >= 66 && code <= 67) return "Freezing Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code >= 85 && code <= 86) return "Snow Showers";
  if (code >= 95) return "Thunderstorm";
  return "Cloudy";
}

interface PlatformFeature {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  /** When set, the card shows live data in place of the static description. */
  liveKey?: "weather" | "events" | "streams" | "rewards";
}

const platformFeatures: PlatformFeature[] = [
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
    liveKey: "weather",
  },
  {
    href: "/channels",
    icon: Radio,
    title: "Stream Guide",
    description:
      "Explore legacy streams and fresh new channels, find the perfect soundtrack anytime, anywhere.",
    color: "from-[#74ddc7] to-[#0d9488]",
    liveKey: "streams",
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
    liveKey: "events",
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
    liveKey: "rewards",
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
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("events")
        .select("id,title,description,venue,image_url,start_date,is_free")
        .eq("status", "PUBLISHED")
        .eq("visibility", "PUBLIC")
        .gte("start_date", new Date().toISOString())
        .order("start_date", { ascending: true })
        .limit(3);
      if (!active) return;
      const rows = (data ?? []) as Array<{
        id: string;
        title: string;
        description: string | null;
        venue: string | null;
        image_url: string | null;
        start_date: string;
        is_free: boolean | null;
      }>;
      setEvents(
        rows.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description ?? undefined,
          startDate: r.start_date,
          venue: r.venue ?? undefined,
          imageUrl: r.image_url ?? undefined,
          isFree: !!r.is_free,
        })),
      );
    })().catch(() => {
      if (active) setEvents([]);
    });
    return () => {
      active = false;
    };
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

export default function HomePageContent({
  heroShows,
}: {
  /** Hero carousel shows resolved from the DB at build time (server parent). */
  heroShows: ShowData[];
}) {
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  const [activeCta, setActiveCta] = useState(0); // 0 = newsletter, 1 = community

  // ── Live data for the "Explore the Platform" cards ────────────────────
  const [cardWeather, setCardWeather] = useState<{ temp: number; emoji: string; condition: string } | null>(null);
  const [cardEvent, setCardEvent] = useState<{ title: string; date: string } | null>(null);
  const [cardPoints, setCardPoints] = useState(0);
  const liveStationCount = STATIONS.filter((s) => s.status === "ACTIVE").length;
  usePointsSync(() => setCardPoints(getListeningPoints()));

  // Phase A9 — fire visit_home once per page load.
  const visitTrackedRef = useRef(false);
  useEffect(() => {
    if (visitTrackedRef.current) return;
    visitTrackedRef.current = true;
    void track("visit_home");
  }, []);

  // Fetch live card data (weather + next event + points) once on mount.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=35.0527&longitude=-78.8784&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America%2FNew_York",
        );
        if (!res.ok || !active) return;
        const data = await res.json();
        const code = Number(data?.current?.weather_code ?? -1);
        setCardWeather({
          temp: Math.round(data.current.temperature_2m),
          emoji: weatherEmoji(code),
          condition: weatherCondition(code),
        });
      } catch {
        // ignore — card keeps its static description
      }
    })();
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("events")
          .select("title,start_date")
          .eq("status", "PUBLISHED")
          .eq("visibility", "PUBLIC")
          .gte("start_date", new Date().toISOString())
          .order("start_date", { ascending: true })
          .limit(1);
        if (!active) return;
        const row = (data ?? [])[0] as { title: string; start_date: string } | undefined;
        if (row) {
          setCardEvent({
            title: row.title,
            date: new Date(row.start_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
          });
        }
      } catch {
        // ignore — card keeps its static description
      }
    })();
    // Deferred so SSR's 0 state matches first paint (avoids hydration mismatch).
    queueMicrotask(() => {
      if (active) setCardPoints(getListeningPoints());
    });
    return () => {
      active = false;
    };
  }, []);

  // Phase A8 — real newsletter signup.
  async function handleSubscribe(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const emailInput = form.elements.namedItem("email") as HTMLInputElement | null;
    const email = emailInput?.value?.trim();
    if (!email) return;
    setSubscribing(true);
    setSubscribeError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email, source: "home_hero_cta" });
      // 23505 = email already on the list → treat as success (don't reveal it).
      if (error && error.code !== "23505") throw new Error(error.message);
      setSubscribed(true);
      void track("newsletter_subscribed", { source: "home_hero_cta" });
      setTimeout(() => setSubscribed(false), 4000);
      form.reset();
    } catch (err) {
      setSubscribeError((err as Error).message ?? "Couldn't subscribe — try again.");
    } finally {
      setSubscribing(false);
    }
  }

  return (
    <div className="space-y-10">
      {/* Show carousel — primary on-air programming view.
          The "Listen live, earn WP →" CTA strip lives on the user
          dashboard (/my) instead of the home page. */}
      <Hero heroShows={heroShows} />

      {/* Duke Game Day */}
      <DukeGameTile />

      {/* Quick access — Marketplace · Local Resources · Events */}
      <section className="px-4 md:px-[50px]">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { href: "/marketplace", label: "Marketplace", desc: "Shop local vendors, merch & more", icon: ShoppingBag, color: "#f59e0b" },
            { href: "/community", label: "Local Resources", desc: "Find services & places near you", icon: MapPin, color: "#14b8a6" },
            { href: "/events", label: "Events", desc: "Concerts, contests & community happenings", icon: CalendarDays, color: "#7401df" },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.href}
                href={c.href}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{ "--c": c.color } as React.CSSProperties}
              >
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 blur-2xl" style={{ backgroundColor: c.color }} />
                <div className="relative flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${c.color}1a`, color: c.color }}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-foreground">{c.label}</p>
                    <p className="text-sm text-muted-foreground">{c.desc}</p>
                  </div>
                  <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-[color:var(--c)]" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Platform Headline */}
      <section className="text-center py-4">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight">
          One Platform. Endless Possibilities.
        </h2>
        <p className="mt-3 max-w-2xl mx-auto text-sm sm:text-base text-muted-foreground leading-relaxed">
          Your hub for tickets, streaming, weather &amp; news updates, community discovery, podcast booking, dynamic advertising, and digital media services, all in one place.
        </p>
      </section>

      {/* Platform Features — three smoothly auto-scrolling marquee rows */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-foreground">
          Explore the Platform
        </h2>
        <div className="relative space-y-3 overflow-hidden">
          {[0, 1, 2].map((row) => {
            // Each row = the full set rotated by row*3, duplicated for a seamless loop.
            const items = platformFeatures.map(
              (_, i) => platformFeatures[(i + row * 3) % platformFeatures.length],
            );
            const loop = [...items, ...items];
            const anim = "marquee-left"; // every row scrolls left (per request)
            const dur = 60 + row * 8; // 60s / 68s / 76s — slow, organic, not lockstep
            return (
              <div key={row} className="group/marq relative overflow-hidden">
                <ul
                  className="flex w-max gap-3 group-hover/marq:[animation-play-state:paused]"
                  style={{ animation: `${anim} ${dur}s linear infinite` }}
                >
                  {loop.map((feature, i) => (
                    <li key={`${row}-${i}`} className="shrink-0">
                      <Link
                        href={feature.href}
                        className="group flex w-[240px] items-start gap-3 overflow-hidden rounded-xl border border-border bg-card p-4 transition-all hover:border-input hover:shadow-lg sm:w-[280px]"
                      >
                        <div className="relative shrink-0">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color}`}
                          >
                            <feature.icon className="h-5 w-5 text-white" />
                          </div>
                          {feature.liveKey && (
                            <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-card" />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold text-foreground transition-colors group-hover:text-[#74ddc7]">
                            {feature.title}
                          </h3>
                          {feature.liveKey === "weather" && cardWeather ? (
                            <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                              <span className="text-sm leading-none">{cardWeather.emoji}</span>
                              <span className="tabular-nums">{cardWeather.temp}°F</span>
                              <span className="font-normal text-muted-foreground">· {cardWeather.condition}</span>
                            </p>
                          ) : feature.liveKey === "events" && cardEvent ? (
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">Next: {cardEvent.title}</span> · {cardEvent.date}
                            </p>
                          ) : feature.liveKey === "streams" ? (
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">{liveStationCount} channels live</span> · tap to tune in
                            </p>
                          ) : feature.liveKey === "rewards" && cardPoints > 0 ? (
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">{cardPoints.toLocaleString()} WP earned</span> · keep listening
                            </p>
                          ) : (
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{feature.description}</p>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {/* Edge fades for the premium look */}
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent" />
        </div>
      </section>

      {/* Upcoming Events — client-side fetched */}
      <UpcomingEventsSection />

      {/* CTA Toggle — show one at a time */}
      <div className="relative">
        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <button
            onClick={() => setActiveCta(0)}
            className={`h-2 rounded-full transition-all ${activeCta === 0 ? "w-6 bg-[#dc2626]" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"}`}
            aria-label="Show newsletter"
          />
          <button
            onClick={() => setActiveCta(1)}
            className={`h-2 rounded-full transition-all ${activeCta === 1 ? "w-6 bg-[#7401df]" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"}`}
            aria-label="Show community"
          />
        </div>

      {/* Email Subscription CTA */}
      <section className={`relative overflow-hidden rounded-2xl bg-[#dc2626] p-8 md:p-12 transition-all duration-500 ${activeCta === 0 ? "block" : "hidden"}`}>
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
          {subscribed ? (
            <div className="flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-6 py-3 mt-1">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-semibold text-white">You&apos;re subscribed!</span>
            </div>
          ) : (
            <form
              className="flex w-full max-w-md gap-2 mt-1"
              onSubmit={handleSubscribe}
            >
              <input
                type="email"
                name="email"
                placeholder="Enter your email..."
                required
                disabled={subscribing}
                className="flex-1 rounded-full bg-white px-5 py-3 text-sm text-gray-900 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/40 disabled:opacity-60"
              />
              <Button
                type="submit"
                size="lg"
                disabled={subscribing}
                className="rounded-full bg-[#dc2626] text-white font-bold hover:bg-[#b91c1c] shadow-lg px-6 shrink-0"
              >
                {subscribing ? "Subscribing..." : "Subscribe"}
                {!subscribing && <ArrowDownRight className="ml-1.5 h-4 w-4" />}
              </Button>
            </form>
          )}
          {subscribeError && (
            <p className="text-xs text-white/90 bg-black/30 rounded-full px-3 py-1">
              {subscribeError}
            </p>
          )}
          <p className="text-[11px] text-white/50">
            Confirm via email to unlock +100 WP. No spam ever. Unsubscribe anytime.
          </p>
        </div>
      </section>

      {/* Community CTA */}
      <section className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#7401df] to-[#3b82f6] p-8 md:p-12 transition-all duration-500 ${activeCta === 1 ? "block" : "hidden"}`}>
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
    </div>
  );
}
