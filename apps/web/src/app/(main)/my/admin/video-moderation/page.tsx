"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Film,
  Loader2,
  RefreshCw,
  Check,
  X,
  ExternalLink,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PendingVideo {
  id: string;
  title: string;
  creator_name: string | null;
  description: string | null;
  category: string | null;
  rating: string;
  thumbnail_url: string | null;
  youtube_id: string | null;
  created_at: string;
}

function thumbFor(v: PendingVideo): string | null {
  if (v.thumbnail_url) return v.thumbnail_url;
  if (v.youtube_id) return `https://i.ytimg.com/vi/${v.youtube_id}/hqdefault.jpg`;
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VideoModerationPage() {
  const { supabase } = useSupabase();
  const { user, isLoading: authLoading } = useAuth();

  const [rows, setRows] = useState<PendingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const fetchPending = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("videos")
      .select(
        "id, title, creator_name, description, category, rating, thumbnail_url, youtube_id, created_at"
      )
      .eq("status", "pending_review")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch pending videos:", error);
      toast.error("Failed to load the moderation queue");
      setRows([]);
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const approve = async (v: PendingVideo) => {
    setActing(v.id);
    const { error } = await supabase
      .from("videos")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", v.id);

    if (error) {
      toast.error(`Approve failed: ${error.message}`);
    } else {
      setRows((prev) => prev.filter((r) => r.id !== v.id));
      toast.success(`"${v.title}" published to the Watch feed`);
    }
    setActing(null);
  };

  const reject = async (v: PendingVideo) => {
    setActing(v.id);
    const { error } = await supabase
      .from("videos")
      .update({ status: "removed" })
      .eq("id", v.id);

    if (error) {
      toast.error(`Reject failed: ${error.message}`);
    } else {
      setRows((prev) => prev.filter((r) => r.id !== v.id));
      toast.success(`"${v.title}" rejected`);
    }
    setActing(null);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ec4899]/10 border border-[#ec4899]/20">
            <Film className="h-7 w-7 text-[#ec4899]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Video Moderation
            </h1>
            <p className="text-sm text-muted-foreground">
              Review creator submissions before they hit the main Watch feed
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPending}
          disabled={loading}
          className="border-[#ec4899]/30 text-[#ec4899] hover:bg-[#ec4899]/10"
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Count */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          Awaiting Review
        </p>
        <p className="mt-1 text-2xl font-bold text-[#ec4899]">{rows.length}</p>
      </div>

      {/* Queue */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16">
          <Inbox className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No videos awaiting review. The Watch feed is up to date.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((v) => {
            const thumb = thumbFor(v);
            return (
              <div
                key={v.id}
                className="flex flex-col sm:flex-row gap-4 rounded-xl border border-border bg-card p-4"
              >
                {/* Thumbnail */}
                <a
                  href={`/videos/${v.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative block w-full sm:w-44 shrink-0 overflow-hidden rounded-lg bg-muted aspect-video group"
                >
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Film className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
                    <ExternalLink className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                </a>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{v.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {v.creator_name || "Unknown creator"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {v.category && (
                      <Badge variant="outline" className="text-[10px]">
                        {v.category}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {v.rating}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground/60">
                      Submitted{" "}
                      {new Date(v.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  {v.description && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                      {v.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex sm:flex-col items-center gap-2 shrink-0 sm:justify-center">
                  <Button
                    size="sm"
                    onClick={() => approve(v)}
                    disabled={acting === v.id}
                    className="bg-[#22c55e] hover:bg-[#16a34a] text-white w-full"
                  >
                    {acting === v.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Publish
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => reject(v)}
                    disabled={acting === v.id}
                    className="border-[#dc2626]/30 text-[#dc2626] hover:bg-[#dc2626]/10 w-full"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4 text-center">
        <p className="text-xs text-muted-foreground/60">
          Publishing makes the video public on /videos. Station staff &amp; the
          YouTube reseeder bypass review; only signed-in creators are queued here.
        </p>
      </div>
    </div>
  );
}
