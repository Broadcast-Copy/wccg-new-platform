"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./use-auth";

const FAVORITES_STORAGE_KEY = "wccg_favorites";

function getStoredFavorites(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setStoredFavorites(favorites: Record<string, string[]>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
}

/**
 * Hook to manage favorites for a specific item.
 * Uses localStorage for persistence (works without API).
 */
export function useFavorites(itemType: string, itemId: string) {
  const { user } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load favorite state from localStorage
  useEffect(() => {
    const favorites = getStoredFavorites();
    const key = itemType;
    const items = favorites[key] || [];
    setIsFavorited(items.includes(itemId));
  }, [itemType, itemId]);

  const toggle = useCallback(() => {
    setIsLoading(true);
    const favorites = getStoredFavorites();
    const key = itemType;
    const items = favorites[key] || [];

    if (items.includes(itemId)) {
      favorites[key] = items.filter((id) => id !== itemId);
      setIsFavorited(false);
    } else {
      favorites[key] = [...items, itemId];
      setIsFavorited(true);
    }

    setStoredFavorites(favorites);
    // Dispatch event so other components can react
    window.dispatchEvent(new CustomEvent("wccg-favorites-change"));
    setIsLoading(false);
  }, [itemType, itemId]);

  return { isFavorited, toggle, isLoading };
}

/** Get all favorites for a given type */
export function getFavoritesByType(itemType: string): string[] {
  const favorites = getStoredFavorites();
  return favorites[itemType] || [];
}
