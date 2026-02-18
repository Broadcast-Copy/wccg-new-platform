"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./use-auth";
import { apiClient } from "@/lib/api-client";

/**
 * Hook to manage favorites for a specific item.
 *
 * Provides the current favorited state and a toggle function.
 * Automatically syncs with the backend API.
 *
 * @param itemType - The type of item (e.g., "show", "stream")
 * @param itemId - The ID of the item
 */
export function useFavorites(itemType: string, itemId: string) {
  const { user } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch initial favorite status
  useEffect(() => {
    if (!user) {
      setIsFavorited(false);
      return;
    }

    let cancelled = false;

    async function checkFavorite() {
      try {
        const response = await apiClient<{ favorited: boolean }>(
          `/favorites/${itemType}/${itemId}`,
        );
        if (!cancelled) {
          setIsFavorited(response.favorited);
        }
      } catch {
        // Silently fail — user may not be authenticated or endpoint not ready
      }
    }

    checkFavorite();

    return () => {
      cancelled = true;
    };
  }, [user, itemType, itemId]);

  const toggle = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    const previousState = isFavorited;
    setIsFavorited(!previousState); // Optimistic update

    try {
      if (previousState) {
        await apiClient(`/favorites/${itemType}/${itemId}`, {
          method: "DELETE",
        });
      } else {
        await apiClient(`/favorites`, {
          method: "POST",
          body: JSON.stringify({ itemType, itemId }),
        });
      }
    } catch {
      setIsFavorited(previousState); // Rollback on error
    } finally {
      setIsLoading(false);
    }
  }, [user, isFavorited, itemType, itemId]);

  return { isFavorited, toggle, isLoading };
}
