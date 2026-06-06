"use client";

/**
 * Production Orders — /my/sales/production-orders
 *
 * Sales submits production orders via a form (with file attachments) and
 * tracks them through production. The "file manager for sales". Supabase-
 * direct. Sales / production / admin / management.
 */

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, FileText, Loader2, Plus, RefreshCw, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const TYPES = ["commercial", "promo", "imaging", "jingle", "voiceover", "video", "social", "other"];
const STATUSES = ["submitted", "assigned", "in_production", "review", "revisions", "approved", "delivered", "cancelled"];
const PRIORITIES = ["low", "normal", "high", "rush"];

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-500/15 text-blue-400", assigned: "bg-purple-500/15 text-purple-400",
  in_production: "bg-amber-500/15 text-amber-400", review: "bg-amber-500/15 text-amber-400",
  revisions: "bg-orange-500/15 text-orange-400", approved: "bg-[#74ddc7]/15 text-[#74ddc7]",
  delivered: "bg-[#74ddc7]/15 text-[#74ddc7]", cancelled: "bg-muted text-muted-foreground",
};

interface ClientLite { id: string; name: string }
interface Order {
  id: string; order_number: number; client_id: string | null; title: string; type: string;
  status: string; priority: string; brief: string | null; script: string | null;
  length_seconds: number | null; budget: number | null; due_date: string | null; created_at: string;
}
interface OrderFile { id: string; name: string; storage_path: string | null; size_bytes: number | null; created_at: string }

export default function ProductionOrdersPage() {
  return (
    <Suspense fallback={<div className="py-8 text-sm text-muted-foreground">Loading…</div>}>
      <ProductionOrdersInner />
    </Suspense>
  );
}

function ProductionOrdersInner() {
  const sp = useSearchParams();
  const presetClient = sp.get("client") ?? "";
  const presetOrder = sp.get("order") ?? "";

  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [clientName, setClientName] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<Order | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const [{ data: o, error: oErr }, { data: c }] = await Promise.all([
        supabase.from("production_orders").select("*").order("created_at", { ascending: false }),
        supabase.from("crm_clients").select("id,name").order("name"),
      ]);
      if (oErr) throw new Error(oErr.message);
      setOrders((o ?? []) as Order[]);
      setClients((c ?? []) as ClientLite[]);
      setClientName(Object.fromEntries((c ?? []).map((x: ClientLite) => [x.id, x.name])));
      setError(null);
    } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => { if (presetClient) setCreating(true); }, [presetClient]);
  useEffect(() => { if (presetOrder && orders.length) { const o = orders.find((x) => x.id === presetOrder); if (o) setDetail(o); } }, [presetOrder, orders]);

  return (
    <div className="space-y-6 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Sales · Production</p>
          <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">Production Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">{orders.length} orders · {orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length} open</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={load} variant="outline" size="sm" className="rounded-full"><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh</Button>
          <Button onClick={() => setCreating(true)} size="sm" className="rounded-full"><Plus className="mr-1.5 h-3.5 w-3.5" /> New order</Button>
        </div>
      </header>

      {error && <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      {loading && orders.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No production orders yet. Submit your first.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-card/60 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <tr><th className="px-4 py-3 text-left">#</th><th className="px-4 py-3 text-left">Title</th><th className="px-4 py-3 text-left">Client</th><th className="px-4 py-3 text-left">Type</th><th className="px-4 py-3 text-left">Priority</th><th className="px-4 py-3 text-left">Due</th><th className="px-4 py-3 text-left">Status</th></tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} onClick={() => setDetail(o)} className="cursor-pointer border-t border-border hover:bg-foreground/[0.03]">
                  <td className="px-4 py-2 font-mono text-muted-foreground">#{o.order_number}</td>
                  <td className="px-4 py-2 font-bold">{o.title}</td>
                  <td className="px-4 py-2 text-muted-foreground">{o.client_id ? clientName[o.client_id] ?? "—" : "—"}</td>
                  <td className="px-4 py-2 capitalize">{o.type}</td>
                  <td className="px-4 py-2"><span className={`capitalize ${o.priority === "rush" ? "font-bold text-red-400" : o.priority === "high" ? "text-amber-400" : "text-muted-foreground"}`}>{o.priority}</span></td>
                  <td className="px-4 py-2 text-muted-foreground">{o.due_date ?? "—"}</td>
                  <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${STATUS_COLORS[o.status] ?? "bg-muted"}`}>{o.status.replace("_", " ")}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && <OrderForm clients={clients} presetClient={presetClient} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
      {detail && <OrderDetail order={detail} clientName={detail.client_id ? clientName[detail.client_id] : null} onClose={() => setDetail(null)} onChanged={load} />}
    </div>
  );
}

function OrderForm({ clients, presetClient, onClose, onSaved }: { clients: ClientLite[]; presetClient: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ client_id: presetClient, title: "", type: "commercial", priority: "normal", brief: "", script: "", length_seconds: "", budget: "", due_date: "" });
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const inp = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40";

  const submit = async () => {
    setErr(null);
    if (!f.title.trim()) { setErr("Title required."); return; }
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data: order, error } = await supabase.from("production_orders").insert({
        client_id: f.client_id || null, title: f.title.trim(), type: f.type, priority: f.priority,
        brief: f.brief.trim() || null, script: f.script.trim() || null,
        length_seconds: f.length_seconds ? Number(f.length_seconds) : null,
        budget: f.budget ? Number(f.budget) : null, due_date: f.due_date || null,
        status: "submitted", created_by: user?.id,
      }).select("id").single();
      if (error) throw new Error(error.message);

      // Upload attachments
      for (const file of files) {
        const path = `${order.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("production-orders").upload(path, file, { contentType: file.type || undefined });
        if (!upErr) {
          await supabase.from("production_order_files").insert({ order_id: order.id, name: file.name, storage_path: path, size_bytes: file.size, uploaded_by: user?.id });
        }
      }
      onSaved();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold">New production order</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        {err && <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-300">{err}</div>}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><L label="Title *"><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={inp} /></L></div>
          <L label="Client"><select value={f.client_id} onChange={(e) => setF({ ...f, client_id: e.target.value })} className={inp}><option value="">— none —</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></L>
          <L label="Type"><select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className="inp capitalize">{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></L>
          <L label="Priority"><select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })} className="inp capitalize">{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}</select></L>
          <L label="Due date"><input type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} className={inp} /></L>
          <L label="Length (sec)"><input type="number" value={f.length_seconds} onChange={(e) => setF({ ...f, length_seconds: e.target.value })} className={inp} /></L>
          <L label="Budget ($)"><input type="number" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value })} className={inp} /></L>
        </div>
        <L label="Brief / direction"><textarea rows={3} value={f.brief} onChange={(e) => setF({ ...f, brief: e.target.value })} className={inp} /></L>
        <L label="Script (optional)"><textarea rows={3} value={f.script} onChange={(e) => setF({ ...f, script: e.target.value })} className={inp} /></L>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Attachments</label>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} className="rounded-full"><Upload className="mr-1.5 h-3.5 w-3.5" /> {files.length ? `${files.length} file(s)` : "Add files"}</Button>
          {files.length > 0 && <ul className="mt-2 space-y-1 text-xs text-muted-foreground">{files.map((x, i) => <li key={i}>· {x.name}</li>)}</ul>}
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />} Submit order</Button>
        </div>
      </div>
    </div>
  );
}

