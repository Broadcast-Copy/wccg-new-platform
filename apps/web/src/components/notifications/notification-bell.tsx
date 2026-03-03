"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
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
} from "lucide-react";
import Link from "next/link";

// ------------------------------------------------------------------ Types

type NotificationType =
  | "FOLLOW"
  | "LIKE"
  | "COMMENT"
  | "SYSTEM"
  | "EVENT"
  | "POINTS";

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
}

interface UnreadCountResponse {
  count: number;
}

// ------------------------------------------------------------------ Helpers

const NOTIFICATION_ICONS: Record<NotificationType, typeof Bell> = {
  FOLLOW: UserPlus,
  LIKE: Heart,
  COMMENT: MessageCircle,
  SYSTEM: Info,
  EVENT: Calendar,
  POINTS: Star,
};

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  FOLLOW: "text-blue-400",
  LIKE: "text-pink-400",
  COMMENT: "text-amber-400",
  SYSTEM: "text-foreground/60",
  EVENT: "text-purple-400",
  POINTS: "text-[#74ddc7]",
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiClient<UnreadCountResponse>(
        "/notifications/unread-count",
      );
      setUnreadCount(data.count);
    } catch {
      // Silently fail — polling shouldn't produce toast errors
    }
  }, [user]);

  // ---- Fetch notifications (on popover open)
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setIsLoadingNotifications(true);
    try {
      const data = await apiClient<Notification[]>(
        "/notifications?limit=10",
      );
      setNotifications(data);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [user]);

  // ---- Poll for unread count every 30s
  useEffect(() => {
    if (!user) return;

    fetchUnreadCount();
    pollIntervalRef.current = setInterval(fetchUnreadCount, 30_000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [user, fetchUnreadCount]);

  // ---- Load notifications when popover opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // ---- Mark single notification as read
  const markAsRead = async (notification: Notification) => {
    if (notification.isRead) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await apiClient(`/notifications/${notification.id}/read`, {
        method: "PATCH",
      });
    } catch {
      // Revert on failure
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, isRead: false } : n,
        ),
      );
      setUnreadCount((prev) => prev + 1);
    }
  };

  // ---- Mark all as read
  const markAllAsRead = async () => {
    setMarkingAllRead(true);

    // Optimistic update
    const prevNotifications = [...notifications];
    const prevCount = unreadCount;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await apiClient("/notifications/read-all", { method: "PATCH" });
    } catch {
      // Revert on failure
      setNotifications(prevNotifications);
      setUnreadCount(prevCount);
      toast.error("Failed to mark all as read");
    } finally {
      setMarkingAllRead(false);
    }
  };

  // Don't render until auth is resolved, or if no user
  if (authLoading || !user) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
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
                const Icon =
                  NOTIFICATION_ICONS[notification.type] || Info;
                const iconColor =
                  NOTIFICATION_COLORS[notification.type] || "text-foreground/60";

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
                        {notification.message}
                      </p>
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
                        setIsOpen(false);
                      }}
                      className="block"
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <div key={notification.id}>
                    {content}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-border px-4 py-2.5">
            <Link
              href="/my/notifications"
              onClick={() => setIsOpen(false)}
              className="block text-center text-xs font-medium text-[#74ddc7] hover:text-[#74ddc7]/80 transition-colors"
            >
              View all notifications
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
