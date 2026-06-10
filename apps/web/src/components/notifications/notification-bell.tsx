"use client";

/**
 * Header notification bell — Supabase-direct (no API server).
 *
 * Reads the current user's `notifications` (own-scoped by RLS), shows an
 * unread badge (polled every 60s + refetched on window focus + bumped live by
 * a realtime INSERT subscription), loads the latest 8 on open, and marks one /
 * all read (optimistic, rolled back on { error }). Notifications are produced
 * by DB triggers: FOLLOW, MESSAGE, LIKE, NEW_VIDEO, MILESTONE, EVENT_REMINDER.
 *
 * Hooks discipline (react-hooks/set-state-in-effect): no synchronous setState
 * in any effect body — state updates happen after an await (guarded) or in
 * event/realtime callbacks.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  Star,
  Calendar,
  Info,
  Check,
  Loader2,
  Trophy,
  Video,
} from "lucide-react";
import Link from "next/link";

// ------------------------------------------------------------------ Types

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
  link?: string | null;
}

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

// ------------------------------------------------------------------ Helpers

// Types currently produced by DB triggers: FOLLOW, MESSAGE, LIKE, NEW_VIDEO,
// MILESTONE, EVENT_REMINDER. The extras are defensive defaults.
const NOTIFICATION_ICONS: Record<string, typeof Bell> = {
  FOLLOW: UserPlus,
  LIKE: Heart,
  COMMENT: MessageCircle,
  MESSAGE: MessageCircle,
  NEW_VIDEO: Video,
  MILESTONE: Trophy,
  EVENT_REMINDER: Calendar,
  SYSTEM: Info,
  EVENT: Calendar,
  POINTS: Star,
};

const NOTIFICATION_COLORS: Record<string, string> = {
  FOLLOW: "text-blue-400",
  LIKE: "text-pink-400",
  COMMENT: "text-amber-400",
  MESSAGE: "text-[#74ddc7]",
  NEW_VIDEO: "text-red-400",
  MILESTONE: "text-amber-400",
  EVENT_REMINDER: "text-purple-400",
  SYSTEM: "text-foreground/60",
  EVENT: "text-purple-400",
  POINTS: "text-[#74ddc7]",
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ------------------------------------------------------------------ Component

export function NotificationBell() {
  const { user, isLoading: authLoading } = useAuth();
  const [supabase] = useState(() => createClient());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Mirrors `isOpen` so the realtime callback can check panel state without
  // resubscribing the channel on every open/close.
  const isOpenRef = useRef(false);
  const setOpen = (open: boolean) => {
    isOpenRef.current = open;
    setIsOpen(open);
  };

  // ---- Unread count (own-scoped by RLS).
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setUnreadCount(count ?? 0);
  }, [user, supabase]);

  // ---- Latest notifications (on popover open).
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setIsLoadingNotifications(true);
    try {
      const { data } = await supabase
        .from("notifications")
        .select("id,type,title,body,link,is_read,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8);
      const rows = (data ?? []) as NotificationRow[];
      setNotifications(
        rows.map((r) => ({
          id: r.id,
          type: r.type,
          title: r.title,
          body: r.body,
          isRead: r.is_read,
          createdAt: r.created_at,
          link: r.link,
        })),
      );
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [user, supabase]);

  // ---- Poll unread count every 60s + refetch when the window regains focus.
  useEffect(() => {
    if (!user) return;
    fetchUnreadCount();
    pollIntervalRef.current = setInterval(fetchUnreadCount, 60_000);
    const onFocus = () => fetchUnreadCount();
    window.addEventListener("focus", onFocus);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      window.removeEventListener("focus", onFocus);
    };
  }, [user, fetchUnreadCount]);

  // ---- Realtime: new notifications addressed to me bump the badge instantly
  // (and refresh the open panel). Polling above is the safety net if realtime
  // is unavailable. Mirrors the messenger-dock postgres_changes pattern.
  useEffect(() => {
    if (!user) return;
    let channel: RealtimeChannel | null = null;
    channel = supabase
      .channel(`notif-bell:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadCount();
          if (isOpenRef.current) fetchNotifications();
        },
      )
      .subscribe();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [user, supabase, fetchUnreadCount, fetchNotifications]);

  // ---- Load list when the popover opens.
  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen, fetchNotifications]);

  // ---- Mark one read (optimistic).
  const markAsRead = async (n: Notification) => {
    if (n.isRead || !user) return;
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    setUnreadCount((p) => Math.max(0, p - 1));
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", n.id)
      .eq("user_id", user.id);
    if (error) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: false } : x)));
      setUnreadCount((p) => p + 1);
    }
  };

  // ---- Mark all read (optimistic).
  const markAllAsRead = async () => {
    if (!user) return;
    setMarkingAllRead(true);
    const prevNotifications = notifications;
    const prevCount = unreadCount;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("is_read", false);
    if (error) {
      setNotifications(prevNotifications);
      setUnreadCount(prevCount);
    }
    setMarkingAllRead(false);
  };

  if (authLoading || !user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative text-muted-foreground hover:text-foreground/70 hover:bg-foreground/[0.06]"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 border-border bg-card p-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              disabled={markingAllRead}
              className="flex items-center gap-1 text-xs text-[#74ddc7] hover:text-[#74ddc7]/80 transition-colors disabled:opacity-50"
            >
              {markingAllRead ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Mark all read
            </button>
          )}
        </div>

        {/* Notification list */}
        <ScrollArea className="max-h-[360px]">
          {isLoadingNotifications ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/70" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/70">
              <Bell className="h-8 w-8 mb-2" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {notifications.map((notification) => {
                const Icon = NOTIFICATION_ICONS[notification.type] || Info;
                const iconColor = NOTIFICATION_COLORS[notification.type] || "text-foreground/60";

                const content = (
                  <div
                    className={`flex gap-3 px-4 py-3 transition-colors cursor-pointer hover:bg-white/[0.03] ${
                      !notification.isRead ? "bg-white/[0.02]" : ""
                    }`}
                    onClick={() => markAsRead(notification)}
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06] ${iconColor}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm leading-snug ${
                          notification.isRead
                            ? "text-muted-foreground"
                            : "text-foreground/90 font-medium"
                        }`}
                      >
                        {notification.title}
                      </p>
                      {notification.body && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground/80">
                          {notification.body}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground/70">
                        {timeAgo(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#74ddc7]" />
                    )}
                  </div>
                );

                if (notification.link) {
                  return (
                    <Link
                      key={notification.id}
                      href={notification.link}
                      onClick={() => {
                        markAsRead(notification);
                        setOpen(false);
                      }}
                      className="block"
                    >
                      {content}
                    </Link>
                  );
                }

                return <div key={notification.id}>{content}</div>;
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2.5">
          <Link
            href="/my/notifications"
            onClick={() => setOpen(false)}
            className="block text-center text-xs font-medium text-[#74ddc7] hover:text-[#74ddc7]/80 transition-colors"
          >
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
