"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Headphones,
  History,
  Radio,
  ShoppingBag,
  Sparkles,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  reconcileSessionPoints,
  usePointsSync,
} from "@/hooks/use-listening-points";
import { readPointsBalance, deductLocalPoints } from "@/lib/points-storage";
import { loadUnlockedMilestones } from "@/lib/milestones";
import { Button } from "@/components/ui/button";
import { MultiplierBanner } from "@/components/player/multiplier-banner";
import { MultiplierSchedule } from "@/components/points/multiplier-schedule";
import { PointsHistory } from "@/components/points/points-history";
import { ListeningHistory } from "@/components/history/listening-history";
import { ArcadeHeader } from "./arcade-header";
import { ArcadeLeaderboard } from "./arcade-leaderboard";
import { ListenerSpotlight } from "./listener-spotlight";
import { BadgeWall } from "./badge-wall";
import { RewardCatalog } from "./reward-catalog";
import { RedeemDialog } from "./redeem-dialog";
import type {
  ArcadeLeaderEntry,
  ArcadeReward,
  Loadable,
  SpotlightListener,
} from "./arcade-data";

/** Raw row shapes from Supabase (untyped client → cast, per app convention). */
interface AllTimeRow {
  rank: number;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  balance: number | null;
}

interface WeeklyRow {
  rank: number;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  points: number | null;
}

interface CatalogRow {
  id: string;
  name: string | null;
  description: string | null;
  image_url: string | null;
  points_cost: number | null;
  category: string | null;
  stock_count: number | null;
}

interface SpotlightRow {
  display_name: string | null;
  city: string | null;
  points_earned: number | null;
  listening_hours: number | null;
  quote: string | null;
  week_start_date: string | null;
}

type ActivityTab = "points" | "listening";

/**
 * Rewards Arcade — the fun page of the app.
 *
 * Presentation/redeem/leaderboard surface only: points are still EARNED by
 * the untouched local listening engine (hooks/use-listening-points.ts) and
 * reconciled to the server outbox. The redeem gate uses the local balance —
 * the same convention the previous rewards-content.tsx used — while the
 * server's redeem_reward RPC enforces the real spend atomically.
 */