function OrderDetail({ order, clientName, onClose, onChanged }: { order: Order; clientName: string | null; onClose: () => void; onChanged: () => void }) {
  const [files, setFiles] = useState<OrderFile[]>([]);
  const [status, setStatus] = useState(order.status);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("production_order_files").select("id,name,storage_path,size_bytes,created_at").eq("order_id", order.id).order("created_at").then(({ data }) => setFiles((data ?? []) as OrderFile[]));
  }, [order.id]);

  const updateStatus = async (s: string) => {
    setStatus(s); setSaving(true);
    const supabase = createClient();
    await supabase.from("production_orders").update({ status: s }).eq("id", order.id);
    setSaving(false); onChanged();
  };
  const download = async (file: OrderFile) => {
    if (!file.storage_path) return;
    const supabase = createClient();
    const { data } = await supabase.storage.from("production-orders").createSignedUrl(file.storage_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-lg overflow-y-auto border-l border-border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-xs text-muted-foreground">#{order.order_number}</p>
            <h2 className="text-2xl font-black tracking-tight">{order.title}</h2>
            <p className="text-sm text-muted-foreground">{clientName ?? "No client"} · {order.type}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Status {saving && <Loader2 className="ml-1 inline h-3 w-3 animate-spin" />}</label>
          <select value={status} onChange={(e) => updateStatus(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm capitalize">
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
        </div>

        <dl className="mt-4 space-y-1.5 text-sm">
          <Row label="Priority" value={order.priority} />
          <Row label="Due date" value={order.due_date} />
          <Row label="Length" value={order.length_seconds ? `${order.length_seconds}s` : null} />
          <Row label="Budget" value={order.budget ? `$${order.budget}` : null} />
        </dl>
        {order.brief && <div className="mt-3"><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Brief</p><p className="mt-1 whitespace-pre-wrap rounded-xl border border-border bg-background p-3 text-sm text-muted-foreground">{order.brief}</p></div>}
        {order.script && <div className="mt-3"><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Script</p><p className="mt-1 whitespace-pre-wrap rounded-xl border border-border bg-background p-3 text-sm text-muted-foreground">{order.script}</p></div>}

        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Attachments ({files.length})</p>
          {files.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">None.</p> : (
            <div className="mt-2 space-y-2">
              {files.map((file) => (
                <div key={file.id} className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2">
                  <FileText className="h-4 w-4 shrink-0 text-[#74ddc7]" />
                  <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => download(file)}><Download className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return <div className="flex justify-between gap-3 border-b border-border py-1.5"><dt className="capitalize text-muted-foreground">{label}</dt><dd className="text-right font-medium capitalize text-foreground">{value || "—"}</dd></div>;
}
function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</label>{children}</div>;
}
