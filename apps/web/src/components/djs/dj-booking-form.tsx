"use client";

/**
 * DJ booking request form — lives in the Booking tab of a DJ's public profile.
 *
 * Submits straight to `dj_bookings` as the (possibly anonymous) browser user
 * (no API server). RLS lets anyone INSERT a fresh `pending` row; station staff
 * review it in the admin console. supabase-js never throws, so the insert is
 * checked via `{ error }`; setState only happens in event handlers.
 */

import { useState } from "react";
import { CalendarCheck, CheckCircle2, Loader2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const DURATIONS = ["1 hour", "2 hours", "3 hours", "4 hours", "All day"];
const LOCATION_TYPES = ["Indoor", "Outdoor", "Private venue", "Club", "Concert / Arena", "Festival", "Other"];
const MUSIC_TYPES = ["Hip-Hop", "R&B", "Reggae / Caribbean", "Top 40", "Gospel", "Old School", "Open format / Mixed"];

const FIELD =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40";
const LABEL = "mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground";

export function DjBookingForm({ djId, djName }: { djId: string; djName: string }) {
  const [supabase] = useState(() => createClient());
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Controlled fields
  const [f, setF] = useState({
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    event_name: "",
    event_date: "",
    event_time: "",
    duration: "",
    venue_name: "",
    city: "",
    state: "",
    location_type: "",
    music_type: "",
    needs_host: false,
    needs_sound: false,
    message: "",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((prev) => ({ ...prev, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!f.contact_name.trim() || !f.contact_email.trim() || !f.event_name.trim()) {
      setError("Please fill in your name, email, and the event name.");
      return;
    }
    setSubmitting(true);
    const { error: insErr } = await supabase.from("dj_bookings").insert({
      dj_id: djId,
      status: "pending",
      event_name: f.event_name.trim(),
      event_date: f.event_date || null,
      event_time: f.event_time.trim() || null,
      duration: f.duration || null,
      venue_name: f.venue_name.trim() || null,
      city: f.city.trim() || null,
      state: f.state.trim() || null,
      location_type: f.location_type || null,
      music_type: f.music_type || null,
      needs_host: f.needs_host,
      needs_sound: f.needs_sound,
      contact_name: f.contact_name.trim(),
      contact_email: f.contact_email.trim(),
      contact_phone: f.contact_phone.trim() || null,
      message: f.message.trim() || null,
    });
    setSubmitting(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-[#74ddc7]/40 bg-[#74ddc7]/[0.06] p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-[#74ddc7]" />
        <h3 className="mt-3 text-lg font-black tracking-tight text-foreground">Request sent! 🎧</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Thanks — your booking request for {djName} is in. WCCG will review availability and follow up
          at <span className="font-bold text-foreground">{f.contact_email}</span>. This is a request, not a
          confirmation.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <CalendarCheck className="h-5 w-5 text-[#74ddc7]" />
        <h3 className="text-lg font-black tracking-tight text-foreground">Book {djName}</h3>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        Tell us about your event. All Mix Squad bookings are coordinated through the station; submitting
        this form doesn&apos;t guarantee availability.
      </p>

      {/* Contact */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={LABEL}>Your name *</label>
          <input className={FIELD} value={f.contact_name} onChange={(e) => set("contact_name", e.target.value)} required />
        </div>
        <div>
          <label className={LABEL}>Email *</label>
          <input type="email" className={FIELD} value={f.contact_email} onChange={(e) => set("contact_email", e.target.value)} required />
        </div>
        <div>
          <label className={LABEL}>Phone</label>
          <input className={FIELD} value={f.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
        </div>
      </div>

      {/* Event */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={LABEL}>Event name *</label>
          <input className={FIELD} value={f.event_name} onChange={(e) => set("event_name", e.target.value)} placeholder="e.g. Summer Block Party" required />
        </div>
        <div>
          <label className={LABEL}>Date</label>
          <input type="date" className={FIELD} value={f.event_date} onChange={(e) => set("event_date", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Start time</label>
            <input type="time" className={FIELD} value={f.event_time} onChange={(e) => set("event_time", e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>Duration</label>
            <select className={FIELD} value={f.duration} onChange={(e) => set("duration", e.target.value)}>
              <option value="">—</option>
              {DURATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Venue */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={LABEL}>Venue / location</label>
          <input className={FIELD} value={f.venue_name} onChange={(e) => set("venue_name", e.target.value)} />
        </div>
        <div className="grid grid-cols-[1fr_5rem] gap-3">
          <div>
            <label className={LABEL}>City</label>
            <input className={FIELD} value={f.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>State</label>
            <input className={FIELD} value={f.state} onChange={(e) => set("state", e.target.value)} placeholder="NC" maxLength={2} />
          </div>
        </div>
        <div>
          <label className={LABEL}>Location type</label>
          <select className={FIELD} value={f.location_type} onChange={(e) => set("location_type", e.target.value)}>
            <option value="">—</option>
            {LOCATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Music type</label>
          <select className={FIELD} value={f.music_type} onChange={(e) => set("music_type", e.target.value)}>
            <option value="">—</option>
            {MUSIC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Needs */}
      <div className="flex flex-wrap gap-4">
        <label className="inline-flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" className="h-4 w-4 accent-[#74ddc7]" checked={f.needs_host} onChange={(e) => set("needs_host", e.target.checked)} />
          Need the DJ to host / be on the mic
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" className="h-4 w-4 accent-[#74ddc7]" checked={f.needs_sound} onChange={(e) => set("needs_sound", e.target.checked)} />
          Need sound equipment
        </label>
      </div>

      <div>
        <label className={LABEL}>Event details</label>
        <textarea className={`${FIELD} min-h-[90px] resize-y`} value={f.message} onChange={(e) => set("message", e.target.value)} placeholder="Anything else we should know — crowd size, vibe, budget range…" />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <p className="text-[11px] leading-relaxed text-muted-foreground/70">
        All WCCG DJs are independent contractors; availability and rates are set by the DJ. Sound services and
        promotion may carry additional cost negotiated directly. Submitting this form is a request, not a
        confirmation.
      </p>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7401df] to-[#74ddc7] px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {submitting ? "Sending…" : "Send booking request"}
      </button>
    </form>
  );
}
