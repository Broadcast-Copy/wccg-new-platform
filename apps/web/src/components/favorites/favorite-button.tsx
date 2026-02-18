"use client";

import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useFavorites } from "@/hooks/use-favorites";

interface FavoriteButtonProps {
  /** The type of item to favorite (e.g., "show", "stream") */
  itemType: string;
  /** The ID of the item to favorite */
  itemId: string;
}

export function FavoriteButton({ itemType, itemId }: FavoriteButtonProps) {
  const { isFavorited, toggle, isLoading } = useFavorites(itemType, itemId);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => toggle()}
      disabled={isLoading}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        className={`h-5 w-5 transition-colors ${
          isFavorited
            ? "fill-red-500 text-red-500"
            : "text-muted-foreground"
        }`}
      />
    </Button>
  );
}
