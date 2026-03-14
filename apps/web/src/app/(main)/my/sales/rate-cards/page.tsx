"use client";

import { useState, useEffect } from "react";
import {
  LayoutGrid,
  DollarSign,
  Sun,
  Sunset,
  Moon,
  Clock,
  Calendar,
  Plus,
  X,
  Pencil,
  Save,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { DetailModal } from "@/components/admin/detail-modal";
import { TabsNav } from "@/components/admin/tabs-nav";
import { loadOrSeed, persist, genId, formatCurrency } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DayPart = "Morning Drive" | "Midday" | "Afternoon Drive" | "Evening" | "Overnight" | "Weekend";
type SpotType = ":30 Spot" | ":60 Spot" | "Sponsorship" | "Digital Banner" | "Social Post" | "Package Deal";

interface RateCard {
  id: string;
  spotType: SpotType;
  dayPart: DayPart;
  baseRate: number;
  description: string;
}

interface SeasonalMultiplier {
  id: string;
  season: string;
  months: string;
  multiplier: number;
}

const DAYPARTS: DayPart[] = ["Morning Drive", "Midday", "Afternoon Drive", "Evening", "Overnight", "Weekend"];
const SPOT_TYPES: SpotType[] = [":30 Spot", ":60 Spot", "Sponsorship", "Digital Banner", "Social Post", "Package Deal"];

const DAYPART_TIMES: Record<DayPart, string> = {
  "Morning Drive": "6AM - 10AM",
  Midday: "10AM - 3PM",
  "Afternoon Drive": "3PM - 7PM",
  Evening: "7PM - 12AM",
  Overnight: "12AM - 6AM",
  Weekend: "Sat-Sun 6AM - 7PM",
};

const DAYPART_ICONS: Record<DayPart, typeof Sun> = {
  "Morning Drive": Sun,
  Midday: Clock,
  "Afternoon Drive": Sunset,
  Evening: Moon,
  Overnight: Moon,
  Weekend: Calendar,
};

const KEY_RATES = "wccg_sales_rate_cards";
const KEY_MULTIPLIERS = "wccg_sales_seasonal_multipliers";

// ---------------------------------------------------------------------------
// Seed Data
// ---------------------------------------------------------------------------

function buildSeedRates(): RateCard[] {
  const rates: Record<SpotType, Record<DayPart, number>> = {
    ":30 Spot": { "Morning Drive": 75, Midday: 45, "Afternoon Drive": 65, Evening: 35, Overnight: 15, Weekend: 50 },
    ":60 Spot": { "Morning Drive": 125, Midday: 75, "Afternoon Drive": 110, Evening: 55, Overnight: 25, Weekend: 85 },
    Sponsorship: { "Morning Drive": 250, Midday: 150, "Afternoon Drive": 225, Evening: 100, Overnight: 50, Weekend: 175 },
    "Digital Banner": { "Morning Drive": 40, Midday: 30, "Afternoon Drive": 35, Evening: 25, Overnight: 15, Weekend: 30 },
    "Social Post": { "Morning Drive": 50, Midday: 35, "Afternoon Drive": 45, Evening: 30, Overnight: 20, Weekend: 40 },
    "Package Deal": { "Morning Drive": 350, Midday: 225, "Afternoon Drive": 300, Evening: 150, Overnight: 75, Weekend: 250 },
  };
  const result: RateCard[] = [];
  for (const spotType of SPOT_TYPES) {
    for (const dayPart of DAYPARTS) {
      result.push({
        id: genId("rc"),
        spotType,
        dayPart,
        baseRate: rates[spotType][dayPart],
        description: `${spotType} during ${dayPart} (${DAYPART_TIMES[dayPart]})`,
      });
    }
  }
  return result;
}

const SEED_MULTIPLIERS: SeasonalMultiplier[] = [
  { id: "sm1", season: "Holiday (Nov-Dec)", months: "Nov, Dec", multiplier: 1.5 },
  { id: "sm2", season: "Spring (Mar-May)", months: "Mar, Apr, May", multiplier: 1.15 },
  { id: "sm3", season: "Summer (Jun-Aug)", months: "Jun, Jul, Aug", multiplier: 1.1 },
  { id: "sm4", season: "Back to School (Aug)", months: "Aug", multiplier: 1.25 },
  { id: "sm5", season: "Q1 Value (Jan-Feb)", months: "Jan, Feb", multiplier: 0.85 },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RateCardsPage() {
  const [rates, setRates] = useState<RateCard[]>([]);
  const [multipliers, setMultipliers] = useState<SeasonalMultiplier[]>([]);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("grid");
  const [selectedSpotType, setSelectedSpotType] = useState<SpotType>(":30 Spot");
  const [editingRate, setEditingRate] = useState<RateCard | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    setMounted(true);
    setRates(loadOrSeed(KEY_RATES, buildSeedRates()));
    setMultipliers(loadOrSeed(KEY_MULTIPLIERS, SEED_MULTIPLIERS));
  }, []);

  if (!mounted) return null;

  function getRate(spotType: SpotType, dayPart: DayPart): number {
    const card = rates.find((r) => r.spotType === spotType && r.dayPart === dayPart);
    return card?.baseRate || 0;
  }

  function handleSaveRate() {
    if (!editingRate || !editValue) return;
    const updated = rates.map((r) =>
      r.id === editingRate.id ? { ...r, baseRate: Number(editValue) } : r
    );
    setRates(updated);
    persist(KEY_RATES, updated);
    setEditingRate(null);
    setEditValue("");
  }

  const avgRate = rates.length > 0 ? Math.round(rates.reduce((s, r) => s + r.baseRate, 0) / rates.length) : 0;
  const highestRate = Math.max(...rates.map((r) => r.baseRate));
  const morningDriveAvg = Math.round(
    rates.filter((r) => r.dayPart === "Morning Drive").reduce((s, r) => s + r.baseRate, 0) /
      SPOT_TYPES.length
  );

  return (
    <div className="space-y-8">
      <PageHeader
        icon={LayoutGrid}
        title="Rate Cards"
        description="Advertising rates by spot type and daypart for WCCG 104.5 FM."
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Rate Cards" value={rates.length.toString()} icon={LayoutGrid} color="text-[#74ddc7]" bg="bg-[#74ddc7]/10" />
        <StatCard label="Avg Rate" value={formatCurrency(avgRate)} icon={DollarSign} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard label="Highest Rate" value={formatCurrency(highestRate)} icon={DollarSign} color="text-purple-400" bg="bg-purple-500/10" />
        <StatCard label="Morning Drive Avg" value={formatCurrency(morningDriveAvg)} icon={Sun} color="text-yellow-400" bg="bg-yellow-500/10" />
      </div>

      <TabsNav
        tabs={[
          { key: "grid", label: "Rate Grid" },
          { key: "multipliers", label: "Seasonal Multipliers", count: multipliers.length },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "grid" && (
        <div className="space-y-4">
          {/* Spot Type Filter */}
          <div className="flex flex-wrap gap-2">
            {SPOT_TYPES.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedSpotType(st)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  selectedSpotType === st
                    ? "border-[#74ddc7]/50 bg-[#74ddc7]/10 text-[#74ddc7]"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-input"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Rate Grid */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left font-medium px-4 py-3">Daypart</th>
                  <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">Time</th>
                  <th className="text-right font-medium px-4 py-3">Base Rate</th>
                  <th className="text-right font-medium px-4 py-3 hidden md:table-cell">Holiday Rate</th>
                  <th className="text-right font-medium px-4 py-3 hidden lg:table-cell">Q1 Value Rate</th>
                  <th className="text-center font-medium px-4 py-3 w-16">Edit</th>
                </tr>
              </thead>
              <tbody>
                {DAYPARTS.map((dp) => {
                  const rate = getRate(selectedSpotType, dp);
                  const holidayMult = multipliers.find((m) => m.season.includes("Holiday"))?.multiplier || 1;
                  const q1Mult = multipliers.find((m) => m.season.includes("Q1"))?.multiplier || 1;
                  const DPIcon = DAYPART_ICONS[dp];
                  return (
                    <tr key={dp} className="border-b border-border last:border-0 hover:bg-foreground/[0.02]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <DPIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">{dp}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell text-xs">
                        {DAYPART_TIMES[dp]}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">
                        {formatCurrency(rate)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-red-400 hidden md:table-cell">
                        {formatCurrency(Math.round(rate * holidayMult))}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-400 hidden lg:table-cell">
                        {formatCurrency(Math.round(rate * q1Mult))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            const card = rates.find((r) => r.spotType === selectedSpotType && r.dayPart === dp);
                            if (card) { setEditingRate(card); setEditValue(card.baseRate.toString()); }
                          }}
                          className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-muted-foreground hover:text-[#74ddc7] hover:bg-[#74ddc7]/10 transition-colors"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* All Spot Types Comparison */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground">Full Rate Comparison</h3>
            <div className="rounded-xl border border-border bg-card overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left font-medium px-4 py-3">Spot Type</th>
                    {DAYPARTS.map((dp) => (
                      <th key={dp} className="text-right font-medium px-3 py-3">{dp.replace(" Drive", "")}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SPOT_TYPES.map((st) => (
                    <tr key={st} className="border-b border-border last:border-0 hover:bg-foreground/[0.02]">
                      <td className="px-4 py-3 font-medium text-foreground">{st}</td>
                      {DAYPARTS.map((dp) => (
                        <td key={dp} className="px-3 py-3 text-right text-muted-foreground">
                          {formatCurrency(getRate(st, dp))}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "multipliers" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left font-medium px-4 py-3">Season</th>
                  <th className="text-left font-medium px-4 py-3">Months</th>
                  <th className="text-right font-medium px-4 py-3">Multiplier</th>
                  <th className="text-right font-medium px-4 py-3">Effect</th>
                </tr>
              </thead>
              <tbody>
                {multipliers.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-foreground/[0.02]">
                    <td className="px-4 py-3 font-medium text-foreground">{m.season}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.months}</td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">{m.multiplier}x</td>
                    <td className="px-4 py-3 text-right">
                      <StatusBadge
                        status={m.multiplier > 1 ? "Premium" : "Discount"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Rate Modal */}
      <DetailModal
        open={!!editingRate}
        onClose={() => setEditingRate(null)}
        title="Edit Rate"
        subtitle={editingRate ? `${editingRate.spotType} — ${editingRate.dayPart}` : ""}
        maxWidth="max-w-sm"
        actions={
          <>
            <button type="button" onClick={() => setEditingRate(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg border border-border hover:bg-muted transition-colors">Cancel</button>
            <button type="button" onClick={handleSaveRate} className="px-4 py-2 text-sm font-semibold text-[#0a0a0f] bg-[#74ddc7] rounded-lg hover:bg-[#74ddc7]/90 transition-colors inline-flex items-center gap-1.5"><Save className="h-3.5 w-3.5" />Save</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Base Rate ($)</label>
            <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
          </div>
        </div>
      </DetailModal>
    </div>
  );
}
