"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";

/** Read points from localStorage, checking user-specific key, default, then scanning all keys */
function readLocalBalance(email: string | null | undefined): number {
  if (typeof window === "undefined") return 0;
  try {
    const keys = email
      ? [`wccg_listening_points_${email}`, "wccg_listening_points"]
      : ["wccg_listening_points"];
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const pts = JSON.parse(raw).totalPoints ?? 0;
        if (pts > 0) return pts;
      }
    }
    // If email not provided, scan all user-specific keys
    if (!email) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("wccg_listening_points_") && key !== "wccg_listening_points") {
          const raw = localStorage.getItem(key);
          if (raw) {
            const pts = JSON.parse(raw).totalPoints ?? 0;
            if (pts > 0) return pts;
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return 0;
}

export function PointsBadge() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchBalance() {
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
        setBalance(readLocalBalance(user?.email));
      }
    }

    fetchBalance();
    const interval = setInterval(fetchBalance, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user]);

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
