"use client";

import { Award, Lock } from "lucide-react";
import { MILESTONES } from "@/lib/milestones";
import type { Milestone } from "@/lib/milestones";

function requirementText(m: Milestone): string {
  if (m.unit === "minutes") {
    const hours = m.threshold / 60;
    return `Listen for ${hours.toLocaleString()} hour${hours === 1 ? "" : "s"} total`;
  }
  return `Complete ${m.threshold.toLocaleString()} listening sessions`;
}

/**
 * Badge wall — every milestone from lib/milestones.ts rendered as a badge:
 * unlocked badges are lit, locked ones are dimmed with their requirement.
 * `unlockedIds` is the union of localStorage milestones and the user's
 * `user_milestones.unlocked_ids` row.
 */
export function BadgeWall({ unlockedIds }: { unlockedIds: string[] }) {
  const unlockedCount = MILESTONES.filter((m) =>
    unlockedIds.includes(m.id),
  ).length;

  return (
    <section aria-label="Badge wall" className="rounded-2xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-[#7401df]" />
          <h2 className="text-lg font-bold text-foreground">Badge Wall</h2>
        </div>
        <span className="text-sm font-semibold tabular-nums text-muted-foreground">
          {unlockedCount} of {MILESTONES.length} unlocked
        </span>
      </header>

      <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {MILESTONES.map((m) => {
          const unlocked = unlockedIds.includes(m.id);
          return (
            <div
              key={m.id}
              className={`relative flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                unlocked
                  ? "border-[#74ddc7]/40 bg-gradient-to-br from-[#74ddc7]/10 to-[#7401df]/10"
                  : "border-border opacity-55 grayscale"
              }`}
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl ${
                  unlocked
                    ? "bg-[#74ddc7]/15 shadow-[0_0_14px_rgba(116,221,199,0.35)]"
                    : "bg-muted"
                }`}
                role="img"
                aria-label={m.name}
              >
                {m.icon}
              </span>
              <div className="min-w-0">
                <p
                  className={`truncate text-sm font-bold ${
                    unlocked ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {m.name}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {unlocked ? m.description : requirementText(m)}
                </p>
              </div>
              {!unlocked && (
                <Lock className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/70" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
