"use client";

/**
 * Station analytics — /my/admin/analytics
 *
 * Operator-facing dashboard rolled up from points_history (27k+ rows of
 * real engagement), dj_drops, record_pool_*, and auth.users signup data.
 * Distinct from /my/admin/streaming-analytics which still fronts the
 * unfilled Centova stream-log tables.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Calendar,
  Disc3,
  Download,
  Headphones,
  Loader2,
  RefreshCw,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// Each counter is number when the data model can supply it under the browser's
// RLS, or null when it can't (rendered as "—" rather than a fabricated 0).
interface Overview {
  events_24h: number | null;
  events_7d: number | null;
  events_30d: number | null;
  dau: number | null;
  wau: number | null;
  mau: number | null;
  total_signups: number | null;
  signups_7d: number | null;
  points_awarded_7d: number | null;
  drops_uploaded_7d: number | null;
  slots_unassigned: number | null;
  pool_tracks_approved: number | null;
  pool_tracks_pending: number | null;
  pool_downloads_7d: number | null;
}

interface EngagementDay {
  day: string;
  events: number;
  active_users: number;
  points_awarded: number;
}

interface EngagementReason {
  reason: string;
  events: number;
  users: number;
  points: number;
  first_seen: string;
  last_seen: string;
}

interface SignupWeek {
  week: string;
  signups: number;
}

interface DjActivity {
  week: string;
  dj_id: string;
  display_name: string;
  slug: string;
  drops_count: number;
  total_bytes: number | null;
}

interface PoolActivityWeek {
  week: string;
  uploads: number;
  uploads_approved: number;
  downloads: number;
  distinct_downloaders: number;
}

interface Digest {
  weekOf: string;
  nextWeekOf: string;
  engagement: {
    totalEvents: number;
    activeUsers: number;
    byReason: Record<string, { events: number; points: number }>;
  };
  signups: number;
  djPortal: { dropsUploaded: number; uniqueDjs: number; uniqueCodes: number };
  recordPool: { uploads: number; approved: number; downloads: number };
  eas: { events: number; received: number; originated: number; tests: number };
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [daily, setDaily] = useState<EngagementDay[]>([]);
  const [byReason, setByReason] = useState<EngagementReason[]>([]);
  const [signups, setSignups] = useState<SignupWeek[]>([]);
  const [djs, setDjs] = useState<DjActivity[]>([]);
  const [pool, setPool] = useState<PoolActivityWeek[]>([]);
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Truthful per-section notes when the data model can't supply a metric to
  // the browser (RLS on the underlying tables). We never fabricate a value.
  const [notices, setNotices] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // The analytics_* views run with security_invoker=on, so the browser's
      // RLS on the BASE tables applies. points_history / record_pool_* only
      // expose the caller's own rows, and auth.users isn't granted to the anon
      // key at all — so station-wide engagement, signups, and pool aggregates
      // can't be computed client-side. We fetch what's genuinely available
      // (DJ activity, plus slot/drop counts from world/admin-readable tables)
      // and mark the rest "Not available" rather than show a fake 0.
      const nextNotices: string[] = [];

      // DJ activity leaderboard — backed by djs (public) + dj_drops (admin
      // read-all). Open slots + 7-day drops come from world/admin-readable
      // tables. Everything else is per-user RLS or auth.users (unavailable).
      const [djAct, slotsRes, drops7dRes] = await Promise.all([
        supabase
          .from("analytics_dj_activity_weekly")
          .select("week,dj_id,display_name,slug,drops_count,total_bytes")
          .order("week", { ascending: false }),
        supabase.from("dj_slots").select("id", { count: "exact", head: true }).is("dj_id", null),
        supabase
          .from("dj_drops")
          .select("id", { count: "exact", head: true })
          .gte("uploaded_at", new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()),
      ]);

      if (djAct.error) {
        nextNotices.push(`DJ activity: ${djAct.error.message}`);
        setDjs([]);
      } else {
        setDjs((djAct.data ?? []) as DjActivity[]);
      }

      setOverview({
        // Engagement + active-user counters come from points_history, which
        // RLS restricts to the caller's own rows — not a station-wide total.
        events_24h: null,
        events_7d: null,
        events_30d: null,
        dau: null,
        wau: null,
        mau: null,
        // auth.users is not readable with the anon key.
        total_signups: null,
        signups_7d: null,
        points_awarded_7d: null,
        // dj_drops: admins read all; reliable for this role-gated page.
        drops_uploaded_7d: drops7dRes.error ? null : drops7dRes.count ?? 0,
        // dj_slots is world-readable; always correct.
        slots_unassigned: slotsRes.error ? null : slotsRes.count ?? 0,
        // record_pool_* are per-user RLS; no station-wide total client-side.
        pool_tracks_approved: null,
        pool_tracks_pending: null,
        pool_downloads_7d: null,
      });

      // Engagement (daily + by reason), signups and pool activity: views
      // resolve to the caller's own rows only (or hit auth.users), so they're
      // not station-wide. Leave the series empty and note why instead of
      // charting a misleading partial.
      setDaily([]);
      setByReason([]);
      setPool([]);
      setSignups([]);
      nextNotices.push(
        "Station-wide engagement, signups, points and record-pool aggregates aren't available from the browser: the analytics views read per-user-restricted tables (points_history, record_pool_*) and auth.users, which RLS does not expose to the app. These need a service-role rollup. DJ activity, open slots and 7-day drops below are live.",
      );

      // Weekly digest had no backing view (it was assembled by the now-dead
      // API). Don't fabricate it.
      setDigest(null);

      setNotices(nextNotices);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const maxDailyEvents = Math.max(1, ...daily.map((d) => d.events));
  const maxReasonEvents = Math.max(1, ...byReason.map((r) => r.events));
  const maxSignups = Math.max(1, ...signups.map((s) => s.signups));

  // Roll DJ activity into a per-DJ leaderboard for the 4-week window.
  const djLeaderboard = useDjLeaderboard(djs);

  return (
    <div className="space-y-8 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Operations
          </p>
          <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
            Station analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Engagement, signups, DJ activity, record-pool usage. Pulled fresh on each load.
          </p>
        </div>
        <Button onClick={load} variant="outline" size="sm" className="rounded-full">
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Refresh
        </Button>
      </header>

      {error && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {notices.length > 0 && (
        <div className="space-y-2">
          {notices.map((n, i) => (
            <div
              key={i}
              className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200"
            >
              {n}
            </div>
          ))}
        </div>
      )}

      {loading && !overview ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : !overview ? null : (
        <>
          {/* ── Counters ──────────────────────────────────────────────── */}
          <section>
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Right now
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Counter label="DAU"            value={overview.dau}                  icon={Users}      tone="mint" />
              <Counter label="WAU"            value={overview.wau}                  icon={Users}      tone="mint" />
              <Counter label="MAU"            value={overview.mau}                  icon={Users}      tone="mint" />
              <Counter label="Signups (7d)"   value={overview.signups_7d}           icon={Sparkles}   tone="purple" />
              <Counter label="Events (24h)"   value={overview.events_24h}           icon={Activity}   tone="cyan" />
              <Counter label="Events (7d)"    value={overview.events_7d}            icon={Activity}   tone="cyan" />
              <Counter label="Points (7d)"    value={overview.points_awarded_7d}    icon={Zap}        tone="amber" />
              <Counter label="Drops (7d)"     value={overview.drops_uploaded_7d}    icon={Disc3}      tone="purple" />
              <Counter label="Slots open"     value={overview.slots_unassigned}     icon={Calendar}   tone="muted" link="/my/admin/dj-slots" />
              <Counter label="Pool approved"  value={overview.pool_tracks_approved} icon={Headphones} tone="mint" />
              <Counter label="Pool pending"   value={overview.pool_tracks_pending}  icon={Headphones} tone="amber" link="/my/admin/pool" />
              <Counter label="Pool DLs (7d)"  value={overview.pool_downloads_7d}    icon={Download}   tone="cyan" />
            </div>
          </section>

          {/* ── Daily engagement bar chart ────────────────────────────── */}
          <section>
            <header className="mb-3 flex items-end justify-between">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Engagement events / day
              </h2>
              <p className="text-xs text-muted-foreground">last 30 days, ET</p>
            </header>
            {daily.length === 0 ? (
              <p className="text-sm text-muted-foreground">No engagement events yet.</p>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex h-44 items-end gap-1">
                  {[...daily].reverse().map((d) => {
                    const h = Math.max(2, (d.events / maxDailyEvents) * 100);
                    return (
                      <div
                        key={d.day}
                        className="group relative flex-1"
                        title={`${d.day} · ${d.events} events · ${d.active_users} users · ${d.points_awarded ?? 0} pts`}
                      >
                        <div
                          className="w-full rounded-t bg-[#74ddc7] transition-all group-hover:bg-[#74ddc7]/80"
                          style={{ height: `${h}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                  <span>{daily[daily.length - 1]?.day ?? ""}</span>
                  <span>{daily[0]?.day ?? ""}</span>
                </div>
              </div>
            )}
          </section>

          {/* ── Engagement by reason ──────────────────────────────────── */}
          <section>
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              How users earn (last 90 days)
            </h2>
            {byReason.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data.</p>
            ) : (
              <div className="space-y-2">
                {byReason.map((r) => {
                  const pct = (r.events / maxReasonEvents) * 100;
                  return (
                    <article key={r.reason} className="rounded-xl border border-border bg-card p-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-mono text-sm font-bold">{r.reason}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.events.toLocaleString()} events · {r.users} user{r.users === 1 ? "" : "s"} · {r.points.toLocaleString()} pts
                        </p>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-[#74ddc7]" style={{ width: `${pct}%` }} />
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Signups weekly bar chart ──────────────────────────────── */}
          <section>
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              New signups / week
            </h2>
            {signups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No signups in window.</p>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex h-32 items-end gap-2">
                  {[...signups].reverse().map((s) => {
                    const h = Math.max(4, (s.signups / maxSignups) * 100);
                    return (
                      <div key={s.week} className="group relative flex-1" title={`${s.week} · ${s.signups} signups`}>
                        <div className="w-full rounded-t bg-[#7401df]" style={{ height: `${h}%` }} />
                        <p className="mt-1 text-center text-[9px] text-muted-foreground">
                          {s.week.slice(5)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* ── DJ leaderboard ────────────────────────────────────────── */}
          <section>
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              DJ drops — last 4 weeks
            </h2>
            {djLeaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground">No drop uploads yet. Once DJs start uploading, this will fill up.</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-card/60 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">DJ</th>
                      <th className="px-4 py-3 text-right">Drops (4w)</th>
                      <th className="px-4 py-3 text-right">Total upload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {djLeaderboard.slice(0, 25).map((row, i) => (
                      <tr key={row.slug} className="border-t border-border">
                        <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-2">
                          <Link href={`/djs/${row.slug}`} className="font-medium hover:text-[#74ddc7]">
                            {row.display_name}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-right font-bold">{row.drops}</td>
                        <td className="px-4 py-2 text-right text-muted-foreground">
                          {row.bytes > 0 ? fmtBytes(row.bytes) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Pool activity table ───────────────────────────────────── */}
          <section>
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Record pool — weekly activity
            </h2>
            {pool.length === 0 ? (
              <p className="text-sm text-muted-foreground">No record-pool activity yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-card/60 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">Week</th>
                      <th className="px-4 py-3 text-right">Uploads</th>
                      <th className="px-4 py-3 text-right">Approved</th>
                      <th className="px-4 py-3 text-right">Downloads</th>
                      <th className="px-4 py-3 text-right">Downloaders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pool.map((w) => (
                      <tr key={w.week} className="border-t border-border">
                        <td className="px-4 py-2 font-mono text-xs">{w.week}</td>
                        <td className="px-4 py-2 text-right font-bold">{w.uploads}</td>
                        <td className="px-4 py-2 text-right text-muted-foreground">{w.uploads_approved}</td>
                        <td className="px-4 py-2 text-right font-bold">{w.downloads}</td>
                        <td className="px-4 py-2 text-right text-muted-foreground">{w.distinct_downloaders}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Weekly digest preview ─────────────────────────────────── */}
          {digest && <DigestCard digest={digest} />}
        </>
      )}
    </div>
  );
}

function Counter({ label, value, icon: Icon, tone, link }: {
  label: string;
  value: number | null | undefined;
  icon: React.ComponentType<{ className?: string }>;
  tone: "mint" | "purple" | "cyan" | "amber" | "muted";
  link?: string;
}) {
  const toneClass = {
    mint: "text-[#74ddc7]",
    purple: "text-[#7401df]",
    cyan: "text-[#3b82f6]",
    amber: "text-amber-400",
    muted: "text-muted-foreground",
  }[tone];
  // null / undefined means the data model can't supply this metric to the
  // browser — show an em-dash, never a fabricated 0.
  const unavailable = value === null || value === undefined;
  const content = (
    <article className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <Icon className={`h-3 w-3 ${unavailable ? "text-muted-foreground" : toneClass}`} />
      </div>
      {unavailable ? (
        <p className="mt-1 text-2xl font-black text-muted-foreground" title="Not available — requires a service-role rollup">—</p>
      ) : (
        <p className={`mt-1 text-2xl font-black ${toneClass}`}>{value.toLocaleString()}</p>
      )}
    </article>
  );
  return link ? <Link href={link} className="block transition-opacity hover:opacity-80">{content}</Link> : content;
}

function DigestCard({ digest }: { digest: Digest }) {
  const totalReasons = Object.keys(digest.engagement.byReason).length;
  return (
    <section className="rounded-2xl border border-[#74ddc7]/30 bg-gradient-to-br from-[#74ddc7]/5 via-card to-card p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#74ddc7]">
            Weekly digest
          </p>
          <h2 className="text-xl font-black tracking-tight">
            Week of {digest.weekOf}
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">→ {digest.nextWeekOf}</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DigestStat label="Engagement events" value={digest.engagement.totalEvents} />
        <DigestStat label="Active users" value={digest.engagement.activeUsers} />
        <DigestStat label="Signups" value={digest.signups} />
        <DigestStat label="Reasons triggered" value={totalReasons} />
        <DigestStat label="DJ drops" value={digest.djPortal.dropsUploaded} sub={`${digest.djPortal.uniqueDjs} DJ${digest.djPortal.uniqueDjs === 1 ? "" : "s"}`} />
        <DigestStat label="Pool uploads" value={digest.recordPool.uploads} sub={`${digest.recordPool.approved} approved`} />
        <DigestStat label="Pool downloads" value={digest.recordPool.downloads} />
        <DigestStat label="EAS events" value={digest.eas.events} sub={`${digest.eas.tests} test · ${digest.eas.received} received · ${digest.eas.originated} originated`} />
      </div>
    </section>
  );
}

function DigestStat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-2xl font-black tracking-tight">{value.toLocaleString()}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

interface LeaderboardRow {
  slug: string;
  display_name: string;
  drops: number;
  bytes: number;
}

function useDjLeaderboard(rows: DjActivity[]): LeaderboardRow[] {
  const by = new Map<string, LeaderboardRow>();
  for (const r of rows) {
    const cur = by.get(r.slug) ?? { slug: r.slug, display_name: r.display_name, drops: 0, bytes: 0 };
    cur.drops += r.drops_count || 0;
    cur.bytes += Number(r.total_bytes) || 0;
    by.set(r.slug, cur);
  }
  return Array.from(by.values()).sort((a, b) => b.drops - a.drops || b.bytes - a.bytes);
}

function fmtBytes(n: number): string {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
