"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";

export function PointsBadge() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      // Defer state reset to avoid synchronous setState in effect
      queueMicrotask(() => setBalance(null));
      return;
    }

    let cancelled = false;

    async function fetchBalance() {
      try {
        const data = await apiClient<{ balance: number }>("/points/balance");
        if (!cancelled) setBalance(data.balance);
      } catch {
        // Fall back to localStorage points
        if (!cancelled) {
          try {
            const key = user?.email
              ? `wccg_listening_points_${user.email}`
              : "wccg_listening_points";
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              setBalance(parsed.totalPoints ?? 0);
            } else {
              setBalance(0);
            }
          } catch {
            setBalance(0);
          }
        }
      }
    }

    fetchBalance();
    // Refresh every 30 seconds so points update in real-time
    const interval = setInterval(fetchBalance, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user]);

  // Don't show points badge for unauthenticated users
  if (!user) {
    return null;
  }

  return (
    <Link href="/my/points">
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
