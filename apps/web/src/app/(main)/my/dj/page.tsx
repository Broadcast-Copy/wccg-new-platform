"use client";

/**
 * DJ Portal — /my/dj
 *
 * One page, three jobs:
 *   1. Show every slot the DJ owns + this-week's expected file codes.
 *   2. Upload by drag-drop OR by clicking a file slot — auto-detects which
 *      DJB code the file belongs to from the filename.
 *   3. Show FTP credentials (rotate-on-demand) so the DJ can sync from their
 *      DAW or radio automation software.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** ISO Monday of the current week in America/New_York (YYYY-MM-DD). */
function currentWeekOfET(): string {
  const nowEt = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = nowEt.getDay(); // 0=Sun..6=Sat
  const offsetToMon = (day + 6) % 7;
  const monday = new Date(nowEt);
  monday.setDate(nowEt.getDate() - offsetToMon);
  return monday.toISOString().slice(0, 10);
}

interface Drop {
  id: string;
  status: "pending" | "uploaded" | "validated" | "published" | "rejected";
  source: "web" | "ftp";
  uploaded_at: string | null;
  storage_path: string | null;
  format: string | null;
  size_bytes: number | null;
}

interface Slot {
  slotId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  status: "active" | "tentative" | "inactive";
  notes: string | null;
  files: Array<{ fileCode: string; drop: Drop | null }>;
}

interface MeResponse {
  dj: { id: string; slug: string; displayName: string; email: string | null; isActive: boolean };
  weekOf: string;
  slots: Slot[];
}

export default function DjPortalPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingCode, setUploadingCode] = useState<string | null>(null);

  // Load DJ profile + slots + this-week's drops directly from Supabase.
  // No API server — the static site talks to Supabase via RLS-scoped queries.
  const reload = useCallback(() => {
    setLoading(true);
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Please sign in to use the DJ portal.");

        const { data: dj } = await supabase
          .from("djs")
          .select("id, slug, display_name, email, is_active")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!dj) {
          throw new Error(
            "No DJ profile is linked to this account. Ask an admin to claim your DJ slug to your login.",
          );
        }

        const { data: slots } = await supabase
          .from("dj_slots")
          .select("id, day_of_week, start_time, end_time, file_codes, status, notes")
          .eq("dj_id", dj.id)
          .order("day_of_week")
          .order("start_time");

        const weekOf = currentWeekOfET();
        const { data: drops } = await supabase
          .from("dj_drops")
          .select("id, file_code, status, source, uploaded_at, storage_path, format, size_bytes")
          .eq("dj_id", dj.id)
          .eq("week_of", weekOf);

        const dropByCode = new Map((drops ?? []).map((d) => [d.file_code, d]));
        setMe({
          dj: {
            id: dj.id, slug: dj.slug, displayName: dj.display_name,
            email: dj.email, isActive: dj.is_active,
          },
          weekOf,
          slots: (slots ?? []).map((s) => ({
            slotId: s.id, dayOfWeek: s.day_of_week, startTime: s.start_time,
            endTime: s.end_time, status: s.status, notes: s.notes,
            files: ((s.file_codes ?? []) as string[]).map((code) => ({
              fileCode: code,
              drop: (dropByCode.get(code) as Drop | undefined) ?? null,
            })),
          })),
        });
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(reload, [reload]);

  // Upload an mp3 straight to Supabase Storage, then upsert the dj_drops row.
  const handleFile = async (file: File, fileCode?: string) => {
    setError(null);
    let code = fileCode;
    if (!code) {
      const m = file.name.match(/DJB_\d{5}/i);
      if (!m) {
        setError(`Couldn't infer file code from "${file.name}". Rename to DJB_NNNNN.mp3 or upload from a slot.`);
        return;
      }
      code = m[0].toUpperCase();
    }
    if (!me) return;

    const slot = me.slots.find((s) => s.files.some((f) => f.fileCode === code));
    if (!slot) {
      setError(`${code} is not one of your assigned codes. Check your slot list.`);
      return;
    }
    setUploadingCode(code);

    try {
      const supabase = createClient();
      const ext = (file.name.match(/\.(mp3|wav|flac)$/i)?.[1] ?? "mp3").toLowerCase();
      const weekOf = me.weekOf;
      const storagePath = `${me.dj.slug}/${weekOf}/${code}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("dj-drops")
        .upload(storagePath, file, { upsert: true, contentType: file.type || `audio/${ext}` });
      if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);

      const { error: rowErr } = await supabase.from("dj_drops").upsert(
        {
          dj_id: me.dj.id,
          slot_id: slot.slotId,
          file_code: code,
          week_of: weekOf,
          status: "uploaded",
          source: "web",
          storage_path: storagePath,
          size_bytes: file.size,
          format: ext,
          uploaded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slot_id,file_code,week_of" },
      );
      if (rowErr) throw new Error(rowErr.message);

      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploadingCode(null);
    }
  };

  if (loading && !me) return <div className="py-8 text-sm text-muted-foreground">Loading…</div>;

  if (error && !me) {
    return (
      <div className="py-8 space-y-3">
        <p className="text-sm text-red-500">{error}</p>
        <p className="text-xs text-muted-foreground">
          If you're a WCCG DJ and don't see your portal, ask an admin to claim your DJ slug to your account.
        </p>
      </div>
    );
  }
  if (!me) return null;

  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            DJ Portal
          </p>
          <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
            {me.dj.displayName}
          </h1>
          <p className="mt-1 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            Week of {me.weekOf}
          </p>
        </div>
        <Button onClick={reload} variant="outline" size="sm" className="rounded-full">
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Refresh
        </Button>
      </header>

      {/* Bulk drag-drop */}
      <BulkDropZone
        onFile={(f) => handleFile(f)}
        uploadingCode={uploadingCode}
      />

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Slots */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Your slots
        </h2>
        <div className="space-y-3">
          {me.slots.map((slot) => (
            <SlotCard
              key={slot.slotId}
              slot={slot}
              uploadingCode={uploadingCode}
              onFile={handleFile}
            />
          ))}
          {me.slots.length === 0 && (
            <p className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
              No slots assigned. Reach out to ops.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── Bulk drop zone (top of page) ───────────────────────────────────────
function BulkDropZone({
  onFile,
  uploadingCode,
}: {
  onFile: (file: File) => void;
  uploadingCode: string | null;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [drag, setDrag] = useState(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    files.forEach(onFile);
  };

  return (
    <section
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
        drag ? "border-[#74ddc7] bg-[#74ddc7]/5" : "border-border bg-card/50"
      }`}
    >
      <UploadCloud className={`h-10 w-10 ${drag ? "text-[#74ddc7]" : "text-muted-foreground"}`} />
      <div>
        <p className="font-bold text-foreground">Drop files anywhere here</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Names must include your code, e.g. <code className="rounded bg-muted px-1">DJB_76051.mp3</code>
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="audio/mpeg,audio/wav,audio/flac,.mp3,.wav,.flac"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.currentTarget.files ?? []);
          files.forEach(onFile);
          e.currentTarget.value = "";
        }}
      />
      <Button
        type="button"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={!!uploadingCode}
        className="rounded-full bg-[#dc2626] text-white hover:bg-[#b91c1c]"
      >
        {uploadingCode ? `Uploading ${uploadingCode}…` : "Choose files"}
      </Button>
    </section>
  );
}

