"use client";

import { Clock, type LucideIcon } from "lucide-react";
import { relativeTime } from "@/lib/admin-storage";

export interface ActivityItem {
  id: string;
  action: string;
  actor: string;
  target: string;
  timestamp: string;
  type: string;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  typeIcons?: Record<string, LucideIcon>;
  typeColors?: Record<string, string>;
  maxItems?: number;
}

const DEFAULT_COLORS: Record<string, string> = {
  create: "bg-emerald-500/10 text-emerald-400",
  update: "bg-blue-500/10 text-blue-400",
  delete: "bg-red-500/10 text-red-400",
  alert: "bg-yellow-500/10 text-yellow-400",
  broadcast: "bg-purple-500/10 text-purple-400",
  note: "bg-[#74ddc7]/10 text-[#74ddc7]",
};

export function ActivityFeed({
  items,
  typeIcons = {},
  typeColors = DEFAULT_COLORS,
  maxItems = 10,
}: ActivityFeedProps) {
  const visible = items.slice(0, maxItems);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
      {visible.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">No activity yet</div>
      ) : (
        visible.map((item) => {
          const Icon = typeIcons[item.type];
          const color = typeColors[item.type] || "bg-foreground/[0.06] text-muted-foreground";
          return (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
              {Icon ? (
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              ) : (
                <div className={`h-2 w-2 rounded-full shrink-0 ${color.includes("emerald") ? "bg-emerald-400" : color.includes("red") ? "bg-red-400" : "bg-blue-400"}`} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{item.actor}</span>{" "}
                  <span className="text-muted-foreground">{item.action}</span>{" "}
                  <span className="font-medium">{item.target}</span>
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                <Clock className="h-3 w-3" />
                {relativeTime(item.timestamp)}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
