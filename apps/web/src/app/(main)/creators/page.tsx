"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import { HubFeed } from "@/components/social/hub-feed";
import { HubSidebar } from "@/components/social/hub-sidebar";
import { HubRail } from "@/components/social/hub-rail";
import {
  Music,
  Podcast,
  Video,
  Mic,
  Palette,
  TrendingUp,
  ArrowRight,
  Users,
  FolderOpen,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Features grid data
// ---------------------------------------------------------------------------
const features = [
  {
    icon: Music,
    title: "Music Submission",
    description:
      "Submit your tracks directly to our programming team for airplay consideration across all 6 channels.",
    href: "/creators/upload-music",
  },
  {
    icon: Podcast,
    title: "Podcast Hosting",
    description:
      "Launch your podcast on the mY1045 platform with distribution, analytics, and promotion support.",
    href: "/creators/podcast",
  },
  {
    icon: Video,
    title: "Video Content",
    description:
      "Create and share video content through our YouTube channels and digital platforms.",
    href: "/studio/video-editor",
  },
  {
    icon: Mic,
    title: "On-Air Features",
    description:
      "Get featured on live shows through interviews, live performances, and artist spotlights.",
    href: "/shows",
  },
  {
    icon: Palette,
    title: "Brand Building",
    description:
      "Leverage our audience and platforms to build your personal brand and grow your following.",
    href: "/my/blog",
  },
  {
    icon: TrendingUp,
    title: "Analytics & Growth",
    description:
      "Track your content performance with detailed analytics on plays, engagement, and audience growth.",
    href: "/my",
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function CreatorsPage() {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [isMember, setIsMember] = useState(false);
  const [memberLoading, setMemberLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const [stats, setStats] = useState({ creators: 0, projects: 0, thisWeek: 0 });

  useEffect(() => {
    let active = true;
    async function checkMembership(): Promise<boolean> {
      if (!user) return false;
      const { data } = await supabase
        .from('hub_memberships')
        .select('id')
        .eq('user_id', user.id)
        .eq('hub_type', 'creator')
        .single();
      return !!data;
    }
    checkMembership().then((member) => {
      if (!active) return;
      setIsMember(member);
      setMemberLoading(false);
    });
    return () => { active = false; };
  }, [user, supabase]);

  async function handleJoin() {
    if (!user) return;
    setJoining(true);
    await supabase.from('hub_memberships').insert({ user_id: user.id, hub_type: 'creator' });
    setIsMember(true);
    setJoining(false);
  }

  async function handleLeave() {
    if (!user || !confirm("Leave the Creator Hub?")) return;
    await supabase.from('hub_memberships').delete().eq('user_id', user.id).eq('hub_type', 'creator');
    setIsMember(false);
  }

  useEffect(() => {
    async function loadStats() {
      const [creatorsRes, projectsRes, weekRes] = await Promise.all([
        supabase.from("profiles_public").select("id", { count: "exact", head: true }),
        supabase
          .from("hub_posts")
          .select("id", { count: "exact", head: true })
          .eq("hub_type", "creator"),
        supabase
          .from("hub_posts")
          .select("id", { count: "exact", head: true })
          .eq("hub_type", "creator")
          .gte(
            "created_at",
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          ),
      ]);

      setStats({
        creators: creatorsRes.count ?? 0,
        projects: projectsRes.count ?? 0,
        thisWeek: weekRes.count ?? 0,
      });
    }

    loadStats();
  }, [supabase]);

  if (memberLoading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#7401df] border-t-transparent" /></div>;
  }

  if (isMember) {
    const firstName =
      user?.user_metadata?.display_name?.split(" ")[0] ||
      user?.email?.split("@")[0] ||
      "creator";
    return (
      <HubSidebar hubType="creator" color="#7401df">
        <div className="space-y-6">
          {/* Warm welcome banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#9b4dff] via-[#7401df] to-[#5a01b0]">
            <div className="absolute -right-6 -top-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
            <div className="absolute -bottom-10 left-10 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-7">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 shadow-lg backdrop-blur-sm">
                  <Mic className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="flex items-center gap-2 text-xl font-bold text-white">
                    Hey {firstName}! <span className="text-2xl">🎤</span>
                  </h1>
                  <p className="text-sm text-white/75">
                    Welcome back to the Creator Hub — share your latest and grow your following.
                  </p>
                </div>
              </div>
              <button
                onClick={handleLeave}
                className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/25"
              >
                Leave Hub
              </button>
            </div>
          </div>

          {/* Quick-stats strip */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Creators", value: stats.creators, icon: Users },
              { label: "Projects Shared", value: stats.projects, icon: FolderOpen },
              { label: "This Week", value: stats.thisWeek, icon: CalendarDays },
            ].map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#7401df]/10">
                  <s.icon className="h-4 w-4 text-[#7401df]" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-none text-foreground">
                    {s.value.toLocaleString()}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Feed + right rail (members + groups + calendar) */}
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 min-w-0">
              <HubFeed
                hubType="creator"
                accentColor="#7401df"
                placeholder="Share a project, update, or milestone..."
                postTypes={[
                  { value: "project", label: "Project" },
                  { value: "update", label: "Update" },
                  { value: "milestone", label: "Milestone" },
                  { value: "resource", label: "Resource" },
                ]}
              />
            </div>
            <HubRail hubType="creator" accentColor="#7401df" supabase={supabase} />
          </div>
        </div>
      </HubSidebar>
    );
  }

  return (
    <div className="space-y-8">
      {(
        <>
          {/* ---- Hero ---- */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#7401df] to-[#5a01b0]">
            <div className="relative px-6 py-10 sm:px-10 sm:py-14">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm shadow-xl">
                  <Mic className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Creator Hub</h1>
                  <p className="text-white/70 mt-1">
                    A network for creators — share projects, connect, and grow on
                    WCCG 104.5 FM
                  </p>
                </div>
              </div>
              {user && (
                <button onClick={handleJoin} disabled={joining} className="mt-4 rounded-full bg-white text-gray-900 px-6 py-2 text-sm font-bold hover:bg-white/90 transition-colors disabled:opacity-50">
                  {joining ? "Joining..." : "Join the Hub"}
                </button>
              )}
            </div>
          </div>

          {/* ---- Stats bar ---- */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Creators", value: stats.creators, icon: Users },
              { label: "Projects Shared", value: stats.projects, icon: FolderOpen },
              { label: "This Week", value: stats.thisWeek, icon: CalendarDays },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-border bg-card p-4 flex items-center gap-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#7401df]/10">
                  <s.icon className="h-5 w-5 text-[#7401df]" />
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
              Creator Tools
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <Link
                  key={f.title}
                  href={f.href}
                  className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-input"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#7401df]/10 mb-3">
                    <f.icon className="h-5 w-5 text-[#7401df]" />
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
                    <ArrowRight className="h-4 w-4 mt-1 shrink-0 text-foreground/20 group-hover:text-[#7401df] transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      <HubFeed
        hubType="creator"
        accentColor="#7401df"
        placeholder="Share a project, update, or milestone..."
        postTypes={[
          { value: "project", label: "Project" },
          { value: "update", label: "Update" },
          { value: "milestone", label: "Milestone" },
          { value: "resource", label: "Resource" },
        ]}
      />
    </div>
  );
}
