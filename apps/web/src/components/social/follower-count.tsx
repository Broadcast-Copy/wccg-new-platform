"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Users2 } from "lucide-react";

// ------------------------------------------------------------------ Types

type TargetType = "host" | "show" | "user";

interface FollowerCountResponse {
  count: number;
}

interface FollowerCountProps {
  targetType: TargetType;
  targetId: string;
  /** Optional class name for the container */
  className?: string;
}

// ------------------------------------------------------------------ Helpers

function formatCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return count.toString();
}

// ------------------------------------------------------------------ Component

export function FollowerCount({
  targetType,
  targetId,
  className = "",
}: FollowerCountProps) {
  const [count, setCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCount = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient<FollowerCountResponse>(
        `/follows/count?targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}`,
      );
      setCount(data.count);
    } catch {
      // If the endpoint doesn't exist yet, just show nothing
      setCount(null);
    } finally {
      setIsLoading(false);
    }
  }, [targetType, targetId]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <div className="h-3.5 w-12 animate-pulse rounded bg-white/[0.06]" />
      </div>
    );
  }

  if (count === null) {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-1.5 text-sm text-white/40 ${className}`}
    >
      <Users2 className="h-3.5 w-3.5" />
      <span>
        <span className="font-medium text-white/60">{formatCount(count)}</span>{" "}
        {count === 1 ? "follower" : "followers"}
      </span>
    </div>
  );
}
