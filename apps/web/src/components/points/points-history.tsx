"use client";

import { useEffect, useState, useCallback } from "react";
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
import { apiClient } from "@/lib/api-client";
import { Coins, Loader2, History } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

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
  | "REFERRAL_BONUS";

interface PointsTransaction {
  id: string;
  amount: number;
  reason: PointsReason;
  referenceType: string | null;
  referenceId: string | null;
  balance: number;
  createdAt: string;
}

interface PointsBalance {
  balance: number;
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

/** Read points data from localStorage (for when API is unavailable) */
function loadLocalPointsData(email: string | null | undefined): {
  balance: number;
  history: PointsTransaction[];
} {
  try {
    // Check user-specific key first, then default key
    const keys = email
      ? [`wccg_listening_points_${email}`, "wccg_listening_points"]
      : ["wccg_listening_points"];
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const totalPoints = parsed.totalPoints ?? 0;
        const history: PointsTransaction[] = (parsed.history ?? []).map(
          (h: { points: number; reason: string; timestamp: string; program?: string }, i: number) => ({
            id: `local_${i}`,
            amount: h.points,
            reason: h.reason as PointsReason,
            referenceType: null,
            referenceId: h.program || null,
            balance: 0,
            createdAt: h.timestamp,
          }),
        );
        if (totalPoints > 0 || history.length > 0) {
          return { balance: totalPoints, history };
        }
      }
    }
  } catch {
    // ignore
  }
  return { balance: 0, history: [] };
}

export function PointsHistory() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [balanceRes, historyRes] = await Promise.all([
        apiClient<PointsBalance>("/points/balance"),
        apiClient<{ data: PointsTransaction[] }>("/points/history"),
      ]);
      setBalance(balanceRes.balance);
      setTransactions(historyRes.data);
    } catch {
      // Fall back to localStorage
      const local = loadLocalPointsData(user?.email);
      setBalance(local.balance);
      setTransactions(local.history);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  // Refresh every 30s
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

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
                <TableHead>Reason</TableHead>
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
                    <TableCell className="text-sm">{tx.referenceId || "WCCG 104.5 FM"}</TableCell>
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
