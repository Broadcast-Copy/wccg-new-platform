"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Gift,
  Clock,
  Users,
  Star,
  ArrowRight,
  Ticket,
  Radio,
  PartyPopper,
  Sparkles,
  CalendarDays,
  MapPin,
  Phone,
  Flame,
  CheckCircle2,
  Timer,
  Zap,
  Crown,
  Heart,
  Check,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────

type ContestStatus = "active" | "upcoming" | "ended";
type EntryMethod = "call" | "text" | "online" | "in-person" | "app" | "social";

interface Contest {
  id: string;
  title: string;
  description: string;
  prize: string;
  prizeValue: string;
  imageUrl?: string;
  gradient: string;
  status: ContestStatus;
  entryMethods: EntryMethod[];
  startDate: string;
  endDate: string;
  totalEntries: number;
  sponsor?: string;
  category: "giveaway" | "call-in" | "sweepstakes" | "social" | "event";
  rules?: string;
  featured?: boolean;
}

// ─── Mock Data ────────────────────────────────────────────────────────

const CONTESTS: Contest[] = [
  {
    id: "c01",
    title: "Spring Concert Series Ticket Giveaway",
    description: "Win VIP tickets to see your favorite artists live at the Crown Coliseum! Listen for the cue to call and be caller #10 to win a pair of VIP passes with backstage meet & greet.",
    prize: "2 VIP Concert Tickets + Backstage Pass",
    prizeValue: "$500",
    gradient: "from-[#7401df] to-[#3b82f6]",
    status: "active",
    entryMethods: ["call", "app"],
    startDate: "2026-02-20",
    endDate: "2026-03-15",
    totalEntries: 2847,
    sponsor: "Crown Coliseum",
    category: "call-in",
    featured: true,
  },
  {
    id: "c02",
    title: "mY1045 Cash Drop",
    description: "Download the mY1045 app and check in daily for your chance to win $1,045 cash! Every check-in earns you an entry. The more you listen, the better your chances.",
    prize: "$1,045 Cash Prize",
    prizeValue: "$1,045",
    gradient: "from-[#74ddc7] to-[#0d9488]",
    status: "active",
    entryMethods: ["app", "online"],
    startDate: "2026-02-01",
    endDate: "2026-03-31",
    totalEntries: 15320,
    category: "sweepstakes",
    featured: true,
  },
  {
    id: "c03",
    title: "Sneaker Sunday Giveaway",
    description: "Text KICKS to 104-5 every Sunday during Sunday Snacks for your chance to win a brand new pair of limited edition sneakers. A new winner is picked each week!",
    prize: "Limited Edition Sneakers",
    prizeValue: "$250",
    gradient: "from-[#ec4899] to-[#be185d]",
    status: "active",
    entryMethods: ["text"],
    startDate: "2026-02-01",
    endDate: "2026-04-27",
    totalEntries: 4210,
    category: "giveaway",
  },
  {
    id: "c04",
    title: "Valentine's Day Dinner for Two",
    description: "Share your love story on Instagram with #WCCGLove for a chance to win a romantic dinner for two at The Mash House, plus a dozen roses and chocolates.",
    prize: "Dinner for Two + Roses & Chocolates",
    prizeValue: "$300",
    gradient: "from-[#ef4444] to-[#dc2626]",
    status: "ended",
    entryMethods: ["social", "online"],
    startDate: "2026-02-01",
    endDate: "2026-02-14",
    totalEntries: 1893,
    sponsor: "The Mash House",
    category: "social",
  },
  {
    id: "c05",
    title: "Spring Break Getaway",
    description: "Win a 3-night stay in Myrtle Beach for you and 3 friends! Listen to the Streetz Morning Takeover for the secret code word, then enter online before midnight.",
    prize: "3-Night Myrtle Beach Stay for 4",
    prizeValue: "$2,000",
    gradient: "from-[#f59e0b] to-[#d97706]",
    status: "upcoming",
    entryMethods: ["online", "call"],
    startDate: "2026-03-10",
    endDate: "2026-03-21",
    totalEntries: 0,
    category: "sweepstakes",
    featured: true,
  },
  {
    id: "c06",
    title: "Battle of the DJs: MixxSquadd Edition",
    description: "Vote for your favorite MixxSquadd DJ's mix of the week! Each vote is an entry to win exclusive WCCG merch and a meet & greet with the MixxSquadd crew.",
    prize: "WCCG Merch Pack + DJ Meet & Greet",
    prizeValue: "$150",
    gradient: "from-[#3b82f6] to-[#1d4ed8]",
    status: "active",
    entryMethods: ["online", "app"],
    startDate: "2026-02-15",
    endDate: "2026-03-15",
    totalEntries: 6421,
    category: "social",
  },
  {
    id: "c07",
    title: "Community Business Spotlight",
    description: "Nominate a local business that makes Fayetteville special! Winners get free on-air advertising and a feature on wccg.com. Support local businesses that support our community.",
    prize: "Free On-Air Advertising ($5,000 value)",
    prizeValue: "$5,000",
    gradient: "from-[#06b6d4] to-[#0891b2]",
    status: "active",
    entryMethods: ["online", "in-person"],
    startDate: "2026-02-01",
    endDate: "2026-04-30",
    totalEntries: 892,
    category: "event",
  },
  {
    id: "c08",
    title: "HBCU Homecoming Weekend Package",
    description: "Win the ultimate HBCU homecoming experience! Includes tailgate party for 10, premium game tickets, and exclusive WCCG gear.",
    prize: "HBCU Homecoming VIP Package",
    prizeValue: "$1,500",
    gradient: "from-[#f97316] to-[#ea580c]",
    status: "upcoming",
    entryMethods: ["app", "online"],
    startDate: "2026-09-01",
    endDate: "2026-10-15",
    totalEntries: 0,
    category: "sweepstakes",
  },
];

