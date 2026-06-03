"use client";

import { useState, useEffect, useCallback } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoles } from "@/hooks/use-user-roles";
import { Heart, ChevronDown, Link2, LogIn, Lock, Sparkles, LayoutList, Clapperboard } from "lucide-react";
import Link from "next/link";
import { HubReels } from "@/components/social/hub-reels";

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

/** A friendly emoji for a post type, matched loosely by keyword so any hub's
 *  custom post types still get something fun. Falls back to a speech balloon. */
function postEmoji(value: string, label: string): string {
  const k = `${value} ${label}`.toLowerCase();
  if (k.includes("now") || k.includes("playing") || k.includes("track") || k.includes("song")) return "🎵";
  if (k.includes("review")) return "⭐";
  if (k.includes("shout")) return "📣";
  if (k.includes("milestone") || k.includes("achieve")) return "🏆";
  if (k.includes("question") || k.includes("ask")) return "❓";
  if (k.includes("event") || k.includes("show")) return "📅";
  if (k.includes("deal") || k.includes("offer") || k.includes("promo")) return "🏷️";
  if (k.includes("hire") || k.includes("job") || k.includes("gig")) return "💼";
  if (k.includes("release") || k.includes("drop") || k.includes("new")) return "🚀";
  if (k.includes("collab")) return "🤝";
  return "💬";
}

/** Pleasant, deterministic avatar gradient derived from a name so each member
 *  gets a consistent splash of colour (kept in the accent family via the ring). */
function avatarHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const PAGE_SIZE = 20;

