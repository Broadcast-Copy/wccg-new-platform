"use client";

import Link from "next/link";
import {
  Trophy,
  ChevronRight,
  MapPin,
  Users,
  Megaphone,
  Shield,
} from "lucide-react";
import { ALL_SPORTS_TEAMS } from "@/data/sports";
import { AppImage } from "@/components/ui/app-image";

export default function SportsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#003087] via-[#001a4d] to-[#0a0a1a]">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl -translate-y-1/2" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#74ddc7] rounded-full blur-3xl translate-y-1/2" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 py-14 sm:py-20">
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-4 py-1.5 text-xs font-semibold text-white/80 uppercase tracking-wider mb-5">
              <Shield className="h-3.5 w-3.5" />
              NCAA &middot; ACC
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-3">
              Duke Sports
            </h1>
            <p className="text-lg sm:text-xl text-white/60 max-w-2xl">
              WCCG 104.5 FM brings you complete coverage of Duke Blue Devils
              athletics &mdash; football and basketball.
            </p>
          </div>
        </div>
      </div>

      {/* Team Cards */}
      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <div className="grid gap-8 md:grid-cols-2">
          {ALL_SPORTS_TEAMS.map((team) => (
            <div
              key={team.id}
              className="group relative overflow-hidden rounded-2xl border border-border bg-foreground/[0.03] transition-all hover:border-foreground/[0.15] hover:bg-foreground/[0.05]"
            >
              {/* Team Image */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-[#003087]/30 to-[#001a4d]/30">
                <AppImage
                  src={team.heroImageUrl}
                  alt={`${team.name} - ${team.sport}`}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                {/* Gradient overlay at bottom for text readability */}
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />

                {/* Sport badge overlay */}
                <div className="absolute top-4 left-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#003087]/90 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white uppercase tracking-wider border border-white/10">
                    <Trophy className="h-3 w-3" />
                    {team.sport}
                  </span>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-6 space-y-4">
                <h2 className="text-2xl font-extrabold text-foreground group-hover:text-[#74ddc7] transition-colors">
                  {team.name}
                </h2>

                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                  {team.description}
                </p>

                {/* Quick info */}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 bg-foreground/[0.04] rounded-full px-3 py-1.5">
                    <MapPin className="h-3 w-3 text-[#74ddc7]/70" />
                    <span>{team.venue}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-foreground/[0.04] rounded-full px-3 py-1.5">
                    <Users className="h-3 w-3 text-[#74ddc7]/70" />
                    <span>{team.conference}</span>
                  </div>
                </div>

                {/* Action Links */}
                <div className="flex items-center gap-4 pt-2">
                  <Link
                    href={`/sports/${team.slug}`}
                    className="inline-flex items-center gap-1.5 text-[#74ddc7] text-sm font-semibold hover:text-[#74ddc7]/80 transition-colors"
                  >
                    <span>View Profile</span>
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="/advertise"
                    className="inline-flex items-center gap-1.5 text-muted-foreground text-sm font-medium hover:text-foreground/70 transition-colors"
                  >
                    <Megaphone className="h-3.5 w-3.5" />
                    <span>Advertise on this show</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
