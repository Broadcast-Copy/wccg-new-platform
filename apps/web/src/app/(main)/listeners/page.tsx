"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import { HubFeed } from "@/components/social/hub-feed";
import {
  Headphones,
  Users,
  Star,
  Music,
  Radio,
  ListMusic,
  Gift,
  Trophy,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Features grid data
// ---------------------------------------------------------------------------
const features = [
  {
    icon: Star,
    title: "Listener Points",
    description: "Earn points for listening, sharing, and engaging with WCCG content.",
    href: "/my/points",
  },
  {
    icon: Music,
    title: "Song Requests",
    description: "Request your favorite songs and hear them on air.",
    href: "/discover",
  },
  {
    icon: ListMusic,
    title: "Playlists",
    description: "Browse curated playlists and discover new music across all channels.",
    href: "/channels",
  },
  {
    icon: Gift,
    title: "Birthday Club",
    description: "Join the birthday club for special shoutouts and rewards on your day.",
    href: "/rewards",
  },
  {
    icon: Trophy,
    title: "Contests",
    description: "Enter contests and giveaways for prizes, tickets, and exclusive access.",
    href: "/rewards",
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ListenersPage() {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [isMember, setIsMember] = useState(false);
  const [memberLoading, setMemberLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const [stats, setStats] = useState({
    listeners: 0,
    points: 0,
    requests: 0,
  });

  useEffect(() => {
    if (!user) { setMemberLoading(false); return; }
    supabase.from('hub_memberships').select('id').eq('user_id', user.id).eq('hub_type', 'listener').single()
      .then(({ data }) => { setIsMember(!!data); setMemberLoading(false); });
  }, [user, supabase]);

  async function handleJoin() {
    if (!user) return;
    setJoining(true);
    await supabase.from('hub_memberships').insert({ user_id: user.id, hub_type: 'listener' });
    setIsMember(true);
    setJoining(false);
  }

  async function handleLeave() {
    if (!user || !confirm("Leave the Listener Hub?")) return;
    await supabase.from('hub_memberships').delete().eq('user_id', user.id).eq('hub_type', 'listener');
    setIsMember(false);
  }

  useEffect(() => {
    async function loadStats() {
      const [listenersRes, pointsRes, requestsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("points_ledger")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("song_requests")
          .select("id", { count: "exact", head: true }),
      ]);

      setStats({
        listeners: listenersRes.count ?? 0,
        points: pointsRes.count ?? 0,
        requests: requestsRes.count ?? 0,
      });
    }

    loadStats();
  }, [supabase]);

  return (
    <div className="space-y-8">
      {memberLoading ? null : !isMember ? (
        <>
          {/* ---- Hero ---- */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#74ddc7] to-[#14b8a6]">
            <div className="relative px-6 py-10 sm:px-10 sm:py-14">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black/10 backdrop-blur-sm shadow-xl">
                  <Headphones className="h-7 w-7 text-gray-900" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Listener Hub</h1>
                  <p className="text-gray-900/60 mt-1">
                    A network for listeners — connect, discover, and earn rewards
                  </p>
                </div>
              </div>
              {user && (
                <button onClick={handleJoin} disabled={joining} className="mt-4 rounded-full bg-gray-900 text-white px-6 py-2 text-sm font-bold hover:bg-gray-900/90 transition-colors disabled:opacity-50">
                  {joining ? "Joining..." : "Join the Hub"}
                </button>
              )}
            </div>
          </div>

          {/* ---- Stats bar ---- */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Listeners", value: stats.listeners, icon: Users },
              { label: "Points Earned", value: stats.points, icon: Star },
              { label: "Songs Requested", value: stats.requests, icon: Radio },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-border bg-card p-4 flex items-center gap-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#14b8a6]/10">
                  <s.icon className="h-5 w-5 text-[#14b8a6]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ---- Features grid ---- */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Listener Perks
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <Link
                  key={f.title}
                  href={f.href}
                  className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-input"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#14b8a6]/10 mb-3">
                    <f.icon className="h-5 w-5 text-[#14b8a6]" />
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">
                        {f.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {f.description}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 mt-1 shrink-0 text-foreground/20 group-hover:text-[#14b8a6] transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Member header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#14b8a6]/10">
                <Headphones className="h-5 w-5 text-[#14b8a6]" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Listener Hub</h1>
                <span className="text-xs text-[#14b8a6] font-medium">Member</span>
              </div>
            </div>
            <button onClick={handleLeave} className="text-xs text-muted-foreground hover:text-red-400 transition-colors">
              Leave Hub
            </button>
          </div>
          {/* Quick tools */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { href: "/my/points", label: "Points", icon: Star },
              { href: "/requests", label: "Song Requests", icon: Music },
              { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
              { href: "/my/playlists", label: "Playlists", icon: ListMusic },
            ].map((t) => (
              <Link key={t.href} href={t.href} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2.5 text-xs font-medium hover:border-[#14b8a6]/40 transition-colors">
                <t.icon className="h-3.5 w-3.5 text-[#14b8a6]" />
                {t.label}
              </Link>
            ))}
          </div>
        </>
      )}

      {/* ---- Social Feed ---- */}
      <HubFeed
        hubType="listener"
        accentColor="#14b8a6"
        placeholder="Share what you're listening to, a review, or shoutout..."
        postTypes={[
          { value: "now-playing", label: "Now Playing" },
          { value: "review", label: "Review" },
          { value: "shoutout", label: "Shoutout" },
          { value: "milestone", label: "Milestone" },
        ]}
      />
    </div>
  );
}
