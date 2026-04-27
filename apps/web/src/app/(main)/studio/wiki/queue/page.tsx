"use client";

/**
 * Staff wiki review queue — Phase C5.
 *
 * Two stacks:
 *   1. Jobs currently in-flight or queued (agent_jobs)
 *   2. Articles that need human review before publishing (wiki_entities.needs_review)
 *
 * Each card links into the wiki page and offers a one-click approve action.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";

interface Job {
  id: string;
  entity_slug: string;
  entity_type: string;
  display_name: string;
  trigger: string;
  priority: number;
  status: "queued" | "running" | "done" | "failed";
  attempts: number;
  enqueued_at: string;
  next_attempt_at: string;
  last_error: string | null;
}

interface ReviewItem {
  slug: string;
  type: string;
  display_name: string;
  confidence: number | null;
  last_researched_at: string | null;
}

interface QueueResponse {
  jobs: Job[];
  needsReview: ReviewItem[];
}

export default function WikiReviewQueuePage() {
  const [data, setData] = useState<QueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busySlug, setBusySlug] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    apiClient<QueueResponse>("/wiki/queue")
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, []);

  const approve = async (slug: string) => {
    setBusySlug(slug);
    try {
      await apiClient(`/wiki/${slug}/approve`, { method: "POST" });
      load();
    } finally {
      setBusySlug(null);
    }
  };

  return (
    <div className="space-y-8 py-6">
      <header>
        <h1 className="text-2xl font-black text-foreground">Wiki review queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live view of the auto-research pipeline. Jobs auto-refresh every 15s.
        </p>
      </header>

      {/* Needs review */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Awaiting human review
        </h2>
        {loading && !data && <p className="text-sm text-muted-foreground">Loading…</p>}
        {data && data.needsReview.length === 0 && (
          <p className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
            Nothing in the review queue. Clean state.
          </p>
        )}
        <ul className="space-y-2">
          {data?.needsReview.map((r) => (
            <li
              key={r.slug}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <span>{r.type}</span>
                  {r.confidence != null && (
                    <span
                      className={`rounded-full px-1.5 ${
                        r.confidence >= 0.7 ? "bg-[#f59e0b]/15 text-[#f59e0b]" : "bg-red-500/15 text-red-400"
                      }`}
                    >
                      {Math.round(r.confidence * 100)}%
                    </span>
                  )}
                </div>
                <Link
                  href={`/wiki/${r.slug}`}
                  className="block truncate font-semibold text-foreground hover:text-[#74ddc7]"
                >
                  {r.display_name}
                </Link>
              </div>
              <Button
                size="sm"
                onClick={() => approve(r.slug)}
                disabled={busySlug === r.slug}
                className="rounded-full bg-[#dc2626] text-xs font-bold hover:bg-[#b91c1c]"
              >
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                {busySlug === r.slug ? "…" : "Approve & publish"}
              </Button>
            </li>
          ))}
        </ul>
      </section>

      {/* Jobs */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Pipeline
        </h2>
        <ul className="space-y-2">
          {data?.jobs.map((j) => (
            <li
              key={j.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-sm"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {j.status === "running" ? (
                    <Clock className="h-3 w-3 text-[#74ddc7] animate-spin" />
                  ) : j.status === "failed" ? (
                    <AlertTriangle className="h-3 w-3 text-red-400" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                  <span>{j.status}</span>
                  <span>· {j.entity_type}</span>
                  <span>· {j.trigger}</span>
                  {j.attempts > 1 && <span>· try {j.attempts}</span>}
                </div>
                <Link
                  href={`/wiki/${j.entity_slug}`}
                  className="block truncate font-semibold text-foreground hover:text-[#74ddc7]"
                >
                  {j.display_name}
                </Link>
                {j.last_error && (
                  <p className="mt-0.5 truncate text-xs text-red-400">{j.last_error}</p>
                )}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                p{j.priority}
              </span>
            </li>
          ))}
          {data && data.jobs.length === 0 && (
            <li className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
              Queue is empty. Agent is idle.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
