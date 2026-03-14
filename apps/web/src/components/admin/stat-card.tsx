"use client";

import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  bg?: string;
  trend?: string;
  trendUp?: boolean;
  onClick?: () => void;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  color = "text-[#74ddc7]",
  bg = "bg-[#74ddc7]/10",
  trend,
  trendUp,
  onClick,
}: StatCardProps) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`text-left rounded-xl border border-border bg-card p-5 transition-all ${
        onClick ? "cursor-pointer hover:border-input hover:shadow-lg hover:shadow-black/10" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          {label}
        </span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {trend && (
        <p className={`text-xs mt-1 ${trendUp ? "text-emerald-400" : "text-red-400"}`}>
          {trend}
        </p>
      )}
    </Comp>
  );
}
