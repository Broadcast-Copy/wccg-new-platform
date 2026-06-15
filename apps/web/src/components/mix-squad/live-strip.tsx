"use client";

/**
 * MixSquadLiveStrip — the dynamic part of the Mix Squad hero.
 *
 * Reads the live weekly schedule (dj_slots → djs, status='active') Supabase-direct
 * and shows, in America/New_York time: who's ON AIR NOW, who's UP NEXT, and the
 * full THIS-WEEK lineup (avatars). No API server; setState only in the async
 * callback behind an `active` guard.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Radio, Clock, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Slot {
  day_of_week: number;
  start_time: string;
  end_time: string;
  dj: { display_name: string | null; slug: string | null; user_id: string | null } | null;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
function fmtClock(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const am = h < 12;
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}${m ? ":" + String(m).padStart(2, "0") : ""}${am ? "am" : "pm"}`;
}
function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}
function hue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}
/** Current day (0=Sun) + minute-of-day in America/New_York. */
function etNow(): { day: number; min: number } {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  return { day: d.getDay(), min: d.getHours() * 60 + d.getMinutes() };
}

function Avatar({ name, slug, url, size = 40 }: { name: string; slug: string | null; url: string | null; size?: number }) {
  const h = hue(slug || name);
  const inner = url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name} className="h-full w-full object-cover" />
  ) : (
    <span className="font-bold text-white" style={{ fontSize: size * 0.34 }}>{initials(name)}</span>
  );
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-white/20"
      style={{
        height: size, width: size,
        background: `linear-gradient(135deg, hsl(${h} 70% 55%), hsl(${(h + 50) % 360} 70% 45%))`,
      }}
    >
      {inner}
    </span>
  );
}

export function MixSquadLiveStrip() {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [avatars, setAvatars] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let active = true;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("dj_slots")
        .select("day_of_week, start_time, end_time, dj:djs ( display_name, slug, user_id )")
        .eq("status", "active")
        .order("day_of_week")
        .order("start_time");
      if (!active) return;
      const rows = ((data ?? []) as unknown as Slot[]).filter((s) => s.dj?.slug && s.dj.slug !== "dj-admin");
      const uids = [...new Set(rows.map((s) => s.dj?.user_id).filter(Boolean) as string[])];
      let amap = new Map<string, string>();
      if (uids.length) {
        const { data: profs } = await supabase
          .from("profiles_public")
          .select("id, avatar_url")
          .in("id", uids);
        amap = new Map(
          (profs ?? [])
            .filter((p: { avatar_url: string | null }) => p.avatar_url)
            .map((p: { id: string; avatar_url: string }) => [p.id, p.avatar_url]),
        );
      }
      if (!active) return;
      setSlots(rows);
      setAvatars(amap);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (slots === null) {
    return (
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[88px] animate-pulse rounded-xl border border-white/10 bg-white/5" />
        ))}
      </div>
    );
  }

  const now = etNow();
  const avatarOf = (s: Slot | null) => (s?.dj?.user_id ? avatars.get(s.dj.user_id) ?? null : null);

  // On air now: a slot on today's weekday whose [start,end) covers now (handles cross-midnight).
  const onAir = slots.find((s) => {
    if (s.day_of_week !== now.day) return false;
    const a = toMin(s.start_time), b = toMin(s.end_time);
    return b > a ? now.min >= a && now.min < b : now.min >= a || now.min < b;
  }) ?? null;

  // Up next: soonest slot to START, wrapping the week.
  const upNext =
    [...slots]
      .map((s) => {
        let delta = (s.day_of_week - now.day) * 1440 + toMin(s.start_time) - now.min;
        if (delta <= 0) delta += 7 * 1440;
        return { s, delta };
      })
      .sort((x, y) => x.delta - y.delta)[0]?.s ?? null;

  // This week's lineup: distinct DJs (by slug), in schedule order.
  const seen = new Set<string>();
  const lineup = slots.filter((s) => {
    const slug = s.dj?.slug;
    if (!slug || seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-3">
      {/* ON AIR NOW */}
      <div className="rounded-xl border border-[#74ddc7]/30 bg-[#74ddc7]/[0.08] px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {onAir && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#74ddc7] opacity-75" />}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${onAir ? "bg-[#74ddc7]" : "bg-white/40"}`} />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#74ddc7]">On Air Now</span>
        </div>
        {onAir ? (
          <Link href={`/djs/${onAir.dj!.slug}`} className="group mt-2 flex items-center gap-3">
            <Avatar name={onAir.dj!.display_name ?? "DJ"} slug={onAir.dj!.slug} url={avatarOf(onAir)} />
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-white group-hover:text-[#74ddc7]">{onAir.dj!.display_name}</p>
              <p className="text-xs text-white/60">live until {fmtClock(onAir.end_time)}</p>
            </div>
          </Link>
        ) : (
          <div className="mt-2 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-2 ring-white/20">
              <Radio className="h-5 w-5 text-[#74ddc7]" />
            </span>
            <div>
              <p className="text-base font-bold text-white">MixxSquadd Radio</p>
              <p className="text-xs text-white/60">non-stop mix rotation</p>
            </div>
          </div>
        )}
      </div>

      {/* UP NEXT */}
      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-[#7401df]" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-white/70">Up Next</span>
        </div>
        {upNext ? (
          <Link href={`/djs/${upNext.dj!.slug}`} className="group mt-2 flex items-center gap-3">
            <Avatar name={upNext.dj!.display_name ?? "DJ"} slug={upNext.dj!.slug} url={avatarOf(upNext)} />
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-white group-hover:text-[#74ddc7]">{upNext.dj!.display_name}</p>
              <p className="text-xs text-white/60">
                {now.day === upNext.day_of_week ? "today" : DAYS[upNext.day_of_week]} · {fmtClock(upNext.start_time)}
              </p>
            </div>
          </Link>
        ) : (
          <p className="mt-2 text-sm text-white/50">Schedule coming soon</p>
        )}
      </div>

      {/* THIS WEEK lineup */}
      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-[#ec4899]" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-white/70">This Week</span>
          <span className="ml-auto text-sm font-bold text-white">{lineup.length} DJs</span>
        </div>
        <div className="mt-2.5 flex items-center">
          {lineup.slice(0, 8).map((s, i) => (
            <Link
              key={s.dj!.slug}
              href={`/djs/${s.dj!.slug}`}
              title={s.dj!.display_name ?? undefined}
              className="-ml-2 transition-transform hover:z-10 hover:-translate-y-0.5 first:ml-0"
              style={{ zIndex: 8 - i }}
            >
              <Avatar name={s.dj!.display_name ?? "DJ"} slug={s.dj!.slug} url={avatarOf(s)} size={32} />
            </Link>
          ))}
          {lineup.length > 8 && (
            <span className="-ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-[11px] font-bold text-white ring-2 ring-white/20">
              +{lineup.length - 8}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