export function RewardsArcade() {
  const { user, isLoading: authLoading } = useAuth();
  const signedIn = !!user;

  const [balance, setBalance] = useState<number | null>(null);
  const [weekly, setWeekly] = useState<Loadable<ArcadeLeaderEntry[]>>({
    status: "loading",
  });
  const [allTime, setAllTime] = useState<Loadable<ArcadeLeaderEntry[]>>({
    status: "loading",
  });
  const [catalog, setCatalog] = useState<Loadable<ArcadeReward[]>>({
    status: "loading",
  });
  const [spotlight, setSpotlight] = useState<Loadable<SpotlightListener | null>>(
    { status: "loading" },
  );
  const [dbUnlocked, setDbUnlocked] = useState<string[]>([]);
  // Local milestones read once via lazy init (same pattern as points-history).
  const [localUnlocked] = useState<string[]>(() => {
    try {
      return loadUnlockedMilestones();
    } catch {
      return [];
    }
  });
  const [activityTab, setActivityTab] = useState<ActivityTab>("points");
  const [dialogReward, setDialogReward] = useState<ArcadeReward | null>(null);

  // ── Balance: hybrid local engine (reconcile, then read) ────────────────
  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function refresh() {
      // Catch up any points missed while the tab was backgrounded, then read
      // the local (authoritative for the redeem gate) balance.
      reconcileSessionPoints();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!active) return;
      setBalance(readPointsBalance(authUser?.email));
    }

    void refresh();
    const interval = setInterval(refresh, 30_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Cross-tab updates (another tab earned points) → re-read.
  usePointsSync(() => {
    setBalance(readPointsBalance(user?.email));
  });

  // ── Public data: leaderboards, catalog, spotlight ──────────────────────
  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function load() {
      const [weeklyRes, allTimeRes, catalogRes, spotlightRes] =
        await Promise.all([
          supabase.rpc("points_leaderboard_weekly", { p_limit: 100 }),
          supabase.rpc("points_leaderboard", { p_limit: 100 }),
          supabase
            .from("reward_catalog")
            .select(
              "id, name, description, image_url, points_cost, category, stock_count",
            )
            .eq("is_active", true)
            .order("points_cost", { ascending: true }),
          supabase
            .from("listener_of_the_week")
            .select(
              "display_name, city, points_earned, listening_hours, quote, week_start_date",
            )
            .order("week_start_date", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);
      if (!active) return;

      setWeekly(
        weeklyRes.error
          ? { status: "error" }
          : {
              status: "ready",
              data: ((weeklyRes.data ?? []) as WeeklyRow[]).map((r) => ({
                rank: Number(r.rank),
                userId: r.user_id,
                displayName: r.display_name ?? "Listener",
                avatarUrl: r.avatar_url,
                points: Number(r.points ?? 0),
              })),
            },
      );

      setAllTime(
        allTimeRes.error
          ? { status: "error" }
          : {
              status: "ready",
              data: ((allTimeRes.data ?? []) as AllTimeRow[]).map((r) => ({
                rank: Number(r.rank),
                userId: r.user_id,
                displayName: r.display_name ?? "Listener",
                avatarUrl: r.avatar_url,
                points: Number(r.balance ?? 0),
              })),
            },
      );

      setCatalog(
        catalogRes.error
          ? { status: "error" }
          : {
              status: "ready",
              data: ((catalogRes.data ?? []) as CatalogRow[]).map((r) => ({
                id: r.id,
                name: r.name ?? "Reward",
                description: r.description,
                imageUrl: r.image_url,
                pointsCost: Number(r.points_cost ?? 0),
                category: r.category,
                stockCount: r.stock_count,
              })),
            },
      );

      if (spotlightRes.error) {
        setSpotlight({ status: "error" });
      } else {
        const row = spotlightRes.data as SpotlightRow | null;
        setSpotlight({
          status: "ready",
          data: row
            ? {
                displayName: row.display_name ?? "WCCG Listener",
                city: row.city,
                pointsEarned: row.points_earned,
                listeningHours: row.listening_hours,
                quote: row.quote,
                weekStartDate: row.week_start_date,
              }
            : null,
        });
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  // ── Own milestones row (RLS own-read) merged with local unlocks ────────
  useEffect(() => {
    if (authLoading) return;
    let active = true;

    async function load() {
      if (!user) {
        if (!active) return;
        setDbUnlocked([]);
        return;
      }
      const supabase = createClient();
      const { data, error } = await supabase
        .from("user_milestones")
        .select("unlocked_ids")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      if (!error) {
        setDbUnlocked(
          (data as { unlocked_ids: string[] | null } | null)?.unlocked_ids ??
            [],
        );
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [user, authLoading]);

  const unlockedIds = useMemo(
    () => Array.from(new Set([...localUnlocked, ...dbUnlocked])),
    [localUnlocked, dbUnlocked],
  );

  // ── Redeem success: reflect spend locally + decrement stock in view ────
  const handleRedeemed = useCallback(
    (reward: ArcadeReward) => {
      const newBalance = deductLocalPoints(
        user?.email,
        reward.pointsCost,
        reward.name,
      );
      setBalance(newBalance);
      setCatalog((prev) =>
        prev.status === "ready"
          ? {
              status: "ready",
              data: prev.data.map((r) =>
                r.id === reward.id && r.stockCount !== null
                  ? { ...r, stockCount: Math.max(0, r.stockCount - 1) }
                  : r,
              ),
            }
          : prev,
      );
    },
    [user],
  );

  return (
    <div className="space-y-10">
      {/* 1 ── Header: balance count-up, week earned, rank */}
      <ArcadeHeader
        balance={balance}
        weekly={weekly}
        userId={user?.id ?? null}
        signedIn={signedIn}
      />

      {/* Active multiplier callout (preserved) */}
      <MultiplierBanner />

      {/* 2+3 ── Leaderboard + Listener of the Week */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ArcadeLeaderboard
            weekly={weekly}
            allTime={allTime}
            currentUserId={user?.id ?? null}
            signedIn={signedIn}
          />
        </div>
        <div className="space-y-6">
          <ListenerSpotlight spotlight={spotlight} />

          {/* Ways to earn (preserved from the old page, condensed) */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
              <Headphones className="h-4 w-4 text-[#74ddc7]" />
              How to earn WP
            </h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-[#74ddc7]">●</span>
                1 WP every 90 seconds of listening
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-[#7401df]">●</span>
                Daily bounty on your first listen of the day
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-[#f59e0b]">●</span>
                Streak bonuses at 1 and 2 hours straight
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-[#ec4899]">●</span>
                Shares, referrals, keywords &amp; event check-ins
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 4 ── Badge wall */}
      <BadgeWall unlockedIds={unlockedIds} />

      {/* 5 ── Rewards catalog */}
      <RewardCatalog
        catalog={catalog}
        balance={balance}
        signedIn={signedIn}
        onRedeemClick={setDialogReward}
      />

      {/* Multiplier schedule (preserved) */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <Zap className="h-5 w-5 text-[#f59e0b]" />
          Point Multiplier Schedule
        </h2>
        <MultiplierSchedule />
      </section>

      {/* 6 ── Activity (preserved: points + listening history) */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <Sparkles className="h-5 w-5 text-[#7401df]" />
          Your Activity
        </h2>
        <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
          {(
            [
              { value: "points", label: "Points History", icon: History },
              { value: "listening", label: "Listening History", icon: Radio },
            ] as const
          ).map((tab) => (
            <Button
              key={tab.value}
              variant={activityTab === tab.value ? "default" : "ghost"}
              size="sm"
              className={`flex-1 gap-2 ${
                activityTab === tab.value
                  ? "bg-[#7401df] text-white hover:bg-[#7401df]/90"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActivityTab(tab.value)}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </Button>
          ))}
        </div>
        {activityTab === "points" ? <PointsHistory /> : <ListeningHistory />}
      </section>

      {/* Footer note */}
      <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground/70">
        <ShoppingBag className="h-3.5 w-3.5" />
        Prizes are fulfilled by the WCCG 104.5 FM crew — we&apos;ll reach out
        after every redemption.
      </p>

      {/* Redeem confirm dialog — keyed so each reward gets fresh state */}
      {dialogReward && (
        <RedeemDialog
          key={dialogReward.id}
          reward={dialogReward}
          balance={balance}
          open
          onOpenChange={(next) => {
            if (!next) setDialogReward(null);
          }}
          onRedeemed={handleRedeemed}
        />
      )}
    </div>
  );
}
