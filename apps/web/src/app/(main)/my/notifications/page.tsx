"use client";

/**
 * /my/notifications — the full notifications inbox, Supabase-direct (no API
 * server). Reads the signed-in user's own `notifications` (RLS own-scoped),
 * filters All/Unread, marks one / all read (optimistic with rollback on
 * { error }), paginates 25 per page via "Load more", and live-updates via a
 * realtime INSERT subscription. Producers are DB triggers: FOLLOW, MESSAGE,
 * LIKE, NEW_VIDEO, MILESTONE, EVENT_REMINDER.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Bell,
  BellOff,
  Calendar,
  CheckCheck,
  Heart,
  Info,
  Loader2,
  MessageCircle,
  Star,
  Trophy,
  UserPlus,
  Video,
} from "lucide-react";

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

type FilterTab = "all" | "unread";

// Types currently produced by DB triggers: FOLLOW, MESSAGE, LIKE, NEW_VIDEO,
// MILESTONE, EVENT_REMINDER. The extras are defensive defaults.
const ICONS: Record<string, typeof Bell> = {
  MESSAGE: MessageCircle,
  COMMENT: MessageCircle,
  FOLLOW: UserPlus,
  LIKE: Heart,
  NEW_VIDEO: Video,
  MILESTONE: Trophy,
  EVENT_REMINDER: Calendar,
  EVENT: Calendar,
  POINTS: Star,
  SYSTEM: Info,
};

const COLORS: Record<string, string> = {
  MESSAGE: "text-[#74ddc7] bg-[#74ddc7]/10",
  COMMENT: "text-amber-400 bg-amber-400/10",
  FOLLOW: "text-blue-400 bg-blue-400/10",
  LIKE: "text-pink-400 bg-pink-400/10",
  NEW_VIDEO: "text-red-400 bg-red-400/10",
  MILESTONE: "text-amber-400 bg-amber-400/10",
  EVENT_REMINDER: "text-[#7401df] bg-[#7401df]/10",
  EVENT: "text-[#7401df] bg-[#7401df]/10",
  POINTS: "text-[#74ddc7] bg-[#74ddc7]/10",
  SYSTEM: "text-muted-foreground bg-foreground/[0.06]",
};

const PAGE_SIZE = 25;

function relTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const m = Math.floor((Date.now() - then) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
];

export default function NotificationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [supabase] = useState(() => createClient());
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tab, setTab] = useState<FilterTab>("all");
  const [page, setPage] = useState(1);
  const [listKey, setListKey] = useState(0);

  // Load the user's notifications (newest first), 25 per page. "Load more"
  // bumps `page` and we refetch rows 0..page*25-1 in one query — replacing the
  // list wholesale keeps it consistent when realtime inserts arrive between
  // pages (no duplicate/shifted rows). All setState is post-await behind an
  // `active` guard — nothing synchronous in the effect body.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      let cancelled = false;
      queueMicrotask(() => {
        if (!cancelled) {
          setItems([]);
          setTotal(0);
          setLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }
    let active = true;
    (async () => {
      const { data, count, error } = await supabase
        .from("notifications")
        .select("id,type,title,body,link,is_read,created_at", { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(0, page * PAGE_SIZE - 1);
      if (!active) return;
      if (!error) {
        setItems((data ?? []) as NotificationRow[]);
        setTotal(count ?? 0);
      }
      setLoading(false);
      setLoadingMore(false);
    })().catch(() => {
      if (active) {
        setLoading(false);
        setLoadingMore(false);
      }
    });
    return () => {
      active = false;
    };
  }, [user, authLoading, supabase, page, listKey]);

  // Realtime: bump the list key on any new notification addressed to me.
  useEffect(() => {
    if (!user) return;
    let channel: RealtimeChannel | null = null;
    channel = supabase
      .channel(`notif-page:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => setListKey((k) => k + 1),
      )
      .subscribe();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  const unreadCount = useMemo(() => items.filter((n) => !n.is_read).length, [items]);
  const filtered = useMemo(
    () => (tab === "unread" ? items.filter((n) => !n.is_read) : items),
    [items, tab],
  );

  // Optimistic mark-all-read; rolls back the previously-unread rows on { error }.
  const markAllRead = useCallback(async () => {
    if (!user) return;
    const wasUnread = new Set(items.filter((n) => !n.is_read).map((n) => n.id));
    if (wasUnread.size === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("is_read", false);
    if (error) {
      setItems((prev) =>
        prev.map((n) => (wasUnread.has(n.id) ? { ...n, is_read: false } : n)),
      );
    }
  }, [user, supabase, items]);

  // Optimistic single mark-read; rolls back on { error }.
  const markOne = useCallback(
    async (n: NotificationRow) => {
      if (n.is_read || !user) return;
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", n.id)
        .eq("user_id", user.id);
      if (error) {
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: false } : x)));
      }
    },
    [user, supabase],
  );

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#7401df]/10">
            <Bell className="h-5 w-5 text-[#7401df]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
            <p className="text-muted-foreground">Stay up to date with WCCG 104.5 FM</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={markAllRead}>
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {FILTER_TABS.map((t) => (
          <Button
            key={t.value}
            variant={tab === t.value ? "default" : "outline"}
            size="sm"
            className={tab === t.value ? "bg-[#7401df] hover:bg-[#7401df]/90" : ""}
            onClick={() => setTab(t.value)}
          >
            {t.label}
            {t.value === "unread" && unreadCount > 0 && (
              <span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* States */}
      {authLoading || loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : !user ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Bell className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Sign in to see your notifications</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Get notified about new messages, followers, and activity on WCCG.
            </p>
          </div>
          <Link
            href="/login"
            className="rounded-full bg-[#74ddc7] px-5 py-2 text-sm font-bold text-[#0a0a0f] transition-opacity hover:opacity-90"
          >
            Sign in
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <BellOff className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">You&apos;re all caught up</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {tab === "unread"
                ? "No unread notifications."
                : "Nothing here yet. Check back later for updates from WCCG 104.5 FM."}
            </p>
          </div>
          {tab !== "all" && (
            <Button variant="outline" size="sm" onClick={() => setTab("all")}>
              View all notifications
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const Icon = ICONS[n.type] || Bell;
            const color = COLORS[n.type] || "text-muted-foreground bg-foreground/[0.06]";
            const inner = (
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!n.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-[#74ddc7]" />}
                    <h3 className={`truncate text-sm ${n.is_read ? "font-medium" : "font-semibold"}`}>
                      {n.title}
                    </h3>
                  </div>
                  {n.body && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                  )}
                  <span className="mt-1 block text-[11px] text-muted-foreground/60">
                    {relTime(n.created_at)}
                  </span>
                </div>
              </div>
            );
            const cls = `block w-full rounded-lg border p-4 text-left transition-colors hover:bg-accent/50 ${
              n.is_read ? "border-border bg-transparent opacity-70" : "border-[#7401df]/20 bg-[#7401df]/5"
            }`;
            return n.link ? (
              <Link key={n.id} href={n.link} onClick={() => markOne(n)} className={cls}>
                {inner}
              </Link>
            ) : (
              <button key={n.id} type="button" onClick={() => markOne(n)} className={cls}>
                {inner}
              </button>
            );
          })}
        </div>
      )}

      {/* Pagination — 25/page; "Load more" extends the window. `total` is the
          exact own-row count from the paged query. */}
      {user && !loading && items.length < total && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={loadingMore}
            onClick={() => {
              setLoadingMore(true);
              setPage((p) => p + 1);
            }}
          >
            {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Load more
          </Button>
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          {tab === "unread"
            ? `Showing ${filtered.length} unread`
            : `Showing ${items.length} of ${total} notifications`}
        </p>
      )}
    </div>
  );
}
