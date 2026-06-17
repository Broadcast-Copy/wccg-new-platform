"use client";

/**
 * Public social profile at /u/[username].
 *
 * A read-only, social-media-style page for any WCCG member: a cover banner +
 * avatar, identity (name / @handle / bio), role badges, a member-since + stat
 * strip, an optional link out to the person's DJ page, and tabbed content
 * (Posts / Shows & Mixes / Videos). Empty tabs are hidden; the first non-empty
 * tab is selected by default.
 *
 * Everything is read directly from Supabase via the public anon client and is
 * PII-safe: the profile comes from the `profiles_public` view (never the
 * `profiles` base table, never an email). Posts / mixes / videos are all
 * public-readable (RLS is the real backstop; this page only ever asks for
 * published + public rows).
 *
 * The handle is unknown until the client mounts (useParams), so a single effect
 * loads everything once the handle is known. Per the enforced
 * react-hooks/set-state-in-effect rule, no setState runs synchronously in the
 * effect body — an async worker applies results behind an `active` guard.
 */

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  BadgeCheck,
  CalendarDays,
  Clapperboard,
  ExternalLink,
  Eye,
  Headphones,
  Heart,
  Link2,
  Loader2,
  Mic2,
  Music,
  Play,
  Store,
  UserPlus,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { MessageButton } from "@/components/messaging/message-button";
import { OnlineDot } from "@/components/social/online-dot";

// ---------------------------------------------------------------------------
// Row shapes (small, strict — no `any`). Columns mirror the queries below.
// ---------------------------------------------------------------------------

/** A row of the PII-safe `profiles_public` view. */
interface PublicProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  artist_name: string | null;
  created_at: string | null;
  username: string | null;
  bio: string | null;
  is_internal: boolean | null;
  has_creator_access: boolean | null;
  has_vendor_access: boolean | null;
  user_type: string | null;
  creator_type: string | null;
}

/** The `djs` row linked to this profile (gives a polished name + a DJ page). */
interface DjLink {
  id: string;
  slug: string | null;
  display_name: string | null;
}

/** A `hub_posts` row authored by this user. */
interface ProfilePost {
  id: string;
  hub_type: string | null;
  content: string | null;
  media_url: string | null;
  link_url: string | null;
  link_title: string | null;
  post_type: string | null;
  likes_count: number | null;
  created_at: string | null;
}

/** A published `dj_mixes` row (a show / mix / podcast episode). */
interface ProfileMix {
  id: string;
  title: string | null;
  description: string | null;
  audio_url: string | null;
  cover_image_url: string | null;
  duration: number | null;
  genre: string | null;
  play_count: number | null;
  item_type: string | null;
}

/** A published, public `videos` row. */
interface ProfileVideo {
  id: string;
  title: string | null;
  youtube_id: string | null;
  thumbnail_url: string | null;
  program: string | null;
  views: number | null;
  duration_seconds: number | null;
}

type TabKey = "posts" | "shows" | "videos";

// ---------------------------------------------------------------------------
// Display helpers (pure, hydration-safe — `timeAgo` reads Date.now() only in
// event/render after mount, never affecting the server render of this page,
// which is a static shim).
// ---------------------------------------------------------------------------

