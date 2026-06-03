"use client";

/**
 * AI Image Generator — /studio/image-generator
 *
 * Calls the deployed `generate-image` Supabase Edge Function (OpenAI
 * gpt-image-1) with the signed-in user's session, shows the freshly
 * generated image, and lists the user's past generations from the
 * `generated_images` table / `generated-images` storage bucket.
 *
 * Note on <img> vs next/image: the Supabase bucket host
 * (irjiqbmoohklagdegezz.supabase.co) is NOT in next.config's
 * images.remotePatterns, and this page must not touch config — so we
 * render bucket images with a plain <img>. This matches the existing
 * precedent for Supabase-hosted media elsewhere in the app.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Download,
  Globe,
  ImageIcon,
  Loader2,
  LogIn,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "generated-images";

type ImageSize = "1024x1024" | "1536x1024" | "1024x1536";

const SIZES: { value: ImageSize; label: string; hint: string }[] = [
  { value: "1024x1024", label: "Square", hint: "1024 × 1024" },
  { value: "1536x1024", label: "Landscape", hint: "1536 × 1024" },
  { value: "1024x1536", label: "Portrait", hint: "1024 × 1536" },
];

interface GeneratedRow {
  id: string;
  user_id: string | null;
  prompt: string;
  size: string | null;
  provider: string | null;
  model: string | null;
  storage_path: string;
  is_public: boolean;
  created_at: string;
}

interface FreshImage {
  id: string;
  url: string;
  prompt: string;
  size: string;
  is_public: boolean;
}

/** Result shape returned by the edge function on success. */
interface GenerateResponse {
  id: string;
  path: string;
  url: string;
  prompt: string;
  size: string;
  error?: string;
}

/**
 * Pull the human-readable error out of a failed functions.invoke call.
 * With supabase-js, a non-2xx response produces a FunctionsHttpError whose
 * real JSON body ({ error }) lives on error.context — we read it defensively
 * and fall back to the data payload and the raw error message.
 */
async function extractFunctionError(
  err: unknown,
  data: GenerateResponse | null,
): Promise<string> {
  // FunctionsHttpError carries the original Response on `.context`.
  const ctx = (err as { context?: Response } | null)?.context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const body = (await ctx.json()) as { error?: string } | null;
      if (body?.error) return body.error;
    } catch {
      /* body wasn't JSON — fall through to other sources */
    }
  }
  if (data?.error) return data.error;
  if (err instanceof Error && err.message) return err.message;
  return "Image generation failed. Please try again.";
}

function isMissingKeyError(msg: string): boolean {
  return msg.includes("OPENAI_API_KEY");
}

const MISSING_KEY_NOTE =
  "Image generation needs an OpenAI key — an admin must add OPENAI_API_KEY in Supabase → Edge Functions → Secrets.";

