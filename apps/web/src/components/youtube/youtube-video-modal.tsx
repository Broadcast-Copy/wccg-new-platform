"use client";

import { useEffect, useRef, useState } from "react";
import { Award, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { awardVideoWatchPoints } from "@/hooks/use-listening-points";

interface YouTubeVideoModalProps {
  videoId: string | null;
  title: string;
  onClose: () => void;
}

export function YouTubeVideoModal({
  videoId,
  title,
  onClose,
}: YouTubeVideoModalProps) {
  const [pointsAwarded, setPointsAwarded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!videoId) {
      setPointsAwarded(false);
      return;
    }

    // Award points after 15 seconds of watching
    timerRef.current = setTimeout(() => {
      const awarded = awardVideoWatchPoints(videoId);
      if (awarded) setPointsAwarded(true);
    }, 15_000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [videoId]);

  return (
    <Dialog open={!!videoId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-4xl gap-0 overflow-hidden border-border bg-black p-0 sm:max-w-4xl"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <DialogTitle className="line-clamp-1 text-sm font-medium text-white">
            {title}
          </DialogTitle>
          <div className="flex items-center gap-3">
            {pointsAwarded && (
              <span className="flex items-center gap-1.5 rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-semibold text-yellow-400">
                <Award className="h-3.5 w-3.5" />
                +3 pts
              </span>
            )}
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="relative aspect-video w-full">
          {videoId && (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
              title={title}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