function initials(name: string): string {
  return (name || "?")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** "Jun 2025" from an ISO timestamp. */
function memberSince(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/** Compact relative timestamp, e.g. "3d ago". */
function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.round(mo / 12)}y ago`;
}

/** m:ss / h:mm:ss from a seconds count. */
function fmtDuration(s: number | null): string {
  if (!s || s <= 0) return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** Compact play/view counts, e.g. "1.2K". */
function fmtCount(n: number | null): string {
  const v = n ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return `${v}`;
}

/** YouTube thumbnail URL for a video (explicit thumbnail wins). */
function videoThumb(v: ProfileVideo): string {
  if (v.thumbnail_url) return v.thumbnail_url;
  if (v.youtube_id) return `https://i.ytimg.com/vi/${v.youtube_id}/hqdefault.jpg`;
  return "/images/logos/wccg-logo.png";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProfileClient() {
  // Resolve the @handle from the REAL URL. Under `output: export`, /u/<name> can
  // be served by the _placeholder shim, so useParams() returns "_placeholder" —
  // but usePathname() reflects the actual browser path, so derive the handle from
  // it (and it updates on client-side profile→profile navigation).
  const pathname = usePathname();
  const handle = useMemo(() => {
    const segs = (pathname ?? "").split("/").filter(Boolean);
    const i = segs.indexOf("u");
    const seg = i >= 0 ? segs[i + 1] : undefined;
    if (!seg || seg === "_placeholder") return "";
    try {
      return decodeURIComponent(seg);
    } catch {
      return seg;
    }
  }, [pathname]);

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [dj, setDj] = useState<DjLink | null>(null);
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [mixes, setMixes] = useState<ProfileMix[]>([]);
  const [videos, setVideos] = useState<ProfileVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<TabKey>("posts");

  // Social graph: the signed-in viewer (or null), follower/following totals for
  // this profile, and whether the viewer already follows it. Loaded after the
  // profile resolves; mutated optimistically by the Follow button.
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followPending, setFollowPending] = useState(false);

  // Load the profile + everything that hangs off it, in one effect, once the
  // handle is known. All setState happens post-await behind the `active` guard.
  useEffect(() => {
    if (!handle) return;
    let active = true;

    async function run(username: string) {
      setLoading(true);
      try {
        const supabase = createClient();

        // 1) The public profile (PII-safe view; never `profiles`/email).
        const { data: prof } = await supabase
          .from("profiles_public")
          .select(
            "id, display_name, avatar_url, artist_name, created_at, username, bio, is_internal, has_creator_access, has_vendor_access, user_type, creator_type",
          )
          .eq("username", username)
          .maybeSingle();

        if (!active) return;
        if (!prof) {
          setNotFound(true);
          return;
        }
        const p = prof as PublicProfile;

        // 2) DJ link (polished name + mixes source + a DJ-page link).
        const { data: djRow } = await supabase
          .from("djs")
          .select("id, slug, display_name")
          .eq("user_id", p.id)
          .maybeSingle();
        const djLink = (djRow as DjLink | null) ?? null;
        const djId = djLink?.id ?? null;

        // 3) Posts, mixes (only if a DJ), and videos — in parallel.
        const [postsRes, mixesRes, videosRes] = await Promise.all([
          supabase
            .from("hub_posts")
            .select(
              "id, hub_type, content, media_url, link_url, link_title, post_type, likes_count, created_at",
            )
            .eq("user_id", p.id)
            .order("created_at", { ascending: false }),
          djId
            ? supabase
                .from("dj_mixes")
                .select(
                  "id, title, description, audio_url, cover_image_url, duration, genre, play_count, item_type",
                )
                .eq("dj_id", djId)
                .eq("is_published", true)
                .order("created_at", { ascending: false })
            : Promise.resolve({ data: [] as ProfileMix[] }),
          supabase
            .from("videos")
            .select("id, title, youtube_id, thumbnail_url, program, views, duration_seconds")
            .eq("user_id", p.id)
            .eq("status", "published")
            .in("visibility", ["public", "unlisted"])
            .order("published_at", { ascending: false }),
        ]);

        if (!active) return;

        const loadedPosts = (postsRes.data ?? []) as ProfilePost[];
        const loadedMixes = (mixesRes.data ?? []) as ProfileMix[];
        const loadedVideos = (videosRes.data ?? []) as ProfileVideo[];

        setProfile(p);
        setDj(djLink);
        setPosts(loadedPosts);
        setMixes(loadedMixes);
        setVideos(loadedVideos);
        setNotFound(false);
        // Default-select the first non-empty tab (Posts → Shows → Videos).
        setTab(
          loadedPosts.length > 0
            ? "posts"
            : loadedMixes.length > 0
              ? "shows"
              : loadedVideos.length > 0
                ? "videos"
                : "posts",
        );

        // 4) Social graph (follows). Resolve the viewer + follower/following
        // totals in parallel, then (only for a signed-in, non-self viewer)
        // whether they already follow this profile. Every setState below the
        // awaits is gated on `active`.
        const [{ data: auth }, followersRes, followingRes] = await Promise.all([
          supabase.auth.getUser(),
          supabase
            .from("follows")
            .select("*", { count: "exact", head: true })
            .eq("following_id", p.id),
          supabase
            .from("follows")
            .select("*", { count: "exact", head: true })
            .eq("follower_id", p.id),
        ]);

        if (!active) return;
        const vId = auth.user?.id ?? null;
        setViewerId(vId);
        setFollowerCount(followersRes.count ?? 0);
        setFollowingCount(followingRes.count ?? 0);

        if (vId && vId !== p.id) {
          const { data: rel } = await supabase
            .from("follows")
            .select("follower_id")
            .eq("follower_id", vId)
            .eq("following_id", p.id)
            .maybeSingle();
          if (!active) return;
          setIsFollowing(!!rel);
        } else {
          setIsFollowing(false);
        }
      } catch {
        if (active) setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    void run(handle);
    return () => {
      active = false;
    };
  }, [handle]);

  // Which tabs to show (hide a tab with zero items).
  const visibleTabs = useMemo<TabKey[]>(() => {
    const t: TabKey[] = [];
    if (posts.length > 0) t.push("posts");
    if (mixes.length > 0) t.push("shows");
    if (videos.length > 0) t.push("videos");
    return t;
  }, [posts.length, mixes.length, videos.length]);

  // Follow: optimistically flip to following + bump the count, then INSERT.
  // RLS allows the row only when auth.uid() = follower_id, so a signed-in,
  // non-self viewer is required (the button enforces this too). Revert on error.
  async function handleFollow() {
    const targetId = profile?.id;
    if (!viewerId || !targetId || viewerId === targetId || followPending) return;
    setFollowPending(true);
    setIsFollowing(true);
    setFollowerCount((c) => c + 1);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: viewerId, following_id: targetId });
      if (error) throw error;
    } catch {
      setIsFollowing(false);
      setFollowerCount((c) => Math.max(0, c - 1));
    } finally {
      setFollowPending(false);
    }
  }

  // Unfollow: optimistically clear following + decrement, then DELETE the row.
  async function handleUnfollow() {
    const targetId = profile?.id;
    if (!viewerId || !targetId || viewerId === targetId || followPending) return;
    setFollowPending(true);
    setIsFollowing(false);
    setFollowerCount((c) => Math.max(0, c - 1));
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", viewerId)
        .eq("following_id", targetId);
      if (error) throw error;
    } catch {
      setIsFollowing(true);
      setFollowerCount((c) => c + 1);
    } finally {
      setFollowPending(false);
    }
  }

  // ── Early states ──────────────────────────────────────────────────────────
  // While the handle resolves from the URL (static-export hydration) or the
  // profile loads, show the spinner — never a premature "No profile".
  if (loading || !handle) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading profile…
      </div>
    );
  }
  if (notFound || !profile) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-20 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground">
          <UserRound className="h-7 w-7" />
        </div>
        <div>
          <p className="text-lg font-black text-foreground">Profile not found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We couldn&apos;t find <span className="font-bold">@{handle}</span>.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full bg-[#74ddc7] px-4 py-2 text-sm font-bold text-[#0a0a0f] transition-opacity hover:opacity-90"
        >
          Back to WCCG
        </Link>
      </div>
    );
  }

  // ── Derived identity ──────────────────────────────────────────────────────
  const isWccgDj = !!profile.is_internal && !!dj;
  // Prefer the DJ display name, then artist name, then the profile display name.
  const name =
    dj?.display_name?.trim() ||
    profile.artist_name?.trim() ||
    profile.display_name?.trim() ||
    profile.username ||
    "WCCG member";
  const since = memberSince(profile.created_at);
  // Show the follow control for everyone except the profile's own owner.
  const canFollow = viewerId !== profile.id;

  // Banner gradient: a WCCG-branded blue/teal for internal DJs, neutral for all.
  const bannerClass = isWccgDj
    ? "bg-gradient-to-r from-[#0b3b54] via-[#0f6e8c] to-[#74ddc7]"
    : "bg-gradient-to-r from-[#7401df]/30 via-muted to-[#74ddc7]/25";

  return (
    <div className="py-6">
      <Card className="overflow-hidden p-0 pt-0 pb-0 gap-0">
        {/* Cover banner */}
        <div className={`relative h-36 w-full md:h-44 ${bannerClass}`} aria-hidden />

        {/* Identity block */}
        <div className="px-5 pb-5 md:px-7">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
            {/* Avatar overlapping the banner + live presence dot */}
            <div className="relative h-24 w-24 shrink-0">
              <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-card bg-muted shadow-md">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#7401df]/40 to-[#74ddc7]/30 text-2xl font-black text-foreground">
                    {initials(name)}
                  </div>
                )}
              </div>
              <OnlineDot userId={profile.id} className="absolute bottom-1 right-1 h-4 w-4" />
            </div>

            {/* Header actions: Follow + Message + (for DJs) a link to the DJ page. */}
            <div className="flex flex-wrap items-center gap-2">
              {canFollow && (
                <FollowButton
                  viewerId={viewerId}
                  isFollowing={isFollowing}
                  pending={followPending}
                  onFollow={handleFollow}
                  onUnfollow={handleUnfollow}
                />
              )}
              {viewerId && viewerId !== profile.id && (
                <MessageButton
                  recipientId={profile.id}
                  recipientName={name}
                  variant="button"
                  label="Message"
                />
              )}
              {dj?.slug && (
                <Link
                  href={`/djs/${dj.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#74ddc7]/40 bg-[#74ddc7]/10 px-4 py-1.5 text-sm font-bold text-[#0f9e88] transition-colors hover:bg-[#74ddc7]/20 dark:text-[#74ddc7]"
                >
                  View DJ page <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>

          {/* Name + badges */}
          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-foreground md:text-3xl">{name}</h1>
              <ProfileBadges
                isWccgDj={isWccgDj}
                hasCreator={!!profile.has_creator_access}
                hasVendor={!!profile.has_vendor_access}
              />
            </div>
            {profile.username && (
              <p className="mt-0.5 text-sm text-muted-foreground">@{profile.username}</p>
            )}
            {profile.bio && (
              <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {profile.bio}
              </p>
            )}
          </div>

          {/* Meta + stat strip */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {since && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" /> Member since {since}
              </span>
            )}
            <span className="inline-flex items-center gap-3">
              <Stat label="Followers" value={followerCount} strong />
              <span className="text-muted-foreground/40">·</span>
              <Stat label="Following" value={followingCount} strong />
              <span className="text-muted-foreground/40">·</span>
              <Stat label="Posts" value={posts.length} />
              <span className="text-muted-foreground/40">·</span>
              <Stat label="Shows" value={mixes.length} />
              <span className="text-muted-foreground/40">·</span>
              <Stat label="Videos" value={videos.length} />
            </span>
          </div>
        </div>
      </Card>

      {/* ── Tabbed content ─────────────────────────────────────────────────── */}
      {visibleTabs.length === 0 ? (
        <EmptyShell
          icon={<UserRound className="h-8 w-8" />}
          title="Nothing here yet"
          body={`${name} hasn't shared any posts, shows, or videos yet.`}
        />
      ) : (
        <div className="mt-6">
          <div className="flex w-fit items-center gap-1 rounded-full border border-border bg-card p-1">
            {visibleTabs.includes("posts") && (
              <TabButton active={tab === "posts"} onClick={() => setTab("posts")} icon={<Link2 className="h-3.5 w-3.5" />}>
                Posts · {posts.length}
              </TabButton>
            )}
            {visibleTabs.includes("shows") && (
              <TabButton active={tab === "shows"} onClick={() => setTab("shows")} icon={<Headphones className="h-3.5 w-3.5" />}>
                Shows &amp; Mixes · {mixes.length}
              </TabButton>
            )}
            {visibleTabs.includes("videos") && (
              <TabButton active={tab === "videos"} onClick={() => setTab("videos")} icon={<Clapperboard className="h-3.5 w-3.5" />}>
                Videos · {videos.length}
              </TabButton>
            )}
          </div>

          <div className="mt-5">
            {tab === "posts" && visibleTabs.includes("posts") && <PostsTab posts={posts} />}
            {tab === "shows" && visibleTabs.includes("shows") && <ShowsTab mixes={mixes} />}
            {tab === "videos" && visibleTabs.includes("videos") && <VideosTab videos={videos} />}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

function ProfileBadges({
  isWccgDj,
  hasCreator,
  hasVendor,
}: {
  isWccgDj: boolean;
  hasCreator: boolean;
  hasVendor: boolean;
}) {
  const hasAny = isWccgDj || hasCreator || hasVendor;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {isWccgDj && (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#74ddc7]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#0f9e88] ring-1 ring-inset ring-[#74ddc7]/40 dark:text-[#74ddc7]">
          <BadgeCheck className="h-3.5 w-3.5" /> WCCG DJ
        </span>
      )}
      {hasCreator && (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#7401df]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#7401df] ring-1 ring-inset ring-[#7401df]/40 dark:text-[#b98cff]">
          <Mic2 className="h-3.5 w-3.5" /> Creator
        </span>
      )}
      {hasVendor && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 ring-1 ring-inset ring-amber-500/40 dark:text-amber-300">
          <Store className="h-3.5 w-3.5" /> Vendor
        </span>
      )}
      {!hasAny && (
        <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.06] px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground ring-1 ring-inset ring-border">
          <Headphones className="h-3.5 w-3.5" /> Listener
        </span>
      )}
    </div>
  );
}