export function HubFeed({ hubType, accentColor, postTypes, placeholder }: HubFeedProps) {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const { hasRealRole } = useUserRoles();
  // Listeners may post in the Listener hub; the Creator/Vendor hubs are
  // post-restricted to creators/vendors (admins always pass via hasRealRole).
  const canPost =
    hubType === "listener" ||
    (hubType === "creator" && hasRealRole("content_creator")) ||
    (hubType === "vendor" && hasRealRole("vendor"));

  // Feed vs. Reels (TikTok-style) view. Defaults to the post feed; kept in
  // component state so switching tabs doesn't lose the loaded post list.
  const [mode, setMode] = useState<"feed" | "reels">("feed");

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
  // Pure async loader: fetches one page + enriches it, and returns the rows.
  // It never calls setState itself — callers own that (so the mount effect can
  // set results inside a `.then`, satisfying react-hooks/set-state-in-effect).
  const fetchPage = useCallback(
    async (pageNum: number): Promise<{ posts: HubPost[]; hasMore: boolean } | null> => {
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: rawPosts } = await supabase
        .from("hub_posts")
        .select("*")
        .eq("hub_type", hubType)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (!rawPosts) return null;

      // Fetch profile display names
      const userIds = [...new Set(rawPosts.map((p) => p.user_id))];
      const { data: profiles } = userIds.length
        ? await supabase
            .from("profiles_public")
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

      return { posts: enriched, hasMore: rawPosts.length === PAGE_SIZE };
    },
    [supabase, hubType, user]
  );

  // Initial load (and reload when hub/user identity changes). setState lives in
  // the `.then` (post-await) + an `active` guard drops results from a stale run.
  useEffect(() => {
    let active = true;
    fetchPage(0).then((res) => {
      if (!active) return;
      if (res) {
        setPosts(res.posts);
        setHasMore(res.hasMore);
      }
      setPage(0);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [fetchPage]);

  // ------- Load more -------
  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    setLoading(true);
    fetchPage(next).then((res) => {
      if (res) {
        setPosts((prev) => [...prev, ...res.posts]);
        setHasMore(res.hasMore);
      }
      setLoading(false);
    });
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
      const res = await fetchPage(0);
      if (res) {
        setPosts(res.posts);
        setHasMore(res.hasMore);
      }
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
      {/* ---- Header + mode toggle ---- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <Sparkles className="h-5 w-5" style={{ color: accentColor }} />
          Community Feed
        </h2>
        {/* Feed / Reels pills */}
        <div className="inline-flex rounded-full border border-border bg-card p-1">
          {([
            { key: "feed", label: "Feed", Icon: LayoutList },
            { key: "reels", label: "Reels", Icon: Clapperboard },
          ] as const).map(({ key, label, Icon }) => {
            const on = mode === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                aria-pressed={on}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold transition-colors"
                style={
                  on
                    ? { backgroundColor: accentColor, color: "#fff" }
                    : { color: "var(--muted-foreground)" }
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- Reels (TikTok-style) ---- */}
      {mode === "reels" ? (
        <HubReels accentColor={accentColor} />
      ) : (
      <>
      {/* ---- Composer (role-gated: listeners can't post in creator/vendor hubs) ---- */}
      {user ? (
        canPost ? (
        <div
          className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
        >
          {/* Friendly gradient header */}
          <div
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white"
            style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}b3)` }}
          >
            <Sparkles className="h-4 w-4" />
            What&apos;s on your mind?
          </div>
          <div className="space-y-3 p-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholder}
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-foreground/[0.04] px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              style={{ "--accent": accentColor } as React.CSSProperties}
            />
            <div className="flex items-center justify-between gap-3">
              <select
                value={postType}
                onChange={(e) => setPostType(e.target.value)}
                className="rounded-full border border-border bg-foreground/[0.04] px-3 py-1.5 text-sm text-foreground focus:outline-none"
              >
                {postTypes.map((pt) => (
                  <option key={pt.value} value={pt.value} className="bg-card">
                    {postEmoji(pt.value, pt.label)} {pt.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleSubmit}
                disabled={submitting || !content.trim()}
                className="rounded-full px-6 py-2 text-sm font-bold text-white shadow-sm transition-all hover:brightness-105 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                style={{ backgroundColor: accentColor }}
              >
                {submitting ? "Posting..." : "Share 🎉"}
              </button>
            </div>
          </div>
        </div>
        ) : (
          <div
            className="rounded-2xl border border-border p-6 text-center"
            style={{ background: `linear-gradient(135deg, ${accentColor}14, transparent)` }}
          >
            <div
              className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: `${accentColor}1f`, color: accentColor }}
            >
              <Lock className="h-5 w-5" />
            </div>
            <p className="mb-1 text-sm font-semibold text-foreground">
              Only {hubType === "creator" ? "creators" : "vendors"} can post here
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              You can read &amp; react — become a {hubType === "creator" ? "creator" : "vendor"} to post and join the conversation.
            </p>
            <Link
              href={hubType === "creator" ? "/creators" : "/become-vendor"}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold text-white shadow-sm transition-transform hover:scale-105"
              style={{ backgroundColor: accentColor }}
            >
              Become a {hubType === "creator" ? "Creator" : "Vendor"}
            </Link>
          </div>
        )
      ) : (
        <div
          className="rounded-2xl border border-border p-6 text-center"
          style={{ background: `linear-gradient(135deg, ${accentColor}14, transparent)` }}
        >
          <div
            className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: `${accentColor}1f`, color: accentColor }}
          >
            <LogIn className="h-5 w-5" />
          </div>
          <p className="mb-3 text-sm text-muted-foreground">Sign in to join the conversation 👋</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold text-white shadow-sm transition-transform hover:scale-105"
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
        <div
          className="rounded-2xl border border-dashed border-border p-10 text-center"
          style={{ background: `linear-gradient(135deg, ${accentColor}12, transparent)` }}
        >
          <div className="mb-2 text-4xl" aria-hidden>
            🎉
          </div>
          <p className="font-semibold text-foreground">It&apos;s quiet in here</p>
          <p className="mt-1 text-sm text-muted-foreground">Be the first to share 🎉</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const ytId = post.link_url ? getYouTubeId(post.link_url) : null;
            const name = post.display_name ?? "";
            const hue = avatarHue(name || post.user_id);

            return (
              <div
                key={post.id}
                className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-input hover:shadow-md"
              >
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm ring-2"
                    style={{
                      background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 40) % 360} 70% 45%))`,
                      // colored ring in the hub accent to tie members together
                      ["--tw-ring-color" as string]: `${accentColor}66`,
                    }}
                  >
                    {initials(name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-semibold text-foreground">
                      {post.display_name}
                    </span>
                    <span className="mx-2 text-muted-foreground/40">·</span>
                    <span className="text-xs text-muted-foreground">
                      {relativeTime(post.created_at)}
                    </span>
                  </div>
                  <span
                    className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                    style={{
                      backgroundColor: `${accentColor}1f`,
                      color: accentColor,
                    }}
                  >
                    <span aria-hidden>{postEmoji(post.post_type, typeLabel(post.post_type))}</span>
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
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
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => toggleLike(post)}
                    disabled={!user}
                    className="group/like inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-foreground/[0.05] disabled:opacity-40 disabled:hover:bg-transparent"
                    style={{ color: post.liked ? accentColor : undefined }}
                  >
                    <Heart
                      className="h-4 w-4 transition-transform group-active/like:scale-125"
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
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-input hover:text-foreground"
            >
              <ChevronDown className="h-4 w-4" />
              {loading ? "Loading..." : "Load more"}
            </button>
          )}
        </div>
      )}
      </>
      )}
    </div>
  );
}
