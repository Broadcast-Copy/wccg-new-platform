/* ---------- Advertiser Performance Mock Data ---------- */

export interface SummaryStats {
  totalImpressions: number;
  totalRedemptions: number;
  listenThroughRate: number;
  estimatedROI: number;
  avgDailyListeners: number;
}

export interface DailyData {
  date: string;
  impressions: number;
  redemptions: number;
  listenThroughRate: number;
}

export interface SponsoredHour {
  label: string;
  impressions: number;
  redemptions: number;
  ctr: number;
  revenue: number;
}

export interface CampaignPerformance {
  name: string;
  status: "active" | "completed" | "scheduled";
  startDate: string;
  endDate: string;
  spotsAired: number;
  totalReach: number;
  conversionRate: number;
}

export const summaryStats: SummaryStats = {
  totalImpressions: 145200,
  totalRedemptions: 342,
  listenThroughRate: 87.3,
  estimatedROI: 4.2,
  avgDailyListeners: 1850,
};

/* Generate 30 days of realistic daily data */
function generateDailyData(): DailyData[] {
  const data: DailyData[] = [];
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Base values with upward trend
    const trendMultiplier = 1 + (29 - i) * 0.008;
    const weekendMultiplier = isWeekend ? 0.65 : 1;
    const randomVariation = 0.85 + Math.random() * 0.3;

    const impressions = Math.round(
      4200 * trendMultiplier * weekendMultiplier * randomVariation
    );
    const redemptions = Math.round(
      impressions * (0.002 + Math.random() * 0.002)
    );
    const listenThroughRate = Number(
      (82 + Math.random() * 10).toFixed(1)
    );

    data.push({
      date: date.toISOString().split("T")[0],
      impressions,
      redemptions,
      listenThroughRate,
    });
  }

  return data;
}

export const dailyData: DailyData[] = generateDailyData();

export const sponsoredHours: SponsoredHour[] = [
  {
    label: "McDonald's Morning Rush",
    impressions: 38500,
    redemptions: 112,
    ctr: 3.8,
    revenue: 4200,
  },
  {
    label: "AutoZone Drive Time",
    impressions: 32100,
    redemptions: 87,
    ctr: 3.2,
    revenue: 3650,
  },
  {
    label: "Walmart Midday Mix",
    impressions: 28400,
    redemptions: 64,
    ctr: 2.9,
    revenue: 3100,
  },
  {
    label: "State Farm Evening Vibes",
    impressions: 25800,
    redemptions: 48,
    ctr: 2.5,
    revenue: 2800,
  },
  {
    label: "Coca-Cola Weekend Countdown",
    impressions: 20400,
    redemptions: 31,
    ctr: 2.1,
    revenue: 2250,
  },
];

export const campaignPerformance: CampaignPerformance[] = [
  {
    name: "Spring Savings Blitz",
    status: "active",
    startDate: "2026-02-15",
    endDate: "2026-04-15",
    spotsAired: 248,
    totalReach: 89200,
    conversionRate: 3.4,
  },
  {
    name: "Community Concert Series",
    status: "active",
    startDate: "2026-03-01",
    endDate: "2026-05-31",
    spotsAired: 124,
    totalReach: 42600,
    conversionRate: 2.8,
  },
  {
    name: "Holiday Gift Guide 2025",
    status: "completed",
    startDate: "2025-11-15",
    endDate: "2025-12-31",
    spotsAired: 410,
    totalReach: 156800,
    conversionRate: 4.1,
  },
];
