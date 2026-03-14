"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Radio,
  Users,
  Clock,
  Trophy,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { DataTable, type Column } from "@/components/admin/data-table";
import { TabsNav } from "@/components/admin/tabs-nav";
import { loadOrSeed, persist } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types & Seed
// ---------------------------------------------------------------------------

interface DaypartRating {
  id: string;
  daypart: string;
  timeSlot: string;
  share: number;
  prevShare: number;
  cume: number;
  rank: number;
  totalStations: number;
}

interface CompetitorRating {
  id: string;
  station: string;
  frequency: string;
  format: string;
  overallShare: number;
  targetDemoShare: number;
  rank: number;
}

const SEED_DAYPARTS: DaypartRating[] = [
  { id: "dp1", daypart: "Morning Drive", timeSlot: "6A-10A", share: 8.2, prevShare: 7.9, cume: 18500, rank: 3, totalStations: 22 },
  { id: "dp2", daypart: "Midday", timeSlot: "10A-3P", share: 6.8, prevShare: 7.1, cume: 14200, rank: 5, totalStations: 22 },
  { id: "dp3", daypart: "Afternoon Drive", timeSlot: "3P-7P", share: 7.5, prevShare: 7.2, cume: 16800, rank: 4, totalStations: 22 },
  { id: "dp4", daypart: "Evening", timeSlot: "7P-12A", share: 5.4, prevShare: 5.1, cume: 9200, rank: 6, totalStations: 22 },
  { id: "dp5", daypart: "Overnight", timeSlot: "12A-6A", share: 3.1, prevShare: 3.0, cume: 4100, rank: 8, totalStations: 22 },
];

const SEED_COMPETITORS: CompetitorRating[] = [
  { id: "cr1", station: "WCCG 104.5", frequency: "104.5 FM", format: "Urban AC", overallShare: 6.4, targetDemoShare: 7.8, rank: 4 },
  { id: "cr2", station: "WQSM 98.1", frequency: "98.1 FM", format: "Urban Contemporary", overallShare: 8.1, targetDemoShare: 9.2, rank: 1 },
  { id: "cr3", station: "WZFX 99.1", frequency: "99.1 FM", format: "Hip-Hop/R&B", overallShare: 7.6, targetDemoShare: 8.5, rank: 2 },
  { id: "cr4", station: "WRCQ 103.5", frequency: "103.5 FM", format: "Classic Hip-Hop", overallShare: 7.2, targetDemoShare: 7.1, rank: 3 },
  { id: "cr5", station: "WFNC 640", frequency: "640 AM", format: "News/Talk", overallShare: 5.8, targetDemoShare: 4.2, rank: 5 },
  { id: "cr6", station: "WKML 95.7", frequency: "95.7 FM", format: "Country", overallShare: 5.5, targetDemoShare: 3.8, rank: 6 },
  { id: "cr7", station: "WFLB 96.5", frequency: "96.5 FM", format: "Top 40/CHR", overallShare: 5.1, targetDemoShare: 6.1, rank: 7 },
];

