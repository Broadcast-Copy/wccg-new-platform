"use client";

/**
 * Admin — DJ Bookings. Station staff review booking requests submitted from
 * DJ profiles (the public Booking tab → `dj_bookings`). Staff-gated by the
 * /my/admin layout (RequireRole). Supabase-direct; RLS limits read/update to
 * staff. supabase-js never throws, so every query checks `{ error }`, and
 * setState only happens after awaits behind an `active` guard.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Clock,
  Loader2,
  Mail,
  MapPin,
  Music,
  Phone,
  User as UserIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Status = "pending" | "reviewing" | "confirmed" | "declined";
const STATUSES: Status[] = ["pending", "reviewing", "confirmed", "declined"];
const STATUS_STYLE: Record<Status, string> = {
  pending: "border-amber-400/40 bg-amber-400/15 text-amber-300",
  reviewing: "border-sky-400/40 bg-sky-400/15 text-sky-300",
  confirmed: "border-[#74ddc7]/40 bg-[#74ddc7]/15 text-[#74ddc7]",
  declined: "border-border bg-foreground/[0.06] text-muted-foreground",
};

interface Booking {
  id: string;
  dj_id: string;
  event_name: string;
  event_date: string | null;
  event_time: string | null;
  duration: string | null;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  location_type: string | null;
  music_type: string | null;
  needs_host: boolean;
  needs_sound: boolean;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  message: string | null;
  status: Status;
  created_at: string;
  djs: { display_name: string; slug: string } | null;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtSubmitted(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function AdminDjBookingsPage() {
  const [supabase] = useState(() => createClient());
  const [rows, setRows] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void (async () => {
      const { data, error: qErr } = await supabase
        .from("dj_bookings")
        .select(
          "id,dj_id,event_name,event_date,event_time,duration,venue_name,city,state,location_type,music_type,needs_host,needs_sound,contact_name,contact_email,contact_phone,message,status,created_at,djs(display_name,slug)",
        )
        .order("created_at", { ascending: false });
      if (!active) return;
      if (qErr) {
        setError(qErr.message);
        setRows([]);
      } else {
        setRows((data ?? []) as unknown as Booking[]);
        setError(null);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const s of STATUSES) c[s] = rows.filter((r) => r.status === s).length;
    return c;
  }, [rows]);

  const visible = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  );

  const setStatus = useCallback(
    async (id: string, status: Status) => {
      setBusy(id);
      const { error: upErr } = await supabase
        .from("dj_bookings")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      setBusy(null);
      if (upErr) {
        setError(upErr.message);
        return;
      }
      // Optimistic local update (avoids a full reload).
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    },
    [supabase],
  );

  return (
    <div className="space-y-6 py-6">
      <header>
        <Link href="/my/admin" className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
          ← Admin
        </Link>
        <h1 className="mt-2 inline-flex items-center gap-2 text-3xl font-black tracking-tight text-foreground">
          <CalendarCheck className="h-7 w-7 text-[#74ddc7]" /> DJ Bookings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Booking requests from DJ profile pages. Update status as you work each one.
        </p>
      </header>

      {/* Status filter */}
      <div className="flex flex-wrap gap-1.5">
        {(["all", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-bold capitalize transition-colors ${
              filter === s ? "border-[#74ddc7]/60 bg-[#74ddc7]/10 text-[#74ddc7]" : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {s} · {counts[s] ?? 0}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
          <CalendarCheck className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            {filter === "all" ? "No booking requests yet." : `No ${filter} requests.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((b) => (
            <article key={b.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-black tracking-tight text-foreground">{b.event_name}</h2>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLE[b.status]}`}>
                      {b.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    for{" "}
                    {b.djs ? (
                      <Link href={`/djs/${b.djs.slug}`} className="font-bold text-foreground hover:text-[#74ddc7]">
                        {b.djs.display_name}
                      </Link>
                    ) : (
                      <span className="font-bold text-foreground">{b.dj_id}</span>
                    )}
                    {" · "}
                    <span className="text-xs">submitted {fmtSubmitted(b.created_at)}</span>
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  Status
                  <select
                    value={b.status}
                    disabled={busy === b.id}
                    onChange={(e) => setStatus(b.id, e.target.value as Status)}
                    className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40 disabled:opacity-50"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Event detail chips */}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                {(b.event_date || b.event_time) && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-[#74ddc7]" />
                    {fmtDate(b.event_date)}{b.event_time ? ` · ${b.event_time}` : ""}{b.duration ? ` · ${b.duration}` : ""}
                  </span>
                )}
                {(b.venue_name || b.city) && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[#74ddc7]" />
                    {[b.venue_name, [b.city, b.state].filter(Boolean).join(", "), b.location_type].filter(Boolean).join(" · ")}
                  </span>
                )}
                {b.music_type && (
                  <span className="inline-flex items-center gap-1.5">
                    <Music className="h-3.5 w-3.5 text-[#74ddc7]" /> {b.music_type}
                  </span>
                )}
                {(b.needs_host || b.needs_sound) && (
                  <span className="text-foreground/70">
                    Needs: {[b.needs_host ? "host/mic" : null, b.needs_sound ? "sound" : null].filter(Boolean).join(", ")}
                  </span>
                )}
              </div>

              {b.message && (
                <p className="mt-3 rounded-xl border border-border bg-background/50 px-3 py-2 text-sm text-muted-foreground">
                  {b.message}
                </p>
              )}

              {/* Contact */}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <UserIcon className="h-3.5 w-3.5" /> {b.contact_name}
                </span>
                <a href={`mailto:${b.contact_email}?subject=${encodeURIComponent(`WCCG booking — ${b.event_name}`)}`} className="inline-flex items-center gap-1.5 font-bold text-[#74ddc7] hover:underline">
                  <Mail className="h-3.5 w-3.5" /> {b.contact_email}
                </a>
                {b.contact_phone && (
                  <a href={`tel:${b.contact_phone}`} className="inline-flex items-center gap-1.5 text-foreground hover:text-[#74ddc7]">
                    <Phone className="h-3.5 w-3.5" /> {b.contact_phone}
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
