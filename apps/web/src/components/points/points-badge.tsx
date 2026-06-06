"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { readPointsBalance } from "@/lib/points-storage";
import { reconcileSessionPoints, usePointsSync } from "@/hooks/use-listening-points";

const supabase = createClient();

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

      // Server balance (own-read RLS). Default to 0 when no row exists yet —
      // balance is awarded server-side, never written from the client.
      if (user) {
        const { data, error } = await supabase
          .from("user_points")
          .select("balance")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!error) {
          if (!cancelled) setBalance(data?.balance ?? 0);
          return;
        }
        // On error, fall through to the local optimistic balance.
      }
      // Fall back to localStorage (signed-out, or server read failed)
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