const PAST_WINNERS = [
  { name: "Tasha M.", prize: "VIP Concert Tickets", date: "Feb 10, 2026", city: "Fayetteville" },
  { name: "Marcus J.", prize: "$500 Cash Prize", date: "Feb 3, 2026", city: "Clinton" },
  { name: "Aaliyah W.", prize: "Sneaker Giveaway Winner", date: "Jan 27, 2026", city: "Lumberton" },
  { name: "Demetrius L.", prize: "Super Bowl Watch Party VIP", date: "Jan 20, 2026", city: "Hope Mills" },
  { name: "Keisha B.", prize: "$1,045 Cash Drop", date: "Jan 13, 2026", city: "Spring Lake" },
  { name: "Andre T.", prize: "DJ Meet & Greet", date: "Jan 6, 2026", city: "Sanford" },
];

// ─── Entry method helpers ─────────────────────────────────────────────

const entryMethodLabels: Record<EntryMethod, { label: string; icon: typeof Phone }> = {
  call: { label: "Call In", icon: Phone },
  text: { label: "Text", icon: Zap },
  online: { label: "Online", icon: Sparkles },
  "in-person": { label: "In Person", icon: MapPin },
  app: { label: "mY1045 App", icon: Radio },
  social: { label: "Social Media", icon: Heart },
};

const statusConfig: Record<ContestStatus, { label: string; color: string; icon: typeof Flame }> = {
  active: { label: "Live Now", color: "bg-[#22c55e] text-white", icon: Flame },
  upcoming: { label: "Coming Soon", color: "bg-[#f59e0b] text-[#0a0a0f]", icon: Timer },
  ended: { label: "Ended", color: "bg-white/10 text-muted-foreground", icon: CheckCircle2 },
};

// ─── Category filter chips ────────────────────────────────────────────

const CATEGORIES = [
  { id: "all", label: "All Contests" },
  { id: "active", label: "Live Now" },
  { id: "giveaway", label: "Giveaways" },
  { id: "call-in", label: "Call-In" },
  { id: "sweepstakes", label: "Sweepstakes" },
  { id: "social", label: "Social" },
  { id: "event", label: "Events" },
];

// ─── Contest Card Component ───────────────────────────────────────────

