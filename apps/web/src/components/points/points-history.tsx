"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Coins, Loader2, History, Trophy } from "lucide-react";
import { MILESTONES, loadUnlockedMilestones } from "@/lib/milestones";

type PointsReason =
  | "LISTENING"
  | "EVENT_CHECKIN"
  | "PURCHASE"
  | "REDEMPTION"
  | "ADMIN_GRANT"
  | "DAILY_BOUNTY"
  | "STREAK_BONUS"
  | "SHARE"
  | "SHARE_BONUS"
  | "VIDEO_WATCH"
  | "REFERRAL_BONUS"
  | "KEYWORD_ENTRY";

interface PointsTransaction {
  id: string;
  amount: number;
  reason: PointsReason;
  /** What the user was listening to when this was earned (correlated from sessions). */
  program: string;
  createdAt: string;
}

/** Raw row shapes from Supabase. */
interface PointsHistoryRow {
  id: string;
  amount: number | null;
  reason: string | null;
  description: string | null;
  created_at: string;
}

interface SessionWindow {
  start: number;
  end: number;
  label: string;
}

const REASON_LABELS: Record<string, string> = {
  LISTENING: "Listening",
  EVENT_CHECKIN: "Event Check-in",
  PURCHASE: "Purchase",
  REDEMPTION: "Redemption",
  ADMIN_GRANT: "Admin Grant",
  DAILY_BOUNTY: "Daily Bonus",
  STREAK_BONUS: "Streak Bonus",
  SHARE: "Share",
  SHARE_BONUS: "Share Bonus",
  VIDEO_WATCH: "Video Watch",
  REFERRAL_BONUS: "Referral Bonus",
  KEYWORD_ENTRY: "Keyword Contest",
};

function reasonIsPositive(reason: string): boolean {
  return reason !== "PURCHASE" && reason !== "REDEMPTION";
}

function ReasonBadge({ reason }: { reason: string }) {
  const isPositive = reasonIsPositive(reason);
  return (
    <Badge
      variant="outline"
      className={
        isPositive
          ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
          : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
      }
    >
      {REASON_LABELS[reason] ?? reason}
    </Badge>
  );
}

/**
 * Build the "Program" cell for a points row: the song the user was
 * listening to when the points were earned.
 *
 * Correlates the row's timestamp against the listening-session windows
 * `[started_at, coalesce(ended_at, now)]`. Falls back to the row's own
 * description when it looks like a real song/label, otherwise a clean
 * generic label — never "WCCG 104.5 FM".
 */
function resolveProgram(
  createdAt: string,
  description: string | null,
  sessions: SessionWindow[],
): string {
  const ts = new Date(createdAt).getTime();
  if (!Number.isNaN(ts)) {
    const match = sessions.find((s) => ts >= s.start && ts <= s.end);
    if (match) return match.label;
  }

  // No matching session — fall back to the row's description when it's a
  // real label (not an empty value or the generic station name).
  const desc = description?.trim();
  if (desc && desc.toLowerCase() !== "wccg 104.5 fm") {
    return desc;
  }

  return "Live radio";
}

export function PointsHistory() {
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  // Unlocked milestones are read from localStorage once (client-only) via a
  // lazy initializer — avoids a synchronous setState inside an effect.
  const [unlockedIds] = useState<string[]>(() => {
    try {
      return loadUnlockedMilestones();
    } catch {
      return [];
    }
  });

  // Read the user's real points + balance from Supabase, refreshed every 30s.
  // All setState happens after an await behind an `active` guard, so there is
  // no synchronous setState in the effect body.
  useEffect(() => {
    let active = true;

    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;

      if (!user) {
        setBalance(0);
        setTransactions([]);
        setLoading(false);
        return;
      }

      // Balance, the user's own points history, and their listening sessions
      // (to correlate each points row with the song that was playing) — all
      // gated by RLS to the signed-in user's rows.
      const [balanceRes, historyRes, sessionsRes] = await Promise.all([
        supabase
          .from("user_points")
          .select("balance")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("points_history")
          .select("id, amount, reason, description, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("listening_sessions")
          .select("title, artist, started_at, ended_at")
          .eq("user_id", user.id),
      ]);
      if (!active) return;

      // Build session windows for correlation: [started_at, ended_at|now].
      const now = Date.now();
      const windows: SessionWindow[] = (
        (sessionsRes.data as
          | {
              title: string | null;
              artist: string | null;
              started_at: string | null;
              ended_at: string | null;
            }[]
          | null) ?? []
      )
        .filter((s) => s.started_at && (s.title || s.artist))
        .map((s) => {
          const artist = s.artist?.trim();
          const title = s.title?.trim();
          const label =
            artist && title
              ? `${artist} — ${title}`
              : title || artist || "Live radio";
          return {
            start: new Date(s.started_at as string).getTime(),
            end: s.ended_at ? new Date(s.ended_at).getTime() : now,
            label,
          };
        });

      const rows = (historyRes.data as PointsHistoryRow[] | null) ?? [];
      const txns: PointsTransaction[] = rows.map((r) => ({
        id: r.id,
        amount: r.amount ?? 0,
        reason: (r.reason as PointsReason) ?? "LISTENING",
        program: resolveProgram(r.created_at, r.description, windows),
        createdAt: r.created_at,
      }));

      setBalance(Number(balanceRes.data?.balance ?? 0));
      setTransactions(txns);
      setLoading(false);
    }

    load();
    const interval = setInterval(load, 30_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading points...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Coins className="size-4" />
            WCCG Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold tabular-nums">
            {(balance ?? 0).toLocaleString()}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Current balance
          </p>
        </CardContent>
      </Card>

      {/* Listening Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Trophy className="size-4" />
            Listening Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {MILESTONES.map((m) => {
              const unlocked = unlockedIds.includes(m.id);
              return (
                <div
                  key={m.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                    unlocked
                      ? "border-[#7401df]/30 bg-[#7401df]/5"
                      : "border-border opacity-50"
                  }`}
                >
                  <span className="text-2xl" role="img" aria-label={m.name}>
                    {m.icon}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${unlocked ? "" : "text-muted-foreground"}`}>
                      {m.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {m.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      {transactions.length === 0 ? (
        <div className="rounded-lg border p-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <History className="size-10 text-muted-foreground/50" />
            <div>
              <p className="font-medium">No transactions yet</p>
              <p className="text-sm text-muted-foreground">
                Listen to streams and participate in events to earn points!
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => {
                const isPositive = tx.amount > 0;
                return (
                  <TableRow key={tx.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      <span className="text-muted-foreground/60">
                        {new Date(tx.createdAt).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{tx.program}</TableCell>
                    <TableCell>
                      <ReasonBadge reason={tx.reason} />
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium tabular-nums ${
                        isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {tx.amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