function Stat({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="font-black text-foreground">{value}</span>
      <span
        className={
          strong
            ? "text-sm font-bold text-foreground"
            : "text-xs uppercase tracking-wide text-muted-foreground"
        }
      >
        {label}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Follow button
// ---------------------------------------------------------------------------

/**
 * The header follow control. Three states:
 *  • signed out (`viewerId === null`)  → a teal "Follow" that routes to /login.
 *  • following                         → an outline "Following" pill that flips
 *                                        to red "Unfollow" styling on hover.
 *  • not following                     → a solid teal "Follow" button.
 * The owner's own profile never renders this (the parent gates on it).
 */
function FollowButton({
  viewerId,
  isFollowing,
  pending,
  onFollow,
  onUnfollow,
}: {
  viewerId: string | null;
  isFollowing: boolean;
  pending: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
}) {
  // Signed out: no optimistic write — send them to log in first.
  if (!viewerId) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 rounded-full bg-[#74ddc7] px-4 py-1.5 text-sm font-bold text-[#0a0a0f] transition-opacity hover:opacity-90"
      >
        <UserPlus className="h-3.5 w-3.5" /> Follow
      </Link>
    );
  }

  if (isFollowing) {
    return (
      <button
        type="button"
        onClick={onUnfollow}
        disabled={pending}
        className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-transparent px-4 py-1.5 text-sm font-bold text-foreground transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-600 disabled:opacity-60 dark:hover:text-red-400"
      >
        <BadgeCheck className="h-3.5 w-3.5 group-hover:hidden" />
        <span className="group-hover:hidden">Following</span>
        <span className="hidden group-hover:inline">Unfollow</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onFollow}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-full bg-[#74ddc7] px-4 py-1.5 text-sm font-bold text-[#0a0a0f] transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      <UserPlus className="h-3.5 w-3.5" /> Follow
    </button>
  );
}

// ---------------------------------------------------------------------------
// Tab button + shared empty shell
// ---------------------------------------------------------------------------

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
        active ? "bg-[#74ddc7] text-[#0a0a0f]" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function EmptyShell({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-foreground/[0.05] text-muted-foreground">
        {icon}
      </div>
      <p className="mt-3 text-sm font-bold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Posts tab
// ---------------------------------------------------------------------------

function PostsTab({ posts }: { posts: ProfilePost[] }) {
  if (posts.length === 0) {
    return <EmptyShell icon={<Link2 className="h-6 w-6" />} title="No posts yet" body="When this member posts in a hub, it shows up here." />;
  }
  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <Card key={post.id} className="gap-3 p-4">
          {/* meta row */}
          <div className="flex items-center justify-between gap-3">
            {post.hub_type && (
              <span className="inline-flex items-center rounded-full bg-foreground/[0.06] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {post.hub_type}
              </span>
            )}
            <span className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</span>
          </div>

          {post.content && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{post.content}</p>
          )}

          {/* image */}
          {post.media_url && (
            <div className="overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.media_url} alt="" className="max-h-96 w-full object-cover" loading="lazy" />
            </div>
          )}

          {/* link preview */}
          {post.link_url && (
            <a
              href={post.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3 transition-colors hover:border-[#74ddc7]/50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#74ddc7]/15 text-[#0f9e88] dark:text-[#74ddc7]">
                <Link2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">{post.link_title || post.link_url}</p>
                <p className="truncate text-xs text-muted-foreground">{post.link_url}</p>
              </div>
            </a>
          )}

          {/* like count */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Heart className="h-4 w-4" fill="currentColor" />
            <span>{post.likes_count ?? 0}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shows & Mixes tab
// ---------------------------------------------------------------------------

function ShowsTab({ mixes }: { mixes: ProfileMix[] }) {
  if (mixes.length === 0) {
    return <EmptyShell icon={<Music className="h-6 w-6" />} title="No shows or mixes yet" body="Published mixes and podcast episodes will appear here." />;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {mixes.map((mix) => (
        <Card key={mix.id} className="overflow-hidden p-0 pt-0 pb-0 gap-0">
          {/* cover */}
          <div className="relative aspect-video w-full overflow-hidden">
            {mix.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mix.cover_image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#7401df]/30 to-[#74ddc7]/15">
                <Music className="h-8 w-8 text-[#74ddc7]" />
              </div>
            )}
            {mix.item_type === "podcast" && (
              <span className="absolute left-2 top-2 rounded-full bg-[#7401df] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Podcast
              </span>
            )}
          </div>

          <div className="space-y-2 p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-foreground">{mix.title || "Untitled"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {mix.genre && <>{mix.genre}</>}
                {mix.genre && mix.duration ? " · " : ""}
                {mix.duration ? fmtDuration(mix.duration) : ""}
                {(mix.genre || mix.duration) && (mix.play_count ?? 0) > 0 ? " · " : ""}
                {(mix.play_count ?? 0) > 0 ? `${fmtCount(mix.play_count)} plays` : ""}
              </p>
            </div>

            {mix.audio_url ? (
              <audio controls preload="none" src={mix.audio_url} className="w-full" />
            ) : (
              <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Play className="h-3.5 w-3.5" /> No audio
              </p>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Videos tab
// ---------------------------------------------------------------------------

function VideosTab({ videos }: { videos: ProfileVideo[] }) {
  if (videos.length === 0) {
    return <EmptyShell icon={<Clapperboard className="h-6 w-6" />} title="No videos yet" body="Published videos will show up in this grid." />;
  }
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {videos.map((video) => (
        <Link key={video.id} href={`/videos/${video.id}`} className="group block">
          <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={videoThumb(video)}
              alt={video.title ?? ""}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            {video.duration_seconds ? (
              <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {fmtDuration(video.duration_seconds)}
              </span>
            ) : null}
          </div>
          <p className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-foreground group-hover:text-[#0f9e88] dark:group-hover:text-[#74ddc7]">
            {video.title ?? "Untitled"}
          </p>
          <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5" /> {fmtCount(video.views)} views
          </p>
        </Link>
      ))}
    </div>
  );
}
