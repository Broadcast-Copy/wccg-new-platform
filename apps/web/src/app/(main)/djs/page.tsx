"use client";

/**
 * /djs — index of all active WCCG DJs (Supabase-direct, no API server).
 *
 * Each card links to the DJ's listening archive (/djs/[slug]) and, when the DJ
 * has a linked member account, to their public social profile (/u/[username]).
 * This is a primary way to discover the public profiles of WCCG's people.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Headphones, Loader2, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface DjSlotLite {
  id: string;
  day_of_week: number;
  start_time: string;
}

interface DjCard {
  id: string;
  slug: string;
  display_name: string;
  username: string | null;
  slots: DjSlotLite[];
}

/** Raw row from `djs` with embedded `dj_slots`. */
interface DjQueryRow {
  id: string;
  slug: string;
  display_name: string;
  user_id: string | null;
  dj_slots: { id: string; day_of_week: number; start_time: string }[] | null;
}

export default function DjsIndexPage() {
  const [djs, setDjs] = useState<DjCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load the active roster + each DJ's public handle once. All setState happens
  // after the awaits, behind an `active` guard (no setState in the effect body).
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const supabase = createClient();
        const { data, error: qErr } = await supabase
          .from("djs")
          .select("id, slug, display_name, user_id, dj_slots(id, day_of_week, start_time)")
          .eq("is_active", true)
          .order("display_name", { ascending: true });
        if (qErr) throw new Error(qErr.message);

        const rows = (data ?? []) as unknown as DjQueryRow[];

        // Resolve usernames for DJs with a linked account → link /u/<handle>.
        const userIds = rows.map((r) => r.user_id).filter((v): v is string => !!v);
        const usernameById = new Map<string, string>();
        if (userIds.length) {
          const { data: profs } = await supabase
            .from("profiles_public")
            .select("id, username")
            .in("id", userIds);
          for (const p of (profs ?? []) as { id: string; username: string | null }[]) {
            if (p.username) usernameById.set(p.id, p.username);
          }
        }

        const cards: DjCard[] = rows.map((r) => ({
          id: r.id,
          slug: r.slug,
          display_name: r.display_name,
          username: r.user_id ? usernameById.get(r.user_id) ?? null : null,
          slots: (r.dj_slots ?? [])
            .slice()
            .sort(
              (a, b) =>
                a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time),
            ),
        }));

        if (!active) return;
        setDjs(cards);
        setError(null);
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
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
          The full WCCG rotation. Tap a DJ to hear their archive or view their profile.
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
      ) : djs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active DJs yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {djs.map((dj) => (
            <div
              key={dj.id}
              className="group rounded-2xl border border-border bg-card px-5 py-4 transition-colors hover:border-[#74ddc7]/60 hover:bg-[#74ddc7]/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/djs/${dj.slug}`}
                    className="font-bold tracking-tight text-foreground transition-colors group-hover:text-[#74ddc7]"
                  >
                    {dj.display_name}
                  </Link>
                  {dj.username && (
                    <Link
                      href={`/u/${dj.username}`}
                      className="mt-0.5 block w-fit text-xs text-muted-foreground transition-colors hover:text-[#7401df]"
                    >
                      @{dj.username}
                    </Link>
                  )}
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {dj.slots.length} {dj.slots.length === 1 ? "slot" : "slots"}/wk
                  </p>
                </div>
                <Headphones className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-[#74ddc7]" />
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

              {/* Direct access: listening archive + public social profile */}
              <div className="mt-4 flex items-center gap-2">
                <Link
                  href={`/djs/${dj.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#74ddc7]/10 px-3 py-1 text-xs font-semibold text-[#0f9e88] transition-colors hover:bg-[#74ddc7]/20 dark:text-[#74ddc7]"
                >
                  <Headphones className="h-3.5 w-3.5" /> Listen
                </Link>
                {dj.username && (
                  <Link
                    href={`/u/${dj.username}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#7401df]/10 px-3 py-1 text-xs font-semibold text-[#7401df] transition-colors hover:bg-[#7401df]/20 dark:text-[#b98cff]"
                  >
                    <UserRound className="h-3.5 w-3.5" /> Profile
                  </Link>
                )}
              </div>
            </div>
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