// ─── Per-slot card ──────────────────────────────────────────────────────
function SlotCard({
  slot,
  uploadingCode,
  onFile,
}: {
  slot: Slot;
  uploadingCode: string | null;
  onFile: (file: File, fileCode?: string) => void;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
        <div className="flex items-center gap-3 text-sm">
          <span className="rounded-full bg-foreground/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground">
            {DAYS[slot.dayOfWeek]} {fmtTime(slot.startTime)} – {fmtTime(slot.endTime)}
          </span>
          {slot.status === "tentative" && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-500">
              Tentative
            </span>
          )}
          {slot.status === "inactive" && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Inactive
            </span>
          )}
        </div>
        {slot.notes && <span className="text-xs text-muted-foreground">{slot.notes}</span>}
      </header>
      <ul className="divide-y divide-border">
        {slot.files.map((f) => (
          <FileRow
            key={f.fileCode}
            fileCode={f.fileCode}
            drop={f.drop}
            uploading={uploadingCode === f.fileCode}
            onFile={(file) => onFile(file, f.fileCode)}
          />
        ))}
      </ul>
    </article>
  );
}

function FileRow({
  fileCode,
  drop,
  uploading,
  onFile,
}: {
  fileCode: string;
  drop: Drop | null;
  uploading: boolean;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const status = drop?.status ?? "pending";
  const statusColor =
    status === "published" || status === "validated"
      ? "text-[#74ddc7]"
      : status === "uploaded"
        ? "text-amber-500"
        : status === "rejected"
          ? "text-red-500"
          : "text-muted-foreground";

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
      <div className="min-w-0">
        <p className="font-mono text-sm font-bold tracking-wide text-foreground">{fileCode}</p>
        <p className={`text-xs ${statusColor}`}>
          {status}
          {drop?.source === "ftp" ? " · via FTP" : ""}
          {drop?.uploaded_at ? ` · ${new Date(drop.uploaded_at).toLocaleString()}` : ""}
          {drop?.size_bytes ? ` · ${prettyBytes(drop.size_bytes)}` : ""}
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="audio/mpeg,audio/wav,audio/flac,.mp3,.wav,.flac"
        className="hidden"
        onChange={(e) => {
          const f = e.currentTarget.files?.[0];
          if (f) onFile(f);
          e.currentTarget.value = "";
        }}
      />
      <Button
        size="sm"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="rounded-full"
      >
        <UploadCloud className="mr-1.5 h-3.5 w-3.5" />
        {uploading ? "Uploading…" : drop ? "Replace" : "Upload"}
      </Button>
    </li>
  );
}

function fmtTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const am = h < 12;
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}${m === 0 ? "" : `:${String(m).padStart(2, "0")}`}${am ? "a" : "p"}`;
}

function prettyBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
