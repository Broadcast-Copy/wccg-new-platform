"use client";

import { useEffect, useState } from "react";
import { Tag } from "lucide-react";
import { supabase } from "@/lib/supabase";

/**
 * Real-time changelog. Reads bc_changelog (public SELECT of published rows, mig
 * 096) client-side, so a new release published to the DB shows here with no
 * marketing rebuild. Version-controlled: one row per semantic version.
 */

type Channel = "alpha" | "beta" | "stable";

type Entry = {
  version: string;
  released_on: string;
  channel: Channel;
  title: string | null;
  changes: string[];
  sort_order: number;
};

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; entries: Entry[] };

const CHANNEL_STYLE: Record<Channel, string> = {
  alpha: "bg-[#a855f7]/15 text-[#c084fc] border-[#a855f7]/40",
  beta: "bg-amber/15 text-amber border-amber/40",
  stable: "bg-signal/15 text-signal-soft border-signal/40",
};

function fmtDate(iso: string): string {
  // Anchor at noon so a date-only value doesn't slip a day across time zones.
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function ChangelogList() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("bc_changelog")
        .select("version, released_on, channel, title, changes, sort_order")
        .order("sort_order", { ascending: false });
      if (cancelled) return;
      if (error || !data) setState({ status: "error" });
      else setState({ status: "ready", entries: data as Entry[] });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return <p className="mt-10 text-sm text-faint">Loading changelog…</p>;
  }

  if (state.status === "error") {
    return (
      <p className="mt-10 text-sm text-dim">
        Couldn&rsquo;t load the changelog right now. Please try again shortly.
      </p>
    );
  }

  return (
    <div className="relative mt-10 space-y-8">
      <div className="absolute top-0 bottom-0 left-[15px] w-px bg-line" aria-hidden />
      {state.entries.map((entry, idx) => {
        const latest = idx === 0;
        const changes = Array.isArray(entry.changes) ? entry.changes : [];
        return (
          <article key={entry.version} className="relative pl-10">
            <div
              className={`absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-surface ${
                latest ? "border-signal" : "border-line"
              }`}
            >
              <Tag className={`h-3.5 w-3.5 ${latest ? "text-signal" : "text-faint"}`} aria-hidden />
            </div>

            <div
              className={`rounded-2xl border bg-surface p-6 ${
                latest ? "border-signal/30" : "border-line"
              }`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-semibold">v{entry.version}</h2>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${CHANNEL_STYLE[entry.channel]}`}
                >
                  {entry.channel}
                </span>
                {latest && (
                  <span className="rounded-full bg-signal/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-signal-soft uppercase">
                    Latest
                  </span>
                )}
                <span className="text-xs text-faint">{fmtDate(entry.released_on)}</span>
              </div>

              {entry.title && (
                <p className="mt-2 text-sm font-medium text-dim">{entry.title}</p>
              )}

              <ul className="mt-4 space-y-2.5">
                {changes.map((change) => (
                  <li key={change} className="flex items-start gap-3">
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                        latest ? "bg-signal" : "bg-faint"
                      }`}
                      aria-hidden
                    />
                    <span className="text-sm text-dim">{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        );
      })}
    </div>
  );
}
