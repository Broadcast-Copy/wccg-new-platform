"use client";

/**
 * Admin: DJ slot upload status — the DJ admin oversight view.
 *
 * For the selected week this lists every available (active/tentative) slot with:
 *   - the slot's day + time and the DJ assigned to it
 *   - each expected file (DJB code) the DJ owes, and whether it's uploaded
 *   - the upload date/time and file type for files that have landed
 *   - a "Nudge" action that DMs the DJ to remind them to upload their mix
 *   - inline Publish for drops that are uploaded but not yet published
 *
 * Reads dj_slots (+ embedded djs incl. user_id, for messaging) and this week's
 * dj_drops directly from Supabase. The production-tier RLS policy ("Production
 * reads all drops", migration 024) lets admins/ops see every DJ's drops.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  Check,
  Download,
  FileAudio,
  FolderOpen,
  Loader2,
  Play,
  RefreshCw,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageButton } from "@/components/messaging/message-button";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

const TEAL = "#74ddc7";
const AMBER = "#f59e0b";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DjLite {
  id: string;
  slug: string;
  display_name: string;
  user_id: string | null;
}

interface SlotRow {
  id: string;
  dj_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  file_codes: string[];
  status: "active" | "tentative" | "inactive";
  djs: DjLite | null;
}

interface DropRow {
  id: string;
  slot_id: string;
  dj_id: string | null;
  file_code: string;
  status: string;
  source: string | null;
  format: string | null;
  storage_path: string | null;
  size_bytes: number | null;
  uploaded_at: string | null;
  created_at: string;
}

/** One expected file (DJB code) within a slot, plus its upload state. */
interface FileCell {
  code: string;
  drop: DropRow | null;
  uploaded: boolean;
  status: string;
  uploadedAt: string | null;
  fileType: string | null;
  source: string | null;
}

interface SlotView {
  slotId: string;
  day: number;
  start: string;
  end: string;
  tentative: boolean;
  dj: DjLite | null;
  files: FileCell[];
  total: number;
  done: number;
  missing: number;
}

type FilterMode = "all" | "missing" | "complete";

