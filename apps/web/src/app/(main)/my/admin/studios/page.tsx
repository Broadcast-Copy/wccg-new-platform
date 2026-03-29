"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import {
  Mic,
  Radio,
  Headphones,
  Monitor,
  Music,
  Video,
  Podcast,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Settings,
  Wrench,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Studio data
// ---------------------------------------------------------------------------
type StudioStatus = "available" | "in-use" | "maintenance" | "reserved";

interface Studio {
  id: string;
  name: string;
  type: string;
  icon: React.ElementType;
  status: StudioStatus;
  currentUser: string | null;
  currentShow: string | null;
  equipment: string[];
  capacity: number;
  nextBooking: string | null;
}

const STUDIOS: Studio[] = [
  {
    id: "studio-a",
    name: "Studio A",
    type: "On-Air Booth",
    icon: Radio,
    status: "in-use",
    currentUser: "Yung Joc",
    currentShow: "Streetz Morning Takeover",
    equipment: ["Wheatstone Console", "Electro-Voice RE20", "Telos VX Prime"],
    capacity: 4,
    nextBooking: "10:00 AM — Way Up with Angela Yee",
  },
  {
    id: "studio-b",
    name: "Studio B",
    type: "Production Suite",
    icon: Headphones,
    status: "available",
    currentUser: null,
    currentShow: null,
    equipment: ["Pro Tools HDX", "Neumann U87", "Genelec 8340A"],
    capacity: 2,
    nextBooking: "2:00 PM — Commercial Production",
  },
  {
    id: "studio-c",
    name: "Studio C",
    type: "Podcast Room",
    icon: Podcast,
    status: "reserved",
    currentUser: null,
    currentShow: null,
    equipment: ["Rodecaster Pro II", "SM7B x4", "Sony MDR-7506"],
    capacity: 4,
    nextBooking: "11:00 AM — Riich Villianz Radio",
  },
  {
    id: "studio-d",
    name: "Studio D",
    type: "Voice-Over Booth",
    icon: Mic,
    status: "available",
    currentUser: null,
    currentShow: null,
    equipment: ["Sennheiser MKH 416", "Avalon VT-737sp", "Source-Connect"],
    capacity: 1,
    nextBooking: null,
  },
  {
    id: "studio-e",
    name: "Studio E",
    type: "Music Production",
    icon: Music,
    status: "in-use",
    currentUser: "DJ Ike GDA",
    currentShow: "Mix Session",
    equipment: ["Ableton Live", "Pioneer DJ CDJ-3000", "KRK Rokit 8"],
    capacity: 3,
    nextBooking: "4:00 PM — Big Gleem Session",
  },
  {
    id: "studio-f",
    name: "Studio F",
    type: "Video Studio",
    icon: Video,
    status: "maintenance",
    currentUser: null,
    currentShow: null,
    equipment: ["Sony FX6", "Aputure 600d", "Blackmagic ATEM Mini"],
    capacity: 6,
    nextBooking: null,
  },
  {
    id: "studio-g",
    name: "Studio G",
    type: "Control Room",
    icon: Monitor,
    status: "available",
    currentUser: null,
    currentShow: null,
    equipment: ["Wheatstone IP-12", "Telos Infinity", "Axia Pathfinder"],
    capacity: 2,
    nextBooking: "6:00 AM — Morning Show Setup",
  },
];

const STATUS_CONFIG: Record<StudioStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  "available": { label: "Available", color: "text-emerald-500", bg: "bg-emerald-500/10", icon: CheckCircle2 },
  "in-use": { label: "In Use", color: "text-red-500", bg: "bg-red-500/10", icon: Radio },
  "maintenance": { label: "Maintenance", color: "text-amber-500", bg: "bg-amber-500/10", icon: Wrench },
  "reserved": { label: "Reserved", color: "text-blue-500", bg: "bg-blue-500/10", icon: Clock },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function StudioManagerPage() {
  const { user } = useAuth();
  const [studios, setStudios] = useState(STUDIOS);
  const [filter, setFilter] = useState<StudioStatus | "all">("all");

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Please <Link href="/login" className="text-primary underline">sign in</Link> to manage studios.</p>
      </div>
    );
  }

  const filtered = filter === "all" ? studios : studios.filter((s) => s.status === filter);

  const counts = {
    available: studios.filter((s) => s.status === "available").length,
    inUse: studios.filter((s) => s.status === "in-use").length,
    maintenance: studios.filter((s) => s.status === "maintenance").length,
    reserved: studios.filter((s) => s.status === "reserved").length,
  };

  function toggleStatus(id: string) {
    setStudios((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const order: StudioStatus[] = ["available", "reserved", "in-use", "maintenance"];
        const next = order[(order.indexOf(s.status) + 1) % order.length];
        return { ...s, status: next, currentUser: next === "available" ? null : s.currentUser, currentShow: next === "available" ? null : s.currentShow };
      })
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Studio Manager</h1>
          <p className="text-muted-foreground">Manage all 7 station studios — status, bookings, and equipment</p>
        </div>
        <Link
          href="/studio/booking"
          className="inline-flex items-center gap-2 rounded-xl bg-[#dc2626] px-4 py-2 text-sm font-semibold text-white hover:bg-[#dc2626]/90 transition-colors shrink-0"
        >
          <Clock className="h-4 w-4" /> Book a Studio
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Available", value: counts.available, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "In Use", value: counts.inUse, color: "text-red-500", bg: "bg-red-500/10" },
          { label: "Reserved", value: counts.reserved, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Maintenance", value: counts.maintenance, color: "text-amber-500", bg: "bg-amber-500/10" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "available", "in-use", "reserved", "maintenance"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
              filter === f ? "bg-[#dc2626] text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f === "all" ? "All Studios" : f.replace("-", " ")}
          </button>
        ))}
      </div>

      {/* Studios grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((studio) => {
          const status = STATUS_CONFIG[studio.status];
          const StatusIcon = status.icon;
          const StudioIcon = studio.icon;
          return (
            <div key={studio.id} className="rounded-xl border border-border bg-card overflow-hidden">
              {/* Studio header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#dc2626]/10">
                    <StudioIcon className="h-5 w-5 text-[#dc2626]" />
                  </div>
                  <div>
                    <h3 className="font-bold">{studio.name}</h3>
                    <p className="text-[11px] text-muted-foreground">{studio.type}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleStatus(studio.id)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${status.bg} ${status.color}`}
                >
                  <StatusIcon className="h-3 w-3" />
                  {status.label}
                </button>
              </div>

              {/* Studio body */}
              <div className="px-4 py-3 space-y-2.5">
                {/* Current usage */}
                {studio.currentUser && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{studio.currentUser}</span>
                    {studio.currentShow && (
                      <span className="text-xs text-muted-foreground">— {studio.currentShow}</span>
                    )}
                  </div>
                )}

                {/* Next booking */}
                {studio.nextBooking && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Next: {studio.nextBooking}
                  </div>
                )}

                {/* Capacity */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  Capacity: {studio.capacity} {studio.capacity === 1 ? "person" : "people"}
                </div>

                {/* Equipment */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {studio.equipment.map((eq) => (
                    <span key={eq} className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                      {eq}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
