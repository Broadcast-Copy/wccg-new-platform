"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Gift, ShoppingBag, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ArcadeReward, Loadable } from "./arcade-data";

const CATEGORY_EMOJI: Record<string, string> = {
  "Food & Drinks": "🍔",
  "Event Tickets": "🎫",
  "Merch & Gear": "👕",
  "Digital Perks": "⚡",
  "Gift Cards": "💳",
  "Experiences": "🌟",
  "Community": "❤️",
};

/**
 * Live rewards catalog from `reward_catalog` — image, cost, stock badges
 * ("Only N left" at ≤5, "Out of stock" disabled at 0), and a Redeem button
 * that opens the confirm dialog. Insufficient balance shows "Need N more WP".
 */
export function RewardCatalog({
  catalog,
  balance,
  signedIn,
  onRedeemClick,
}: {
  catalog: Loadable<ArcadeReward[]>;
  balance: number | null;
  signedIn: boolean;
  onRedeemClick: (reward: ArcadeReward) => void;
}) {
  const [category, setCategory] = useState<string>("All");

  const categories = useMemo(() => {
    if (catalog.status !== "ready") return ["All"];
    const cats = Array.from(
      new Set(
        catalog.data
          .map((r) => r.category)
          .filter((c): c is string => Boolean(c)),
      ),
    );
    return ["All", ...cats];
  }, [catalog]);

  const filtered = useMemo(() => {
    if (catalog.status !== "ready") return [];
    if (category === "All") return catalog.data;
    return catalog.data.filter((r) => r.category === category);
  }, [catalog, category]);

  return (
    <section aria-label="Rewards catalog" className="space-y-4">
      <div className="flex items-center gap-2">
        <ShoppingBag className="h-5 w-5 text-[#74ddc7]" />
        <h2 className="text-lg font-bold text-foreground">Prize Counter</h2>
      </div>

      {catalog.status === "loading" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-border">
              <div className="aspect-video animate-pulse bg-muted" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
                <div className="h-8 w-full animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      )}

      {catalog.status === "error" && (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="font-medium text-foreground">
            Couldn&apos;t load the prize counter.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Please refresh the page or check back in a bit.
          </p>
        </div>
      )}

      {catalog.status === "ready" && catalog.data.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <Gift className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 font-medium text-foreground">
            The prize counter is being restocked.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            New rewards are on the way — keep earning in the meantime.
          </p>
        </div>
      )}

      {catalog.status === "ready" && catalog.data.length > 0 && (
        <>
          {categories.length > 2 && (
            <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
              {categories.map((cat) => {
                const isActive = category === cat;
                const emoji = CATEGORY_EMOJI[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[#7401df] text-white"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {emoji && <span>{emoji}</span>}
                    {cat}
                  </button>
                );
              })}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((reward) => (
              <RewardTile
                key={reward.id}
                reward={reward}
                balance={balance}
                signedIn={signedIn}
                onRedeemClick={onRedeemClick}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

// ─── Single reward tile ───────────────────────────────────────────────────

function RewardTile({
  reward,
  balance,
  signedIn,
  onRedeemClick,
}: {
  reward: ArcadeReward;
  balance: number | null;
  signedIn: boolean;
  onRedeemClick: (reward: ArcadeReward) => void;
}) {
  const outOfStock = reward.stockCount !== null && reward.stockCount <= 0;
  const lowStock =
    reward.stockCount !== null &&
    reward.stockCount > 0 &&
    reward.stockCount <= 5;
  const shortBy =
    balance !== null && balance < reward.pointsCost
      ? reward.pointsCost - balance
      : 0;
  const canRedeem = signedIn && !outOfStock && balance !== null && shortBy === 0;

  return (
    <div
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all ${
        outOfStock
          ? "border-border opacity-60"
          : "border-border hover:border-[#7401df]/40 hover:shadow-lg hover:shadow-[#7401df]/10"
      }`}
    >
      {/* Image */}
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-[#7401df]/15 to-[#74ddc7]/15">
        {reward.imageUrl ? (
          // Plain <img> — reward images live in Supabase storage, outside the
          // next/image remotePatterns allowlist.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={reward.imageUrl}
            alt={reward.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Gift className="h-10 w-10 text-[#7401df]/40" />
          </div>
        )}

        {/* Stock badge */}
        {outOfStock && (
          <Badge className="absolute right-2 top-2 border-zinc-500/40 bg-zinc-900/80 text-zinc-300">
            Out of stock
          </Badge>
        )}
        {lowStock && (
          <Badge className="absolute right-2 top-2 border-amber-500/40 bg-amber-950/80 text-amber-400">
            Only {reward.stockCount} left
          </Badge>
        )}

        {/* Category badge */}
        {reward.category && (
          <Badge
            variant="outline"
            className="absolute left-2 top-2 border-white/20 bg-black/50 text-[10px] text-white backdrop-blur-sm"
          >
            {reward.category}
          </Badge>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-sm font-bold leading-tight text-foreground">
          {reward.name}
        </h3>
        {reward.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {reward.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="flex items-center gap-1.5">
            <Star className="h-4 w-4 text-[#f59e0b]" />
            <span className="text-sm font-extrabold tabular-nums text-foreground">
              {reward.pointsCost.toLocaleString()}
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground">
              WP
            </span>
          </span>

          {!signedIn ? (
            <Button size="sm" variant="outline" className="text-xs" asChild>
              <Link href="/login">Sign in to redeem</Link>
            </Button>
          ) : outOfStock ? (
            <Button size="sm" variant="outline" className="text-xs" disabled>
              Out of stock
            </Button>
          ) : balance === null ? (
            <Button size="sm" variant="outline" className="text-xs" disabled>
              Loading…
            </Button>
          ) : shortBy > 0 ? (
            <Button size="sm" variant="outline" className="text-xs" disabled>
              Need {shortBy.toLocaleString()} more WP
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-[#7401df] px-4 text-xs font-bold text-white hover:bg-[#7401df]/90"
              disabled={!canRedeem}
              onClick={() => onRedeemClick(reward)}
            >
              Redeem
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