/** Trigger a browser download of a public image URL (CORS-safe blob path with fallback). */
async function downloadImage(url: string, filename: string): Promise<void> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    // Fallback: let the browser handle it directly.
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export default function ImageGeneratorPage() {
  const [supabase] = useState(() => createClient());

  // Auth
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Generation form
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<ImageSize>("1024x1024");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingKey, setMissingKey] = useState(false);

  // Freshly generated image (this session)
  const [fresh, setFresh] = useState<FreshImage | null>(null);
  const [publishing, setPublishing] = useState(false);

  // Gallery of past generations
  const [gallery, setGallery] = useState<GeneratedRow[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const publicUrlFor = useCallback(
    (storagePath: string) =>
      supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl,
    [supabase],
  );

  // Resolve the current user once on mount.
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active) return;
      setUserId(user?.id ?? null);
      setAuthChecked(true);
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  // Load the user's gallery whenever we have a user id.
  // Refreshes the gallery for a given user. Returns the rows so callers can
  // apply them however they like. Pure async — no setState inside — which
  // keeps it safe to call from an effect.
  const fetchGallery = useCallback(
    async (uid: string): Promise<{ rows: GeneratedRow[]; error: string | null }> => {
      const { data, error: gErr } = await supabase
        .from("generated_images")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      if (gErr) return { rows: [], error: gErr.message };
      return { rows: (data ?? []) as GeneratedRow[], error: null };
    },
    [supabase],
  );

  // Initial gallery load. The main UI only renders once `userId` is set
  // (otherwise the auth gate shows). State is applied inside the async
  // callback after the request resolves, guarded against unmount.
  useEffect(() => {
    if (!userId) return;
    let active = true;
    void fetchGallery(userId).then(({ rows, error: e }) => {
      if (!active) return;
      setGallery(rows);
      setGalleryError(e);
      setGalleryLoading(false);
    });
    return () => {
      active = false;
    };
  }, [userId, fetchGallery]);

  // Imperative refresh used after generate / delete.
  const refreshGallery = useCallback(
    async (uid: string) => {
      const { rows, error: e } = await fetchGallery(uid);
      setGallery(rows);
      setGalleryError(e);
      setGalleryLoading(false);
    },
    [fetchGallery],
  );

  const handleGenerate = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed || generating) return;

    setGenerating(true);
    setError(null);
    setMissingKey(false);

    const { data, error: fnErr } = await supabase.functions.invoke<GenerateResponse>(
      "generate-image",
      { body: { prompt: trimmed, size } },
    );

    if (fnErr || data?.error || !data?.url) {
      const msg = await extractFunctionError(fnErr ?? null, data ?? null);
      if (isMissingKeyError(msg)) {
        setMissingKey(true);
      } else {
        setError(msg);
      }
      setGenerating(false);
      return;
    }

    setFresh({
      id: data.id,
      url: data.url,
      prompt: data.prompt,
      size: data.size,
      is_public: false,
    });
    setGenerating(false);

    // Refresh the gallery so the new image appears in the grid too.
    if (userId) void refreshGallery(userId);
  }, [prompt, size, generating, supabase, userId, refreshGallery]);

  const handleMakePublic = useCallback(async () => {
    if (!fresh || publishing || fresh.is_public) return;
    setPublishing(true);
    const { error: upErr } = await supabase
      .from("generated_images")
      .update({ is_public: true })
      .eq("id", fresh.id);
    setPublishing(false);
    if (upErr) {
      setError(`Couldn't make public: ${upErr.message}`);
      return;
    }
    setFresh({ ...fresh, is_public: true });
    setGallery((prev) =>
      prev.map((row) => (row.id === fresh.id ? { ...row, is_public: true } : row)),
    );
  }, [fresh, publishing, supabase]);

  const handleDelete = useCallback(
    async (row: GeneratedRow) => {
      if (deletingId) return;
      setDeletingId(row.id);
      setGalleryError(null);

      const { error: dbErr } = await supabase
        .from("generated_images")
        .delete()
        .eq("id", row.id);
      if (dbErr) {
        setGalleryError(`Delete failed: ${dbErr.message}`);
        setDeletingId(null);
        return;
      }

      // Best-effort removal of the underlying object (row is already gone).
      await supabase.storage.from(BUCKET).remove([row.storage_path]);

      setGallery((prev) => prev.filter((r) => r.id !== row.id));
      if (fresh?.id === row.id) setFresh(null);
      setDeletingId(null);
    },
    [deletingId, supabase, fresh],
  );

  // ---- Auth gate ---------------------------------------------------------
  if (!authChecked) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#7401df]" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="rounded-2xl border border-border bg-card p-8 text-center sm:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#7401df]/10">
            <LogIn className="h-7 w-7 text-[#7401df]" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-foreground">
            Sign in to generate images
          </h1>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
            The AI Image Generator creates art from your prompts and saves it to
            your personal gallery. Sign in to get started.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              className="gap-2 rounded-full bg-[#7401df] px-6 text-white hover:bg-[#5c00b3]"
            >
              <Link href="/login">
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full px-6">
              <Link href="/register">Create Account</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Main UI -----------------------------------------------------------
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#74ddc7] to-[#7401df] shadow-lg shadow-[#7401df]/20">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              AI Image Generator
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Describe what you want and let AI create it. Generated images are
              saved privately to your gallery — make any public to share.
            </p>
          </div>
        </div>
      </header>

      {/* Prompt + controls */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <label
          htmlFor="prompt"
          className="mb-2 block text-sm font-medium text-foreground"
        >
          Prompt
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="A neon-lit radio studio at night, synthwave style, ultra detailed…"
          rows={3}
          disabled={generating}
          className="w-full resize-y rounded-xl border border-input bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition focus-visible:border-[#74ddc7] focus-visible:ring-2 focus-visible:ring-[#74ddc7]/40 disabled:opacity-60"
        />

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="mb-2 block text-sm font-medium text-foreground">
              Aspect ratio
            </span>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((opt) => {
                const selected = size === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSize(opt.value)}
                    disabled={generating}
                    aria-pressed={selected}
                    className={[
                      "rounded-xl border px-3.5 py-2 text-left transition disabled:opacity-60",
                      selected
                        ? "border-[#74ddc7] bg-[#74ddc7]/10 ring-1 ring-[#74ddc7]/40"
                        : "border-border bg-background hover:border-[#74ddc7]/50",
                    ].join(" ")}
                  >
                    <span className="block text-sm font-medium text-foreground">
                      {opt.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {opt.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="h-11 gap-2 rounded-xl bg-[#74ddc7] px-6 font-semibold text-[#0a0a0f] hover:bg-[#74ddc7]/90"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                Generate
              </>
            )}
          </Button>
        </div>

        {/* Missing-key friendly note */}
        {missingKey && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-sm text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <span>{MISSING_KEY_NOTE}</span>
          </div>
        )}

        {/* Generic error */}
        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="break-words">{error}</span>
          </div>
        )}
      </section>

      {/* Freshly generated image */}
      {fresh && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#74ddc7]" />
            <h2 className="text-lg font-semibold text-foreground">
              Your latest creation
            </h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="overflow-hidden rounded-xl border border-border bg-black/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fresh.url}
                alt={fresh.prompt}
                className="mx-auto max-h-[70vh] w-full object-contain"
              />
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-foreground/80">{fresh.prompt}</p>
              <p className="text-xs text-muted-foreground">Size: {fresh.size}</p>
              <div className="mt-auto flex flex-col gap-2">
                <Button
                  onClick={() => downloadImage(fresh.url, `wccg-${fresh.id}.png`)}
                  variant="outline"
                  className="gap-2 rounded-xl"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button
                  onClick={handleMakePublic}
                  disabled={publishing || fresh.is_public}
                  className="gap-2 rounded-xl bg-[#7401df] text-white hover:bg-[#5c00b3] disabled:opacity-60"
                >
                  {publishing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Globe className="h-4 w-4" />
                  )}
                  {fresh.is_public ? "Public" : "Make public"}
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Gallery */}
      <section className="mt-10">
        <div className="mb-4 flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-[#74ddc7]" />
          <h2 className="text-xl font-semibold text-foreground">Your gallery</h2>
          {!galleryLoading && gallery.length > 0 && (
            <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs text-muted-foreground">
              {gallery.length}
            </span>
          )}
        </div>

        {galleryLoading ? (
          <div className="flex items-center justify-center rounded-2xl border border-border bg-card py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#74ddc7]" />
          </div>
        ) : galleryError ? (
          <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="break-words">
              Couldn&apos;t load your gallery: {galleryError}
            </span>
          </div>
        ) : gallery.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#74ddc7]/10">
              <ImageIcon className="h-6 w-6 text-[#74ddc7]" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">
              No images yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate your first image above — it&apos;ll show up here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map((row) => {
              const url = publicUrlFor(row.storage_path);
              const isDeleting = deletingId === row.id;
              return (
                <div
                  key={row.id}
                  className="group overflow-hidden rounded-2xl border border-border bg-card"
                >
                  <div className="relative aspect-square overflow-hidden bg-black/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={row.prompt}
                      loading="lazy"
                      className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                    />
                    {row.is_public && (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#7401df]/90 px-2 py-0.5 text-[11px] font-medium text-white">
                        <Globe className="h-3 w-3" />
                        Public
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p
                      className="line-clamp-2 text-sm text-foreground/80"
                      title={row.prompt}
                    >
                      {row.prompt}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        onClick={() =>
                          downloadImage(url, `wccg-${row.id}.png`)
                        }
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5 rounded-lg"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </Button>
                      <Button
                        onClick={() => handleDelete(row)}
                        disabled={isDeleting}
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Delete image"
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