const SK_DP = "wccg:gm:ratings-dayparts";
const SK_CR = "wccg:gm:ratings-competitors";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RatingsPage() {
  const [tab, setTab] = useState("dayparts");
  const [dayparts, setDayparts] = useState<DaypartRating[]>([]);
  const [competitors, setCompetitors] = useState<CompetitorRating[]>([]);

  useEffect(() => {
    setDayparts(loadOrSeed(SK_DP, SEED_DAYPARTS));
    setCompetitors(loadOrSeed(SK_CR, SEED_COMPETITORS));
  }, []);

  const wccg = competitors.find((c) => c.station.includes("WCCG"));
  const avgShare = dayparts.length > 0 ? (dayparts.reduce((s, d) => s + d.share, 0) / dayparts.length).toFixed(1) : "0";
  const bestDaypart = [...dayparts].sort((a, b) => b.share - a.share)[0];
  const totalCume = dayparts.reduce((s, d) => s + d.cume, 0);

  const daypartCols: Column<DaypartRating>[] = [
    { key: "daypart", label: "Daypart", render: (r) => (
      <div>
        <span className="font-medium text-foreground">{r.daypart}</span>
        <span className="text-xs text-muted-foreground ml-2">{r.timeSlot}</span>
      </div>
    )},
    { key: "share", label: "Share", align: "right", sortable: true, sortKey: (r) => r.share, render: (r) => <span className="font-mono font-semibold text-foreground">{r.share.toFixed(1)}</span> },
    { key: "trend", label: "Trend", align: "center", render: (r) => {
      const diff = (r.share - r.prevShare).toFixed(1);
      const up = r.share >= r.prevShare;
      return (
        <span className={`inline-flex items-center gap-1 text-xs ${up ? "text-emerald-400" : "text-red-400"}`}>
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {up ? "+" : ""}{diff}
        </span>
      );
    }},
    { key: "cume", label: "Cume", align: "right", hideOnMobile: true, render: (r) => <span className="text-muted-foreground">{r.cume.toLocaleString()}</span> },
    { key: "rank", label: "Rank", align: "center", render: (r) => (
      <span className={`text-xs font-bold ${r.rank <= 3 ? "text-[#74ddc7]" : r.rank <= 5 ? "text-yellow-400" : "text-muted-foreground"}`}>
        #{r.rank}/{r.totalStations}
      </span>
    )},
  ];

  const competitorCols: Column<CompetitorRating>[] = [
    { key: "rank", label: "#", render: (r) => <span className={`font-mono font-bold ${r.rank <= 3 ? "text-[#74ddc7]" : "text-muted-foreground"}`}>{r.rank}</span> },
    { key: "station", label: "Station", render: (r) => (
      <div>
        <span className={`font-medium ${r.station.includes("WCCG") ? "text-[#74ddc7]" : "text-foreground"}`}>{r.station}</span>
        <span className="text-xs text-muted-foreground ml-2">{r.format}</span>
      </div>
    )},
    { key: "overall", label: "Overall Share", align: "right", sortable: true, sortKey: (r) => r.overallShare, render: (r) => <span className="font-mono text-foreground">{r.overallShare.toFixed(1)}</span> },
    { key: "target", label: "P25-54 Share", align: "right", hideOnMobile: true, sortable: true, sortKey: (r) => r.targetDemoShare, render: (r) => <span className="font-mono text-foreground">{r.targetDemoShare.toFixed(1)}</span> },
  ];

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        icon={BarChart3}
        title="Ratings Dashboard"
        description="Station audience measurement and competitive position"
        iconColor="text-[#74ddc7]"
        iconBg="bg-[#74ddc7]/10 border-[#74ddc7]/20"
        badge="Nielsen Audio"
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Overall Market Share"
          value={wccg ? `${wccg.overallShare}` : "--"}
          icon={Radio}
          color="text-[#74ddc7]"
          bg="bg-[#74ddc7]/10"
          trend={wccg ? `#${wccg.rank} in market` : ""}
          trendUp={true}
        />
        <StatCard
          label="Target Demo (P25-54)"
          value={wccg ? `${wccg.targetDemoShare}` : "--"}
          icon={Users}
          color="text-blue-400"
          bg="bg-blue-500/10"
          trend="Key advertiser demographic"
          trendUp={true}
        />
        <StatCard
          label="Avg Daypart Share"
          value={avgShare}
          icon={Clock}
          color="text-purple-400"
          bg="bg-purple-500/10"
          trend={bestDaypart ? `Best: ${bestDaypart.daypart} (${bestDaypart.share})` : ""}
          trendUp={true}
        />
        <StatCard
          label="Total Weekly Cume"
          value={totalCume.toLocaleString()}
          icon={Trophy}
          color="text-yellow-400"
          bg="bg-yellow-500/10"
          trend="Unique listeners per week"
          trendUp={true}
        />
      </div>

      <TabsNav
        tabs={[
          { key: "dayparts", label: "Daypart Performance" },
          { key: "competitors", label: "Market Rankings", count: competitors.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "dayparts" && (
        <>
          {/* Visual bars */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            {dayparts.map((dp) => {
              const maxShare = 10;
              const pct = (dp.share / maxShare) * 100;
              return (
                <div key={dp.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <span className="text-sm font-medium text-foreground">{dp.daypart}</span>
                      <span className="text-xs text-muted-foreground ml-2">{dp.timeSlot}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs ${dp.share >= dp.prevShare ? "text-emerald-400" : "text-red-400"}`}>
                        {dp.share >= dp.prevShare ? "+" : ""}{(dp.share - dp.prevShare).toFixed(1)}
                      </span>
                      <span className="text-sm font-mono font-semibold text-foreground">{dp.share.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#74ddc7] to-[#7401df] transition-all"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <DataTable columns={daypartCols} data={dayparts} keyField="id" />
        </>
      )}

      {tab === "competitors" && (
        <DataTable
          columns={competitorCols}
          data={[...competitors].sort((a, b) => a.rank - b.rank)}
          keyField="id"
        />
      )}
    </div>
  );
}
