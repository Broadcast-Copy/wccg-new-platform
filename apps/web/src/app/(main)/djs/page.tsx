"use client";

/**
 * /djs — index of all active WCCG DJs. Click through to /djs/[slug].
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Headphones, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface AdminListItem {
  id: string;
  slug: string;
  display_name: string;
  is_active: boolean;
  email: string | null;
  phone: string | null;
  slots: Array<{ id: string; day_of_week: number; start_time: string }>;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DjsIndexPage() {
  const [djs, setDjs] = useState<AdminListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient<AdminListItem[]>("/djs/admin/all")
      .then((rs) => {
        setDjs((rs ?? []).filter((d) => d.is_active));
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 py-8">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#74ddc7]">
          WCCG 104.5 FM
        </p>
        <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
          DJs
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The full WCCG rotation. Click any DJ to hear their archive.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {djs.map((dj) => (
            <Link
              key={dj.id}
              href={`/djs/${dj.slug}`}
              className="group rounded-2xl border border-border bg-card px-5 py-4 transition-colors hover:border-[#74ddc7]/60 hover:bg-[#74ddc7]/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold tracking-tight text-foreground group-hover:text-[#74ddc7]">
                    {dj.display_name}
                  </h2>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {dj.slots.length} {dj.slots.length === 1 ? "slot" : "slots"}/wk
                  </p>
                </div>
                <Headphones className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-[#74ddc7]" />
              </div>
              {dj.slots.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {dj.slots.slice(0, 5).map((s) => (
                    <span
                      key={s.id}
                      className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {DAYS[s.day_of_week]} {fmt12h(s.start_time)}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function fmt12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const ampm = h >= 12 ? "p" : "a";
  const display = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${display}${ampm}` : `${display}:${String(m).padStart(2, "0")}${ampm}`;
}
