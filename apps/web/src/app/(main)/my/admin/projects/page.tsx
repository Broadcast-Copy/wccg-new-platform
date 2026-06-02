"use client";

/**
 * Project Manager — /my/admin/projects
 *
 * A board of projects across the station, optionally linked to a CRM client
 * or a production order. Each project has a checklist of tasks. Supabase-
 * direct. Admin / management / production / sales / promotions.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckSquare, Loader2, Plus, RefreshCw, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const COLUMNS = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "blocked", label: "Blocked" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
];
const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-400", high: "bg-amber-500/15 text-amber-400",
  normal: "bg-muted text-muted-foreground", low: "bg-muted text-muted-foreground/70",
};

interface Project {
  id: string; title: string; description: string | null; status: string; priority: string;
  client_id: string | null; due_date: string | null; created_at: string;
}
interface Task { id: string; project_id: string; title: string; done: boolean; position: number }

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, { done: number; total: number }>>({});
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<Project | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const [{ data: p, error: pErr }, { data: t }, { data: c }] = await Promise.all([
        supabase.from("projects").select("id,title,description,status,priority,client_id,due_date,created_at").order("created_at", { ascending: false }),
        supabase.from("project_tasks").select("project_id,done"),
        supabase.from("crm_clients").select("id,name").order("name"),
      ]);
      if (pErr) throw new Error(pErr.message);
      setProjects((p ?? []) as Project[]);
      setClients((c ?? []) as { id: string; name: string }[]);
      const tc: Record<string, { done: number; total: number }> = {};
      for (const row of t ?? []) {
        const k = (row as { project_id: string }).project_id;
        tc[k] = tc[k] ?? { done: 0, total: 0 };
        tc[k].total++;
        if ((row as { done: boolean }).done) tc[k].done++;
      }
      setTaskCounts(tc);
      setError(null);
    } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const byStatus = useMemo(() => {
    const m: Record<string, Project[]> = {};
    for (const col of COLUMNS) m[col.key] = [];
    for (const p of projects) (m[p.status] ?? (m[p.status] = [])).push(p);
    return m;
  }, [projects]);

  const move = async (p: Project, status: string) => {
    setProjects((xs) => xs.map((x) => (x.id === p.id ? { ...x, status } : x)));
    const supabase = createClient();
    await supabase.from("projects").update({ status }).eq("id", p.id);
  };

  return (
    <div className="space-y-6 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Operations</p>
          <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">Project Manager</h1>
          <p className="mt-1 text-sm text-muted-foreground">{projects.length} projects · {projects.filter((p) => p.status !== "done").length} open</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={load} variant="outline" size="sm" className="rounded-full"><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh</Button>
          <Button onClick={() => setCreating(true)} size="sm" className="rounded-full"><Plus className="mr-1.5 h-3.5 w-3.5" /> New project</Button>
        </div>
      </header>

      {error && <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      {loading && projects.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          {COLUMNS.map((col) => (
            <div key={col.key} className="rounded-2xl border border-border bg-card/40 p-2">
              <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{col.label} · {byStatus[col.key]?.length ?? 0}</p>
              <div className="space-y-2">
                {(byStatus[col.key] ?? []).map((p) => {
                  const tc = taskCounts[p.id];
                  return (
                    <button key={p.id} onClick={() => setDetail(p)} className="w-full rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-[#74ddc7]/40">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-foreground">{p.title}</p>
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${PRIORITY_COLORS[p.priority]}`}>{p.priority}</span>
                      </div>
                      {tc && tc.total > 0 && <p className="mt-1 text-[11px] text-muted-foreground">{tc.done}/{tc.total} tasks</p>}
                      {p.due_date && <p className="text-[11px] text-muted-foreground">due {p.due_date}</p>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && <ProjectForm clients={clients} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
      {detail && <ProjectDetail project={detail} clients={clients} onClose={() => setDetail(null)} onMove={move} onChanged={load} />}
    </div>
  );
}

function ProjectForm({ clients, onClose, onSaved }: { clients: { id: string; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ title: "", description: "", priority: "normal", status: "todo", client_id: "", due_date: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inp = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";

  const save = async () => {
    setErr(null);
    if (!f.title.trim()) { setErr("Title required."); return; }
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("projects").insert({
        title: f.title.trim(), description: f.description.trim() || null, priority: f.priority,
        status: f.status, client_id: f.client_id || null, due_date: f.due_date || null, created_by: user?.id, assignee_user_id: user?.id,
      });
      if (error) throw new Error(error.message);
      onSaved();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between"><h3 className="text-lg font-bold">New project</h3><button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button></div>
        {err && <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-300">{err}</div>}
        <div className="space-y-3">
          <div><label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Title *</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={inp} /></div>
          <div><label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Description</label><textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={inp} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Status</label><select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className={inp}>{COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></div>
            <div><label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Priority</label><select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })} className={inp}>{["low", "normal", "high", "urgent"].map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
            <div><label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Client</label><select value={f.client_id} onChange={(e) => setF({ ...f, client_id: e.target.value })} className={inp}><option value="">— none —</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Due</label><input type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} className={inp} /></div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-4"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null} Create</Button></div>
      </div>
    </div>
  );
}

function ProjectDetail({ project, clients, onClose, onMove, onChanged }: { project: Project; clients: { id: string; name: string }[]; onClose: () => void; onMove: (p: Project, s: string) => void; onChanged: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [status, setStatus] = useState(project.status);
  const clientName = clients.find((c) => c.id === project.client_id)?.name;

  const loadTasks = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("project_tasks").select("id,project_id,title,done,position").eq("project_id", project.id).order("position");
    setTasks((data ?? []) as Task[]);
  }, [project.id]);
  useEffect(() => { loadTasks(); }, [loadTasks]);

  const addTask = async () => {
    if (!newTask.trim()) return;
    const supabase = createClient();
    await supabase.from("project_tasks").insert({ project_id: project.id, title: newTask.trim(), position: tasks.length });
    setNewTask(""); loadTasks();
  };
  const toggleTask = async (t: Task) => {
    setTasks((xs) => xs.map((x) => (x.id === t.id ? { ...x, done: !t.done } : x)));
    const supabase = createClient();
    await supabase.from("project_tasks").update({ done: !t.done }).eq("id", t.id);
    onChanged();
  };
  const changeStatus = async (s: string) => {
    setStatus(s);
    onMove(project, s);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-lg overflow-y-auto border-l border-border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight">{project.title}</h2>
            {clientName && <p className="text-sm text-muted-foreground">Client: {clientName}</p>}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        {project.description && <p className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-background p-3 text-sm text-muted-foreground">{project.description}</p>}

        <div className="mt-4">
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Status</label>
          <select value={status} onChange={(e) => changeStatus(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
            {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Tasks ({tasks.filter((t) => t.done).length}/{tasks.length})</p>
          <div className="space-y-1.5">
            {tasks.map((t) => (
              <button key={t.id} onClick={() => toggleTask(t)} className="flex w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm hover:border-[#74ddc7]/40">
                {t.done ? <CheckSquare className="h-4 w-4 shrink-0 text-[#74ddc7]" /> : <Square className="h-4 w-4 shrink-0 text-muted-foreground" />}
                <span className={t.done ? "text-muted-foreground line-through" : "text-foreground"}>{t.title}</span>
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input value={newTask} onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addTask(); }} placeholder="Add a task…" className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <Button size="sm" onClick={addTask}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}
