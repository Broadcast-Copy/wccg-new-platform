"use client";

/**
 * Points & Rewards admin (PT3). Staff CRUD over reward_catalog (the /rewards
 * store) and points_rules (what each earn action is worth). Supabase-direct;
 * the /my/admin subtree is staff-gated by its layout (RequireRole) and both
 * tables are staff-write RLS (migration 081). Editing a rule's points_amount
 * changes what users earn — award_points reads it live.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gift, SlidersHorizontal, ArrowLeft, Plus, Pencil, X, Loader2, Check, Ban } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Reward {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  points_cost: number;
  category: string | null;
  stock_count: number | null;
  is_active: boolean;
}

interface Rule {
  id: string;
  name: string;
  trigger_type: string;
  points_amount: number;
  threshold: number | null;
  cooldown_minutes: number | null;
  is_active: boolean;
}

const REWARD_CATEGORIES = ["Digital", "Experiences", "Merchandise"];
const KNOWN_TRIGGERS = [
  "LISTENING", "DAILY_BOUNTY", "SHARE", "VIDEO_WATCH", "REFERRAL",
  "KEYWORD_ENTRY", "EVENT_CHECKIN", "STREAK_BONUS", "LISTEN_MINUTES",
  "EVENT_ATTENDANCE", "SIGNUP",
];

// ===========================================================================
// Rewards manager
// ===========================================================================

interface RewardDraft {
  id: string | null;
  name: string;
  description: string;
  image_url: string;
  points_cost: number;
  category: string;
  stock_count: string; // "" = unlimited
  is_active: boolean;
}

function RewardsManager() {
  const [rows, setRows] = useState<Reward[] | null>(null);
  const [editing, setEditing] = useState<RewardDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function fetchRows() {
    const supabase = createClient();
    const { data } = await supabase
      .from("reward_catalog")
      .select("id, name, description, image_url, points_cost, category, stock_count, is_active")
      .order("points_cost");
    return (data ?? []) as unknown as Reward[];
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      const data = await fetchRows();
      if (active) setRows(data);
    })();
    return () => { active = false; };
  }, []);

  async function reload() { setRows(await fetchRows()); }

  function openNew() {
    setErr(null);
    setEditing({ id: null, name: "", description: "", image_url: "", points_cost: 100, category: "Digital", stock_count: "", is_active: true });
  }
  function openEdit(r: Reward) {
    setErr(null);
    setEditing({
      id: r.id, name: r.name, description: r.description ?? "", image_url: r.image_url ?? "",
      points_cost: Number(r.points_cost), category: r.category ?? "", stock_count: r.stock_count == null ? "" : String(r.stock_count), is_active: r.is_active,
    });
  }
  function patch(p: Partial<RewardDraft>) { setEditing((prev) => (prev ? { ...prev, ...p } : prev)); }

  async function save() {
    if (!editing) return;
    if (!editing.name.trim()) { setErr("Enter a reward name."); return; }
    setSaving(true);
    setErr(null);
    const supabase = createClient();
    const payload = {
      name: editing.name.trim(),
      description: editing.description.trim() || null,
      image_url: editing.image_url.trim() || null,
      points_cost: Math.max(0, Math.round(editing.points_cost) || 0),
      category: editing.category.trim() || null,
      stock_count: editing.stock_count.trim() === "" ? null : Math.max(0, parseInt(editing.stock_count, 10) || 0),
      is_active: editing.is_active,
    };
    const { error } = editing.id
      ? await supabase.from("reward_catalog").update(payload).eq("id", editing.id)
      : await supabase.from("reward_catalog").insert(payload);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setEditing(null);
    await reload();
  }

  async function toggle(r: Reward) {
    setBusy(r.id);
    const supabase = createClient();
    const { error } = await supabase.from("reward_catalog").update({ is_active: !r.is_active }).eq("id", r.id);
    setBusy(null);
    if (error) { setErr(error.message); return; }
    await reload();
  }

  const loading = rows === null;
  const list = rows ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{loading ? "Loading…" : `${list.length} rewards · ${list.filter((r) => r.is_active).length} active`}</p>
        <button type="button" onClick={openNew} className="inline-flex items-center gap-1.5 rounded-lg bg-[#74ddc7] px-3 py-1.5 text-xs font-bold text-[#0a0a0f] hover:bg-[#74ddc7]/90 transition-colors">
          <Plus className="h-3.5 w-3.5" /> Add Reward
        </button>
      </div>
      {err && !editing && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{err}</p>}

      <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
        {loading ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : list.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">No rewards yet.</p>
        ) : (
          list.map((r) => (
            <div key={r.id} className={`flex items-center gap-3 px-4 py-3 ${r.is_active ? "" : "opacity-55"}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                  {r.category && <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">{r.category}</span>}
                  {!r.is_active && <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground border border-border rounded-full px-1.5 py-0.5">Inactive</span>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {r.stock_count == null ? "Unlimited stock" : `${r.stock_count} in stock`}
                </p>
              </div>
              <span className="text-sm font-semibold text-yellow-500 shrink-0">{r.points_cost.toLocaleString()} pts</span>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => openEdit(r)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-[#74ddc7] hover:bg-[#74ddc7]/10 transition-colors" title="Edit">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => toggle(r)} disabled={busy === r.id} className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-50 ${r.is_active ? "text-muted-foreground hover:text-red-400 hover:bg-red-500/10" : "text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10"}`} title={r.is_active ? "Deactivate" : "Activate"}>
                  {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : r.is_active ? <Ban className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-lg font-bold text-foreground">{editing.id ? "Edit reward" : "Add reward"}</h3>
              <button type="button" onClick={() => setEditing(null)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <Field label="Name"><input type="text" value={editing.name} onChange={(e) => patch({ name: e.target.value })} className={inputCls} /></Field>
              <Field label="Description"><textarea value={editing.description} onChange={(e) => patch({ description: e.target.value })} rows={2} className={`${inputCls} resize-none`} /></Field>
              <Field label="Image URL"><input type="text" value={editing.image_url} onChange={(e) => patch({ image_url: e.target.value })} placeholder="https://…" className={inputCls} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <input type="text" list="reward-cats" value={editing.category} onChange={(e) => patch({ category: e.target.value })} className={inputCls} />
                  <datalist id="reward-cats">{REWARD_CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
                </Field>
                <Field label="Points cost"><input type="number" min={0} value={editing.points_cost} onChange={(e) => patch({ points_cost: Math.max(0, Number(e.target.value) || 0) })} className={inputCls} /></Field>
              </div>
              <Field label="Stock (blank = unlimited)"><input type="number" min={0} value={editing.stock_count} onChange={(e) => patch({ stock_count: e.target.value })} placeholder="Unlimited" className={inputCls} /></Field>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" checked={editing.is_active} onChange={(e) => patch({ is_active: e.target.checked })} className="h-4 w-4 rounded border-border" /> Active (shown in the rewards store)
              </label>
              {err && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{err}</p>}
            </div>
            <ModalFooter onCancel={() => setEditing(null)} onSave={save} saving={saving} isEdit={!!editing.id} />
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Rules manager
// ===========================================================================

interface RuleDraft {
  id: string | null;
  name: string;
  trigger_type: string;
  points_amount: number;
  threshold: string;
  cooldown_minutes: string;
  is_active: boolean;
}

function RulesManager() {
  const [rows, setRows] = useState<Rule[] | null>(null);
  const [editing, setEditing] = useState<RuleDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function fetchRows() {
    const supabase = createClient();
    const { data } = await supabase
      .from("points_rules")
      .select("id, name, trigger_type, points_amount, threshold, cooldown_minutes, is_active")
      .order("trigger_type")
      .order("points_amount");
    return (data ?? []) as unknown as Rule[];
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      const data = await fetchRows();
      if (active) setRows(data);
    })();
    return () => { active = false; };
  }, []);

  async function reload() { setRows(await fetchRows()); }

  function openNew() {
    setErr(null);
    setEditing({ id: null, name: "", trigger_type: "DAILY_BOUNTY", points_amount: 5, threshold: "1", cooldown_minutes: "0", is_active: true });
  }
  function openEdit(r: Rule) {
    setErr(null);
    setEditing({
      id: r.id, name: r.name, trigger_type: r.trigger_type, points_amount: Number(r.points_amount),
      threshold: r.threshold == null ? "" : String(r.threshold), cooldown_minutes: r.cooldown_minutes == null ? "" : String(r.cooldown_minutes), is_active: r.is_active,
    });
  }
  function patch(p: Partial<RuleDraft>) { setEditing((prev) => (prev ? { ...prev, ...p } : prev)); }

  async function save() {
    if (!editing) return;
    if (!editing.name.trim()) { setErr("Enter a rule name."); return; }
    if (!editing.trigger_type.trim()) { setErr("Enter a trigger type (the earn reason)."); return; }
    setSaving(true);
    setErr(null);
    const supabase = createClient();
    const payload = {
      name: editing.name.trim(),
      trigger_type: editing.trigger_type.trim(),
      points_amount: Math.max(0, Math.round(editing.points_amount) || 0),
      threshold: editing.threshold.trim() === "" ? null : Math.max(0, parseInt(editing.threshold, 10) || 0),
      cooldown_minutes: editing.cooldown_minutes.trim() === "" ? 0 : Math.max(0, parseInt(editing.cooldown_minutes, 10) || 0),
      is_active: editing.is_active,
    };
    const { error } = editing.id
      ? await supabase.from("points_rules").update(payload).eq("id", editing.id)
      : await supabase.from("points_rules").insert(payload);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setEditing(null);
    await reload();
  }

  async function toggle(r: Rule) {
    setBusy(r.id);
    const supabase = createClient();
    const { error } = await supabase.from("points_rules").update({ is_active: !r.is_active }).eq("id", r.id);
    setBusy(null);
    if (error) { setErr(error.message); return; }
    await reload();
  }

  const loading = rows === null;
  const list = rows ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{loading ? "Loading…" : `${list.length} rules · ${list.filter((r) => r.is_active).length} active`}</p>
        <button type="button" onClick={openNew} className="inline-flex items-center gap-1.5 rounded-lg bg-[#74ddc7] px-3 py-1.5 text-xs font-bold text-[#0a0a0f] hover:bg-[#74ddc7]/90 transition-colors">
          <Plus className="h-3.5 w-3.5" /> Add Rule
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        <code className="text-foreground">trigger_type</code> must match the earn reason the app sends (e.g. DAILY_BOUNTY, EVENT_CHECKIN). Changing <code className="text-foreground">points_amount</code> changes what users earn immediately. LISTENING &amp; STREAK_BONUS are intentionally rule-less.
      </p>
      {err && !editing && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{err}</p>}

      <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
        {loading ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : list.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">No rules yet.</p>
        ) : (
          list.map((r) => (
            <div key={r.id} className={`flex items-center gap-3 px-4 py-3 ${r.is_active ? "" : "opacity-55"}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                  {!r.is_active && <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground border border-border rounded-full px-1.5 py-0.5">Inactive</span>}
                </div>
                <p className="text-xs text-muted-foreground">
                  <code>{r.trigger_type}</code>
                  {r.cooldown_minutes ? ` · ${r.cooldown_minutes}m cooldown` : ""}
                  {r.threshold ? ` · threshold ${r.threshold}` : ""}
                </p>
              </div>
              <span className="text-sm font-semibold text-emerald-400 shrink-0">+{r.points_amount} pts</span>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => openEdit(r)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-[#74ddc7] hover:bg-[#74ddc7]/10 transition-colors" title="Edit">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => toggle(r)} disabled={busy === r.id} className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-50 ${r.is_active ? "text-muted-foreground hover:text-red-400 hover:bg-red-500/10" : "text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10"}`} title={r.is_active ? "Deactivate" : "Activate"}>
                  {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : r.is_active ? <Ban className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-lg font-bold text-foreground">{editing.id ? "Edit rule" : "Add rule"}</h3>
              <button type="button" onClick={() => setEditing(null)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <Field label="Name"><input type="text" value={editing.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Daily listen bounty" className={inputCls} /></Field>
              <Field label="Trigger type (earn reason)">
                <input type="text" list="rule-triggers" value={editing.trigger_type} onChange={(e) => patch({ trigger_type: e.target.value })} className={inputCls} />
                <datalist id="rule-triggers">{KNOWN_TRIGGERS.map((t) => <option key={t} value={t} />)}</datalist>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Points awarded"><input type="number" min={0} value={editing.points_amount} onChange={(e) => patch({ points_amount: Math.max(0, Number(e.target.value) || 0) })} className={inputCls} /></Field>
                <Field label="Cooldown (min)"><input type="number" min={0} value={editing.cooldown_minutes} onChange={(e) => patch({ cooldown_minutes: e.target.value })} placeholder="0" className={inputCls} /></Field>
              </div>
              <Field label="Threshold (optional)"><input type="number" min={0} value={editing.threshold} onChange={(e) => patch({ threshold: e.target.value })} placeholder="—" className={inputCls} /></Field>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" checked={editing.is_active} onChange={(e) => patch({ is_active: e.target.checked })} className="h-4 w-4 rounded border-border" /> Active
              </label>
              {err && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{err}</p>}
            </div>
            <ModalFooter onCancel={() => setEditing(null)} onSave={save} saving={saving} isEdit={!!editing.id} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function ModalFooter({ onCancel, onSave, saving, isEdit }: { onCancel: () => void; onSave: () => void; saving: boolean; isEdit: boolean }) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
      <button type="button" onClick={onCancel} disabled={saving} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50">Cancel</button>
      <button type="button" onClick={onSave} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-[#74ddc7] px-4 py-2 text-sm font-bold text-[#0a0a0f] hover:bg-[#74ddc7]/90 transition-colors disabled:opacity-50">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {isEdit ? "Save" : "Add"}
      </button>
    </div>
  );
}

// ===========================================================================
// Page
// ===========================================================================

type Tab = "rewards" | "rules";

export default function AdminPointsPage() {
  const [tab, setTab] = useState<Tab>("rewards");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/my/admin" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-foreground/[0.04] transition-colors">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Gift className="h-6 w-6 text-yellow-500" />
            Points &amp; Rewards
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage the rewards store and what each action earns.</p>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        <button type="button" onClick={() => setTab("rewards")} className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 ${tab === "rewards" ? "border-[#74ddc7] text-[#74ddc7]" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          <Gift className="h-4 w-4" /> Rewards
        </button>
        <button type="button" onClick={() => setTab("rules")} className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 ${tab === "rules" ? "border-[#74ddc7] text-[#74ddc7]" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          <SlidersHorizontal className="h-4 w-4" /> Earning Rules
        </button>
      </div>

      {tab === "rewards" ? <RewardsManager /> : <RulesManager />}
    </div>
  );
}
