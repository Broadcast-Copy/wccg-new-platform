"use client";

/**
 * Follower count for a host / show / user — Supabase-direct (no API server).
 * Reads the public `entity_follows` count (visible to everyone, incl. signed
 * out). Renders nothing if the count can't be read.
 */

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Users2 } from "lucide-react";

type TargetType = "host" | "show" | "user";

interface FollowerCountProps {
  targetType: TargetType;
  targetId: string;
  /** Optional class name for the container */
  className?: string;
}

function formatCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return count.toString();
}

export function FollowerCount({
  targetType,
  targetId,
  className = "",
}: FollowerCountProps) {
  const [supabase] = useState(() => createClient());
  const [count, setCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCount = useCallback(async () => {
    setIsLoading(true);
    try {
      const { count: c, error } = await supabase
        .from("entity_follows")
        .select("*", { count: "exact", head: true })
        .eq("target_type", targetType)
        .eq("target_id", targetId);
      setCount(error ? null : c ?? 0);
    } catch {
      setCount(null);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, targetType, targetId]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <div className="h-3.5 w-12 animate-pulse rounded bg-foreground/[0.06]" />
      </div>
    );
  }

  if (count === null) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1.5 text-sm text-muted-foreground ${className}`}>
      <Users2 className="h-3.5 w-3.5" />
      <span>
        <span className="font-medium text-foreground/60">{formatCount(count)}</span>{" "}
        {count === 1 ? "follower" : "followers"}
      </span>
    </div>
  );
}
