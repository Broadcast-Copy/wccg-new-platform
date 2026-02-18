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
import { toast } from "sonner";
import { Coins, Loader2, History } from "lucide-react";

type PointsReason =
  | "LISTENING"
  | "EVENT_CHECKIN"
  | "PURCHASE"
  | "REDEMPTION"
  | "ADMIN_GRANT";

interface PointsTransaction {
  id: string;
  amount: number;
  reason: PointsReason;
  reference_type: string | null;
  reference_id: string | null;
  balance: number;
  created_at: string;
}

interface PointsBalance {
  balance: number;
}

const REASON_LABELS: Record<PointsReason, string> = {
  LISTENING: "Listening",
  EVENT_CHECKIN: "Event Check-in",
  PURCHASE: "Purchase",
  REDEMPTION: "Redemption",
  ADMIN_GRANT: "Admin Grant",
};

function reasonIsPositive(reason: PointsReason): boolean {
  return reason === "LISTENING" || reason === "EVENT_CHECKIN" || reason === "ADMIN_GRANT";
}

function ReasonBadge({ reason }: { reason: PointsReason }) {
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

export function PointsHistory() {
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [balanceRes, historyRes] = await Promise.all([
        apiClient<PointsBalance>("/points/balance"),
        apiClient<PointsTransaction[]>("/points/history"),
      ]);
      setBalance(balanceRes.balance);
      setTransactions(historyRes);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load points data"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
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
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => {
                const isPositive = tx.amount > 0;
                return (
                  <TableRow key={tx.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
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
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {tx.balance.toLocaleString()}
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
