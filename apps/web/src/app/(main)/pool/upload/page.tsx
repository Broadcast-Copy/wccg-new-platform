"use client";

/**
 * /pool/upload — record-pool upload form.
 *
 * Server-side ID3 extraction fills in artist/title/album/year automatically
 * if the MP3 has good tags. The user can override any field.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const VERSIONS = [
  "Original", "Clean", "Dirty", "Instrumental", "Acapella", "Radio Edit",
  "Extended", "Intro", "Outro", "Quick Hit", "Short Edit", "Remix", "Other",
];

interface Label {
  id: string;
  slug: string;
  name: string;
  verified: boolean;
}

export default function UploadTrackPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState({
    title: "",
    artist: "",
    remixArtist: "",
    labelName: "",
    album: "",
    genre: "",
    subgenre: "",
    bpm: "",
    musicalKey: "",
    releaseYear: "",
    releaseDate: "",
    version: "",
    labelId: "",
  });
  const [labels, setLabels] = useState<Label[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ id: string; autoApproved: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from("record_pool_labels")
        .select("id, slug, name, verified")
        .order("name", { ascending: true });
      if (!err) setLabels((data ?? []) as Label[]);
    })();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError("Pick a file."); return; }
    if (!meta.title.trim() || !meta.artist.trim()) {
      setError("Title and artist are required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in to upload.");

      // The storage RLS scopes uploads to the user's own folder and the path
      // convention is `<auth_uid>/<track_uuid>.<ext>`. Generate the id up front
      // so the storage object and the DB row line up.
      const trackId = crypto.randomUUID();
      const ext = (file.name.match(/\.([a-z0-9]+)$/i)?.[1] ?? "mp3").toLowerCase();
      const storagePath = `${user.id}/${trackId}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("record-pool")
        .upload(storagePath, file, {
          contentType: file.type || `audio/${ext}`,
          upsert: false,
        });
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

      const selectedLabel = meta.labelId
        ? labels.find((l) => l.id === meta.labelId) ?? null
        : null;
      const uploaderType: "dj" | "label" | "admin" =
        selectedLabel?.verified ? "label" : "dj";

      const num = (v: string) => (v.trim() === "" ? null : Number(v));
      const str = (v: string) => (v.trim() === "" ? null : v.trim());

      const { data: row, error: insErr } = await supabase
        .from("record_pool_tracks")
        .insert({
          id: trackId,
          uploaded_by: user.id,
          uploader_type: uploaderType,
          label_id: selectedLabel?.id ?? null,
          title: meta.title.trim(),
          artist: meta.artist.trim(),
          remix_artist: str(meta.remixArtist),
          label_name: str(meta.labelName) ?? selectedLabel?.name ?? null,
          album: str(meta.album),
          genre: str(meta.genre),
          subgenre: str(meta.subgenre),
          bpm: num(meta.bpm),
          musical_key: str(meta.musicalKey),
          release_year: num(meta.releaseYear),
          release_date: str(meta.releaseDate),
          version: str(meta.version),
          storage_path: storagePath,
          size_bytes: file.size,
          format: ext,
          // status defaults to 'pending' in the DB — leave it to moderation.
        })
        .select("id")
        .single();

      if (insErr) {
        // Roll back the orphaned upload so a retry doesn't collide.
        await supabase.storage.from("record-pool").remove([storagePath]);
        throw new Error(insErr.message);
      }

      setDone({ id: row.id, autoApproved: false });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="space-y-4 py-12 text-center">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#74ddc7]/15 text-[#74ddc7]">
          <UploadCloud className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-black tracking-tight">Uploaded</h1>
        <p className="text-sm text-muted-foreground">
          {done.autoApproved
            ? "Auto-approved — it's live in the pool now."
            : "Pending review. We'll publish it after a quick check."}
        </p>
        <div className="flex justify-center gap-2 pt-3">
          <Button variant="outline" onClick={() => { setDone(null); setFile(null); setMeta({ ...meta, title: "", artist: "" }); }}>
            Upload another
          </Button>
          <Button onClick={() => router.push("/pool")}>Back to pool</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6">
      <Link
        href="/pool"
        className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Record pool
      </Link>

      <header>
        <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
          Upload to the pool
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Drop your audio file. We&apos;ll read ID3 tags automatically — fill anything we miss.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Audio file
          </label>
          <input
            type="file"
            accept="audio/*,.mp3,.wav,.flac,.aiff,.aif,.m4a"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              if (f && !meta.title) {
                setMeta((m) => ({ ...m, title: f.name.replace(/\.[^.]+$/, "") }));
              }
            }}
            className="block w-full rounded-xl border border-dashed border-border bg-card px-4 py-8 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-[#74ddc7]/15 file:px-3 file:py-1 file:text-[#74ddc7]"
            required
          />
          {file && (
            <p className="mt-2 text-xs text-muted-foreground">
              {file.name} • {fmtBytes(file.size)}
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title" value={meta.title} onChange={(v) => setMeta({ ...meta, title: v })} required />
          <Field label="Artist" value={meta.artist} onChange={(v) => setMeta({ ...meta, artist: v })} required />
          <Field label="Remix / Feat." value={meta.remixArtist} onChange={(v) => setMeta({ ...meta, remixArtist: v })} />
          <Field label="Album" value={meta.album} onChange={(v) => setMeta({ ...meta, album: v })} />
          <Field label="Genre" value={meta.genre} onChange={(v) => setMeta({ ...meta, genre: v })} />
          <Field label="Subgenre" value={meta.subgenre} onChange={(v) => setMeta({ ...meta, subgenre: v })} />
          <Field label="BPM" value={meta.bpm} onChange={(v) => setMeta({ ...meta, bpm: v })} type="number" step="0.01" />
          <Field label="Musical key" value={meta.musicalKey} onChange={(v) => setMeta({ ...meta, musicalKey: v })} placeholder="e.g. 8A or Cm" />
          <Field label="Release year" value={meta.releaseYear} onChange={(v) => setMeta({ ...meta, releaseYear: v })} type="number" />
          <Field label="Release date" value={meta.releaseDate} onChange={(v) => setMeta({ ...meta, releaseDate: v })} type="date" />
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Version
            </label>
            <select
              value={meta.version}
              onChange={(e) => setMeta({ ...meta, version: e.target.value })}
              className="w-full rounded-full border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
            >
              <option value="">— select —</option>
              {VERSIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Label
            </label>
            <select
              value={meta.labelId}
              onChange={(e) => setMeta({ ...meta, labelId: e.target.value })}
              className="w-full rounded-full border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
            >
              <option value="">— DJ upload (no label) —</option>
              {labels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} {l.verified ? "✓" : ""}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Or type a label name below if it&apos;s not in the verified list yet.
            </p>
          </div>
          <Field label="Label name (free-text)" value={meta.labelName} onChange={(v) => setMeta({ ...meta, labelName: v })} />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button type="submit" disabled={submitting || !file} className="rounded-full">
            {submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-1.5 h-4 w-4" />}
            Upload to pool
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", required, step, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  step?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {label}{required && <span className="text-red-400"> *</span>}
      </label>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-full border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
      />
    </div>
  );
}

function fmtBytes(n: number): string {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
