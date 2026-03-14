"use client";

import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Trophy,
  Star,
  ArrowRight,
  TrendingUp,
  Clock,
  Users,
} from "lucide-react";
import { readPointsBalance } from "@/lib/points-storage";
import { useAuth } from "@/hooks/use-auth";

export default function LeaderboardPage() {
  const { user } = useAuth();
  const balance = typeof window !== "undefined" ? readPointsBalance(user?.email) : 0;

  return (
    <div className="space-y-10">
      {/* ── Hero Section ─────────────────────────────────────────────── */}
      <div className="relative -mx-4 -mt-8 overflow-hidden sm:-mx-6 md:-mx-8">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#1a0533] to-[#0d1b2a]" />
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-[#f59e0b]/10 blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-[#74ddc7]/10 blur-[80px]" />
        </div>

        <div className="relative px-6 py-16 sm:px-10 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/20 px-4 py-1.5">
              <Trophy className="h-3.5 w-3.5 text-[#f59e0b]" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#f59e0b]">
                Weekly Rankings
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
              Listener <span className="text-[#74ddc7]">Leaderboard</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg">
              See who is earning the most points this week. Listen longer,
              engage more, and climb the ranks to become Listener of the Week!
            </p>

            {/* Quick stats */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-white/50">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                247 active listeners
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                Updated daily
              </span>
              <span className="flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" />
                New week every Monday
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── How to Earn ────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">How to Climb the Ranks</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Clock,
              title: "Listen Daily",
              desc: "Earn 1 pt per 90 seconds of listening + daily bonus",
              color: "from-[#74ddc7] to-[#0d9488]",
            },
            {
              icon: Star,
              title: "Hit Streaks",
              desc: "1-hour streak = 5 pts, 2-hour streak = 10 pts",
              color: "from-[#f59e0b] to-[#d97706]",
            },
            {
              icon: TrendingUp,
              title: "Enter Keywords",
              desc: "Listen for on-air keywords worth 25-100 pts each",
              color: "from-[#7401df] to-[#3b82f6]",
            },
            {
              icon: Trophy,
              title: "Win Weekly",
              desc: "Top listener earns Listener of the Week spotlight",
              color: "from-[#ec4899] to-[#be185d]",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-border bg-card p-5 transition-all hover:border-input"
            >
              <div
                className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${item.color}`}
              >
                <item.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold text-foreground">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Leaderboard Table ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-[#f59e0b]" />
          <h2 className="text-xl font-bold text-foreground">This Week&apos;s Rankings</h2>
        </div>
        <LeaderboardTable />
      </section>

      {/* ── Your Rank ──────────────────────────────────────────────────── */}
      <section>
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 md:p-10">
          <div className="absolute inset-0 bg-gradient-to-br from-[#7401df]/5 to-[#74ddc7]/5" />
          <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7401df] to-[#74ddc7]">
              <Star className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1 space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Your Rank</h2>
              {user ? (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    You have <span className="font-bold text-[#74ddc7]">{balance.toLocaleString()} points</span> this
                    week. Keep listening to climb the leaderboard!
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                    <Badge className="bg-white/5 border-border text-foreground">
                      Rank: Unranked
                    </Badge>
                    <Badge className="bg-[#74ddc7]/10 text-[#74ddc7] border-[#74ddc7]/20">
                      Top 25% needed: 256 pts/week
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sign in to track your rank and compete for Listener of the Week!
                </p>
              )}
            </div>
            <Button
              size="lg"
              className="shrink-0 rounded-full bg-[#7401df] text-white font-bold hover:bg-[#7401df]/90 px-6"
              asChild
            >
              <Link href="/rewards">
                Earn More Points
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
