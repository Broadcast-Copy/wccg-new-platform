"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoles } from "@/hooks/use-user-roles";
import { Heart, ChevronDown, Link2, LogIn, Lock, Sparkles, LayoutList, Clapperboard, Paperclip, X, FileText, Film } from "lucide-react";
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
  /** Profile-feed mode: show only this user's posts (across every hub) and
   *  let only that user compose (their posts land in `hubType`). Used by the
   *  public DJ profiles. */
  authorId?: string;
}

interface HubPost {
  id: string;
  hub_type: string;
  user_id: string;
  post_type: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
  media_paths: string[] | null;
  link_url: string | null;
  likes_count: number;
  created_at: string;
  // joined
  display_name?: string;
  username?: string;
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

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "avif", "heic", "heif"];
const VIDEO_EXTS = ["mp4", "mov", "webm", "m4v", "ogv"];
/** Infer a media kind from a path/name extension so one post can mix types. */
function mediaKind(pathOrName: string): "image" | "video" | "pdf" | "other" {
  const ext = pathOrName.split(".").pop()?.toLowerCase() ?? "";
  if (IMAGE_EXTS.includes(ext)) return "image";
  if (VIDEO_EXTS.includes(ext)) return "video";
  if (ext === "pdf") return "pdf";
  return "other";
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

export function HubFeed({ hubType, accentColor, postTypes, placeholder, authorId }: HubFeedProps) {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const { hasRealRole } = useUserRoles();
  // Listeners may post in the Listener hub; the Creator/Vendor hubs are
  // post-restricted to creators/vendors (admins always pass via hasRealRole).
  // Profile-feed mode: only the profile's owner composes on their own feed.
  const canPost = authorId
    ? user?.id === authorId
    : hubType === "listener" ||
      (hubType === "creator" && hasRealRole("content_creator")) ||
      (hubType === "vendor" && hasRealRole("vendor"));

  // Feed vs. Reels (TikTok-style) view. Defaults to the post feed; kept in
  // component state so switching tabs doesn't lose the loaded post list.
  const [mode, setMode] = useState<"feed" | "reels">("feed");

  // Composer state
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState(postTypes[0]?.value ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

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

      // Profile-feed mode shows the author's posts from EVERY hub; hub mode
      // shows one hub's posts from everyone.
      let query = supabase.from("hub_posts").select("*");
      query = authorId ? query.eq("user_id", authorId) : query.eq("hub_type", hubType);
      const { data: rawPosts } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (!rawPosts) return null;

      // Fetch profile display names + usernames (for /u/<username> links)
      const userIds = [...new Set(rawPosts.map((p) => p.user_id))];
      const { data: profiles } = userIds.length
        ? await supabase
            .from("profiles_public")
            .select("id, display_name, username")
            .in("id", userIds)
        : { data: [] };

      const profileMap = new Map(
        (profiles ?? []).map(
          (p: { id: string; display_name: string | null; username: string | null }) => [
            p.id,
            { display_name: p.display_name, username: p.username },
          ]
        )
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

      const enriched: HubPost[] = rawPosts.map((p) => {
        const prof = profileMap.get(p.user_id);
        return {
          ...p,
          display_name: prof?.display_name ?? "Unknown",
          username: prof?.username ?? undefined,
          liked: likedSet.has(p.id),
        };
      });

      return { posts: enriched, hasMore: rawPosts.length === PAGE_SIZE };
    },
    [supabase, hubType, user, authorId]
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

  // ------- Submit post (with optional image / video / PDF attachments) -------
  const MAX_FILES = 4;
  const handleSubmit = async () => {
    if (!user || (!content.trim() && files.length === 0)) return;
    setSubmitting(true);
    setUploadErr(null);

    try {
      const mediaPaths: string[] = [];
      let mediaType: string | null = null;
      if (files.length) {
        const folder = `${user.id}/${Date.now()}`;
        for (const f of files) {
          const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
          const path = `${folder}/${crypto.randomUUID()}-${safe}`;
          const { error: upErr } = await supabase.storage
            .from("post-media")
            .upload(path, f, { upsert: false, contentType: f.type || undefined });
          if (upErr) throw new Error(upErr.message);
          mediaPaths.push(path);
        }
        // One coarse media_type for the post (video > image > pdf); render still
        // infers each attachment's kind from its own path so mixed posts work.
        const kinds = files.map((f) =>
          f.type.startsWith("video/")
            ? "video"
            : f.type.startsWith("image/")
              ? "image"
              : f.type === "application/pdf"
                ? "pdf"
                : "other",
        );
        mediaType = kinds.includes("video")
          ? "video"
          : kinds.includes("image")
            ? "image"
            : kinds.includes("pdf")
              ? "pdf"
              : null;
      }

      const { error } = await supabase.from("hub_posts").insert({
        hub_type: hubType,
        user_id: user.id,
        post_type: postType,
        content: content.trim(),
        media_type: mediaType,
        media_paths: mediaPaths.length ? mediaPaths : null,
      });
      if (error) throw new Error(error.message);

      setContent("");
      setFiles([]);
      setPage(0);
      const res = await fetchPage(0);
      if (res) {
        setPosts(res.posts);
        setHasMore(res.hasMore);
      }
    } catch (e) {
      setUploadErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // Add picked files: cap at MAX_FILES, reject oversized (video 100MB / else 25MB).
  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    setUploadErr(null);
    const picked = Array.from(incoming);
    const tooBig = picked.find((f) =>
      f.type.startsWith("video/") ? f.size > 100 * 1024 * 1024 : f.size > 25 * 1024 * 1024,
    );
    if (tooBig) {
      setUploadErr(`"${tooBig.name}" is too large (max 100 MB video / 25 MB image·PDF).`);
      return;
    }
    setFiles((prev) => [...prev, ...picked].slice(0, MAX_FILES));
  };

  const publicUrl = (path: string) =>
    supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl;

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

    // Toggle server-side via a SECURITY DEFINER RPC that flips the
    // hub_post_likes row and recomputes likes_count atomically. A client-side
    // read-modify-write of hub_posts.likes_count can't work here: RLS limits
    // hub_posts UPDATE to the author's own rows, so cross-user likes silently
    // matched 0 rows and the stored counter never moved.
    const { data, error } = await supabase.rpc("hub_post_toggle_like", {
      p_post_id: post.id,
    });
    if (error || typeof data !== "number") {
      // Roll back the optimistic flip
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, liked: post.liked, likes_count: post.likes_count }
            : p
        )
      );
      return;
    }
    // Reconcile with the authoritative server count
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, likes_count: data } : p))
    );
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
            {uploadErr && <p className="text-xs text-red-500">{uploadErr}</p>}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <span
                    key={`${f.name}-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-foreground/[0.04] py-1 pl-1.5 pr-2 text-xs"
                  >
                    {f.type.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={URL.createObjectURL(f)} alt="" className="h-7 w-7 rounded object-cover" />
                    ) : f.type.startsWith("video/") ? (
                      <Film className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="max-w-[8rem] truncate text-foreground/80">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-red-500"
                      aria-label={`Remove ${f.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,video/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                addFiles(e.currentTarget.files);
                e.currentTarget.value = "";
              }}
            />
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
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
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={files.length >= MAX_FILES}
                  title="Attach images, video, or a PDF"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-foreground/[0.04] px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                >
                  <Paperclip className="h-4 w-4" />
                  Attach
                </button>
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting || (!content.trim() && files.length === 0)}
                className="rounded-full px-6 py-2 text-sm font-bold text-white shadow-sm transition-all hover:brightness-105 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                style={{ backgroundColor: accentColor }}
              >
                {submitting ? "Posting..." : "Share 🎉"}
              </button>
            </div>
          </div>
        </div>
        ) : authorId ? null : (
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
      ) : authorId ? null : (
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
          <p className="mt-1 text-sm text-muted-foreground">
            {authorId ? (canPost ? "Share your first post 🎉" : "No posts yet — check back soon.") : "Be the first to share 🎉"}
          </p>
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
                  {post.username ? (
                    <Link
                      href={`/u/${post.username}`}
                      className="group/author flex min-w-0 flex-1 items-center gap-3"
                    >
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
                        <span className="text-sm font-semibold text-foreground group-hover/author:underline">
                          {post.display_name}
                        </span>
                        <span className="mx-2 text-muted-foreground/40">·</span>
                        <span className="text-xs text-muted-foreground">
                          {relativeTime(post.created_at)}
                        </span>
                      </div>
                    </Link>
                  ) : (
                    <>
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
                    </>
                  )}
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

                {/* Media (legacy single linked image) */}
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

                {/* Attached media — images / videos / PDFs (each rendered by its own kind) */}
                {post.media_paths && post.media_paths.length > 0 && (
                  <div className={`grid gap-2 ${post.media_paths.length > 1 ? "sm:grid-cols-2" : ""}`}>
                    {post.media_paths.map((path) => {
                      const url = publicUrl(path);
                      const kind = mediaKind(path);
                      if (kind === "image") {
                        return (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={path}
                            src={url}
                            alt="Post attachment"
                            loading="lazy"
                            className="w-full max-h-96 rounded-lg border border-border object-cover"
                          />
                        );
                      }
                      if (kind === "video") {
                        return (
                          <video
                            key={path}
                            src={url}
                            controls
                            preload="metadata"
                            className="w-full max-h-96 rounded-lg border border-border bg-black"
                          />
                        );
                      }
                      const name = (path.split("/").pop() ?? "Attachment").replace(/^[0-9a-f-]+-/i, "");
                      return (
                        <a
                          key={path}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-lg border border-border bg-foreground/[0.04] px-3 py-2.5 text-sm transition-colors hover:border-input"
                        >
                          <FileText className="h-5 w-5 shrink-0" style={{ color: accentColor }} />
                          <span className="min-w-0 flex-1 truncate text-foreground/90">{name}</span>
                          <span className="shrink-0 text-xs font-semibold text-muted-foreground">PDF</span>
                        </a>
                      );
                    })}
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
