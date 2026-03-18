"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import {
  Radio,
  Clock,
  Users,
  CalendarDays,
  ArrowLeft,
  Mic,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Pencil,
  Check,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ShowStatus = "Active" | "Inactive" | "Weekend";

interface Show {
  id: string;
  name: string;
  host: string;
  time: string;
  status: ShowStatus;
}

interface ScheduleRow {
  time: string;
  show: string;
  host: string;
  status: "Completed" | "Live" | "Upcoming";
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const initialSchedule: ScheduleRow[] = [
  { time: "6:00 AM - 10:00 AM", show: "The Morning Mix", host: "DJ Quick", status: "Completed" },
  { time: "10:00 AM - 2:00 PM", show: "Midday Groove", host: "DJ Smooth", status: "Live" },
  { time: "2:00 PM - 6:00 PM", show: "Drive Time", host: "MC Blaze", status: "Upcoming" },
  { time: "6:00 PM - 10:00 PM", show: "Evening Vibes", host: "Lady Soul", status: "Upcoming" },
  { time: "10:00 PM - 2:00 AM", show: "Late Night R&B", host: "DJ Velvet", status: "Upcoming" },
  { time: "8:00 AM - 12:00 PM", show: "Sunday Gospel", host: "Minister Ray", status: "Upcoming" },
];

const initialShows: Show[] = [
  { id: "s1", name: "The Morning Mix", host: "DJ Quick", time: "6:00 AM - 10:00 AM", status: "Active" },
  { id: "s2", name: "Midday Groove", host: "DJ Smooth", time: "10:00 AM - 2:00 PM", status: "Active" },
  { id: "s3", name: "Drive Time", host: "MC Blaze", time: "2:00 PM - 6:00 PM", status: "Active" },
  { id: "s4", name: "Evening Vibes", host: "Lady Soul", time: "6:00 PM - 10:00 PM", status: "Active" },
  { id: "s5", name: "Late Night R&B", host: "DJ Velvet", time: "10:00 PM - 2:00 AM", status: "Active" },
  { id: "s6", name: "Sunday Gospel", host: "Minister Ray", time: "Sun 8:00 AM - 12:00 PM", status: "Weekend" },
];

const quickActions: { icon: LucideIcon; title: string; href: string; color: string }[] = [
  { icon: Radio, title: "All Shows", href: "/shows", color: "from-[#7401df] to-[#4c1d95]" },
  { icon: Users, title: "Manage Hosts", href: "/hosts", color: "from-[#3b82f6] to-[#1d4ed8]" },
  { icon: CalendarDays, title: "Full Schedule", href: "/shows", color: "from-[#74ddc7] to-[#0d9488]" },
  { icon: ArrowLeft, title: "Back to Admin", href: "/my/admin", color: "from-[#dc2626] to-[#b91c1c]" },
];

// ---------------------------------------------------------------------------
// Status cycling
// ---------------------------------------------------------------------------

const SHOW_STATUSES: ShowStatus[] = ["Active", "Inactive", "Weekend"];

function nextShowStatus(current: ShowStatus): ShowStatus {
  const idx = SHOW_STATUSES.indexOf(current);
  return SHOW_STATUSES[(idx + 1) % SHOW_STATUSES.length];
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

const SCHEDULE_BADGE_STYLES: Record<string, string> = {
  Live: "bg-[#22c55e]/10 border-[#22c55e]/20 text-[#22c55e]",
  Upcoming: "bg-[#3b82f6]/10 border-[#3b82f6]/20 text-[#3b82f6]",
  Completed: "bg-muted border-border text-muted-foreground",
};

const SHOW_BADGE_STYLES: Record<ShowStatus, string> = {
  Active: "bg-[#74ddc7]/10 border-[#74ddc7]/20 text-[#74ddc7]",
  Inactive: "bg-muted border-border text-muted-foreground",
  Weekend: "bg-[#7401df]/10 border-[#7401df]/20 text-[#7401df]",
};

function ScheduleStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${SCHEDULE_BADGE_STYLES[status] || ""}`}>
      {status}
    </span>
  );
}

function ShowStatusBadge({ status, onClick }: { status: ShowStatus; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:opacity-80 transition-opacity ${SHOW_BADGE_STYLES[status]}`}
      title="Click to toggle status"
    >
      {status}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProgrammingPage() {
  const { user } = useAuth();

  // -- State ----------------------------------------------------------------
  const [shows, setShows] = useState<Show[]>(initialShows);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [editTimeValue, setEditTimeValue] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // New show form
  const [newName, setNewName] = useState("");
  const [newHost, setNewHost] = useState("");
  const [newTime, setNewTime] = useState("");

  // -- Helpers --------------------------------------------------------------
  const showToast = useCallback((msg: string) => {
    setStatusMsg(msg);
    toast.success(msg);
    setTimeout(() => setStatusMsg(null), 3000);
  }, []);

  // -- Handlers -------------------------------------------------------------
  function handleToggleStatus(id: string) {
    setShows((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const ns = nextShowStatus(s.status);
        showToast(`"${s.name}" status changed to ${ns}`);
        return { ...s, status: ns };
      })
    );
  }

  function handleDeleteShow(id: string) {
    const show = shows.find((s) => s.id === id);
    setShows((prev) => prev.filter((s) => s.id !== id));
    showToast(`Deleted show "${show?.name ?? id}"`);
  }

