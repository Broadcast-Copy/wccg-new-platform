"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Send,
  Users,
  Clock,
  BarChart3,
  Link2,
  Image as ImageIcon,
  Target,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotificationDraft {
  title: string;
  body: string;
  url: string;
  icon: string;
}

interface SentNotification {
  id: string;
  title: string;
  body: string;
  target: string;
  sentAt: string;
  delivered: number;
  opened: number;
}

type TargetType = "all" | "segment" | "hub";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_SEGMENTS = [
  { id: "seg-1", name: "Hip-Hop Listeners", count: 4_200 },
  { id: "seg-2", name: "Gospel Fans", count: 2_800 },
  { id: "seg-3", name: "Morning Show Regulars", count: 1_500 },
  { id: "seg-4", name: "Weekend Warriors", count: 3_100 },
  { id: "seg-5", name: "New Users (< 7 days)", count: 620 },
];

const MOCK_HUBS = [
  { id: "hub-1", name: "WCCG 104.5 FM", count: 8_500 },
  { id: "hub-2", name: "Hot 104.5", count: 3_200 },
  { id: "hub-3", name: "Soul 104.5", count: 2_100 },
  { id: "hub-4", name: "The Vibe", count: 1_800 },
];

const MOCK_HISTORY: SentNotification[] = [
  {
    id: "n-1",
    title: "New Morning Show Schedule",
    body: "Check out the updated weekday morning lineup!",
    target: "All Users",
    sentAt: "2026-03-29T14:30:00Z",
    delivered: 8_234,
    opened: 3_412,
  },
  {
    id: "n-2",
    title: "Live Concert Tonight",
    body: "Tune in at 8pm for a live performance by local artists",
    target: "Hip-Hop Listeners",
    sentAt: "2026-03-28T10:00:00Z",
    delivered: 4_100,
    opened: 1_890,
  },
  {
    id: "n-3",
    title: "Easter Weekend Special",
    body: "Gospel marathon this Sunday from 6am to 12pm",
    target: "Gospel Fans",
    sentAt: "2026-03-27T09:00:00Z",
    delivered: 2_750,
    opened: 1_320,
  },
  {
    id: "n-4",
    title: "Win Tickets!",
    body: "Enter our giveaway for concert tickets this weekend",
    target: "All Users",
    sentAt: "2026-03-25T16:00:00Z",
    delivered: 8_100,
    opened: 4_500,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PushNotificationManagerPage() {
  const { user, isLoading } = useAuth();

  // Compose form
  const [draft, setDraft] = useState<NotificationDraft>({
    title: "",
    body: "",
    url: "",
    icon: "",
  });
  const [targetType, setTargetType] = useState<TargetType>("all");
  const [selectedTarget, setSelectedTarget] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // History
  const [history] = useState<SentNotification[]>(MOCK_HISTORY);

  const handleSend = useCallback(async () => {
    if (!draft.title.trim() || !draft.body.trim()) return;

    setSending(true);
    setLastResult(null);

    // Simulate send
    await new Promise((r) => setTimeout(r, 1200));

    const targetLabel =
      targetType === "all"
        ? "All Users"
        : targetType === "segment"
          ? MOCK_SEGMENTS.find((s) => s.id === selectedTarget)?.name ?? "Unknown Segment"
          : MOCK_HUBS.find((h) => h.id === selectedTarget)?.name ?? "Unknown Hub";

    console.log("[Push Notification]", {
      ...draft,
      target: targetLabel,
      timestamp: new Date().toISOString(),
    });

    setLastResult({ ok: true, msg: `Notification sent to ${targetLabel}` });
    setDraft({ title: "", body: "", url: "", icon: "" });
    setSending(false);
  }, [draft, targetType, selectedTarget]);

  // ---------------------------------------------------------------------------
  // Auth guard
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
      </div>
    );
  }

  if (!user?.email) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Card className="border-white/10 bg-white/5">
          <CardContent className="py-12 text-center">
            <p className="text-white/60">Sign in as admin to manage push notifications</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  const totalSubscribers = 8_742;
  const lastSentDate = history[0]?.sentAt
    ? new Date(history[0].sentAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Never";
  const avgOpenRate =
    history.length > 0
      ? Math.round(
          (history.reduce((sum, n) => sum + n.opened / n.delivered, 0) / history.length) * 100,
        )
      : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Back link */}
      <Link
        href="/my/admin"
        className="mb-6 inline-flex items-center text-sm text-white/50 hover:text-white/70 transition-colors"
      >
        &larr; Back to Admin
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Bell className="h-8 w-8 text-red-500" />
          Push Notification Manager
        </h1>
        <p className="mt-2 text-white/60">
          Send targeted push notifications to WCCG listeners
        </p>
      </div>

      {/* Stats Row */}
      <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20">
              <Users className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalSubscribers.toLocaleString()}</p>
              <p className="text-xs text-white/50">Total Subscribers</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20">
              <Clock className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{lastSentDate}</p>
              <p className="text-xs text-white/50">Last Sent</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20">
              <BarChart3 className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{avgOpenRate}%</p>
              <p className="text-xs text-white/50">Avg. Open Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compose Notification */}
      <Card className="mb-8 border-red-500/20 bg-gradient-to-br from-red-500/10 via-white/5 to-red-500/5">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Send className="h-5 w-5 text-red-400" />
            Compose Notification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-medium text-white/70">Title *</label>
            <Input
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="e.g. New Morning Show Schedule"
              className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
              maxLength={65}
            />
            <p className="mt-1 text-xs text-white/40">{draft.title.length}/65 characters</p>
          </div>

          {/* Body */}
          <div>
            <label className="mb-1 block text-sm font-medium text-white/70">Body *</label>
            <textarea
              value={draft.body}
              onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
              placeholder="Notification message body..."
              rows={3}
              maxLength={240}
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/50"
            />
            <p className="mt-1 text-xs text-white/40">{draft.body.length}/240 characters</p>
          </div>

          {/* URL */}
          <div>
            <label className="mb-1 block text-sm font-medium text-white/70 flex items-center gap-1">
              <Link2 className="h-3.5 w-3.5" /> Click URL (optional)
            </label>
            <Input
              value={draft.url}
              onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
              placeholder="https://wccg.com/shows/morning"
              className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
            />
          </div>

          {/* Icon */}
          <div>
            <label className="mb-1 block text-sm font-medium text-white/70 flex items-center gap-1">
              <ImageIcon className="h-3.5 w-3.5" /> Icon URL (optional)
            </label>
            <Input
              value={draft.icon}
              onChange={(e) => setDraft((d) => ({ ...d, icon: e.target.value }))}
              placeholder="https://wccg.com/images/logos/wccg-logo.png"
              className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
            />
          </div>

          {/* Target Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-white/70 flex items-center gap-1">
              <Target className="h-3.5 w-3.5" /> Target Audience
            </label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(["all", "segment", "hub"] as TargetType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTargetType(t);
                    setSelectedTarget("");
                  }}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    targetType === t
                      ? "border-red-500 bg-red-500/20 text-white"
                      : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {t === "all" ? "All Users" : t === "segment" ? "Segment" : "Hub"}
                </button>
              ))}
            </div>

            {/* Segment picker */}
            {targetType === "segment" && (
              <div className="relative">
                <select
                  value={selectedTarget}
                  onChange={(e) => setSelectedTarget(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 pr-8 text-sm text-white focus:border-red-500/50 focus:outline-none"
                >
                  <option value="" className="bg-[#0a0a0f]">
                    Select a segment...
                  </option>
                  {MOCK_SEGMENTS.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#0a0a0f]">
                      {s.name} ({s.count.toLocaleString()} users)
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              </div>
            )}

            {/* Hub picker */}
            {targetType === "hub" && (
              <div className="relative">
                <select
                  value={selectedTarget}
                  onChange={(e) => setSelectedTarget(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 pr-8 text-sm text-white focus:border-red-500/50 focus:outline-none"
                >
                  <option value="" className="bg-[#0a0a0f]">
                    Select a hub...
                  </option>
                  {MOCK_HUBS.map((h) => (
                    <option key={h.id} value={h.id} className="bg-[#0a0a0f]">
                      {h.name} ({h.count.toLocaleString()} listeners)
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              </div>
            )}
          </div>

          {/* Result feedback */}
          {lastResult && (
            <div
              className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
                lastResult.ok
                  ? "bg-green-500/10 border border-green-500/20 text-green-400"
                  : "bg-red-500/10 border border-red-500/20 text-red-400"
              }`}
            >
              {lastResult.ok ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {lastResult.msg}
            </div>
          )}

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={!draft.title.trim() || !draft.body.trim() || sending || (targetType !== "all" && !selectedTarget)}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-40"
          >
            {sending ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Sending...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Send Push Notification
              </span>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Notification History */}
      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-white/60" />
            Notification History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {history.map((n) => {
              const openRate = Math.round((n.opened / n.delivered) * 100);
              const sentDate = new Date(n.sentAt);
              return (
                <div
                  key={n.id}
                  className="rounded-lg border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white text-sm truncate">{n.title}</h4>
                      <p className="mt-0.5 text-xs text-white/50 line-clamp-1">{n.body}</p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-red-500/20 text-red-300 text-xs shrink-0"
                    >
                      {n.target}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-white/40">
                    <span>
                      {sentDate.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      at{" "}
                      {sentDate.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {n.delivered.toLocaleString()} delivered
                    </span>
                    <span className="flex items-center gap-1">
                      <BarChart3 className="h-3 w-3" />
                      {openRate}% opened
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
