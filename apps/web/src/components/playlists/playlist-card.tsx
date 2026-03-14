"use client";

import { Music, Share2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { awardSharePoints } from "@/hooks/use-listening-points";
import { toast } from "sonner";
import type { Playlist } from "@/lib/playlists";

/**
 * PlaylistCard — displays a playlist with song count, thumbnails, and actions.
 */
export function PlaylistCard({
  playlist,
  onEdit,
  onDelete,
}: {
  playlist: Playlist;
  onEdit?: (playlist: Playlist) => void;
  onDelete?: (id: string) => void;
}) {
  const songCount = playlist.songs.length;
  const firstThree = playlist.songs.slice(0, 3);

  const handleShare = async () => {
    const text = `Check out my "${playlist.name}" playlist on WCCG 104.5 FM! ${songCount} songs`;
    try {
      if (navigator.share) {
        await navigator.share({ title: playlist.name, text, url: "https://wccg1045fm.com" });
      } else {
        await navigator.clipboard.writeText(text);
      }
      const awarded = awardSharePoints();
      if (awarded) {
        toast.success("+2 pts for sharing!", { icon: "🎵", duration: 3000 });
      } else {
        toast.success("Playlist link copied!", { duration: 2000 });
      }
    } catch {
      // User cancelled
    }
  };

  const createdDate = new Date(playlist.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card className="overflow-hidden border-border bg-card hover:border-[#74ddc7]/30 transition-colors">
      {/* Header gradient */}
      <div className="h-1.5 bg-gradient-to-r from-[#7401df] to-[#74ddc7]" />

      <div className="p-4 space-y-3">
        {/* Title and song count */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground truncate">
              {playlist.name}
            </h3>
            {playlist.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {playlist.description}
              </p>
            )}
          </div>
          <Badge
            variant="secondary"
            className="shrink-0 bg-[#74ddc7]/10 text-[#74ddc7] border-0"
          >
            {songCount} {songCount === 1 ? "song" : "songs"}
          </Badge>
        </div>

        {/* Song thumbnails */}
        <div className="flex items-center gap-1.5">
          {firstThree.length > 0 ? (
            firstThree.map((song, i) => (
              <div
                key={i}
                className="h-8 w-8 rounded-full bg-gradient-to-br from-[#74ddc7]/20 to-[#7401df]/20 border border-border flex items-center justify-center overflow-hidden"
              >
                {song.albumArt ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={song.albumArt}
                    alt={song.title}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <Music className="h-3 w-3 text-[#74ddc7]" />
                )}
              </div>
            ))
          ) : (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Music className="h-4 w-4" />
              <span className="text-xs">No songs yet</span>
            </div>
          )}
          {songCount > 3 && (
            <span className="text-[10px] text-muted-foreground ml-1">
              +{songCount - 3} more
            </span>
          )}
        </div>

        {/* Footer: date + actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-[10px] text-muted-foreground">
            Created {createdDate}
          </span>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              aria-label="Share playlist"
              className="h-7 w-7 rounded-full text-muted-foreground hover:text-[#74ddc7] hover:bg-[#74ddc7]/10"
            >
              <Share2 className="h-3.5 w-3.5" />
            </Button>
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(playlist)}
                aria-label="Edit playlist"
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(playlist.id)}
                aria-label="Delete playlist"
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
