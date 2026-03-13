/**
 * Streaming Analytics — client helpers for Cir.st listener data.
 *
 * - fetchLiveMetrics()  → calls the `streaming-analytics` Edge Function
 * - fetchDailyStats()   → reads from `stream_log_daily_stats` via Supabase
 * - fetchLogEntries()   → reads from `stream_log_entries` via Supabase
 */

import { createClient } from "@/lib/supabase/client";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LiveMetrics {
  currentListeners: number;
  totalUniqueListeners: number;
  totalListeningHours: number;
  totalRequests: number;
  peakListeners: number;
  peakHour: number;
  avgSessionDurationSecs: number;
  topUserAgents: { agent: string; count: number }[];
  hourlyBreakdown: { hour: number; listeners: number }[];
  dataAsOf: string;
  logDate: string;
}

export interface DailyStat {
  id: string;
  log_date: string;
  unique_listeners: number;
  total_requests: number;
  total_listening_secs: number;
  total_bytes: number;
  peak_hour: number | null;
  peak_listeners: number;
  top_countries: { code: string; count: number }[];
  top_states: { code: string; count: number }[];
  top_cities: { code: string; count: number }[];
  updated_at: string;
}

export interface LogEntry {
  id: string;
  log_date: string;
  ip_address: string;
  timestamp: string;
  request_path: string | null;
  status_code: number | null;
  bytes_sent: number;
  user_agent: string | null;
  referrer: string | null;
  duration_secs: number;
  country_code: string | null;
  state_code: string | null;
  city: string | null;
  dma_code: string | null;
}

// ---------------------------------------------------------------------------
// Live Metrics (Edge Function)
// ---------------------------------------------------------------------------

export async function fetchLiveMetrics(date?: string): Promise<LiveMetrics | null> {
  try {
    let url = `${SUPABASE_URL}/functions/v1/streaming-analytics`;
    if (date) url += `?date=${date}`;

    const resp = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });

    if (!resp.ok) return null;
    return (await resp.json()) as LiveMetrics;
  } catch (err) {
    console.warn("Failed to fetch live metrics:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Daily Stats (Supabase table)
// ---------------------------------------------------------------------------

export async function fetchDailyStats(
  from: string,
  to: string,
): Promise<DailyStat[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("stream_log_daily_stats")
    .select("*")
    .gte("log_date", from)
    .lte("log_date", to)
    .order("log_date", { ascending: true });

  if (error || !data) {
    console.warn("Failed to fetch daily stats:", error?.message);
    return [];
  }

  return data as DailyStat[];
}

// ---------------------------------------------------------------------------
// Log Entries (Supabase table)
// ---------------------------------------------------------------------------

export async function fetchLogEntries(
  date: string,
  limit = 20,
): Promise<LogEntry[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("stream_log_entries")
    .select("*")
    .eq("log_date", date)
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.warn("Failed to fetch log entries:", error?.message);
    return [];
  }

  return data as LogEntry[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatDuration(secs: number): string {
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}h ${m}m`;
}

export function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

export function maskIp(ip: string): string {
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.xxx.xxx`;
  // IPv6 — just show first segment
  return ip.split(":").slice(0, 2).join(":") + "::xxx";
}
