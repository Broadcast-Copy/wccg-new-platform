"use client";

/**
 * Wiki entity page — Supabase-direct (no API server).
 *
 * Reads a single `wiki_entities` row by slug. Three states:
 *
 *   1. published      → render name, summary, content (light Markdown) + Sources.
 *   2. exists, but not published / not found → friendly "No entry yet" state.
 *      Signed-in viewers can request the entry, which inserts a `requested`
 *      row (RLS lets any authenticated user insert status='requested').
 *   3. loading / error → graceful placeholders.
 *
 * Research itself is admin-triggered from the staff queue, so this page only
 * ever *requests* an entry — it never invokes the edge function.
 *
 * The Markdown rendering is intentionally minimal (no new dependency): headings,
 * lists, bold/italic/code inline, and paragraphs with preserved line breaks.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, BookOpen, ExternalLink, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { awardCustomBounty } from "@/hooks/use-listening-points";

const supabase = createClient();

interface WikiSource {
  title: string | null;
  url: string;
}

type WikiStatus =
  | "requested"
  | "researching"
  | "pending_review"
  | "published"
  | "rejected";

interface WikiEntity {
  id: string;
  slug: string;
  name: string;
  entity_type: string;
  summary: string | null;
  content: string | null;
  sources: WikiSource[];
  status: WikiStatus;
  published_at: string | null;
}

function titleCase(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
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

export default function WikiEntityClient() {
  // Resolve the slug from the REAL URL. Under `output: export`, /wiki/<slug> can
  // be served by the _placeholder shim, so useParams() returns "_placeholder" —
  // but usePathname() reflects the actual browser path, so derive the slug from
  // it (and it updates on client-side wiki→wiki navigation). The shim's empty /
  // "_placeholder" slug maps to "" so we skip the network entirely.
  const pathname = usePathname();
  const slug = useMemo(() => {
    const segs = (pathname ?? "").split("/").filter(Boolean);
    const i = segs.indexOf("wiki");
    const seg = i >= 0 ? segs[i + 1] : undefined;
    if (!seg || seg === "_placeholder") return "";
    try {
      return decodeURIComponent(seg);
    } catch {
      return seg;
    }
  }, [pathname]);
  const { user } = useAuth();

  const [entity, setEntity] = useState<WikiEntity | null>(null);
  // Lazy init: only start in the loading state when there's something to load,
  // so we never have to synchronously setState inside the effect body.
  const [loading, setLoading] = useState(() => !!slug);
  const [loadError, setLoadError] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const dwellAwardedRef = useRef(false);

  // Load the entity by slug.
  useEffect(() => {
    if (!slug) return;

    let active = true;

    void (async () => {
      const { data, error } = await supabase
        .from("wiki_entities")
        .select("id, slug, name, entity_type, summary, content, sources, status, published_at")
        .eq("slug", slug)
        .maybeSingle();

      if (!active) return;

      // All setState calls happen post-await behind the active guard.
      if (error) {
        setLoadError(true);
        setEntity(null);
      } else if (data) {
        const row = data as Omit<WikiEntity, "sources"> & { sources: unknown };
        setLoadError(false);
        setEntity({ ...row, sources: normalizeSources(row.sources) });
      } else {
        setLoadError(false);
        setEntity(null);
      }
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [slug]);

  // Award a small "dwell" bounty when a published article is read for >30s.
  useEffect(() => {
    if (!entity || entity.status !== "published") return;
    const t = setTimeout(() => {
      if (dwellAwardedRef.current) return;
      dwellAwardedRef.current = true;
      awardCustomBounty(
        `wiki_dwell:${slug}:${new Date().toISOString().slice(0, 10)}`,
        10,
        "WIKI_DWELL",
        "Wiki Read",
      );
    }, 30_000);
    return () => clearTimeout(t);
  }, [entity, slug]);

  const requestEntry = async () => {
    if (!user || !slug) return;
    setRequesting(true);
    setRequestError(null);
    const { error } = await supabase.from("wiki_entities").insert({
      slug,
      name: titleCase(slug),
      entity_type: "artist",
      status: "requested",
      created_by: user.id,
    });
    // 23505 = unique_violation (already requested). Treat as success.
    if (error && error.code !== "23505") {
      setRequestError("Couldn't request this entry. Please try again.");
    } else {
      setRequested(true);
    }
    setRequesting(false);
  };

  if (loading) {
    return <div className="py-10 text-sm text-muted-foreground">Loading…</div>;
  }

  const isPublished = entity?.status === "published";

  // "No entry yet" — not found, not published, or a load error.
  if (!entity || !isPublished) {
    return (
      <article className="mx-auto max-w-3xl space-y-6 py-10">
        <Link
          href="/wiki"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Wiki
        </Link>
        <header className="space-y-3">
          <p className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3 w-3 text-[#74ddc7]" /> No entry yet
          </p>
          <h1 className="text-4xl font-black tracking-tight text-foreground md:text-5xl">
            {entity?.name ?? titleCase(slug)}
          </h1>
          <p className="text-base text-muted-foreground">
            {loadError
              ? "We couldn't load this entry right now. Please try again in a moment."
              : entity
                ? "This entry is still being prepared. Check back soon — our editors review every page before it goes live."
                : "We don't have a wiki page for this yet."}
          </p>
        </header>

        {user ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={requestEntry}
              disabled={requesting || requested}
              className="rounded-full bg-[#dc2626] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-500/20 hover:bg-[#b91c1c] disabled:opacity-60"
            >
              {requested
                ? "✓ Requested — check back soon"
                : requesting
                  ? "Requesting…"
                  : "Request this entry"}
            </button>
            {requestError && <p className="text-xs text-red-400">{requestError}</p>}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link href="/login" className="text-[#74ddc7] hover:underline">
              Sign in
            </Link>{" "}
            to request this entry.
          </p>
        )}
      </article>
    );
  }

  return (
    <article className="mx-auto max-w-3xl space-y-8 py-10">
      <Link
        href="/wiki"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Wiki
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          <span>{entity.entity_type}</span>
        </div>
        <h1 className="text-4xl font-black tracking-tight text-foreground md:text-5xl">
          {entity.name}
        </h1>
        {entity.summary && (
          <p className="text-lg leading-relaxed text-muted-foreground">{entity.summary}</p>
        )}
        {entity.published_at && (
          <p className="text-xs text-muted-foreground">
            Published {new Date(entity.published_at).toLocaleDateString()}
          </p>
        )}
      </header>

      {/* Body */}
      {entity.content && (
        <div className="text-base leading-relaxed text-foreground">
          <RenderedMarkdown md={entity.content} />
        </div>
      )}

      {/* Sources */}
      {entity.sources.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Sources
          </h2>
          <ol className="space-y-2 text-sm">
            {entity.sources.map((s, i) => (
              <li key={`${s.url}-${i}`} className="flex items-start gap-2">
                <span className="tabular-nums text-xs text-muted-foreground">[{i + 1}]</span>
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
          </ol>
        </section>
      )}

      <footer className="flex items-center justify-end border-t border-border pt-4">
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <BookOpen className="h-3 w-3 text-[#74ddc7]" /> +10 WP for reading
        </span>
      </footer>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Tiny in-house Markdown renderer — intentionally minimal, no dependency.
// Handles headings, unordered lists, bold/italic/code, and paragraphs with
// preserved single line breaks. All text is HTML-escaped first.
// ---------------------------------------------------------------------------

function RenderedMarkdown({ md }: { md: string }) {
  const blocks = md
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        if (block.startsWith("### ")) {
          return (
            <h3 key={i} className="mt-4 font-bold" dangerouslySetInnerHTML={{ __html: inline(block.slice(4)) }} />
          );
        }
        if (block.startsWith("## ")) {
          return (
            <h2 key={i} className="mt-6 text-xl font-bold" dangerouslySetInnerHTML={{ __html: inline(block.slice(3)) }} />
          );
        }
        if (block.startsWith("# ")) {
          return (
            <h1 key={i} className="mt-6 text-2xl font-black" dangerouslySetInnerHTML={{ __html: inline(block.slice(2)) }} />
          );
        }
        if (/^[-*]\s+/.test(block)) {
          const items = block.split(/\n/).map((l) => l.replace(/^[-*]\s+/, ""));
          return (
            <ul key={i} className="my-2 list-disc space-y-1 pl-5">
              {items.map((item, j) => (
                <li key={j} dangerouslySetInnerHTML={{ __html: inline(item) }} />
              ))}
            </ul>
          );
        }
        return (
          <p
            key={i}
            className="whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: inline(block) }}
          />
        );
      })}
    </div>
  );
}

/** Escape HTML, then apply a safe inline-formatting subset. */
function inline(t: string): string {
  return escapeHtml(t)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1">$1</code>');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
