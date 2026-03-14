"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { readPointsBalance } from "@/lib/points-storage";
import { reconcileSessionPoints, usePointsSync } from "@/hooks/use-listening-points";

export function PointsBadge() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [syncTick, setSyncTick] = useState(0);

  // Refresh when another tab updates points
  usePointsSync(() => setSyncTick((t) => t + 1));

  useEffect(() => {
    let cancelled = false;

    async function fetchBalance() {
      // Reconcile first to catch up any missed points
      reconcileSessionPoints();

      // Try API if logged in
      if (user) {
        try {
          const data = await apiClient<{ balance: number }>("/points/balance");
          if (!cancelled) setBalance(data.balance);
          return;
        } catch {
          // Fall through to localStorage
        }
      }
      // Fall back to localStorage
      if (!cancelled) {
        setBalance(readPointsBalance(user?.email));
      }
    }

    fetchBalance();
    const interval = setInterval(fetchBalance, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user, syncTick]);

  return (
    <Link href="/rewards">
      <Badge
        variant="secondary"
        className="flex items-center gap-1 px-2.5 py-1 transition-colors hover:bg-secondary/80"
      >
        <Star className="h-3.5 w-3.5 text-yellow-500" />
        <span className="text-xs font-medium">
          {balance !== null ? `${balance.toLocaleString()} pts` : "-- pts"}
        </span>
      </Badge>
    </Link>
  );
}
