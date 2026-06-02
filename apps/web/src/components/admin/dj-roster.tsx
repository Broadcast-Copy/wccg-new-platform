"use client";

/**
 * DjRoster — manage every WCCG DJ (the djs table). Rendered as the "DJs" tab
 * of the Creator Manager. Supabase-direct; admin/management/production only.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Disc3, Loader2, Pencil, Plus, RefreshCw, Search, UserCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Dj {
  id: string; slug: string; display_name: string;
  email: string | null; phone: string | null; notes: string | null;
  is_active: boolean; user_id: string | null;
}
interface SlotLite { dj_id: string | null; day_of_week: number; start_time: string }

export function DjRoster() {
  const [djs, setDjs] = useState<Dj[]>([]);
  const [slots, setSlots] = useState<SlotLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Dj | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const [{ data: d, error: dErr }, { data: s }] = await Promise.all([
        supabase.from("djs").select("id,slug,display_name,email,phone,notes,is_active,user_id").order("display_name"),
        supabase.from("dj_slots").select("dj_id,day_of_week,start_time"),
      ]);
      if (dErr) throw new Error(dErr.message);
      setDjs((d ?? []) as Dj[]);
      setSlots((s ?? []) as SlotLite[]);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const slotsByDj = useMemo(() => {
    const m = new Map<string, SlotLite[]>();
    for (const s of slots) {
      if (!s.dj_id) continue;
      const arr = m.get(s.dj_id) ?? [];
      arr.push(s); m.set(s.dj_id, arr);
    }
    return m;
  }, [slots]);

  const filtered = useMemo(() => {
    if (!q.trim()) return djs;
    const v = q.toLowerCase();
    return djs.filter((d) => d.display_name.toLowerCase().includes(v) || (d.email ?? "").toLowerCase().includes(v) || (d.notes ?? "").toLowerCase().includes(v));
  }, [djs, q]);

  const toggleActive = async (dj: Dj) => {
    setBusyId(dj.id);
    try {
      const supabase = createClient();
      await supabase.from("djs").update({ is_active: !dj.is_active, updated_at: new Date().toISOString() }).eq("id", dj.id);
      setDjs((xs) => xs.map((x) => (x.id === dj.id ? { ...x, is_active: !dj.is_active } : x)));
    } catch (e) { setError((e as Error).message); } finally { setBusyId(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{djs.length} DJs · {djs.filter((d) => d.is_active).length} active</p>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search DJs…" className="w-56 rounded-full border border-border bg-card pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
          </div>
          <Button onClick={load} variant="outline" size="sm" className="rounded-full"><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh</Button>
          <Button onClick={() => setCreating(true)} size="sm" className="rounded-full"><Plus className="mr-1.5 h-3.5 w-3.5" /> Add DJ</Button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      {loading && djs.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-card/60 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">DJ</th>
                <th className="px-4 py-3 text-left">Real name</th>
                <th className="px-4 py-3 text-left">Contact</th>
                <th className="px-4 py-3 text-left">Slots</th>
                <th className="px-4 py-3 text-left">Account</th>
                <th className="px-4 py-3 text-left">Active</th>
                <th className="px-4 py-3 text-right">Edit</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((dj) => {
                const sl = (slotsByDj.get(dj.id) ?? []).sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time));
                return (
                  <tr key={dj.id} className="border-t border-border">
                    <td className="px-4 py-2">
                      <Link href={`/djs/${dj.slug}`} className="inline-flex items-center gap-2 font-bold hover:text-[#74ddc7]"><Disc3 className="h-4 w-4 text-[#74ddc7]" /> {dj.display_name}</Link>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{dj.notes ?? "—"}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{dj.email ?? "—"}{dj.phone ? <><br />{dj.phone}</> : null}</td>
                    <td className="px-4 py-2">
                      {sl.length === 0 ? <span className="text-muted-foreground/60">none</span> : (
                        <div className="flex flex-wrap gap-1">
                          {sl.slice(0, 4).map((s, i) => <span key={i} className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{DAYS[s.day_of_week]} {fmt12h(s.start_time)}</span>)}
                          {sl.length > 4 && <span className="text-[10px] text-muted-foreground">+{sl.length - 4}</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">{dj.user_id ? <span className="inline-flex items-center gap-1 text-[#74ddc7]"><CheckCircle2 className="h-3.5 w-3.5" /> linked</span> : <span className="text-muted-foreground/60">—</span>}</td>
                    <td className="px-4 py-2">
                      <button onClick={() => toggleActive(dj)} disabled={busyId === dj.id} className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${dj.is_active ? "bg-[#74ddc7]/15 text-[#74ddc7]" : "bg-muted text-muted-foreground"}`}>
                        {busyId === dj.id ? "…" : dj.is_active ? "active" : "inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-right"><Button size="sm" variant="outline" className="rounded-full" onClick={() => setEditing(dj)}><Pencil className="h-3.5 w-3.5" /></Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(editing || creating) && (
        <DjEditDialog dj={editing} onClose={() => { setEditing(null); setCreating(false); }} onSaved={() => { setEditing(null); setCreating(false); load(); }} />
      )}
    </div>
  );
}

function DjEditDialog({ dj, onClose, onSaved }: { dj: Dj | null; onClose: () => void; onSaved: () => void }) {
  const isNew = !dj;
  const [form, setForm] = useState({
    display_name: dj?.display_name ?? "", slug: dj?.slug ?? "",
    email: dj?.email ?? "", phone: dj?.phone ?? "", notes: dj?.notes ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setErr(null);
    if (!form.display_name.trim()) { setErr("Display name required."); return; }
    const slug = form.slug.trim() || form.display_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    setBusy(true);
    try {
      const supabase = createClient();
      if (isNew) {
        const { error } = await supabase.from("djs").insert({
          id: `dj_${slug.replace(/-/g, "_")}`, slug, display_name: form.display_name.trim(),
          email: form.email.trim() || null, phone: form.phone.trim() || null, notes: form.notes.trim() || null, is_active: true,
        });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("djs").update({
          display_name: form.display_name.trim(), slug,
          email: form.email.trim() || null, phone: form.phone.trim() || null, notes: form.notes.trim() || null, updated_at: new Date().toISOString(),
        }).eq("id", dj!.id);
        if (error) throw new Error(error.message);
      }
      onSaved();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold"><UserCircle2 className="h-5 w-5 text-[#74ddc7]" /> {isNew ? "Add DJ" : "Edit DJ"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        {err && <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-300">{err}</div>}
        <div className="space-y-3">
          <Field label="Display name *" value={form.display_name} onChange={(v) => setForm({ ...form, display_name: v })} />
          <Field label="Slug (URL)" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} placeholder="auto from name" />
          <Field label="Real name" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
          <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null} Save</Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
    </div>
  );
}

function fmt12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const ampm = h >= 12 ? "p" : "a";
  const display = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${display}${ampm}` : `${display}:${String(m).padStart(2, "0")}${ampm}`;
}
