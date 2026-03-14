"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Music, Star, Send, CheckCircle2 } from "lucide-react";
import { saveRequest } from "@/lib/song-requests";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export function RequestForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmitted, setLastSubmitted] = useState<string | null>(null);

  function handleSubmit(isPriority: boolean) {
    if (!title.trim() || !artist.trim()) {
      toast.error("Please enter both a song title and artist name.");
      return;
    }

    setSubmitting(true);

    // Simulate a short delay
    setTimeout(() => {
      saveRequest(title.trim(), artist.trim(), isPriority, user?.email);

      const msg = isPriority
        ? `Priority request submitted! "${title}" by ${artist} will jump the queue.`
        : `Request submitted! "${title}" by ${artist} has been added to the queue.`;

      toast.success(msg);
      setLastSubmitted(`${title} - ${artist}`);
      setTitle("");
      setArtist("");
      setSubmitting(false);
      onSubmitted?.();
    }, 500);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Music className="h-5 w-5 text-[#74ddc7]" />
        <h3 className="text-lg font-bold text-foreground">Request a Song</h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="song-title" className="text-xs font-medium text-muted-foreground">
            Song Title
          </label>
          <Input
            id="song-title"
            placeholder='e.g. "Best Part"'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-white/5 border-border"
            disabled={submitting}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="song-artist" className="text-xs font-medium text-muted-foreground">
            Artist
          </label>
          <Input
            id="song-artist"
            placeholder='e.g. "Daniel Caesar"'
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            className="bg-white/5 border-border"
            disabled={submitting}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => handleSubmit(false)}
          disabled={submitting || !title.trim() || !artist.trim()}
          className="rounded-full bg-[#74ddc7] text-[#0a0a0f] font-bold hover:bg-[#74ddc7]/90 px-6"
        >
          <Send className="mr-2 h-4 w-4" />
          Request (Free)
        </Button>
        <Button
          onClick={() => handleSubmit(true)}
          disabled={submitting || !title.trim() || !artist.trim()}
          className="rounded-full bg-[#7401df] text-white font-bold hover:bg-[#7401df]/90 px-6"
        >
          <Star className="mr-2 h-4 w-4" />
          Priority (25 pts)
        </Button>
      </div>

      {lastSubmitted && (
        <div className="flex items-center gap-2 text-sm text-[#22c55e]">
          <CheckCircle2 className="h-4 w-4" />
          <span>
            Last request: <span className="font-medium">{lastSubmitted}</span>
          </span>
        </div>
      )}

      <p className="text-xs text-muted-foreground/60">
        Priority requests cost 25 points and jump to the front of the queue. Free requests
        are added at the end.
      </p>
    </div>
  );
}
