"use client";

/**
 * Wiki entity page — Phase C2.
 *
 * Real renderer. Fetches `/wiki/:slug`. Three states:
 *
 *   1. published       → render Markdown, sources, backlinks, confidence chip
 *   2. in_review/draft → same UI but with a "Pending review" banner
 *   3. 404             → "Coming soon" + "Research this now" button (queues an
 *                        agent_jobs row; the worker picks it up).
 *
 * The Markdown rendering is intentionally minimal — a tiny in-house renderer
 * keeps us out of dep churn. Wiki cross-links and footnote-citations are the
 * only special syntax we care about.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Eye,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { awardCustomBounty } from "@/hooks/use-listening-points";

interface Source {
  url: string;
  title: string | null;
  excerpt: string | null;
  fetchedAt: string;
}

interface WikiEntity {
  slug: string;
  type: string;
  displayName: string;
  bodyMd: string | null;
  bodyHtml: string | null;
  coverUrl: string | null;
  confidence: number | null;
  status: "draft" | "in_review" | "published" | "archived";
  lastResearchedAt: string | null;
  sources: Source[];
  backlinks: string[];
}

function titleCase(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function WikiEntityClient() {
  const params = useParams();
  const slug = (Array.isArray(params?.slug) ? params.slug[0] : (params?.slug as string)) ?? "";
  const [entity, setEntity] = useState<WikiEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const dwellAwardedRef = useState({ done: false })[0];

  useEffect(() => {
    setLoading(true);
    setMissing(false);
    apiClient<WikiEntity>(`/wiki/${slug}`)
      .then((e) => setEntity(e))
      .catch((err) => {
        if ((err.message || "").toLowerCase().includes("not found")) {
          setMissing(true);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  // Phase C: WIKI_DWELL bonus when a published article is read for >30s.
  useEffect(() => {
    if (!entity || entity.status !== "published") return;
    const t = setTimeout(() => {
      if (dwellAwardedRef.done) return;
      dwellAwardedRef.done = true;
      awardCustomBounty(`wiki_dwell:${slug}:${new Date().toISOString().slice(0, 10)}`, 10, "WIKI_DWELL", "Wiki Read");
    }, 30_000);
    return () => clearTimeout(t);
  }, [entity, slug, dwellAwardedRef]);

  const requestResearch = async () => {
    setRequesting(true);
    try {
      await apiClient(`/wiki/${slug}/research`, {
        method: "POST",
        body: JSON.stringify({ type: "topic", displayName: titleCase(slug) }),
      });
      setRequested(true);
    } catch {
      setRequested(true); // Assume queued either way — server dedupes.
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return <div className="py-10 text-sm text-muted-foreground">Loading…</div>;
  }

  if (missing || !entity) {
    return (
      <article className="mx-auto max-w-3xl space-y-6 py-10">
        <Link href="/wiki" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Wiki
        </Link>
        <header className="space-y-3">
          <p className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3 w-3 text-[#74ddc7]" /> Not yet researched
          </p>
          <h1 className="text-4xl font-black tracking-tight text-foreground md:text-5xl">
            {titleCase(slug)}
          </h1>
          <p className="text-base text-muted-foreground">
            We don't have a wiki page for this entity yet. Trigger an auto-research run — the agent will publish a sourced article (usually within a few minutes when it's not at capacity).
          </p>
        </header>
        <button
          type="button"
          onClick={requestResearch}
          disabled={requesting || requested}
          className="rounded-full bg-[#dc2626] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-500/20 hover:bg-[#b91c1c] disabled:opacity-60"
        >
          {requested ? "✓ Queued — refresh in a few minutes" : requesting ? "Queuing…" : "Research this now"}
        </button>
      </article>
    );
  }

  return (
    <article className="mx-auto max-w-3xl space-y-8 py-10">
      <Link href="/wiki" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Wiki
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          <span>{entity.type}</span>
          {entity.confidence != null && (
            <span className={`rounded-full px-2 py-0.5 ${
              entity.confidence >= 0.9 ? "bg-[#74ddc7]/15 text-[#74ddc7]"
              : entity.confidence >= 0.7 ? "bg-[#f59e0b]/15 text-[#f59e0b]"
              : "bg-red-500/15 text-red-400"
            }`}>
              Confidence {Math.round(entity.confidence * 100)}%
            </span>
          )}
          {entity.status !== "published" && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-400">
              {entity.status === "in_review" ? "In review" : "Draft"}
            </span>
          )}
        </div>
        <h1 className="text-4xl font-black tracking-tight text-foreground md:text-5xl">
          {entity.displayName}
        </h1>
        {entity.lastResearchedAt && (
          <p className="text-xs text-muted-foreground">
            Last researched {new Date(entity.lastResearchedAt).toLocaleString()}
          </p>
        )}
      </header>

      {/* Body */}
      <div className="prose prose-sm dark:prose-invert max-w-none text-base leading-relaxed text-foreground">
        <RenderedMarkdown md={entity.bodyMd ?? ""} sources={entity.sources} />
      </div>

      {/* Sources */}
      {entity.sources.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Sources
          </h2>
          <ol className="space-y-2 text-sm">
            {entity.sources.map((s, i) => (
              <li key={s.url} className="flex items-start gap-2">
                <span className="text-xs text-muted-foreground tabular-nums">[{i + 1}]</span>
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

      {/* Backlinks */}
      {entity.backlinks.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Linked from
          </h2>
          <ul className="flex flex-wrap gap-2 text-xs">
            {entity.backlinks.map((b) => (
              <li key={b}>
                <Link
                  href={`/wiki/${b}`}
                  className="rounded-full border border-border bg-card px-3 py-1 hover:border-input"
                >
                  {titleCase(b)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="flex items-center justify-between border-t border-border pt-4">
        <button
          type="button"
          onClick={requestResearch}
          disabled={requesting || requested}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <Eye className="h-3 w-3" /> {requested ? "Re-research queued" : "Refresh research"}
        </button>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <BookOpen className="h-3 w-3 text-[#74ddc7]" /> +10 WP for reading
        </span>
      </footer>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Tiny in-house Markdown renderer.
// Intentionally minimal — handles the subset our agent emits.
// ---------------------------------------------------------------------------

function RenderedMarkdown({ md, sources }: { md: string; sources: Source[] }) {
  // Strip footnote definitions ([^1]: …) — they go in the Sources section.
  const noFootnoteDefs = md.replace(/^\[\^\d+]:.*$/gm, "");

  // Replace [^N] inline citation markers with linked superscripts.
  const withCites = noFootnoteDefs.replace(/\[\^(\d+)\]/g, (_, n) => {
    const idx = Number(n);
    const src = sources[idx - 1];
    if (!src) return `<sup>[${n}]</sup>`;
    return `<sup><a href="${escapeAttr(src.url)}" target="_blank" rel="noopener" class="text-[#74ddc7] no-underline hover:underline">[${n}]</a></sup>`;
  });

  // [[wiki/slug|label]] → /wiki/slug link
  const withWikiLinks = withCites.replace(
    /\[\[(?:wiki\/)?([a-z0-9][a-z0-9-]*)(?:\|([^\]]+))?\]\]/gi,
    (_, slug, label) =>
      `<a href="/wiki/${slug.toLowerCase()}" class="text-foreground underline decoration-dotted underline-offset-2 hover:text-[#74ddc7]">${escapeHtml(label || slug)}</a>`,
  );

  const blocks = withWikiLinks.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const html = blocks
    .map((block) => {
      if (block.startsWith("# ")) return `<h1 class="mt-6 text-3xl font-black">${inline(block.slice(2))}</h1>`;
      if (block.startsWith("## ")) return `<h2 class="mt-6 text-xl font-bold">${inline(block.slice(3))}</h2>`;
      if (block.startsWith("### ")) return `<h3 class="mt-4 font-bold">${inline(block.slice(4))}</h3>`;
      if (block.startsWith("- ") || block.startsWith("* ")) {
        const items = block.split(/\n/).map((l) => l.replace(/^[-*]\s+/, ""));
        return `<ul class="my-2 list-disc space-y-1 pl-5">${items.map((i) => `<li>${inline(i)}</li>`).join("")}</ul>`;
      }
      return `<p class="my-3">${inline(block)}</p>`;
    })
    .join("\n");

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

function inline(t: string): string {
  // Allow bold/italic/code; everything else passes through (HTML already
  // injected by our citation/wikilink replacements above).
  return t
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code class=\"rounded bg-muted px-1\">$1</code>");
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function escapeAttr(s: string) {
  return s.replace(/"/g, "&quot;");
}
