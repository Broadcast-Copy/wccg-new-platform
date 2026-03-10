// ---------------------------------------------------------------------------
// Shared types, constants, and helpers for the WCCG Sales Portal
// Used by: campaign-builder, sales dashboard, invoices, spot-shop, checkout
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OrderType = "specific" | "non_specific";

export type DaypartId =
  | "morning_drive"
  | "midday"
  | "afternoon_drive"
  | "evening"
  | "overnight";

export interface DaypartConfig {
  id: DaypartId;
  label: string;
  startHour: number;
  endHour: number;
  defaultRate: number;
}

export interface SalesClient {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  category: string;
}

export interface SpecificBreakSlot {
  hour: number;
  break18: boolean;
  break48: boolean;
}

export interface DaypartOrder {
  daypartId: DaypartId;
  rate: number;
  spotsPerWeek: number;
  slots: SpecificBreakSlot[];
}

export interface InvoiceLineItem {
  daypartLabel: string;
  orderType: string;
  slotsPerDay: number;
  spotsPerWeek: number;
  weeks: number;
  ratePerSpot: number;
  lineTotal: number;
}

export type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue";

export interface SavedCampaign {
  id: string;
  campaignName: string;
  client: SalesClient;
  flightStart: string;
  flightEnd: string;
  total: number;
  status: "draft" | "active" | "completed";
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  campaignName: string;
  client: SalesClient;
  flightStart: string;
  flightEnd: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: InvoiceStatus;
  createdAt: string;
}

// Spot cart item for the Spot Shop
export interface SpotCartItem {
  daypartId: DaypartId;
  label: string;
  rate: number;
  quantity: number; // spots per week
  startHour: number;
  endHour: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DAYPARTS: DaypartConfig[] = [
  { id: "morning_drive", label: "Morning Drive", startHour: 6, endHour: 10, defaultRate: 75 },
  { id: "midday", label: "Midday", startHour: 10, endHour: 15, defaultRate: 50 },
  { id: "afternoon_drive", label: "Afternoon Drive", startHour: 15, endHour: 19, defaultRate: 65 },
  { id: "evening", label: "Evening", startHour: 19, endHour: 24, defaultRate: 40 },
  { id: "overnight", label: "Overnight", startHour: 0, endHour: 6, defaultRate: 25 },
];

export const CLIENT_CATEGORIES = [
  "Retail",
  "Healthcare",
  "Automotive",
  "Restaurant",
  "Education",
  "Real Estate",
  "Legal",
  "Financial",
  "Entertainment",
  "Non-Profit",
  "Other",
];

export const CAMPAIGNS_KEY = "wccg_sales_campaigns";
export const MARKETING_CAMPAIGNS_KEY = "wccg_marketing_campaigns";
export const CLIENTS_KEY = "wccg_sales_clients";
export const INVOICES_KEY = "wccg_sales_invoices";
export const SPOT_CART_KEY = "wccg_sales_spot_cart";

export const SEED_CLIENTS: SalesClient[] = [
  { id: "c1", businessName: "Cross Creek Mall", contactName: "Sarah Johnson", email: "sarah@crosscreekmall.com", phone: "(910) 555-0101", address: "419 Cross Creek Mall, Fayetteville, NC", category: "Retail" },
  { id: "c2", businessName: "Cape Fear Valley Health", contactName: "Dr. Michael Brown", email: "mbrown@capefearvalley.com", phone: "(910) 555-0202", address: "1638 Owen Dr, Fayetteville, NC", category: "Healthcare" },
  { id: "c3", businessName: "Fort Liberty Auto Group", contactName: "James Williams", email: "james@ftlibertyauto.com", phone: "(910) 555-0303", address: "5925 Yadkin Rd, Fayetteville, NC", category: "Automotive" },
  { id: "c4", businessName: "Mash House Brewing", contactName: "Kim Taylor", email: "kim@mashhouse.com", phone: "(910) 555-0404", address: "4150 Sycamore Dairy Rd, Fayetteville, NC", category: "Restaurant" },
  { id: "c5", businessName: "Cumberland County Schools", contactName: "Angela Davis", email: "adavis@ccs.k12.nc.us", phone: "(910) 555-0505", address: "2465 Gillespie St, Fayetteville, NC", category: "Education" },
];

export const DAYPART_DESCRIPTIONS: Record<DaypartId, string> = {
  morning_drive: "Peak commute hours with the highest listener engagement across the Fayetteville market.",
  midday: "Strong midday reach during lunch breaks and errands, great for local businesses.",
  afternoon_drive: "High-traffic afternoon commute window with strong advertiser demand.",
  evening: "Relaxed evening listening for entertainment, dining, and lifestyle brands.",
  overnight: "Cost-effective overnight slots ideal for brand awareness and frequency campaigns.",
};

export const DAYPART_COLORS: Record<DaypartId, { bg: string; text: string; border: string }> = {
  morning_drive: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  midday: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/20" },
  afternoon_drive: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  evening: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20" },
  overnight: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatHour(h: number): string {
  if (h === 0 || h === 24) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadOrSeed<T>(key: string, seed: T[]): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T[];
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  } catch {
    return seed;
  }
}

export function persist<T>(key: string, data: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

export function computeWeeks(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
  return ms > 0 ? Math.max(1, Math.round(ms / (7 * 24 * 60 * 60 * 1000))) : 0;
}

// ---------------------------------------------------------------------------
// Marketing Campaign Builder types (new)
// ---------------------------------------------------------------------------
import type { CampaignType, SpotLength, DayCategory } from "@/data/rate-card";
export type { CampaignType, SpotLength, DayCategory };

export interface TrafficOrderLine {
  daypartId: string;
  showName: string;
  dayCategory: DayCategory;
  timeRange: string;
  spotLength: SpotLength;
  breakPosition: ":18" | ":48" | "ROS";
  rate: number;
  spotsPerWeek: number;
}

export interface TrafficOrder {
  advertiser: string;
  agency: string;
  campaignName: string;
  flightStart: string;
  flightEnd: string;
  totalWeeks: number;
  lines: TrafficOrderLine[];
  totalSpots: number;
  totalCost: number;
}

export interface FlightWeek {
  weekNumber: number;
  startDate: string;
  endDate: string;
}

export interface MarketingCampaign {
  id: string;
  campaignType: CampaignType;
  campaignName: string;
  client: SalesClient;
  flightStart: string;
  flightEnd: string;
  trafficOrder: TrafficOrder | null;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: "draft" | "active" | "completed";
  createdAt: string;
}

export function computeFlightWeeks(start: string, end: string): FlightWeek[] {
  if (!start || !end) return [];
  const weeks: FlightWeek[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);
  let weekNum = 1;
  const current = new Date(startDate);
  while (current < endDate) {
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weeks.push({
      weekNumber: weekNum++,
      startDate: current.toISOString().slice(0, 10),
      endDate: (weekEnd > endDate ? endDate : weekEnd).toISOString().slice(0, 10),
    });
    current.setDate(current.getDate() + 7);
  }
  return weeks;
}

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 9999) + 1;
  return `INV-${year}-${String(seq).padStart(4, "0")}`;
}