// A drop is "satisfied" once it reaches one of these.
const UPLOADED_STATUSES = new Set(["uploaded", "validated", "published"]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** ISO Monday (UTC date string) of the week containing `ref`. */
function isoMonday(ref: Date): string {
  const d = new Date(Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate()));
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const delta = dow === 0 ? -6 : 1 - dow; // back up to Monday
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function fmt12h(t: string): string {
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return t;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** File extension from a storage path, lowercased (fallback when format is null). */
function extOf(path: string | null): string | null {
  if (!path) return null;
  const m = path.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : null;
}

/** Public URL for a drop in the (public-read) dj-drops bucket. */
function publicUrl(path: string | null): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from("dj-drops").getPublicUrl(path);
  return data?.publicUrl ?? null;
}

function statusMeta(status: string): { label: string; cls: string } {
  switch (status) {
    case "published":
      return { label: "Published", cls: "bg-[#74ddc7]/15 text-[#74ddc7]" };
    case "validated":
      return { label: "Validated", cls: "bg-sky-500/15 text-sky-400" };
    case "uploaded":
      return { label: "Uploaded", cls: "bg-blue-500/15 text-blue-400" };
    case "rejected":
      return { label: "Rejected", cls: "bg-red-500/15 text-red-400" };
    default:
      return { label: "Awaiting", cls: "bg-amber-500/15 text-amber-500" };
  }
}

/** A friendly nudge message pre-filled into the DM compose box. */
function nudgeText(sv: SlotView): string {
  const missing = sv.files.filter((f) => !f.uploaded).map((f) => f.code);
  const when = `${DAYS_LONG[sv.day]} ${fmt12h(sv.start)}–${fmt12h(sv.end)}`;
  const need =
    missing.length > 0 ? ` We're still missing: ${missing.join(", ")}.` : "";
  return (
    `Hi ${sv.dj?.display_name ?? "there"} — friendly reminder to upload your mix ` +
    `for your ${when} slot.${need} You can drop it from your DJ portal under ` +
    `My Mixshows. Thanks! 🎧`
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AdminDjDropsPage() {
  const [slots, setSlots] = useState<SlotView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [weekOf, setWeekOf] = useState<string>("");
  const [filter, setFilter] = useState<FilterMode>("all");

  const load = useCallback(() => {
    setLoading(true);
    const week = weekOf
      ? isoMonday(new Date(`${weekOf}T00:00:00`))
      : isoMonday(new Date());

    (async () => {
      const [slotsRes, dropsRes] = await Promise.all([
        supabase
          .from("dj_slots")
          .select(
            "id,dj_id,day_of_week,start_time,end_time,file_codes,status,djs(id,slug,display_name,user_id)",
          )
          .in("status", ["active", "tentative"])
          .order("day_of_week", { ascending: true })
          .order("start_time", { ascending: true }),
        supabase
          .from("dj_drops")
          .select(
            "id,slot_id,dj_id,file_code,status,source,format,storage_path,size_bytes,uploaded_at,created_at",
          )
          .eq("week_of", week),
      ]);

      if (slotsRes.error) {
        setError(slotsRes.error.message);
        setSlots([]);
        setLoading(false);
        return;
      }
      if (dropsRes.error) {
        setError(dropsRes.error.message);
        setSlots([]);
        setLoading(false);
        return;
      }

      const slotRows = (slotsRes.data ?? []) as unknown as SlotRow[];
      const drops = (dropsRes.data ?? []) as unknown as DropRow[];

      // Index this week's drops by (slot_id|file_code).
      const dropByKey = new Map<string, DropRow>();
      for (const d of drops) dropByKey.set(`${d.slot_id}|${d.file_code}`, d);

      const views: SlotView[] = slotRows.map((s) => {
        const files: FileCell[] = (s.file_codes ?? []).map((code) => {
          const drop = dropByKey.get(`${s.id}|${code}`) ?? null;
          const uploaded = !!drop && UPLOADED_STATUSES.has(drop.status);
          return {
            code,
            drop,
            uploaded,
            status: drop?.status ?? "pending",
            uploadedAt: drop ? drop.uploaded_at ?? drop.created_at : null,
            fileType: drop ? drop.format ?? extOf(drop.storage_path) : null,
            source: drop?.source ?? null,
          };
        });
        const done = files.filter((f) => f.uploaded).length;
        return {
          slotId: s.id,
          day: s.day_of_week,
          start: s.start_time,
          end: s.end_time,
          tentative: s.status === "tentative",
          dj: s.djs ?? null,
          files,
          total: files.length,
          done,
          missing: files.length - done,
        };
      });

      setSlots(views);
      setError(null);
      setLoading(false);
    })().catch((e) => {
      setError((e as Error).message);
      setSlots([]);
      setLoading(false);
    });
  }, [weekOf]);

  useEffect(load, [load]);

  const publish = async (dropId: string) => {
    setPublishing(dropId);
    try {
      const { error: updErr } = await supabase
        .from("dj_drops")
        .update({ status: "published", published_at: new Date().toISOString() })
        .eq("id", dropId);
      if (updErr) {
        setError(updErr.message);
        return;
      }
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPublishing(null);
    }
  };

  // Summary tallies across all slots (independent of the active filter).
  const summary = useMemo(() => {
    const totalSlots = slots.length;
    const complete = slots.filter((s) => s.total > 0 && s.missing === 0).length;
    const needsUpload = slots.filter((s) => s.missing > 0).length;
    const missingFiles = slots.reduce((n, s) => n + s.missing, 0);
    const unassigned = slots.filter((s) => !s.dj).length;
    return { totalSlots, complete, needsUpload, missingFiles, unassigned };
  }, [slots]);

  const visible = useMemo(() => {
    if (filter === "missing") return slots.filter((s) => s.missing > 0);
    if (filter === "complete")
      return slots.filter((s) => s.total > 0 && s.missing === 0);
    return slots;
  }, [slots, filter]);

  return (
    <div className="space-y-6 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Operations
          </p>
          <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
            DJ drops — weekly status
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every available slot, who&apos;s assigned, what they&apos;ve uploaded — and a
            nudge if a mix is missing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/my/admin/dj-slots"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Calendar className="h-3.5 w-3.5" />
            Assign DJs
          </Link>
          <input
            type="date"
            value={weekOf}
            onChange={(e) => setWeekOf(e.target.value)}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
          />
          <Button onClick={load} variant="outline" size="sm" className="rounded-full">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Couldn&apos;t load drop status: {error}
        </div>
      )}

      {/* Summary + filter pills */}
      {!loading && !error && slots.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Stat label="slots" value={summary.totalSlots} />
            <Stat label="complete" value={summary.complete} tone="teal" />
            <Stat label="need upload" value={summary.needsUpload} tone="amber" />
            <Stat label="files missing" value={summary.missingFiles} tone="amber" />
            {summary.unassigned > 0 && (
              <Stat label="unassigned" value={summary.unassigned} />
            )}
          </div>
          <div className="flex items-center gap-1 rounded-full border border-border bg-card p-0.5">
            {(
              [
                ["all", "All"],
                ["missing", "Needs upload"],
                ["complete", "Complete"],
              ] as [FilterMode, string][]
            ).map(([mode, lbl]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilter(mode)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  filter === mode
                    ? "bg-[#74ddc7] text-[#0a0a0f]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? null : slots.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="font-bold text-foreground">No scheduled slots</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add active slots in{" "}
            <Link href="/my/admin/dj-slots" className="text-[#74ddc7] hover:underline">
              DJ slot assignments
            </Link>
            .
          </p>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-[#74ddc7]/40 bg-[#74ddc7]/10 p-6 text-center">
          <p className="font-bold text-foreground">Nothing to show in this view.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {filter === "missing"
              ? "Every slot this week has its mixes uploaded. 🎉"
              : "No slots match this filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((sv) => (
            <SlotCard
              key={sv.slotId}
              sv={sv}
              publishing={publishing}
              onPublish={publish}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slot card
// ---------------------------------------------------------------------------
function SlotCard({
  sv,
  publishing,
  onPublish,
}: {
  sv: SlotView;
  publishing: string | null;
  onPublish: (dropId: string) => void;
}) {
  const complete = sv.total > 0 && sv.missing === 0;
  const mediaHref = sv.dj
    ? `/my/mixes?view=mixshows&dj=${sv.dj.id}`
    : `/my/mixes?view=mixshows&slot=${sv.slotId}`;

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      {/* Slot header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/60 px-5 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {DAYS[sv.day]} {fmt12h(sv.start)} – {fmt12h(sv.end)}
            </span>
            {sv.tentative && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-500">
                Tentative
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {sv.dj ? (
              <Link
                href={`/djs/${sv.dj.slug}`}
                className="truncate font-bold text-foreground hover:text-[#74ddc7]"
              >
                {sv.dj.display_name}
              </Link>
            ) : (
              <span className="font-bold text-muted-foreground">Unassigned</span>
            )}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                complete
                  ? "bg-[#74ddc7]/15 text-[#74ddc7]"
                  : "bg-amber-500/15 text-amber-500"
              }`}
            >
              {complete ? (
                <Check className="h-3 w-3" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
              )}
              {sv.done}/{sv.total} uploaded
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {sv.dj?.user_id && (
            <MessageButton
              variant="button"
              recipientId={sv.dj.user_id}
              recipientName={sv.dj.display_name}
              prefill={nudgeText(sv)}
              label={sv.missing > 0 ? "Nudge to upload" : "Message"}
              accentColor={sv.missing > 0 ? AMBER : TEAL}
            />
          )}
          <Link
            href={mediaHref}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-[#7401df]/50 hover:text-[#7401df]"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Folder
          </Link>
        </div>
      </div>

      {/* Files table */}
      {sv.total === 0 ? (
        <p className="px-5 py-3 text-xs text-muted-foreground">
          No file codes configured for this slot.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="px-5 py-2 text-left">File</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Uploaded</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Source</th>
                <th className="px-5 py-2 text-right">Open / Publish</th>
              </tr>
            </thead>
            <tbody>
              {sv.files.map((f) => {
                const meta = statusMeta(f.status);
                const drop = f.drop;
                const url = drop?.storage_path ? publicUrl(drop.storage_path) : null;
                return (
                  <tr key={f.code} className="border-b border-border/40 last:border-0">
                    <td className="px-5 py-2.5">
                      <Link
                        href={mediaHref}
                        title={`Open ${sv.dj?.display_name ?? "this DJ"}'s media folder`}
                        className="group inline-flex items-center gap-2 transition-colors hover:text-[#7401df]"
                      >
                        <FileAudio
                          className={`h-3.5 w-3.5 ${
                            f.uploaded ? "text-[#74ddc7]" : "text-muted-foreground"
                          } group-hover:text-[#7401df]`}
                        />
                        <span className="font-mono text-xs underline-offset-2 group-hover:underline">
                          {f.code}
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${meta.cls}`}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {fmtDateTime(f.uploadedAt)}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {f.fileType ? (
                        <span className="font-mono uppercase">{f.fileType}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {f.source ? (
                        <span className="uppercase text-muted-foreground">{f.source}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {url && (
                          <>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Play ${f.code}`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-[#74ddc7]/60 hover:text-[#74ddc7]"
                            >
                              <Play className="h-3.5 w-3.5" />
                            </a>
                            <a
                              href={url}
                              download
                              title={`Download ${f.code}`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-[#7401df]/60 hover:text-[#7401df]"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          </>
                        )}
                        {drop &&
                        (drop.status === "uploaded" || drop.status === "validated") ? (
                          <Button
                            onClick={() => onPublish(drop.id)}
                            disabled={publishing === drop.id}
                            size="sm"
                            className="rounded-full"
                          >
                            {publishing === drop.id ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Upload className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Publish
                          </Button>
                        ) : f.status === "published" ? (
                          <span title="Published" className="text-[#74ddc7]">
                            <Check className="h-4 w-4" />
                          </span>
                        ) : !url ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Small summary stat chip
// ---------------------------------------------------------------------------
function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "teal" | "amber";
}) {
  const toneCls =
    tone === "teal"
      ? "text-[#74ddc7]"
      : tone === "amber"
        ? "text-amber-500"
        : "text-foreground";
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1">
      <span className={`font-bold ${toneCls}`}>{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}
