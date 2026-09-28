"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronRight,
  Loader2,
  RefreshCw,
  SearchX,
} from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { Markdown } from "@/components/markdown";
import {
  docVideoUrl,
  fmtUpdated,
  getDoc,
  groupBySection,
  isDocSlug,
  listDocs,
  type Doc,
  type DocListItem,
  type Result,
} from "@/lib/docs";
import { cx } from "@/lib/format";

/**
 * Member documentation: /docs lists the guides, /docs?d=<slug> reads one.
 * A query parameter, not a dynamic segment, because this is a static export.
 *
 * Nothing here is in the build: the page is a shell that reads bc_docs at
 * runtime with the signed-in session (AuthGuard sends anyone else to /login),
 * and RLS returns published rows to authenticated accounts only (migration
 * 114). The guide text therefore never exists in any static file.
 */

type ListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; docs: DocListItem[] };

/** One answer from the database, tagged with the request it answers. */
type DocAnswer = { slug: string; attempt: number; result: Result<Doc | null> };

type DocView =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "ready"; doc: Doc };

function Spinner({ label }: { label: string }) {
  return (
    <div className="grid place-items-center py-24" role="status">
      <Loader2 className="h-6 w-6 animate-spin text-faint" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}

function ErrorBox({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 break-words">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex items-center gap-1.5 font-medium underline underline-offset-2"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Try again
        </button>
      </div>
    </div>
  );
}

function Overview({ list, onRetry }: { list: ListState; onRetry: () => void }) {
  if (list.status === "loading") return <Spinner label="Loading the guides" />;
  if (list.status === "error")
    return <ErrorBox title="Could not load the documentation." message={list.message} onRetry={onRetry} />;
  if (list.docs.length === 0)
    return (
      <div className="rounded-xl border border-line bg-surface px-5 py-8 text-center text-sm text-dim">
        No guides are published yet.
      </div>
    );

  return (
    <div className="space-y-10">
      {groupBySection(list.docs).map((group) => (
        <section key={group.section}>
          <div className="flex items-baseline gap-4">
            <h2 className="text-sm font-semibold tracking-[0.14em] text-fg uppercase">{group.section}</h2>
            <span className="h-px flex-1 bg-line" aria-hidden />
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {group.docs.map((doc) => (
              <li key={doc.slug}>
                <Link
                  href={`/docs?d=${doc.slug}`}
                  className="flex h-full items-start justify-between gap-4 rounded-xl border border-line bg-surface px-5 py-4 transition hover:border-signal/50"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-fg">{doc.title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-dim">{doc.summary}</span>
                  </span>
                  <ArrowRight className="mt-1 h-4 w-4 flex-none text-signal-ink" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function SideNav({ list, current }: { list: ListState; current: string }) {
  if (list.status !== "ready" || list.docs.length === 0) return null;
  return (
    <nav aria-label="All guides" className="hidden lg:block">
      <div className="sticky top-24 space-y-6">
        {groupBySection(list.docs).map((group) => (
          <div key={group.section}>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-faint uppercase">{group.section}</p>
            <ul className="mt-2 space-y-0.5">
              {group.docs.map((doc) => {
                const active = doc.slug === current;
                return (
                  <li key={doc.slug}>
                    <Link
                      href={`/docs?d=${doc.slug}`}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "block rounded-lg px-2.5 py-1.5 text-sm leading-snug transition",
                        active ? "bg-signal/10 font-semibold text-signal-ink" : "text-dim hover:bg-elevated hover:text-fg",
                      )}
                    >
                      {doc.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}

function Reader({
  view,
  list,
  slug,
  onRetry,
}: {
  view: DocView;
  list: ListState;
  slug: string;
  onRetry: () => void;
}) {
  if (view.status === "loading") return <Spinner label="Loading the guide" />;
  if (view.status === "error")
    return <ErrorBox title="Could not load this guide." message={view.message} onRetry={onRetry} />;
  if (view.status === "not-found")
    return (
      <div className="rounded-xl border border-line bg-surface px-5 py-8 text-center">
        <SearchX className="mx-auto h-6 w-6 text-faint" aria-hidden />
        <p className="mt-3 font-semibold text-fg">There is no guide at this address.</p>
        <p className="mt-1 text-sm text-dim">It may have been renamed or unpublished.</p>
        <Link
          href="/docs"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-signal-ink hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          All documentation
        </Link>
      </div>
    );

  const { doc } = view;
  const video = docVideoUrl(doc.video);
  const order = list.status === "ready" ? list.docs : [];
  const at = order.findIndex((d) => d.slug === slug);
  const prev = at > 0 ? order[at - 1] : undefined;
  const next = at >= 0 ? order[at + 1] : undefined;
  const updated = fmtUpdated(doc.updated_at);

  return (
    <article className="min-w-0">
      <p className="text-xs font-semibold tracking-[0.16em] text-faint uppercase">{doc.section}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance text-fg">{doc.title}</h1>
      {doc.summary ? <p className="mt-3 text-lg leading-relaxed text-dim text-pretty">{doc.summary}</p> : null}
      {updated ? <p className="mt-3 text-xs text-faint">Updated {updated}</p> : null}

      {video ? (
        <figure className="mt-6 overflow-hidden rounded-xl border border-line bg-elevated">
          <video src={video} controls muted playsInline preload="metadata" className="aspect-video w-full" />
        </figure>
      ) : null}

      <div className="mt-8 rounded-2xl border border-line bg-surface p-5 sm:p-7">
        <Markdown source={doc.body_md} />
      </div>

      {prev || next ? (
        <nav aria-label="Previous and next guide" className="mt-8 grid gap-3 sm:grid-cols-2">
          {prev ? (
            <Link
              href={`/docs?d=${prev.slug}`}
              className="rounded-xl border border-line bg-surface px-4 py-3 transition hover:border-signal/50"
            >
              <span className="flex items-center gap-1.5 text-xs text-faint">
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Previous
              </span>
              <span className="mt-1 block text-sm font-semibold text-fg">{prev.title}</span>
            </Link>
          ) : (
            <span className="hidden sm:block" />
          )}
          {next ? (
            <Link
              href={`/docs?d=${next.slug}`}
              className="rounded-xl border border-line bg-surface px-4 py-3 text-right transition hover:border-signal/50"
            >
              <span className="flex items-center justify-end gap-1.5 text-xs text-faint">
                Next <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="mt-1 block text-sm font-semibold text-fg">{next.title}</span>
            </Link>
          ) : null}
        </nav>
      ) : null}
    </article>
  );
}

function Docs() {
  const raw = useSearchParams().get("d");
  const requested = raw !== null && raw !== "";
  const slug = requested && isDocSlug(raw) ? raw : null;

  const [list, setList] = useState<ListState>({ status: "loading" });
  const [listAttempt, setListAttempt] = useState(0);
  const [answer, setAnswer] = useState<DocAnswer | null>(null);
  const [docAttempt, setDocAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await listDocs();
      if (cancelled) return;
      setList(result.ok ? { status: "ready", docs: result.value } : { status: "error", message: result.message });
    })();
    return () => {
      cancelled = true;
    };
  }, [listAttempt]);

  useEffect(() => {
    if (slug === null) return;
    let cancelled = false;
    void (async () => {
      const result = await getDoc(slug);
      if (!cancelled) setAnswer({ slug, attempt: docAttempt, result });
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, docAttempt]);

  // The view is derived, so a stale answer for another guide is never shown.
  let view: DocView = { status: "loading" };
  if (requested && slug === null) view = { status: "not-found" };
  else if (answer !== null && answer.slug === slug && answer.attempt === docAttempt) {
    if (!answer.result.ok) view = { status: "error", message: answer.result.message };
    else if (answer.result.value === null) view = { status: "not-found" };
    else view = { status: "ready", doc: answer.result.value };
  }

  const title = view.status === "ready" ? view.doc.title : null;
  useEffect(() => {
    document.title = title ? `${title} — Broadcast Copy docs` : "Docs — Broadcast Copy";
  }, [title]);

  useEffect(() => {
    if (slug !== null) window.scrollTo({ top: 0 });
  }, [slug]);

  const retryList = () => {
    setList({ status: "loading" });
    setListAttempt((n) => n + 1);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-elevated text-dim">
          <BookOpen className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-sm text-dim">
            {requested ? (
              <>
                <Link href="/docs" className="font-medium text-signal-ink hover:underline">
                  Documentation
                </Link>
                <ChevronRight className="h-3.5 w-3.5 text-faint" aria-hidden />
                <span className="truncate">Guide</span>
              </>
            ) : (
              <span className="text-lg font-semibold tracking-tight text-fg">Documentation</span>
            )}
          </p>
          {!requested ? (
            <p className="text-sm text-dim">
              How to run your station on Broadcast Copy, task by task. For signed-in accounts only.
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-8">
        {requested ? (
          <div className="grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)]">
            <SideNav list={list} current={slug ?? ""} />
            <Reader view={view} list={list} slug={slug ?? ""} onRetry={() => setDocAttempt((n) => n + 1)} />
          </div>
        ) : (
          <Overview list={list} onRetry={retryList} />
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <AuthGuard>
      <AppShell>
        <Suspense fallback={<Spinner label="Loading" />}>
          <Docs />
        </Suspense>
      </AppShell>
    </AuthGuard>
  );
}
