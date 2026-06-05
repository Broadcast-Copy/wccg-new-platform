"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoles } from "@/hooks/use-user-roles";
import { createClient } from "@/lib/supabase/client";
import { Star, Clock, Headphones, Settings, Pencil, Loader2, ShieldCheck, ExternalLink } from "lucide-react";

interface ProfileRow {
  display_name: string | null;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
  user_type: string | null;
  created_at: string | null;
  username: string | null;
}

function fmtHours(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function MyProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { roles, isRealAdmin } = useUserRoles();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [listenSecs, setListenSecs] = useState<number>(0);
  const [sessions, setSessions] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let active = true;
    const supabase = createClient();
    async function load() {
      const [p, pts, sess] = await Promise.all([
        supabase.from("profiles").select("display_name, avatar_url, first_name, last_name, user_type, created_at, username").eq("id", user!.id).maybeSingle(),
        supabase.from("user_points").select("balance").eq("user_id", user!.id).maybeSingle(),
        supabase.from("listening_sessions").select("duration_secs", { count: "exact" }).eq("user_id", user!.id),
      ]);
      if (!active) return;
      setProfile((p.data as ProfileRow) ?? null);
      setBalance(Number(pts.data?.balance ?? 0));
      const rows = (sess.data as { duration_secs: number | null }[] | null) ?? [];
      setListenSecs(rows.reduce((sum, r) => sum + (r.duration_secs ?? 0), 0));
      setSessions(sess.count ?? rows.length);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Please sign in to view your profile.</p>
        <Link href="/login" className="mt-3 inline-block rounded-full bg-[#74ddc7] px-4 py-2 text-sm font-bold text-[#0a0a0f]">Sign in</Link>
      </div>
    );
  }

  const name = profile?.display_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || user.email?.split("@")[0] || "Listener";
  const initials = name.slice(0, 2).toUpperCase();
  const memberSince = profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : null;
  const roleLabels = Array.from(new Set(roles.map((r) => r.replace("_", " ")))).filter((r) => r !== "listener");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {/* Header card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-[#74ddc7]/10 via-card to-[#7401df]/10">
        <div className="flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:items-center sm:text-left">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-gradient-to-br from-[#74ddc7]/30 to-[#7401df]/30">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-foreground/80">{initials}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#14b8a6]/10 px-2.5 py-0.5 text-xs font-medium text-[#14b8a6]">
                <Headphones className="h-3 w-3" /> Listener
              </span>
              {roleLabels.map((r) => (
                <span key={r} className="inline-flex items-center gap-1 rounded-full bg-[#7401df]/10 px-2.5 py-0.5 text-xs font-medium capitalize text-[#7401df]">{r}</span>
              ))}
              {isRealAdmin && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400"><ShieldCheck className="h-3 w-3" /> Admin</span>
              )}
            </div>
            {memberSince && <p className="mt-1 text-xs text-muted-foreground/70">Member since {memberSince}</p>}
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <Link href="/my/settings" className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium transition hover:border-[#74ddc7]/50">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Link>
            {profile?.username && (
              <Link href={`/u/${profile.username}`} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#74ddc7] px-4 py-2 text-sm font-bold text-[#0a0a0f] transition hover:bg-[#74ddc7]/90">
                <ExternalLink className="h-3.5 w-3.5" /> Public profile
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { icon: Star, label: "Points", value: balance.toLocaleString(), color: "#f59e0b", href: "/my/points" },
          { icon: Clock, label: "Listening time", value: fmtHours(listenSecs), color: "#74ddc7", href: "/my/history" },
          { icon: Headphones, label: "Sessions", value: sessions.toLocaleString(), color: "#7401df", href: "/my/history" },
        ].map((s) => (
          <Link key={s.label} href={s.href} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 transition hover:border-[#74ddc7]/40">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${s.color}1a`, color: s.color }}>
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Favorites", href: "/my/favorites" },
          { label: "My Tickets", href: "/my/tickets" },
          { label: "My Orders", href: "/my/orders" },
          { label: "Settings", href: "/my/settings", icon: Settings },
        ].map((l) => (
          <Link key={l.label} href={l.href} className="rounded-xl border border-border bg-card px-4 py-3 text-center text-sm font-medium transition hover:border-[#74ddc7]/40">
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