  function handleMoveUp(id: string) {
    setShows((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
    showToast("Show moved up");
  }

  function handleMoveDown(id: string) {
    setShows((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
    showToast("Show moved down");
  }

  function handleStartEditTime(id: string, currentTime: string) {
    setEditingTimeId(id);
    setEditTimeValue(currentTime);
  }

  function handleSaveTime(id: string) {
    if (!editTimeValue.trim()) {
      toast.error("Time cannot be empty");
      return;
    }
    setShows((prev) =>
      prev.map((s) => (s.id === id ? { ...s, time: editTimeValue.trim() } : s))
    );
    setEditingTimeId(null);
    setEditTimeValue("");
    showToast("Time slot updated");
  }

  function handleCancelEditTime() {
    setEditingTimeId(null);
    setEditTimeValue("");
  }

  function handleAddShow() {
    if (!newName.trim()) {
      toast.error("Show name is required");
      return;
    }
    if (!newHost.trim()) {
      toast.error("Host name is required");
      return;
    }
    if (!newTime.trim()) {
      toast.error("Time slot is required");
      return;
    }
    const id = `s${Date.now()}`;
    const show: Show = {
      id,
      name: newName.trim(),
      host: newHost.trim(),
      time: newTime.trim(),
      status: "Active",
    };
    setShows((prev) => [...prev, show]);
    setShowNewForm(false);
    setNewName("");
    setNewHost("");
    setNewTime("");
    showToast(`Added show "${show.name}"`);
  }

  // -- Render ---------------------------------------------------------------
  return (
    <div className="space-y-8">
      {/* Status Message Bar */}
      {statusMsg && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-[#74ddc7] px-4 py-2 text-sm font-medium text-[#0a0a0f] shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {statusMsg}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7401df]/10 border border-[#7401df]/20">
            <Radio className="h-7 w-7 text-[#7401df]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Programming &amp; Shows</h1>
            <p className="text-sm text-muted-foreground">
              Manage schedules, shows, and on-air hosts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowNewForm(!showNewForm)}
            className="bg-[#7401df] text-white hover:bg-[#5e01b3] transition-colors"
          >
            {showNewForm ? <X className="h-4 w-4 mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
            {showNewForm ? "Cancel" : "Add Show"}
          </Button>
          <span className="rounded-full bg-[#7401df]/10 border border-[#7401df]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#7401df]">
            Programming
          </span>
        </div>
      </div>

      {/* Add Show Form */}
      {showNewForm && (
        <div className="rounded-xl border border-[#7401df]/30 bg-[#7401df]/5 p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <h3 className="text-sm font-semibold text-foreground">Add New Show</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Show Name *</label>
              <Input
                placeholder="e.g. The Afternoon Jam"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Host *</label>
              <Input
                placeholder="e.g. DJ Flex"
                value={newHost}
                onChange={(e) => setNewHost(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Time Slot *</label>
              <Input
                placeholder="e.g. 2:00 PM - 4:00 PM"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="bg-background"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleAddShow} className="bg-[#7401df] text-white hover:bg-[#5e01b3]">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Show
            </Button>
          </div>
        </div>
      )}

      {/* Current Schedule */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Clock className="h-5 w-5 text-[#74ddc7]" />
          Current Schedule
        </h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Time</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Show</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Host</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {initialSchedule.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{row.time}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{row.show}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.host}</td>
                    <td className="px-4 py-3">
                      <ScheduleStatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Show Management */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Mic className="h-5 w-5 text-[#7401df]" />
          Show Management
          <span className="text-xs font-normal text-muted-foreground ml-2">
            ({shows.length} shows)
          </span>
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shows.map((show, idx) => (
            <div
              key={show.id}
              className="rounded-xl border border-border bg-card p-5 space-y-3 hover:border-input hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 transition-all group"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-foreground">{show.name}</h3>
                <ShowStatusBadge
                  status={show.status}
                  onClick={() => handleToggleStatus(show.id)}
                />
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {show.host}
                </p>

                {/* Editable time */}
                {editingTimeId === show.id ? (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Input
                      value={editTimeValue}
                      onChange={(e) => setEditTimeValue(e.target.value)}
                      className="h-7 text-xs bg-background"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveTime(show.id);
                        if (e.key === "Escape") handleCancelEditTime();
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveTime(show.id)}
                      className="h-6 w-6 flex items-center justify-center rounded text-[#22c55e] hover:bg-[#22c55e]/10"
                      title="Save"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEditTime}
                      className="h-6 w-6 flex items-center justify-center rounded text-[#dc2626] hover:bg-[#dc2626]/10"
                      title="Cancel"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <p
                    className="text-sm text-muted-foreground flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleStartEditTime(show.id, show.time)}
                    title="Click to edit time"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    {show.time}
                    <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 ml-1" />
                  </p>
                )}
              </div>

              {/* Action row */}
              <div className="flex items-center justify-between pt-1 border-t border-border">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(show.id)}
                    disabled={idx === 0}
                    className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(show.id)}
                    disabled={idx === shows.length - 1}
                    className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteShow(show.id)}
                  className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-[#dc2626] hover:bg-[#dc2626]/10 transition-colors"
                  title="Delete show"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {shows.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">No shows configured. Click "Add Show" to get started.</p>
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:border-input hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${action.color}`}
                >
                  <action.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-[#74ddc7] transition-colors">
                  {action.title}
                </h3>
              </div>
              <div
                className={`absolute -inset-1 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-[0.03] rounded-xl transition-opacity`}
              />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
