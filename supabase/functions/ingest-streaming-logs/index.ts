import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Ingest Streaming Logs Edge Function
 *
 * Fetches Cir.st streaming logs, parses them, and stores parsed entries
 * in the stream_log_entries table. Also computes and upserts daily stats.
 *
 * POST /ingest-streaming-logs — ingest today's log
 * POST /ingest-streaming-logs?date=2026-03-12 — ingest a specific date
 *
 * Can be scheduled via pg_cron every 15 minutes or called manually via HTTP POST
 */

const CIRST_BASE = "https://r.cir.st/dx/remote_data_request.cfm";
const STATION = "WCCG";
const AUTH_TOKEN = Deno.env.get("CIRST_AUTH_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const MONTH_MAP: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

// ---------- Types ----------

interface ParsedEntry {
  ip: string;
  timestamp: Date;
  requestPath: string;
  statusCode: number;
  bytesSent: number;
  referrer: string;
  userAgent: string;
  durationSecs: number;
  countryCode?: string;
  stateCode?: string;
  city?: string;
  dmaCode?: string;
}

// ---------- Parser ----------

const LOG_REGEX =
  /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+)[^"]*" (\d{3}) (\d+|-) "([^"]*)" "([^"]*)"(?:\s+(\d+))?(?:\s+(\S{2})\s+(\S{2})\s+(.+?)\s+(\d{3,5}))?$/;

function parseTimestamp(raw: string): Date | null {
  const m = raw.match(
    /(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})\s([+-]\d{4})/,
  );
  if (!m) return null;
  const [, day, mon, year, hh, mm, ss, tz] = m;
  const month = MONTH_MAP[mon];
  if (!month) return null;
  return new Date(`${year}-${month}-${day}T${hh}:${mm}:${ss}${tz.slice(0, 3)}:${tz.slice(3)}`);
}

function parseLine(line: string): ParsedEntry | null {
  const m = line.match(LOG_REGEX);
  if (!m) return null;
  const ts = parseTimestamp(m[2]);
  if (!ts) return null;
  return {
    ip: m[1],
    timestamp: ts,
    requestPath: m[4],
    statusCode: parseInt(m[5], 10),
    bytesSent: m[6] === "-" ? 0 : parseInt(m[6], 10),
    referrer: m[7],
    userAgent: m[8],
    durationSecs: m[9] ? parseInt(m[9], 10) : 0,
    countryCode: m[10] || undefined,
    stateCode: m[11] || undefined,
    city: m[12]?.trim() || undefined,
    dmaCode: m[13] || undefined,
  };
}

function parseLog(text: string): ParsedEntry[] {
  const entries: ParsedEntry[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const entry = parseLine(line);
    if (entry && entry.statusCode === 200) entries.push(entry);
  }
  return entries;
}

// ---------- Ingestion ----------

async function ingestEntries(
  supabase: ReturnType<typeof createClient>,
  entries: ParsedEntry[],
  logDate: string,
): Promise<number> {
  if (entries.length === 0) return 0;

  // Batch upsert in chunks of 500
  const BATCH_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE).map((e) => ({
      log_date: logDate,
      ip_address: e.ip,
      timestamp: e.timestamp.toISOString(),
      request_path: e.requestPath,
      status_code: e.statusCode,
      bytes_sent: e.bytesSent,
      user_agent: e.userAgent,
      referrer: e.referrer === "-" ? null : e.referrer,
      duration_secs: e.durationSecs,
      country_code: e.countryCode || null,
      state_code: e.stateCode || null,
      city: e.city || null,
      dma_code: e.dmaCode || null,
    }));

    const { error, count } = await supabase
      .from("stream_log_entries")
      .upsert(batch, {
        onConflict: "ip_address,timestamp",
        ignoreDuplicates: true,
        count: "exact",
      });

    if (error) {
      console.error(`Batch upsert error at offset ${i}:`, error.message);
    } else {
      inserted += count ?? batch.length;
    }
  }

  return inserted;
}

async function updateDailyStats(
  supabase: ReturnType<typeof createClient>,
  entries: ParsedEntry[],
  logDate: string,
): Promise<void> {
  if (entries.length === 0) return;

  const uniqueIps = new Set(entries.map((e) => e.ip));
  const totalDuration = entries.reduce((s, e) => s + e.durationSecs, 0);
  const totalBytes = entries.reduce((s, e) => s + e.bytesSent, 0);

  // Hourly peak
  const hourlyMap = new Map<number, Set<string>>();
  for (const e of entries) {
    const h = e.timestamp.getHours();
    if (!hourlyMap.has(h)) hourlyMap.set(h, new Set());
    hourlyMap.get(h)!.add(e.ip);
  }
  let peakHour = 0;
  let peakListeners = 0;
  for (const [h, ips] of hourlyMap) {
    if (ips.size > peakListeners) {
      peakListeners = ips.size;
      peakHour = h;
    }
  }

  // Top countries/states/cities
  const countryMap = new Map<string, number>();
  const stateMap = new Map<string, number>();
  const cityMap = new Map<string, number>();
  for (const e of entries) {
    if (e.countryCode) countryMap.set(e.countryCode, (countryMap.get(e.countryCode) || 0) + 1);
    if (e.stateCode) stateMap.set(e.stateCode, (stateMap.get(e.stateCode) || 0) + 1);
    if (e.city) cityMap.set(e.city, (cityMap.get(e.city) || 0) + 1);
  }
  const topN = (m: Map<string, number>, n: number) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([code, count]) => ({ code, count }));

  const { error } = await supabase
    .from("stream_log_daily_stats")
    .upsert(
      {
        log_date: logDate,
        unique_listeners: uniqueIps.size,
        total_requests: entries.length,
        total_listening_secs: totalDuration,
        total_bytes: totalBytes,
        peak_hour: peakHour,
        peak_listeners: peakListeners,
        top_countries: topN(countryMap, 10),
        top_states: topN(stateMap, 10),
        top_cities: topN(cityMap, 10),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "log_date" },
    );

  if (error) {
    console.error("Daily stats upsert error:", error.message);
  }
}

// ---------- Handler ----------

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");
    const logDate = dateParam || new Date().toISOString().slice(0, 10);

    // Fetch from Cir.st
    let cirstUrl = `${CIRST_BASE}?stationCallSign=${STATION}&authtoken=${AUTH_TOKEN}&requestType=logRetrieve`;
    if (dateParam) cirstUrl += `&logDate=${dateParam}`;

    const resp = await fetch(cirstUrl, { signal: AbortSignal.timeout(30_000) });
    if (!resp.ok) throw new Error(`Cir.st returned ${resp.status}`);

    const text = await resp.text();
    if (text.trim().startsWith("<?xml") || text.trim().startsWith("<error")) {
      throw new Error("Cir.st API returned error response");
    }

    const entries = parseLog(text);

    // Store in Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const inserted = await ingestEntries(supabase, entries, logDate);
    await updateDailyStats(supabase, entries, logDate);

    return new Response(
      JSON.stringify({
        success: true,
        logDate,
        totalParsed: entries.length,
        inserted,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