function ContestCard({
  contest,
  featured,
  entered,
  reminded,
  onEnter,
  onRemind,
}: {
  contest: Contest;
  featured?: boolean;
  entered?: boolean;
  reminded?: boolean;
  onEnter?: () => void;
  onRemind?: () => void;
}) {
  const status = statusConfig[contest.status];
  const StatusIcon = status.icon;
  const daysLeft = contest.status === "active"
    ? Math.max(0, Math.ceil((new Date(contest.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : contest.status === "upcoming"
    ? Math.max(0, Math.ceil((new Date(contest.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border transition-all hover:-translate-y-0.5 ${
        featured
          ? "border-input bg-card col-span-full md:col-span-2"
          : "border-border bg-card"
      }`}
    >
      {/* Gradient header bar */}
      <div className={`h-2 bg-gradient-to-r ${contest.gradient}`} />

      <div className={`p-5 ${featured ? "md:flex md:gap-6" : ""}`}>
        {/* Left: Icon/Image area */}
        <div className={`${featured ? "md:w-1/3" : ""} mb-4 ${featured ? "md:mb-0" : ""}`}>
          <div className={`relative h-40 ${featured ? "md:h-full" : ""} rounded-lg bg-gradient-to-br ${contest.gradient} flex items-center justify-center overflow-hidden`}>
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative text-center space-y-2 px-4">
              <Trophy className="h-10 w-10 text-white mx-auto drop-shadow-lg" />
              <p className="text-white font-bold text-lg drop-shadow">{contest.prizeValue}</p>
              <p className="text-foreground/70 text-xs">Prize Value</p>
            </div>
            {/* Status badge */}
            <div className="absolute top-3 right-3">
              <Badge className={`${status.color} border-0 gap-1 text-[10px] font-bold uppercase tracking-wider`}>
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Right: Content */}
        <div className={`flex-1 space-y-3 ${featured ? "" : ""}`}>
          <div>
            <h3 className="text-lg font-bold text-foreground group-hover:text-[#74ddc7] transition-colors leading-tight">
              {contest.title}
            </h3>
            {contest.sponsor && (
              <p className="text-xs text-muted-foreground/70 mt-1">Sponsored by {contest.sponsor}</p>
            )}
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {contest.description}
          </p>

          {/* Prize */}
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-[#74ddc7]" />
            <span className="text-sm font-medium text-[#74ddc7]">{contest.prize}</span>
          </div>

          {/* Entry methods */}
          <div className="flex flex-wrap gap-2">
            {contest.entryMethods.map((method) => {
              const m = entryMethodLabels[method];
              const Icon = m.icon;
              return (
                <span
                  key={method}
                  className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-border px-2.5 py-1 text-xs text-muted-foreground"
                >
                  <Icon className="h-3 w-3" />
                  {m.label}
                </span>
              );
            })}
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-4 text-xs text-muted-foreground/70">
              {contest.status === "active" && (
                <>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {daysLeft}d left
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {contest.totalEntries.toLocaleString()} entries
                  </span>
                </>
              )}
              {contest.status === "upcoming" && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  Starts in {daysLeft} days
                </span>
              )}
              {contest.status === "ended" && (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {contest.totalEntries.toLocaleString()} total entries
                </span>
              )}
            </div>

            {contest.status === "active" && (
              <Button
                size="sm"
                disabled={entered}
                onClick={onEnter}
                className={`rounded-full font-bold text-xs px-4 ${
                  entered
                    ? "bg-[#22c55e] text-white hover:bg-[#22c55e] cursor-default"
                    : "bg-[#dc2626] text-white hover:bg-[#b91c1c]"
                }`}
              >
                {entered ? (
                  <>
                    <Check className="mr-1.5 h-3 w-3" />
                    Entered!
                  </>
                ) : (
                  <>
                    Enter Now
                    <ArrowRight className="ml-1.5 h-3 w-3" />
                  </>
                )}
              </Button>
            )}
            {contest.status === "upcoming" && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRemind}
                className={`rounded-full text-xs px-4 ${
                  reminded
                    ? "border-[#22c55e]/30 text-[#22c55e] hover:bg-[#22c55e]/5"
                    : "border-white/20 text-foreground hover:bg-white/5"
                }`}
              >
                {reminded ? (
                  <>
                    <Check className="mr-1.5 h-3 w-3" />
                    Reminder Set
                  </>
                ) : (
                  "Remind Me"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page Component ───────────────────────────────────────────────────

export default function ContestsPage() {
  const [filter, setFilter] = useState("all");
  const [enteredIds, setEnteredIds] = useState<Set<string>>(new Set());
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set());

  const handleEnter = (id: string) => {
    setEnteredIds((prev) => new Set(prev).add(id));
  };

  const handleRemind = (id: string) => {
    setRemindedIds((prev) => new Set(prev).add(id));
  };

  const filteredContests = CONTESTS.filter((c) => {
    if (filter === "all") return true;
    if (filter === "active") return c.status === "active";
    return c.category === filter;
  });

  const featuredContests = CONTESTS.filter((c) => c.featured && c.status !== "ended");
  const activeCount = CONTESTS.filter((c) => c.status === "active").length;

  return (
    <div className="space-y-10">
      {/* ── Hero Section ─────────────────────────────────────────────── */}
      <div className="relative -mx-4 -mt-8 overflow-hidden sm:-mx-6 md:-mx-8">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#1a0533] to-[#0d1b2a]" />
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-[#7401df]/10 blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-[#74ddc7]/10 blur-[80px]" />
        </div>

        <div className="relative px-6 py-16 sm:px-10 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#dc2626]/10 border border-[#dc2626]/20 px-4 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#dc2626] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#dc2626]" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-[#dc2626]">
                {activeCount} Active Contests
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Contests &amp; <span className="text-[#74ddc7]">Giveaways</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Win cash, concert tickets, exclusive merch, and more! Enter online,
              call in, or use the mY1045 app for your chance to win.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                size="lg"
                className="rounded-full bg-[#dc2626] text-white font-bold hover:bg-[#b91c1c] px-6"
                asChild
              >
                <a href="#all-contests">
                  <Ticket className="mr-2 h-4 w-4" />
                  Enter Active Contests
                </a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-full border-white/20 text-foreground hover:bg-white/5 px-6"
                asChild
              >
                <Link href="/contest-rules">
                  Contest Rules
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── How It Works ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">How It Works</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Radio, title: "Listen", desc: "Tune into WCCG 104.5 FM for contest cues and code words", color: "from-[#74ddc7] to-[#0d9488]", step: "01" },
            { icon: Sparkles, title: "Enter", desc: "Call in, text, or enter online through the mY1045 app", color: "from-[#7401df] to-[#3b82f6]", step: "02" },
            { icon: Crown, title: "Win", desc: "Winners announced on-air and contacted directly", color: "from-[#f59e0b] to-[#d97706]", step: "03" },
            { icon: PartyPopper, title: "Claim", desc: "Pick up your prize at the WCCG studio or event", color: "from-[#ec4899] to-[#be185d]", step: "04" },
          ].map((step) => (
            <div
              key={step.step}
              className="relative rounded-xl border border-border bg-card p-5 transition-all hover:border-input"
            >
              <span className="absolute top-3 right-3 text-4xl font-black text-foreground/[0.03]">{step.step}</span>
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${step.color}`}>
                <step.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold text-foreground">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured Contests ─────────────────────────────────────────── */}
      {featuredContests.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-[#f59e0b]" />
            <h2 className="text-xl font-bold text-foreground">Featured Contests</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {featuredContests.map((c) => (
              <ContestCard
                key={c.id}
                contest={c}
                featured
                entered={enteredIds.has(c.id)}
                reminded={remindedIds.has(c.id)}
                onEnter={() => handleEnter(c.id)}
                onRemind={() => handleRemind(c.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── All Contests ──────────────────────────────────────────────── */}
      <section id="all-contests" className="space-y-4 scroll-mt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">All Contests</h2>
          <span className="text-sm text-muted-foreground/70">{filteredContests.length} contests</span>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                filter === cat.id
                  ? "bg-[#74ddc7] text-[#0a0a0f]"
                  : "bg-white/5 text-muted-foreground hover:bg-foreground/10 border border-border"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Contest grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {filteredContests.map((c) => (
            <ContestCard
              key={c.id}
              contest={c}
              entered={enteredIds.has(c.id)}
              reminded={remindedIds.has(c.id)}
              onEnter={() => handleEnter(c.id)}
              onRemind={() => handleRemind(c.id)}
            />
          ))}
        </div>

        {filteredContests.length === 0 && (
          <div className="flex h-40 items-center justify-center rounded-xl border border-border bg-card">
            <p className="text-sm text-muted-foreground/70">No contests match this filter. Try another category!</p>
          </div>
        )}
      </section>

      {/* ── Past Winners ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-[#f59e0b]" />
          <h2 className="text-xl font-bold text-foreground">Recent Winners</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PAST_WINNERS.map((winner, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f59e0b]/10">
                <Crown className="h-5 w-5 text-[#f59e0b]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">{winner.name}</p>
                <p className="text-xs text-[#74ddc7] truncate">{winner.prize}</p>
                <p className="text-xs text-muted-foreground/70">{winner.date} · {winner.city}, NC</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Points CTA ────────────────────────────────────────────────── */}
      <section>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#7401df] to-[#ec4899] p-8 md:p-12">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.3) 0%, transparent 50%)"
            }} />
          </div>
          <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
              <Gift className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1 space-y-2">
              <h2 className="text-2xl font-bold text-white">
                Boost Your Chances with mY1045 Points
              </h2>
              <p className="max-w-lg text-sm text-white/70">
                Earn points by listening, attending events, and engaging with the platform.
                Use your points for bonus contest entries and exclusive rewards!
              </p>
            </div>
            <Button
              size="lg"
              className="shrink-0 rounded-full bg-white text-[#7401df] font-bold hover:bg-white/90 px-6"
              asChild
            >
              <Link href="/rewards">
                Earn Points
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Legal Footer ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-foreground/20 pb-4">
        <Link href="/contest-rules" className="hover:text-muted-foreground transition-colors">Official Contest Rules</Link>
        <span>·</span>
        <Link href="/contest-guidelines" className="hover:text-muted-foreground transition-colors">Submission Guidelines</Link>
        <span>·</span>
        <Link href="/terms" className="hover:text-muted-foreground transition-colors">Terms of Service</Link>
        <span>·</span>
        <Link href="/privacy" className="hover:text-muted-foreground transition-colors">Privacy Policy</Link>
      </div>
    </div>
  );
}
