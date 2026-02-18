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
      setBalance(null);
      return;
    }

    async function fetchBalance() {
      try {
        const data = await apiClient<{ balance: number }>("/points/balance");
        setBalance(data.balance);
      } catch {
        setBalance(0);
      }
    }

    fetchBalance();
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
