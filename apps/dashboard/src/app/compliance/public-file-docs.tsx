"use client";

import { useEffect, useState } from "react";
import { AlertCircle, FileText, Loader2, Plus } from "lucide-react";
import { getMyStations, getStationPublicFileDocs } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import type { PublicFileDoc, Station } from "@/lib/types";
import { cx } from "@/lib/format";

/**
 * Staff management of the Public Inspection File. Reads + writes
 * public_file_documents directly through the authed client — the
 * is_station_staff RLS policy (mig 103) authorizes staff writes, so no RPC.
 */

const CATEGORIES = [
  { key: "authorizations", label: "Authorizations" },
  { key: "applications", label: "Applications & related materials" },
  { key: "contour_maps", label: "Contour maps" },
  { key: "ownership", label: "Ownership reports" },
  { key: "political", label: "Political file" },
  { key: "eeo", label: "EEO records" },
  { key: "issues_programs", label: "Issues & programs lists" },
  { key: "public_and_broadcasting", label: "The public & broadcasting" },
] as const;

function labelFor(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

type LoadState =
  | { status: "loading" }
  | { status: "ready"; docs: PublicFileDoc[]; stations: Station[] };

type FormState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "error"; message: string };

const FIELD =
  "w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-fg placeholder:text-faint outline-none transition focus:border-signal/60 focus:ring-2 focus:ring-signal/20";
const LABEL = "block text-xs font-medium tracking-wide text-dim uppercase";

async function fetchAll(): Promise<{ docs: PublicFileDoc[]; stations: Station[] }> {
  const [docs, stations] = await Promise.all([
    getStationPublicFileDocs(),
    getMyStations(),
  ]);
  return { docs, stations };
}

export function PublicFileDocs() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [form, setForm] = useState<FormState>({ status: "idle" });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { docs, stations } = await fetchAll();
      if (!cancelled) setState({ status: "ready", docs, stations });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function addDoc(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.status === "saving") return;
    const el = event.currentTarget;
    const data = new FormData(el);
    const read = (k: string) => String(data.get(k) ?? "").trim();
    const station_id = read("station_id");
    const category = read("category");
    const title = read("title");
    if (station_id === "" || category === "" || title === "") {
      setForm({ status: "error", message: "Station, category, and title are required." });
      return;
    }
    setForm({ status: "saving" });
    const { error } = await supabase.from("public_file_documents").insert({
      station_id,
      category,
      title,
      description: read("description") || null,
      url: read("url") || null,
      period_label: read("period_label") || null,
    });
    if (error) {
      setForm({
        status: "error",
        message:
          error.code === "42501"
            ? "You don't have permission to add documents to this station."
            : error.message,
      });
      return;
    }
    el.reset();
    setForm({ status: "idle" });
    setShowForm(false);
    const next = await fetchAll();
    setState({ status: "ready", docs: next.docs, stations: next.stations });
  }

  async function togglePublish(doc: PublicFileDoc) {
    const { error } = await supabase
      .from("public_file_documents")
      .update({ is_published: !doc.is_published })
      .eq("id", doc.id);
    if (!error) {
      setState((prev) =>
        prev.status === "ready"
          ? {
              ...prev,
              docs: prev.docs.map((d) =>
                d.id === doc.id ? { ...d, is_published: !d.is_published } : d,
              ),
            }
          : prev,
      );
    }
  }

  if (state.status === "loading") {
    return (
      <div className="grid place-items-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-faint" aria-hidden />
      </div>
    );
  }

  const { docs, stations } = state;
  const grouped = CATEGORIES.map((c) => ({
    ...c,
    docs: docs.filter((d) => d.category === c.key),
  })).filter((c) => c.docs.length > 0);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-elevated text-dim">
            <FileText className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Public file documents</h2>
            <p className="text-sm text-dim">
              What appears in your station&rsquo;s public inspection file.
            </p>
          </div>
        </div>
        {stations.length > 0 && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-signal px-3 py-1.5 text-sm font-medium text-fg transition-colors hover:bg-signal-soft"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add document
          </button>
        )}
      </div>

      {showForm && stations.length > 0 && (
        <form onSubmit={addDoc} className="rounded-xl border border-line bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className={LABEL} htmlFor="pf-station">Station</label>
              <select id="pf-station" name="station_id" defaultValue={stations[0]?.id} className={FIELD}>
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.call_sign ?? s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={LABEL} htmlFor="pf-category">Category</label>
              <select id="pf-category" name="category" defaultValue="issues_programs" className={FIELD}>
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className={LABEL} htmlFor="pf-title">Title</label>
              <input id="pf-title" name="title" className={FIELD} placeholder="Quarterly Issues & Programs — 2026 Q3" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className={LABEL} htmlFor="pf-desc">Description</label>
              <input id="pf-desc" name="description" className={FIELD} placeholder="Optional summary" />
            </div>
            <div className="space-y-1.5">
              <label className={LABEL} htmlFor="pf-url">Document URL</label>
              <input id="pf-url" name="url" className={FIELD} placeholder="https://…" />
            </div>
            <div className="space-y-1.5">
              <label className={LABEL} htmlFor="pf-period">Period</label>
              <input id="pf-period" name="period_label" className={FIELD} placeholder="2026 Q3" />
            </div>
          </div>

          {form.status === "error" && (
            <p className="mt-3 flex items-start gap-2 text-sm text-signal-soft">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {form.message}
            </p>
          )}

          <div className="mt-4">
            <button
              type="submit"
              disabled={form.status === "saving"}
              className="inline-flex items-center gap-2 rounded-lg bg-signal px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-signal-soft disabled:opacity-60"
            >
              {form.status === "saving" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {form.status === "saving" ? "Saving…" : "Save document"}
            </button>
          </div>
        </form>
      )}

      {grouped.length === 0 ? (
        <p className="text-sm text-faint">No documents yet.</p>
      ) : (
        <div className="space-y-5">
          {grouped.map((cat) => (
            <div key={cat.key} className="space-y-2">
              <h3 className="text-xs font-semibold tracking-wide text-faint uppercase">{cat.label}</h3>
              <ul className="space-y-2">
                {cat.docs.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-fg">{doc.title}</span>
                        {doc.period_label && (
                          <span className="rounded bg-elevated px-1.5 py-0.5 text-[11px] text-faint">
                            {doc.period_label}
                          </span>
                        )}
                        {!doc.is_published && (
                          <span className="rounded bg-amber/15 px-1.5 py-0.5 text-[11px] text-amber">Draft</span>
                        )}
                      </div>
                      {doc.description && <p className="mt-1 text-sm text-dim">{doc.description}</p>}
                      {doc.url && (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-xs text-signal-soft hover:text-signal"
                        >
                          {doc.url}
                        </a>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePublish(doc)}
                      className={cx(
                        "shrink-0 rounded-md px-2 py-1 text-xs transition-colors",
                        doc.is_published
                          ? "text-dim hover:bg-elevated hover:text-fg"
                          : "bg-elevated text-fg hover:bg-line",
                      )}
                    >
                      {doc.is_published ? "Unpublish" : "Publish"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
