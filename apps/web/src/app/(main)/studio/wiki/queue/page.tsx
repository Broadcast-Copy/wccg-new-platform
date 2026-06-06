"use client";

/**
 * Staff wiki review queue — Supabase-direct (no API server).
 *
 * Lists `wiki_entities` awaiting attention (status in requested / researching /
 * pending_review), newest activity first. For each row:
 *
 *   - requested       → "Generate with AI" invokes the `wiki-research` edge
 *                       function (staff-gated server-side), which fills
 *                       summary/content/sources and flips status to
 *                       pending_review. We then refresh.
 *   - researching     → in-progress indicator (the function is running).
 *   - pending_review  → preview of the generated summary/content + Approve
 *                       (status='published', published_at=now()) and Reject
 *                       (status='rejected').
 *
 * Writes go straight to Supabase; RLS enforces staff-only UPDATE and edge-
 * function access. The page is also wrapped in RequireRole for a friendly
 * client-side guard (defense-in-depth — RLS is the real boundary).
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RequireRole } from "@/components/auth/require-role";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

interface WikiSource {
  title: string | null;
  url: string;
}

type QueueStatus = "requested" | "researching" | "pending_review";

interface QueueEntity {
  id: string;
  slug: string;
  name: string;
  entity_type: string;
  summary: string | null;
  content: string | null;
  sources: WikiSource[];
  status: QueueStatus;
  updated_at: string;
}

interface WikiResearchResponse {
  entity?: unknown;
  error?: string;
}

/** Coerce an unknown jsonb value into a typed source list. */
function normalizeSources(raw: unknown): WikiSource[] {
  if (!Array.isArray(raw)) return [];
  const out: WikiSource[] = [];
  for (const item of raw) {
    if (item && typeof item === "object") {
      const rec = item as Record<string, unknown>;
      const url = typeof rec.url === "string" ? rec.url : "";
      if (!url) continue;
      out.push({ url, title: typeof rec.title === "string" ? rec.title : null });
    }
  }
  return out;
}

/**
 * Pull the human-readable error out of a failed functions.invoke call. With
 * supabase-js, a non-2xx response produces a FunctionsHttpError whose real
 * JSON body ({ error }) lives on error.context.
 */
async function extractFunctionError(
  err: unknown,
  data: WikiResearchResponse | null,
): Promise<string> {
  const ctx = (err as { context?: Response } | null)?.context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const body = (await ctx.json()) as { error?: string } | null;
      if (body?.error) return body.error;
    } catch {
      /* body wasn't JSON — fall through */
    }
  }
  if (data?.error) return data.error;
  if (err instanceof Error && err.message) return err.message;
  return "Research failed. Please try again.";
}

