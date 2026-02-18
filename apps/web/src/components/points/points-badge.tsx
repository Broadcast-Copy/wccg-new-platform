"use client";

import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";

export function PointsBadge() {
  const { user } = useAuth();

  // Don't show points badge for unauthenticated users
  if (!user) {
    return null;
  }

  // TODO: Fetch actual points balance from API
  const pointsBalance = 0;

  return (
    <Link href="/my/points">
      <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1">
        <Star className="h-3 w-3" />
        <span className="text-xs font-medium">{pointsBalance} pts</span>
      </Badge>
    </Link>
  );
}
