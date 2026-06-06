"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./use-auth";

/**
 * Hook to manage a favorite for a specific item, backed by the
 * `user_favorites` table (browser → Supabase direct, RLS-scoped to the
 * signed-in user). Preserves the previous public API
 * ({ isFavorited, toggle, isLoading }) so callers need no changes.
 *
 * `itemType` is normalized to lowercase so mixed-case call sites
 * ("STREAM" vs "stream") resolve to the same favorite.
 */
export function useFavorites(itemType: string, itemId: string, title?: string) {
  const { user } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const normalizedType = itemType.toLowerCase();

  // Load the current favorite state for this item.
  useEffect(() => {
    if (!user) {
      setIsFavorited(false);
      return;
    }

    let active = true;
    const supabase = createClient();

    (async () => {
      const { data, error } = await supabase
        .from("user_favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("item_type", normalizedType)
        .eq("item_id", itemId)
        .maybeSingle();

      if (!active) return;
      // On error, fail closed (treat as not favorited) — the toggle can
      // still create the row, and upsert is idempotent.
      setIsFavorited(!error && data !== null);
    })();

    return () => {
      active = false;
    };
  }, [user, normalizedType, itemId]);

  const toggle = useCallback(async () => {
    if (!user || isLoading) return;

    const supabase = createClient();
    const next = !isFavorited;
    // Optimistic UI; roll back on failure.
    setIsFavorited(next);
    setIsLoading(true);

    try {
      if (next) {
        const { error } = await supabase.from("user_favorites").upsert(
          {
            user_id: user.id,
            item_type: normalizedType,
            item_id: itemId,
            title: title ?? null,
          },
          { onConflict: "user_id,item_type,item_id" },
        );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("item_type", normalizedType)
          .eq("item_id", itemId);
        if (error) throw error;
      }

      // Let other mounted instances (e.g. cards + detail page) refresh.
      window.dispatchEvent(new CustomEvent("wccg-favorites-change"));
    } catch {
      setIsFavorited(!next);
    } finally {
      setIsLoading(false);
    }
  }, [user, isLoading, isFavorited, normalizedType, itemId, title]);

  return { isFavorited, toggle, isLoading };
}
