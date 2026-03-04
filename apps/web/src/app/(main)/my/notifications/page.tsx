"use client";

import { useState, useMemo } from "react";
import {
  Bell,
  Radio,
  CalendarClock,
  Star,
  Mic2,
  Trophy,
  CheckCheck,
  BellOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ─────────────────────────────────────────────────────────────

type NotificationType =
  | "station_alert"
  | "event_reminder"
  | "points_earned"
  | "new_show"
  | "contest";

type FilterTab = "all" | "unread" | "station" | "events" | "rewards";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
}

// ─── Mock Data ─────────────────────────────────────────────────────────

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "station_alert",
    title: "WCCG 104.5 FM is now LIVE",
    description:
      "The afternoon drive show just went on air. Tune in for the hottest tracks and local news.",
    timestamp: "2 minutes ago",
    read: false,
  },
  {
    id: "2",
    type: "event_reminder",
    title: "Streetz Morning Takeover starts in 30 minutes",
    description:
      "Don't miss the live broadcast from downtown. Set your alarm and get ready!",
    timestamp: "28 minutes ago",
    read: false,
  },
  {
    id: "3",
    type: "points_earned",
    title: "+50 points for listening",
    description:
      "You earned 50 loyalty points for tuning in to the live stream today. Keep listening to earn more!",
    timestamp: "1 hour ago",
    read: false,
  },
  {
    id: "4",
    type: "new_show",
    title: "New show: Sunday Night Gospel",
    description:
      "A brand new gospel show has been added to the WCCG lineup every Sunday at 7 PM.",
    timestamp: "3 hours ago",
    read: true,
  },
  {
    id: "5",
    type: "contest",
    title: "Summer Giveaway contest ends tomorrow",
    description:
      "Last chance to enter! Listen for the keyword and text it in for a chance to win concert tickets.",
    timestamp: "5 hours ago",
    read: false,
  },
  {
    id: "6",
    type: "station_alert",
    title: "Schedule change: Evening Vibes moved to 9 PM",
    description:
      "The Evening Vibes show has been rescheduled from 8 PM to 9 PM starting this week.",
    timestamp: "Yesterday",
    read: true,
  },
  {
    id: "7",
    type: "points_earned",
    title: "+100 points bonus for streak",
    description:
      "Congratulations! You have a 7-day listening streak. Bonus points have been added to your balance.",
    timestamp: "Yesterday",
    read: true,
  },
  {
    id: "8",
    type: "event_reminder",
    title: "Community Block Party this Saturday",
    description:
      "WCCG will be live at the community block party. Stop by our booth for free merch and prizes.",
    timestamp: "2 days ago",
    read: true,
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "station_alert":
      return <Radio className="h-5 w-5" />;
    case "event_reminder":
      return <CalendarClock className="h-5 w-5" />;
    case "points_earned":
      return <Star className="h-5 w-5" />;
    case "new_show":
      return <Mic2 className="h-5 w-5" />;
    case "contest":
      return <Trophy className="h-5 w-5" />;
  }
}

function getNotificationColor(type: NotificationType): string {
  switch (type) {
    case "station_alert":
      return "text-red-500 bg-red-500/10";
    case "event_reminder":
      return "text-[#7401df] bg-[#7401df]/10";
    case "points_earned":
      return "text-[#74ddc7] bg-[#74ddc7]/10";
    case "new_show":
      return "text-teal-400 bg-teal-400/10";
    case "contest":
      return "text-amber-500 bg-amber-500/10";
  }
}

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "station", label: "Station" },
  { value: "events", label: "Events" },
  { value: "rewards", label: "Rewards" },
];

function matchesFilter(n: Notification, filter: FilterTab): boolean {
  switch (filter) {
    case "all":
      return true;
    case "unread":
      return !n.read;
    case "station":
      return n.type === "station_alert" || n.type === "new_show";
    case "events":
      return n.type === "event_reminder" || n.type === "contest";
    case "rewards":
      return n.type === "points_earned";
  }
}

// ─── Component ─────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered = useMemo(
    () => notifications.filter((n) => matchesFilter(n, activeTab)),
    [notifications, activeTab]
  );

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const toggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  return (
    <div className="space-y-6">
      {/* ─── Hero Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#7401df]/10">
            <Bell className="h-5 w-5 text-[#7401df]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Notifications
            </h1>
            <p className="text-muted-foreground">
              Stay up to date with WCCG 104.5 FM
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={markAllRead}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* ─── Filter Tabs ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        {FILTER_TABS.map((tab) => (
          <Button
            key={tab.value}
            variant={activeTab === tab.value ? "default" : "outline"}
            size="sm"
            className={
              activeTab === tab.value
                ? "bg-[#7401df] hover:bg-[#7401df]/90"
                : ""
            }
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
            {tab.value === "unread" && unreadCount > 0 && (
              <span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* ─── Notification List ───────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <BellOff className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">No notifications</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {activeTab === "unread"
                ? "You are all caught up! No unread notifications."
                : "Nothing here yet. Check back later for updates from WCCG 104.5 FM."}
            </p>
          </div>
          {activeTab !== "all" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("all")}
            >
              View all notifications
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => toggleRead(n.id)}
              className={`w-full rounded-lg border p-4 text-left transition-colors hover:bg-accent/50 ${
                n.read
                  ? "border-border bg-transparent opacity-70"
                  : "border-[#7401df]/20 bg-[#7401df]/5"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${getNotificationColor(
                    n.type
                  )}`}
                >
                  {getNotificationIcon(n.type)}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!n.read && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[#74ddc7]" />
                    )}
                    <h3
                      className={`truncate text-sm ${
                        n.read ? "font-medium" : "font-semibold"
                      }`}
                    >
                      {n.title}
                    </h3>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {n.description}
                  </p>
                  <span className="mt-1 block text-[11px] text-muted-foreground/60">
                    {n.timestamp}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ─── Summary Footer ──────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Showing {filtered.length} of {notifications.length} notifications
        </p>
      )}
    </div>
  );
}
