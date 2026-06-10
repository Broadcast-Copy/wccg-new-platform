"use client";

import Link from "next/link";
import { Coins, Crown, Gamepad2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountUp } from "./count-up";
import type { ArcadeLeaderEntry, Loadable } from "./arcade-data";

/**
 * Arcade header — balance with animated count-up, this-week earned and weekly
 * rank (own row from points_leaderboard_weekly, when present).
 */
export function ArcadeHeader({
  balance,
  weekly,
  userId,
  signedIn,
}: {
  balance: number | null;
  weekly: Loadable<ArcadeLeaderEntry[]>;
  userId: string | null;
  signedIn: boolean;
}) {
  const mine =
    signedIn && userId && weekly.status === "ready"
      ? weekly.data.find((e) => e.userId === userId) ?? null
      : null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/30 bg-gradient-to-br from-[#0a0a0f] via-[#1d0638] to-[#04211c]">
      {/* Glow blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-10 left-1/4 h-56 w-56 rounded-full bg-[#7401df]/25 blur-[100px]" />
        <div className="absolute -bottom-16 right-1/5 h-56 w-56 rounded-full bg-[#74ddc7]/20 blur-[100px]" />
      </div>

      <div className="relative px-6 py-10 sm:px-10 sm:py-12">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#74ddc7]/25 bg-[#74ddc7]/10 px-4 py-1.5">
          <Gamepad2 className="h-3.5 w-3.5 text-[#74ddc7]" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#74ddc7]">
            mY1045 Rewards Arcade
          </span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Rewards <span className="text-[#74ddc7]">Arcade</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/60 sm:text-base">
          Earn WP every time you listen, climb the boards, unlock badges, and
          cash in at the prize counter.
        </p>

        {/* Stat tiles */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Balance */}
          <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-white/60">
              <Coins className="h-4 w-4 text-[#74ddc7]" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Your balance
              </span>
            </div>
            {balance === null ? (
              <div className="mt-2 h-9 w-28 animate-pulse rounded bg-white/10" />
            ) : (
              <p className="mt-1 text-3xl font-extrabold tabular-nums text-white">
                <CountUp value={balance} />{" "}
                <span className="text-base font-bold text-[#74ddc7]">WP</span>
              </p>
            )}
          </div>

          {/* This week */}
          <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-white/60">
              <TrendingUp className="h-4 w-4 text-[#7c5cff]" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Earned this week
              </span>
            </div>
            {weekly.status === "loading" ? (
              <div className="mt-2 h-9 w-24 animate-pulse rounded bg-white/10" />
            ) : weekly.status === "error" || !signedIn ? (
              <p className="mt-1 text-sm text-white/50">
                {signedIn
                  ? "Couldn't load weekly stats."
                  : "Sign in to track your week."}
              </p>
            ) : mine ? (
              <p className="mt-1 text-3xl font-extrabold tabular-nums text-white">
                <CountUp value={mine.points} />{" "}
                <span className="text-base font-bold text-[#7c5cff]">WP</span>
              </p>
            ) : (
              <p className="mt-1 text-sm text-white/50">
                Not on the board yet — press play and start climbing.
              </p>
            )}
          </div>

          {/* Weekly rank */}
          <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-white/60">
              <Crown className="h-4 w-4 text-[#f59e0b]" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Weekly rank
              </span>
            </div>
            {weekly.status === "loading" ? (
              <div className="mt-2 h-9 w-16 animate-pulse rounded bg-white/10" />
            ) : mine ? (
              <p className="mt-1 text-3xl font-extrabold tabular-nums text-white">
                #{mine.rank.toLocaleString()}
              </p>
            ) : (
              <p className="mt-1 text-sm text-white/50">
                {signedIn ? "Unranked — for now." : "Sign in to get ranked."}
              </p>
            )}
          </div>
        </div>

        {/* Guest CTA */}
        {!signedIn && (
          <div className="mt-6 flex flex-col items-start gap-3 rounded-xl border border-[#7401df]/30 bg-[#7401df]/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/70">
              You&apos;re playing as a guest — points stay on this device. Join
              free to save them, rank on the boards, and redeem prizes.
            </p>
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                className="rounded-full bg-[#7401df] font-bold text-white hover:bg-[#7401df]/90"
                asChild
              >
                <Link href="/register">Join free</Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10"
                asChild
              >
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
