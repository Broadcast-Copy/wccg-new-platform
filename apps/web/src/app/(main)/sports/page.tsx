"use client";

import Link from "next/link";
import { Trophy, ChevronRight, Youtube, MapPin, Users } from "lucide-react";
import { ALL_SPORTS_TEAMS } from "@/data/sports";

export default function SportsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="h-7 w-7 text-[#74ddc7]" />
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Sports
          </h1>
        </div>
        <p className="text-white/50 mb-10 text-lg">
          WCCG 104.5 FM Sports Coverage &mdash; Duke Blue Devils
        </p>

        {/* Team Cards */}
        <div className="grid gap-6 sm:grid-cols-2">
          {ALL_SPORTS_TEAMS.map((team) => (
            <Link
              key={team.id}
              href={`/sports/${team.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] transition-all hover:border-white/[0.15] hover:bg-white/[0.05]"
            >
              {/* Gradient overlay */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${team.gradient} opacity-30 group-hover:opacity-50 transition-opacity`}
              />

              <div className="relative p-6 sm:p-8 space-y-4">
                {/* Sport badge */}
                <span className="inline-block rounded-full bg-white/[0.08] px-3 py-1 text-xs font-semibold text-white/70 uppercase tracking-wider">
                  {team.sport}
                </span>

                <h2 className="text-2xl font-extrabold text-white group-hover:text-[#74ddc7] transition-colors">
                  {team.name}
                </h2>

                <p className="text-sm text-white/40 line-clamp-2">
                  {team.description}
                </p>

                {/* Quick info */}
                <div className="flex flex-wrap gap-4 text-xs text-white/40">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" />
                    <span>{team.venue}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3 w-3" />
                    <span>{team.conference}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Youtube className="h-3 w-3" />
                    <span>{team.youtube.channelName}</span>
                  </div>
                </div>

                {/* CTA */}
                <div className="flex items-center gap-1 text-[#74ddc7] text-sm font-semibold pt-2">
                  <span>View Profile</span>
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
