"use client";

import { useState, useEffect } from "react";
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
  Calendar,
  Newspaper,
  Clock,
  Radio,
  ChevronRight,
  Tv,
  MapPinIcon,
} from "lucide-react";
import type { SportsTeam, UpcomingGame } from "@/data/sports";
import { AppImage } from "@/components/ui/app-image";
import { YouTubeGrid } from "@/components/youtube/youtube-grid";

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

type TabKey = "overview" | "stats" | "players" | "schedule" | "news" | "videos";

const TABS: {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "overview", label: "Overview", icon: Shield },
  { key: "stats", label: "Stats", icon: BarChart3 },
  { key: "players", label: "Players", icon: Users },
  { key: "schedule", label: "Schedule", icon: Calendar },
  { key: "news", label: "News", icon: Newspaper },
  { key: "videos", label: "Videos", icon: Youtube },
];

// ---------------------------------------------------------------------------
// Countdown Hook
// ---------------------------------------------------------------------------

interface CountdownValues {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

function useCountdown(targetDate: string): CountdownValues {
  const [countdown, setCountdown] = useState<CountdownValues>(() =>
    calculateCountdown(targetDate)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(calculateCountdown(targetDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return countdown;
}

function calculateCountdown(targetDate: string): CountdownValues {
  const now = new Date().getTime();
  const target = new Date(targetDate).getTime();
  const diff = target - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    isPast: false,
  };
}

// ---------------------------------------------------------------------------
// Countdown Display Component
// ---------------------------------------------------------------------------

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm">
        <span className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="mt-1.5 text-[10px] sm:text-xs font-medium text-white/50 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Next Game Countdown (Hero Section)
// ---------------------------------------------------------------------------

function NextGameCountdown({
  team,
  game,
}: {
  team: SportsTeam;
  game: UpcomingGame;
}) {
  const { days, hours, minutes, seconds, isPast } = useCountdown(game.date);

  if (isPast) return null;

  return (
    <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-sm p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        {/* Matchup */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Team logo */}
          <div className="relative flex-shrink-0 h-12 w-12 sm:h-14 sm:w-14 rounded-xl overflow-hidden border border-white/20 bg-white/10">
            {team.heroImageUrl ? (
              <AppImage
                src={team.heroImageUrl}
                alt={team.name}
                fill
                className="object-cover"
                sizes="56px"
              />
            ) : (
              <div className="flex items-center justify-center h-full w-full">
                <Shield className="h-6 w-6 text-white/60" />
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-bold text-white/40 uppercase tracking-wider">
              VS
            </span>
          </div>

          {/* Opponent logo */}
          <div className="relative flex-shrink-0 h-12 w-12 sm:h-14 sm:w-14 rounded-xl overflow-hidden border border-white/20 bg-white/10">
            {game.opponentLogo ? (
              <AppImage
                src={game.opponentLogo}
                alt={game.opponent}
                fill
                className="object-cover"
                sizes="56px"
              />
            ) : (
              <div className="flex items-center justify-center h-full w-full">
                <Shield className="h-6 w-6 text-white/60" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm sm:text-base font-bold text-white truncate">
              {game.isHome ? "vs" : "@"} {game.opponent}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {game.time}
              </span>
              <span className="flex items-center gap-1">
                <MapPinIcon className="h-3 w-3" />
                {game.venue}
              </span>
              {game.broadcast && (
                <span className="flex items-center gap-1">
                  <Tv className="h-3 w-3" />
                  {game.broadcast}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Countdown */}
        <div className="flex items-center gap-2 sm:gap-3 justify-center sm:justify-end">
          <CountdownUnit value={days} label="Days" />
          <span className="text-xl font-bold text-white/30 self-start mt-4">
            :
          </span>
          <CountdownUnit value={hours} label="Hrs" />
          <span className="text-xl font-bold text-white/30 self-start mt-4">
            :
          </span>
          <CountdownUnit value={minutes} label="Min" />
          <span className="text-xl font-bold text-white/30 self-start mt-4">
            :
          </span>
          <CountdownUnit value={seconds} label="Sec" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function TeamProfile({ team }: { team: SportsTeam }) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <div className={`relative bg-gradient-to-br ${team.gradient}`}>
        <div className="absolute inset-0 bg-black/40" />
        {/* Decorative blurs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-1/4 w-80 h-80 bg-white rounded-full blur-3xl opacity-[0.04]" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-[#74ddc7] rounded-full blur-3xl opacity-[0.06]" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:py-16">
          {/* Back link */}
          <Link
            href="/sports"
            className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors mb-6"
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
                  <Trophy className="h-10 w-10 sm:h-14 sm:w-14 text-white/80" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <span className="inline-block rounded-full bg-white/[0.15] px-3 py-1 text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
                {team.sport}
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-1">
                {team.name}
              </h1>
              <p className="text-sm sm:text-base text-white/50 mb-3">
                {team.conference}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-white/40">
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

          {/* Next Game Countdown */}
          {team.nextGame && (
            <NextGameCountdown team={team} game={team.nextGame} />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-4 mb-6 border-b border-border scrollbar-none">
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
        {activeTab === "stats" && <StatsTab team={team} />}
        {activeTab === "players" && <PlayersTab team={team} />}
        {activeTab === "schedule" && <ScheduleTab team={team} />}
        {activeTab === "news" && <NewsTab team={team} />}
        {activeTab === "videos" && <VideosTab team={team} />}
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
      <div className="rounded-2xl border border-border bg-foreground/[0.03] p-6">
        <h2 className="text-lg font-bold text-foreground mb-3">About</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {team.description}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {team.stats.slice(0, 6).map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-foreground/[0.03] p-4 text-center"
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
        <div className="rounded-2xl border border-border bg-foreground/[0.03] p-6">
          <h2 className="text-lg font-bold text-foreground mb-3">
            Head Coach
          </h2>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-foreground/[0.06] flex items-center justify-center border border-border">
              <User className="h-8 w-8 text-muted-foreground/70" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground">
                {team.coaches[0].name}
              </p>
              <p className="text-sm text-muted-foreground">
                {team.coaches[0].title}
              </p>
              <p className="text-xs text-muted-foreground/70">
                Since {team.coaches[0].since}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Key Players Preview */}
      <div className="rounded-2xl border border-border bg-foreground/[0.03] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Key Players</h2>
          <span className="text-xs text-muted-foreground">
            {team.players.length} players
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {team.players.slice(0, 4).map((player) => (
            <div
              key={player.name}
              className="text-center rounded-xl border border-border bg-foreground/[0.03] p-3"
            >
              <div
                className="mx-auto h-12 w-12 rounded-full flex items-center justify-center font-extrabold text-lg text-white mb-2"
                style={{ backgroundColor: team.primaryColor }}
              >
                {player.number}
              </div>
              <p className="text-xs font-bold text-foreground truncate">
                {player.name}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {player.position}
              </p>
            </div>
          ))}
        </div>
      </div>

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

      {/* News CTA */}
      {team.newsUrl && (
        <a
          href={team.newsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5 hover:bg-blue-500/15 transition-colors"
        >
          <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Newspaper className="h-6 w-6 text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Latest News</p>
            <p className="text-xs text-muted-foreground">
              Get the latest {team.fullName} news, scores, and analysis
            </p>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground/70" />
        </a>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats Tab
// ---------------------------------------------------------------------------

function StatsTab({ team }: { team: SportsTeam }) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-foreground">Program Statistics</h2>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {team.stats.map((stat, i) => (
          <div
            key={stat.label}
            className="group relative rounded-xl border border-border bg-foreground/[0.03] p-5 text-center hover:bg-foreground/[0.05] transition-all hover:border-[#74ddc7]/20"
          >
            {/* Rank indicator */}
            <div className="absolute top-3 right-3 text-[10px] font-bold text-muted-foreground/30">
              #{i + 1}
            </div>
            <p className="text-3xl font-extrabold text-[#74ddc7] group-hover:scale-105 transition-transform">
              {stat.value}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Coaching Staff (combined into stats for program overview) */}
      <div className="rounded-2xl border border-border bg-foreground/[0.03] p-6">
        <h3 className="text-base font-bold text-foreground mb-4">
          Coaching Staff
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {team.coaches.map((coach) => (
            <div
              key={coach.name}
              className="flex items-center gap-3 rounded-xl border border-border bg-foreground/[0.03] p-4 hover:bg-foreground/[0.05] transition-colors"
            >
              <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-foreground/[0.06] flex items-center justify-center border border-border">
                <User className="h-6 w-6 text-muted-foreground/70" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {coach.name}
                </p>
                <p className="text-xs text-[#74ddc7]/70">{coach.title}</p>
                <p className="text-[10px] text-muted-foreground/70">
                  Since {coach.since}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* External link */}
      <div className="text-center">
        <a
          href={team.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-[#74ddc7]/70 hover:text-[#74ddc7] transition-colors"
        >
          View full stats on GoDuke.com
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Players Tab (enhanced with jersey-style cards)
// ---------------------------------------------------------------------------

function PlayersTab({ team }: { team: SportsTeam }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">
          Roster ({team.players.length})
        </h2>
        <a
          href={team.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#74ddc7]/70 hover:text-[#74ddc7] flex items-center gap-1 transition-colors"
        >
          Full Roster
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {team.players.map((player) => (
          <div
            key={player.name}
            className="group relative overflow-hidden rounded-xl border border-border bg-foreground/[0.03] hover:bg-foreground/[0.05] transition-all hover:border-[#74ddc7]/20"
          >
            {/* Jersey Number Watermark */}
            <div
              className="absolute -right-3 -top-4 text-8xl font-black opacity-[0.04] select-none pointer-events-none"
              style={{ color: team.primaryColor }}
            >
              {player.number}
            </div>

            <div className="relative flex items-center gap-4 p-5">
              {/* Jersey Number Badge */}
              <div
                className="flex-shrink-0 h-14 w-14 rounded-xl flex flex-col items-center justify-center text-white shadow-lg"
                style={{ backgroundColor: team.primaryColor }}
              >
                <span className="text-[10px] font-bold uppercase opacity-60 leading-none">
                  #
                </span>
                <span className="text-xl font-extrabold leading-none">
                  {player.number}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">
                  {player.name}
                </p>
                <p className="text-xs font-medium text-[#74ddc7]/70 mt-0.5">
                  {player.position}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                  <GraduationCap className="h-3 w-3" />
                  {player.year}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground/60 text-center pt-2">
        Roster may not reflect the current season. Visit{" "}
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
// Schedule Tab
// ---------------------------------------------------------------------------

function ScheduleTab({ team }: { team: SportsTeam }) {
  const schedule = team.schedule ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">
          Upcoming Schedule
        </h2>
        <a
          href={team.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#74ddc7]/70 hover:text-[#74ddc7] flex items-center gap-1 transition-colors"
        >
          Full Schedule
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {schedule.length === 0 ? (
        <div className="rounded-2xl border border-border bg-foreground/[0.03] p-10 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No upcoming games scheduled. Check{" "}
            <a
              href={team.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#74ddc7]/70 hover:text-[#74ddc7]"
            >
              GoDuke.com
            </a>{" "}
            for the full schedule.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedule.map((game, i) => {
            const gameDate = new Date(game.date);
            const month = gameDate.toLocaleDateString("en-US", {
              month: "short",
            });
            const day = gameDate.getDate();
            const weekday = gameDate.toLocaleDateString("en-US", {
              weekday: "short",
            });

            return (
              <div
                key={`${game.opponent}-${game.date}`}
                className={`group flex items-center gap-4 rounded-xl border p-4 transition-all hover:bg-foreground/[0.05] ${
                  i === 0
                    ? "border-[#74ddc7]/20 bg-[#74ddc7]/[0.04]"
                    : "border-border bg-foreground/[0.03]"
                }`}
              >
                {/* Date Block */}
                <div className="flex-shrink-0 w-14 text-center">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">
                    {weekday}
                  </p>
                  <p className="text-xl font-extrabold text-foreground">
                    {day}
                  </p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">
                    {month}
                  </p>
                </div>

                {/* Divider */}
                <div className="w-px h-12 bg-border flex-shrink-0" />

                {/* Opponent */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg overflow-hidden bg-foreground/[0.06] border border-border flex items-center justify-center">
                    {game.opponentLogo ? (
                      <AppImage
                        src={game.opponentLogo}
                        alt={game.opponent}
                        width={40}
                        height={40}
                        className="object-contain"
                      />
                    ) : (
                      <Shield className="h-5 w-5 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                      {game.isHome ? "vs" : "@"} {game.opponent}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {game.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPinIcon className="h-2.5 w-2.5" />
                        {game.venue}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Broadcast / Home-Away Badge */}
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      game.isHome
                        ? "bg-[#74ddc7]/15 text-[#74ddc7]"
                        : "bg-foreground/[0.06] text-muted-foreground"
                    }`}
                  >
                    {game.isHome ? "Home" : "Away"}
                  </span>
                  {game.broadcast && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                      <Radio className="h-2.5 w-2.5" />
                      {game.broadcast}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Listen Live CTA */}
      <div className="rounded-2xl border border-[#74ddc7]/20 bg-[#74ddc7]/[0.04] p-5">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-[#74ddc7]/15 flex items-center justify-center flex-shrink-0">
            <Radio className="h-6 w-6 text-[#74ddc7]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">
              Listen Live on WCCG 104.5 FM
            </p>
            <p className="text-xs text-muted-foreground">
              Catch every game with live play-by-play coverage
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#74ddc7]/15 border border-[#74ddc7]/30 px-4 py-2 text-xs font-semibold text-[#74ddc7] hover:bg-[#74ddc7]/25 transition-colors"
          >
            Listen
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// News Tab
// ---------------------------------------------------------------------------

const NEWS_CATEGORIES = [
  {
    label: "Game Recaps",
    description: "Post-game analysis, scores, and highlights",
    icon: Trophy,
  },
  {
    label: "Player Spotlights",
    description: "Profiles and interviews with key players",
    icon: Users,
  },
  {
    label: "Recruiting Updates",
    description: "Latest recruiting news and commitments",
    icon: GraduationCap,
  },
  {
    label: "Injury Reports",
    description: "Player availability and health updates",
    icon: Shield,
  },
];

function NewsTab({ team }: { team: SportsTeam }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">
          {team.fullName} News
        </h2>
        {team.newsUrl && (
          <a
            href={team.newsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#74ddc7]/70 hover:text-[#74ddc7] flex items-center gap-1 transition-colors"
          >
            ESPN Coverage
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* ESPN Link Card */}
      {team.newsUrl && (
        <a
          href={team.newsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-2xl border border-blue-500/20 bg-blue-500/[0.06] p-6 hover:bg-blue-500/10 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Newspaper className="h-7 w-7 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-base font-bold text-foreground">
                ESPN - {team.fullName}
              </p>
              <p className="text-sm text-muted-foreground">
                Scores, news, stats, standings, and more from ESPN
              </p>
            </div>
            <ExternalLink className="h-5 w-5 text-muted-foreground/50" />
          </div>
        </a>
      )}

      {/* News Categories */}
      <div className="grid gap-3 sm:grid-cols-2">
        {NEWS_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const searchUrl = team.newsUrl
            ? team.newsUrl
            : `https://www.google.com/search?q=${encodeURIComponent(team.fullName + " " + cat.label)}&tbm=nws`;
          return (
            <a
              key={cat.label}
              href={searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 rounded-xl border border-border bg-foreground/[0.03] p-5 hover:bg-foreground/[0.05] hover:border-[#74ddc7]/20 transition-all"
            >
              <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-foreground/[0.06] flex items-center justify-center group-hover:bg-[#74ddc7]/15 transition-colors">
                <Icon className="h-5 w-5 text-muted-foreground group-hover:text-[#74ddc7] transition-colors" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {cat.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {cat.description}
                </p>
              </div>
            </a>
          );
        })}
      </div>

      {/* GoDuke News */}
      <a
        href={team.website}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-4 rounded-2xl border border-border bg-foreground/[0.03] p-5 hover:bg-foreground/[0.05] transition-colors"
      >
        <div className="h-12 w-12 rounded-xl bg-foreground/[0.06] flex items-center justify-center flex-shrink-0 border border-border">
          <Shield className="h-6 w-6 text-muted-foreground/70" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">
            GoDuke.com - Official Athletics
          </p>
          <p className="text-xs text-muted-foreground">
            Official news and updates from Duke Athletics
          </p>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground/50" />
      </a>

      {/* WCCG Coverage CTA */}
      <div className="rounded-2xl border border-[#74ddc7]/20 bg-[#74ddc7]/[0.04] p-5">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-[#74ddc7]/15 flex items-center justify-center flex-shrink-0">
            <Radio className="h-6 w-6 text-[#74ddc7]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">
              WCCG 104.5 FM Sports Coverage
            </p>
            <p className="text-xs text-muted-foreground">
              Tune in for exclusive interviews, pre-game shows, and live
              commentary
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Videos Tab (uses YouTubeGrid component)
// ---------------------------------------------------------------------------

function VideosTab({ team }: { team: SportsTeam }) {
  return (
    <div className="space-y-6">
      {/* Reuse the YouTubeGrid component */}
      <YouTubeGrid
        channelUrl={team.youtube.channelUrl}
        searchQuery={team.youtube.searchQuery}
        maxVideos={6}
        title={`${team.youtube.channelName} Videos`}
      />

      {/* Video Categories */}
      <h3 className="text-base font-bold text-foreground pt-2">
        Browse by Category
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            label: "Game Highlights",
            desc: "Full game highlights and top plays",
          },
          {
            label: "Player Interviews",
            desc: "Post-game and feature interviews",
          },
          {
            label: "Press Conferences",
            desc: "Coach and player press conferences",
          },
          {
            label: "Season Recap",
            desc: "Season reviews and best moments",
          },
          {
            label: "Training & Practice",
            desc: "Behind-the-scenes practice footage",
          },
          {
            label: "Fan Experience",
            desc: "Gameday atmosphere and fan content",
          },
        ].map((category) => (
          <a
            key={category.label}
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(team.youtube.searchQuery + " " + category.label)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group overflow-hidden rounded-xl border border-border bg-foreground/[0.03] hover:bg-foreground/[0.05] hover:border-red-500/20 transition-all"
          >
            {/* Thumbnail placeholder */}
            <div className="relative aspect-video bg-gradient-to-br from-gray-800/50 to-gray-900/50">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 shadow-xl backdrop-blur-sm transition-transform group-hover:scale-110">
                  <Play
                    className="h-5 w-5 text-white"
                    fill="white"
                  />
                </div>
              </div>
            </div>
            <div className="p-3">
              <p className="text-sm font-bold text-foreground">
                {category.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {category.desc}
              </p>
            </div>
          </a>
        ))}
      </div>

      {/* Channel CTA */}
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
            Subscribe to {team.youtube.channelName}
          </p>
          <p className="text-xs text-muted-foreground">
            Stay updated with the latest {team.fullName} content
          </p>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground/70" />
      </a>
    </div>
  );
}
