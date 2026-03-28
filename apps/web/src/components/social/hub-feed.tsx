"use client";

import { useState, useEffect, useCallback } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import { Heart, ChevronDown, ImageIcon, Link2, LogIn } from "lucide-react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PostType {
  value: string;
  label: string;
}

interface HubFeedProps {
  hubType: "creator" | "vendor" | "listener";
  accentColor: string;
  postTypes: PostType[];
  placeholder: string;
}

interface HubPost {
  id: string;
  hub_type: string;
  user_id: string;
  post_type: string;
  content: string;
  media_url: string | null;
  link_url: string | null;
  likes_count: number;
  created_at: string;
  // joined
  display_name?: string;
  liked?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
  } catch {
    /* ignore */
  }
  return null;
}

function initials(name: string): string {
  return (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const PAGE_SIZE = 20;

export function HubFeed({ hubType, accentColor, postTypes, placeholder }: HubFeedProps) {
  const { supabase } = useSupabase();
  const { user } = useAuth();

  // Composer state
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState(postTypes[0]?.value ?? "");
  const [submitting, setSubmitting] = useState(false);

  // Feed state
  const [posts, setPosts] = useState<HubPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  // ------- Fetch posts -------
  const fetchPosts = useCallback(
    async (pageNum: number, append = false) => {
      setLoading(true);
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: rawPosts } = await supabase
        .from("hub_posts")
        .select("*")
        .eq("hub_type", hubType)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (!rawPosts) {
        setLoading(false);
        return;
      }

      setHasMore(rawPosts.length === PAGE_SIZE);

      // Fetch profile display names
      const userIds = [...new Set(rawPosts.map((p) => p.user_id))];
      const { data: profiles } = userIds.length
        ? await supabase
            .from("profiles")
            .select("id, display_name")
            .in("id", userIds)
        : { data: [] };

      const profileMap = new Map(
        (profiles ?? []).map((p: { id: string; display_name: string }) => [p.id, p.display_name])
      );

      // Check which posts the current user has liked
      let likedSet = new Set<string>();
      if (user) {
        const postIds = rawPosts.map((p) => p.id);
        const { data: likes } = await supabase
          .from("hub_post_likes")
          .select("post_id")
          .eq("user_id", user.id)
          .in("post_id", postIds);
        likedSet = new Set((likes ?? []).map((l: { post_id: string }) => l.post_id));
      }

      const enriched: HubPost[] = rawPosts.map((p) => ({
        ...p,
        display_name: profileMap.get(p.user_id) ?? "Unknown",
        liked: likedSet.has(p.id),
      }));

      setPosts((prev) => (append ? [...prev, ...enriched] : enriched));
      setLoading(false);
    },
    [supabase, hubType, user]
  );

  useEffect(() => {
    fetchPosts(0);
  }, [fetchPosts]);

  // ------- Load more -------
  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPosts(next, true);
  };

  // ------- Submit post -------
  const handleSubmit = async () => {
    if (!user || !content.trim()) return;
    setSubmitting(true);

    const { error } = await supabase.from("hub_posts").insert({
      hub_type: hubType,
      user_id: user.id,
      post_type: postType,
      content: content.trim(),
    });

    if (!error) {
      setContent("");
      setPage(0);
      fetchPosts(0);
    }
    setSubmitting(false);
  };

  // ------- Like / unlike -------
  const toggleLike = async (post: HubPost) => {
    if (!user) return;

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              liked: !p.liked,
              likes_count: p.liked ? p.likes_count - 1 : p.likes_count + 1,
            }
          : p
      )
    );

    if (post.liked) {
      await supabase
        .from("hub_post_likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", user.id);
      // Decrement likes_count on the post row
      await supabase.from("hub_posts").update({ likes_count: Math.max(0, post.likes_count - 1) }).eq("id", post.id);
    } else {
      await supabase
        .from("hub_post_likes")
        .insert({ post_id: post.id, user_id: user.id });
      // Increment likes_count on the post row
      await supabase.from("hub_posts").update({ likes_count: post.likes_count + 1 }).eq("id", post.id);
    }
  };

  // ------- Post type label lookup -------
  const typeLabel = (val: string) =>
    postTypes.find((t) => t.value === val)?.label ?? val;

  // ------- Render -------
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Community Feed</h2>

      {/* ---- Composer ---- */}
      {user ? (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="w-full rounded-lg border border-border bg-foreground/[0.04] px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/20 focus:border-[var(--accent)] focus:outline-none resize-none"
            style={{ "--accent": accentColor } as React.CSSProperties}
          />
          <div className="flex items-center justify-between gap-3">
            <select
              value={postType}
              onChange={(e) => setPostType(e.target.value)}
              className="rounded-lg border border-border bg-foreground/[0.04] px-3 py-1.5 text-sm text-foreground focus:outline-none"
            >
              {postTypes.map((pt) => (
                <option key={pt.value} value={pt.value} className="bg-card">
                  {pt.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleSubmit}
              disabled={submitting || !content.trim()}
              className="rounded-full px-6 py-2 text-sm font-bold text-white disabled:opacity-50 transition-colors"
              style={{ backgroundColor: accentColor }}
            >
              {submitting ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <LogIn className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-3">Sign in to share with the community</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold text-white"
            style={{ backgroundColor: accentColor }}
          >
            Sign In
          </Link>
        </div>
      )}

      {/* ---- Posts ---- */}
      {loading && posts.length === 0 ? (
        <div className="flex justify-center py-12">
          <div
            className="h-7 w-7 animate-spin rounded-full border-3 border-t-transparent"
            style={{ borderColor: accentColor, borderTopColor: "transparent" }}
          />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No posts yet — be the first to share!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const ytId = post.link_url ? getYouTubeId(post.link_url) : null;

            return (
              <div
                key={post.id}
                className="rounded-xl border border-border bg-card p-4 space-y-3"
              >
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    {initials(post.display_name ?? "")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-sm text-foreground">
                      {post.display_name}
                    </span>
                    <span className="mx-2 text-muted-foreground/40">·</span>
                    <span className="text-xs text-muted-foreground">
                      {relativeTime(post.created_at)}
                    </span>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                    style={{
                      backgroundColor: `${accentColor}15`,
                      color: accentColor,
                    }}
                  >
                    {typeLabel(post.post_type)}
                  </span>
                </div>

                {/* Content */}
                <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {post.content}
                </p>

                {/* Media */}
                {post.media_url && (
                  <div className="rounded-lg overflow-hidden border border-border">
                    <img
                      src={post.media_url}
                      alt="Post media"
                      className="w-full max-h-80 object-cover"
                    />
                  </div>
                )}

                {/* YouTube embed */}
                {ytId && (
                  <div className="rounded-lg overflow-hidden border border-border aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}`}
                      title="YouTube embed"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                )}

                {/* Non-YouTube link */}
                {post.link_url && !ytId && (
                  <a
                    href={post.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm hover:underline"
                    style={{ color: accentColor }}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    {post.link_url}
                  </a>
                )}

                {/* Actions */}
                <div className="flex items-center gap-4 pt-1">
                  <button
                    onClick={() => toggleLike(post)}
                    disabled={!user}
                    className="flex items-center gap-1.5 text-sm transition-colors disabled:opacity-40"
                    style={{ color: post.liked ? accentColor : undefined }}
                  >
                    <Heart
                      className="h-4 w-4"
                      fill={post.liked ? accentColor : "none"}
                      stroke={post.liked ? accentColor : "currentColor"}
                    />
                    <span className="text-muted-foreground">{post.likes_count}</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Load more */}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="w-full rounded-xl border border-border bg-card py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-input transition-colors flex items-center justify-center gap-2"
            >
              <ChevronDown className="h-4 w-4" />
              {loading ? "Loading..." : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
