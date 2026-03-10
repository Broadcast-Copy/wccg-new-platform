"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Trophy,
  Users,
  BarChart3,
  Youtube,
  MapPin,
  ExternalLink,
  ArrowLeft,
  User,
  Hash,
  GraduationCap,
  Shield,
  Play,
} from "lucide-react";
import type { SportsTeam } from "@/data/sports";
import { AppImage } from "@/components/ui/app-image";

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

type TabKey = "overview" | "roster" | "coaches" | "stats" | "youtube";

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "overview", label: "Overview", icon: Shield },
  { key: "roster", label: "Players", icon: Users },
  { key: "coaches", label: "Coaches", icon: User },
  { key: "stats", label: "Stats", icon: BarChart3 },
  { key: "youtube", label: "YouTube", icon: Youtube },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TeamProfile({ team }: { team: SportsTeam }) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <div className={`relative bg-gradient-to-br ${team.gradient}`}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:py-16">
          {/* Back link */}
          <Link
            href="/sports"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground/80 transition-colors mb-6"
          >
            <ArrowLeft className="h-3 w-3" />
            Sports
          </Link>

          <div className="flex items-start gap-6">
            {/* Team hero image */}
            <div
              className="relative flex-shrink-0 h-20 w-20 sm:h-28 sm:w-28 rounded-2xl overflow-hidden border-2 border-white/20"
              style={{ backgroundColor: team.primaryColor }}
            >
              {team.heroImageUrl ? (
                <AppImage
                  src={team.heroImageUrl}
                  alt={team.name}
                  fill
                  className="object-cover"
                  sizes="112px"
                />
              ) : (
                <div className="flex items-center justify-center h-full w-full">
                  <Trophy className="h-10 w-10 sm:h-14 sm:w-14 text-foreground/80" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <span className="inline-block rounded-full bg-white/[0.15] px-3 py-1 text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-2">
                {team.sport}
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-1">
                {team.name}
              </h1>
              <p className="text-sm sm:text-base text-foreground/60 mb-3">
                {team.conference}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" />
                  {team.venue}, {team.location}
                </span>
                <a
                  href={team.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[#74ddc7]/70 hover:text-[#74ddc7] transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  GoDuke.com
                </a>
                <a
                  href={team.youtube.channelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-red-400/70 hover:text-red-400 transition-colors"
                >
                  <Youtube className="h-3 w-3" />
                  {team.youtube.channelName}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-4 mb-6 border-b border-border">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-[#74ddc7]/15 text-[#74ddc7]"
                    : "text-muted-foreground hover:text-foreground/70 hover:bg-foreground/[0.04]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && <OverviewTab team={team} />}
        {activeTab === "roster" && <RosterTab team={team} />}
        {activeTab === "coaches" && <CoachesTab team={team} />}
        {activeTab === "stats" && <StatsTab team={team} />}
        {activeTab === "youtube" && <YoutubeTab team={team} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------

function OverviewTab({ team }: { team: SportsTeam }) {
  return (
    <div className="space-y-6">
      {/* About */}
      <div className="rounded-2xl border border-border bg-white/[0.03] p-6">
        <h2 className="text-lg font-bold text-foreground mb-3">About</h2>
        <p className="text-sm text-foreground/60 leading-relaxed">
          {team.description}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {team.stats.slice(0, 6).map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-white/[0.03] p-4 text-center"
          >
            <p className="text-2xl font-extrabold text-[#74ddc7]">
              {stat.value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Head Coach */}
      {team.coaches[0] && (
        <div className="rounded-2xl border border-border bg-white/[0.03] p-6">
          <h2 className="text-lg font-bold text-foreground mb-3">Head Coach</h2>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-foreground/[0.06] flex items-center justify-center border border-border">
              <User className="h-8 w-8 text-muted-foreground/70" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground">
                {team.coaches[0].name}
              </p>
              <p className="text-sm text-muted-foreground">{team.coaches[0].title}</p>
              <p className="text-xs text-muted-foreground/70">
                Since {team.coaches[0].since}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* YouTube CTA */}
      <a
        href={team.youtube.channelUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 hover:bg-red-500/15 transition-colors"
      >
        <div className="h-12 w-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
          <Youtube className="h-6 w-6 text-red-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">
            {team.youtube.channelName}
          </p>
          <p className="text-xs text-muted-foreground">
            Watch highlights, interviews, and game recaps on YouTube
          </p>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground/70" />
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Roster Tab
// ---------------------------------------------------------------------------

function RosterTab({ team }: { team: SportsTeam }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">
        Players ({team.players.length})
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {team.players.map((player) => (
          <div
            key={player.name}
            className="flex items-center gap-4 rounded-xl border border-border bg-white/[0.03] p-4 hover:bg-white/[0.05] transition-colors"
          >
            {/* Number */}
            <div
              className="flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center font-extrabold text-lg text-foreground/80"
              style={{ backgroundColor: `${team.primaryColor}40` }}
            >
              <Hash className="h-3 w-3 text-muted-foreground mr-0.5" />
              {player.number}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">
                {player.name}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{player.position}</span>
                <span className="text-foreground/20">&middot;</span>
                <span className="flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" />
                  {player.year}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground/60 text-center pt-4">
        Roster may not reflect current season. Visit{" "}
        <a
          href={team.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#74ddc7]/50 hover:text-[#74ddc7]"
        >
          GoDuke.com
        </a>{" "}
        for the latest roster.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Coaches Tab
// ---------------------------------------------------------------------------

function CoachesTab({ team }: { team: SportsTeam }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Coaching Staff</h2>
      <div className="grid gap-3">
        {team.coaches.map((coach) => (
          <div
            key={coach.name}
            className="flex items-center gap-4 rounded-xl border border-border bg-white/[0.03] p-5 hover:bg-white/[0.05] transition-colors"
          >
            <div className="flex-shrink-0 h-14 w-14 rounded-xl bg-foreground/[0.06] flex items-center justify-center border border-border">
              <User className="h-7 w-7 text-muted-foreground/70" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground">{coach.name}</p>
              <p className="text-sm text-[#74ddc7]/70">{coach.title}</p>
              <p className="text-xs text-muted-foreground/70">Since {coach.since}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats Tab
// ---------------------------------------------------------------------------

function StatsTab({ team }: { team: SportsTeam }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Program Statistics</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {team.stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-white/[0.03] p-5 text-center hover:bg-white/[0.05] transition-colors"
          >
            <p className="text-3xl font-extrabold text-[#74ddc7]">
              {stat.value}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// YouTube Tab
// ---------------------------------------------------------------------------

function YoutubeTab({ team }: { team: SportsTeam }) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-foreground">YouTube Channel</h2>

      {/* Channel Card */}
      <a
        href={team.youtube.channelUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-2xl border border-red-500/20 bg-red-500/10 p-6 hover:bg-red-500/15 transition-colors"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="h-14 w-14 rounded-xl bg-red-500/20 flex items-center justify-center">
            <Youtube className="h-8 w-8 text-red-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">
              {team.youtube.channelName}
            </p>
            <p className="text-sm text-muted-foreground">YouTube Channel</p>
          </div>
          <ExternalLink className="h-5 w-5 text-muted-foreground/70 ml-auto" />
        </div>
        <p className="text-sm text-muted-foreground">
          Watch game highlights, player interviews, press conferences, and
          behind-the-scenes content from {team.fullName}.
        </p>
      </a>

      {/* Video placeholder grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          "Game Highlights",
          "Player Interviews",
          "Press Conferences",
          "Season Recap",
        ].map((label) => (
          <a
            key={label}
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(team.youtube.searchQuery + " " + label)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-xl border border-border bg-white/[0.03] p-5 hover:bg-white/[0.05] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-foreground/[0.06] flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                <Play className="h-5 w-5 text-muted-foreground group-hover:text-red-400 transition-colors" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground/70">Search on YouTube</p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