function WikiReviewQueue() {
  const [items, setItems] = useState<QueueEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});

  const load = useCallback(async (active: () => boolean) => {
    if (active()) setLoading(true);
    const { data, error } = await supabase
      .from("wiki_entities")
      .select("id, slug, name, entity_type, summary, content, sources, status, updated_at")
      .in("status", ["requested", "researching", "pending_review"])
      .order("updated_at", { ascending: false });

    if (!active()) return;

    if (error) {
      setLoadError("Couldn't load the review queue.");
      setItems([]);
    } else {
      setLoadError(null);
      const rows = (data ?? []) as (Omit<QueueEntity, "sources"> & { sources: unknown })[];
      setItems(rows.map((r) => ({ ...r, sources: normalizeSources(r.sources) })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    void load(() => active);
    return () => {
      active = false;
    };
  }, [load]);

  const refresh = useCallback(() => {
    void load(() => true);
  }, [load]);

  const setError = (id: string, msg: string | null) => {
    setRowError((prev) => {
      const next = { ...prev };
      if (msg) next[id] = msg;
      else delete next[id];
      return next;
    });
  };

  const generate = async (item: QueueEntity) => {
    setBusyId(item.id);
    setError(item.id, null);
    // Optimistically reflect the in-flight state.
    setItems((prev) =>
      prev.map((r) => (r.id === item.id ? { ...r, status: "researching" } : r)),
    );
    try {
      const { data, error } = await supabase.functions.invoke<WikiResearchResponse>(
        "wiki-research",
        { body: { slug: item.slug } },
      );
      if (error || data?.error) {
        const msg = await extractFunctionError(error, data ?? null);
        setError(item.id, msg);
      }
    } catch (err) {
      setError(item.id, await extractFunctionError(err, null));
    } finally {
      setBusyId(null);
      refresh();
    }
  };

  const approve = async (item: QueueEntity) => {
    setBusyId(item.id);
    setError(item.id, null);
    const { error } = await supabase
      .from("wiki_entities")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", item.id);
    if (error) setError(item.id, "Couldn't publish. Please try again.");
    setBusyId(null);
    refresh();
  };

  const reject = async (item: QueueEntity) => {
    setBusyId(item.id);
    setError(item.id, null);
    const { error } = await supabase
      .from("wiki_entities")
      .update({ status: "rejected" })
      .eq("id", item.id);
    if (error) setError(item.id, "Couldn't reject. Please try again.");
    setBusyId(null);
    refresh();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Wiki review queue</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate, review, and publish wiki entries.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={loading}
          className="rounded-full"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </header>

      {loadError && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400">
          {loadError}
        </p>
      )}

      {loading && items.length === 0 && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}

      {!loading && !loadError && items.length === 0 && (
        <p className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
          Nothing in the queue. Clean state.
        </p>
      )}

      <ul className="space-y-3">
        {items.map((item) => {
          const isBusy = busyId === item.id;
          const err = rowError[item.id];
          return (
            <li key={item.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span>{item.entity_type}</span>
                    <StatusChip status={item.status} />
                  </div>
                  <Link
                    href={`/wiki/${item.slug}`}
                    className="block truncate text-lg font-semibold text-foreground hover:text-[#74ddc7]"
                  >
                    {item.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Updated {new Date(item.updated_at).toLocaleString()}
                  </p>
                </div>

                {item.status === "requested" && (
                  <Button
                    size="sm"
                    onClick={() => generate(item)}
                    disabled={isBusy}
                    className="shrink-0 rounded-full bg-[#dc2626] text-xs font-bold hover:bg-[#b91c1c]"
                  >
                    {isBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {isBusy ? "Generating…" : "Generate with AI"}
                  </Button>
                )}

                {item.status === "researching" && (
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#74ddc7]/10 px-3 py-1 text-xs font-semibold text-[#74ddc7]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Researching…
                  </span>
                )}
              </div>

              {/* Preview + approve/reject for pending review */}
              {item.status === "pending_review" && (
                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  {item.summary && (
                    <p className="text-sm font-medium text-foreground">{item.summary}</p>
                  )}
                  {item.content && (
                    <p className="line-clamp-6 whitespace-pre-wrap text-sm text-muted-foreground">
                      {item.content}
                    </p>
                  )}
                  {item.sources.length > 0 && (
                    <ul className="space-y-1 text-xs">
                      {item.sources.map((s, i) => (
                        <li key={`${s.url}-${i}`} className="flex items-start gap-1.5">
                          <span className="tabular-nums text-muted-foreground">[{i + 1}]</span>
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all text-[#74ddc7] hover:underline"
                          >
                            {s.title ?? s.url}
                            <ExternalLink className="ml-1 inline h-3 w-3" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => approve(item)}
                      disabled={isBusy}
                      className="rounded-full bg-[#16a34a] text-xs font-bold hover:bg-[#15803d]"
                    >
                      {isBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Approve &amp; publish
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reject(item)}
                      disabled={isBusy}
                      className="rounded-full text-xs font-bold"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </div>
                </div>
              )}

              {err && (
                <p className="mt-3 flex items-start gap-1.5 text-xs text-red-400">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {err}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StatusChip({ status }: { status: QueueStatus }) {
  if (status === "requested") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">
        <Clock className="h-3 w-3" /> Requested
      </span>
    );
  }
  if (status === "researching") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#74ddc7]/15 px-1.5 py-0.5 text-[#74ddc7]">
        <Loader2 className="h-3 w-3 animate-spin" /> Researching
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#f59e0b]/15 px-1.5 py-0.5 text-[#f59e0b]">
      <Sparkles className="h-3 w-3" /> Pending review
    </span>
  );
}

export default function WikiReviewQueuePage() {
  return (
    <RequireRole
      roles={[
        "super_admin",
        "admin",
        "management",
        "operations",
        "production",
        "promotions",
        "sales",
        "engineering",
        "traffic",
        "gm",
      ]}
      area="the wiki review queue"
    >
      <WikiReviewQueue />
    </RequireRole>
  );
}
