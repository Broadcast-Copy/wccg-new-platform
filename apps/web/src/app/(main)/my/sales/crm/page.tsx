"use client";

/**
 * CRM — /my/sales/crm
 *
 * Maintain all clients. Each client has a portal of assets (logos, audio,
 * video, docs) that staff upload, plus their production orders. Supabase-
 * direct. Sales / production / admin / management.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Building2, FileBox, Loader2, Plus, RefreshCw, Search, Upload, X, Receipt, Download, Pencil, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface Client {
  id: string; name: string; company: string | null; industry: string | null;
  contact_name: string | null; contact_email: string | null; contact_phone: string | null;
  website: string | null; address: string | null; status: string;
  portal_email: string | null; notes: string | null;
}
interface Asset { id: string; name: string; kind: string; storage_path: string | null; size_bytes: number | null; created_at: string }
interface Order { id: string; order_number: number; title: string; type: string; status: string; priority: string; due_date: string | null; created_at: string }

const STATUS_COLORS: Record<string, string> = {
  lead: "bg-blue-500/15 text-blue-400", prospect: "bg-amber-500/15 text-amber-400",
  active: "bg-[#74ddc7]/15 text-[#74ddc7]", inactive: "bg-muted text-muted-foreground", archived: "bg-muted text-muted-foreground",
};

export default function CrmPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [counts, setCounts] = useState<Record<string, { orders: number; assets: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Client | null>(null);
  const [editing, setEditing] = useState<Client | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("crm_clients").select("*").order("name");
      if (error) throw new Error(error.message);
      setClients((data ?? []) as Client[]);
      // counts
      const [{ data: o }, { data: a }] = await Promise.all([
        supabase.from("production_orders").select("client_id"),
        supabase.from("client_assets").select("client_id"),
      ]);
      const c: Record<string, { orders: number; assets: number }> = {};
      for (const r of o ?? []) { const k = (r as { client_id: string }).client_id; if (k) { c[k] = c[k] ?? { orders: 0, assets: 0 }; c[k].orders++; } }
      for (const r of a ?? []) { const k = (r as { client_id: string }).client_id; if (k) { c[k] = c[k] ?? { orders: 0, assets: 0 }; c[k].assets++; } }
      setCounts(c);
      setError(null);
    } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!q.trim()) return clients;
    const v = q.toLowerCase();
    return clients.filter((c) => [c.name, c.company, c.contact_name, c.contact_email].some((x) => (x ?? "").toLowerCase().includes(v)));
  }, [clients, q]);

  return (
    <div className="space-y-6 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Sales · CRM</p>
          <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">{clients.length} clients · {clients.filter((c) => c.status === "active").length} active</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={load} variant="outline" size="sm" className="rounded-full"><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh</Button>
          <Button onClick={() => setCreating(true)} size="sm" className="rounded-full"><Plus className="mr-1.5 h-3.5 w-3.5" /> Add client</Button>
        </div>
      </header>

      {error && <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients…" className="w-full rounded-full border border-border bg-card pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
      </div>

      {loading && clients.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
          <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">{q ? "No clients match." : "No clients yet. Add your first."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <button key={c.id} onClick={() => setSelected(c)} className="group rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-[#74ddc7]/40">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate font-bold text-foreground group-hover:text-[#74ddc7]">{c.name}</h2>
                  {c.company && <p className="truncate text-xs text-muted-foreground">{c.company}</p>}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${STATUS_COLORS[c.status] ?? "bg-muted"}`}>{c.status}</span>
              </div>
              <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Receipt className="h-3 w-3" /> {counts[c.id]?.orders ?? 0} orders</span>
                <span className="inline-flex items-center gap-1"><FileBox className="h-3 w-3" /> {counts[c.id]?.assets ?? 0} assets</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && <ClientDetail client={selected} onClose={() => setSelected(null)} onEdit={() => { setEditing(selected); setSelected(null); }} onChanged={load} />}
      {(editing || creating) && <ClientEditDialog client={editing} onClose={() => { setEditing(null); setCreating(false); }} onSaved={() => { setEditing(null); setCreating(false); load(); }} />}
    </div>
  );
}

function ClientDetail({ client, onClose, onEdit, onChanged }: { client: Client; onClose: () => void; onEdit: () => void; onChanged: () => void }) {
  const [tab, setTab] = useState<"info" | "assets" | "orders">("info");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [{ data: a }, { data: o }] = await Promise.all([
      supabase.from("client_assets").select("id,name,kind,storage_path,size_bytes,created_at").eq("client_id", client.id).order("created_at", { ascending: false }),
      supabase.from("production_orders").select("id,order_number,title,type,status,priority,due_date,created_at").eq("client_id", client.id).order("created_at", { ascending: false }),
    ]);
    setAssets((a ?? []) as Asset[]); setOrders((o ?? []) as Order[]); setLoading(false);
  }, [client.id]);
  useEffect(() => { load(); }, [load]);

  const uploadAsset = async (file: File) => {
    setUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const ext = file.name.match(/\.([a-z0-9]+)$/i)?.[1] ?? "bin";
      const path = `${client.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("crm-assets").upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (upErr) throw new Error(upErr.message);
      const kind = /(png|jpe?g|gif|webp|svg)$/i.test(ext) ? "image" : /(mp3|wav|aac|m4a)$/i.test(ext) ? "audio" : /(mp4|mov|webm)$/i.test(ext) ? "video" : /(pdf|docx?|txt)$/i.test(ext) ? "document" : "file";
      await supabase.from("client_assets").insert({ client_id: client.id, name: file.name, kind, storage_path: path, size_bytes: file.size, uploaded_by: user?.id });
      await load(); onChanged();
    } catch (e) { alert((e as Error).message); } finally { setUploading(false); }
  };

  const download = async (a: Asset) => {
    if (!a.storage_path) return;
    const supabase = createClient();
    const { data } = await supabase.storage.from("crm-assets").createSignedUrl(a.storage_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-xl overflow-y-auto border-l border-border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight">{client.name}</h2>
            {client.company && <p className="text-sm text-muted-foreground">{client.company}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="rounded-full" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="mt-4 inline-flex rounded-full border border-border bg-background p-0.5 text-xs">
          {(["info", "assets", "orders"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3 py-1.5 font-bold capitalize ${tab === t ? "bg-[#74ddc7] text-[#0a0a0f]" : "text-muted-foreground"}`}>{t}{t === "assets" ? ` (${assets.length})` : t === "orders" ? ` (${orders.length})` : ""}</button>
          ))}
        </div>

        <div className="mt-5">
          {tab === "info" && (
            <dl className="space-y-2 text-sm">
              <Row label="Status" value={client.status} />
              <Row label="Contact" value={client.contact_name} />
              <Row label="Email" value={client.contact_email} />
              <Row label="Phone" value={client.contact_phone} />
              <Row label="Website" value={client.website} />
              <Row label="Industry" value={client.industry} />
              <Row label="Address" value={client.address} />
              <Row label="Portal login" value={client.portal_email} />
              {client.notes && <div className="rounded-xl border border-border bg-background p-3 text-muted-foreground">{client.notes}</div>}
            </dl>
          )}

          {tab === "assets" && (
            <div className="space-y-3">
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAsset(f); e.currentTarget.value = ""; }} />
              <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="rounded-full">
                {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />} Upload asset to portal
              </Button>
              {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : assets.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground">No assets yet. Upload the client&apos;s logos, audio, and docs here.</p>
              ) : (
                <div className="space-y-2">
                  {assets.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2">
                      <FileBox className="h-4 w-4 shrink-0 text-[#74ddc7]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{a.name}</p>
                        <p className="text-[11px] text-muted-foreground">{a.kind}{a.size_bytes ? ` · ${fmtBytes(a.size_bytes)}` : ""}</p>
                      </div>
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => download(a)}><Download className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "orders" && (
            <div className="space-y-3">
              <Link href={`/my/sales/production-orders?client=${client.id}`}>
                <Button size="sm" className="rounded-full"><Plus className="mr-1.5 h-4 w-4" /> New production order</Button>
              </Link>
              {orders.length === 0 ? <p className="rounded-xl border border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground">No production orders yet.</p> : (
                <div className="space-y-2">
                  {orders.map((o) => (
                    <Link key={o.id} href={`/my/sales/production-orders?order=${o.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2 hover:border-[#74ddc7]/40">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">#{o.order_number} · {o.title}</p>
                        <p className="text-[11px] text-muted-foreground">{o.type} · {o.priority}{o.due_date ? ` · due ${o.due_date}` : ""}</p>
                      </div>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{o.status}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border py-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value || "—"}</dd>
    </div>
  );
}

function ClientEditDialog({ client, onClose, onSaved }: { client: Client | null; onClose: () => void; onSaved: () => void }) {
  const isNew = !client;
  const [f, setF] = useState({
    name: client?.name ?? "", company: client?.company ?? "", industry: client?.industry ?? "",
    contact_name: client?.contact_name ?? "", contact_email: client?.contact_email ?? "", contact_phone: client?.contact_phone ?? "",
    website: client?.website ?? "", address: client?.address ?? "", status: client?.status ?? "lead",
    portal_email: client?.portal_email ?? "", notes: client?.notes ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setErr(null);
    if (!f.name.trim()) { setErr("Client name required."); return; }
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const payload = { ...f, name: f.name.trim() };
      if (isNew) {
        const { error } = await supabase.from("crm_clients").insert({ ...payload, created_by: user?.id, owner_user_id: user?.id });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("crm_clients").update(payload).eq("id", client!.id);
        if (error) throw new Error(error.message);
      }
      onSaved();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold">{isNew ? "Add client" : "Edit client"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        {err && <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-300">{err}</div>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Client name *" value={f.name} onChange={(v) => setF({ ...f, name: v })} />
          <Field label="Company" value={f.company} onChange={(v) => setF({ ...f, company: v })} />
          <Field label="Contact name" value={f.contact_name} onChange={(v) => setF({ ...f, contact_name: v })} />
          <Field label="Contact email" value={f.contact_email} onChange={(v) => setF({ ...f, contact_email: v })} />
          <Field label="Phone" value={f.contact_phone} onChange={(v) => setF({ ...f, contact_phone: v })} />
          <Field label="Website" value={f.website} onChange={(v) => setF({ ...f, website: v })} />
          <Field label="Industry" value={f.industry} onChange={(v) => setF({ ...f, industry: v })} />
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Status</label>
            <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              {["lead", "prospect", "active", "inactive", "archived"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <Field label="Address" value={f.address} onChange={(v) => setF({ ...f, address: v })} />
          <Field label="Portal login email" value={f.portal_email} onChange={(v) => setF({ ...f, portal_email: v })} placeholder="for client portal access" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Notes</label>
          <textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
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

function fmtBytes(n: number): string {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
