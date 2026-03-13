import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Streaming Analytics Edge Function
 *
 * Fetches today's Cir.st streaming log, parses it in-memory, and returns
 * computed live metrics (current listeners, peak hour, hourly breakdown, etc.)
 *
 * GET /streaming-analytics — returns live metrics JSON
 * GET /streaming-analytics?date=2026-03-13 — metrics for a specific date
 */

const CIRST_BASE =
  "https://r.cir.st/dx/remote_data_request.cfm";
const STATION = "WCCG";
const AUTH_TOKEN = Deno.env.get("CIRST_AUTH_TOKEN") ?? "";

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

interface LiveMetrics {
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

// ---------- Parser ----------

const LOG_REGEX =
  /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+)[^"]*" (\d{3}) (\d+|-) "([^"]*)" "([^"]*)"(?:\s+(\d+))?(?:\s+(\S{2})\s+(\S{2})\s+(.+?)\s+(\d{3,5}))?$/;

function parseTimestamp(raw: string): Date | null {
  // Format: 13/Mar/2026:00:03:23 -0400
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

// ---------- Metrics Computation ----------

function computeMetrics(entries: ParsedEntry[], logDate: string): LiveMetrics {
  const now = Date.now();
  const fiveMinAgo = now - 5 * 60 * 1000;

  // Unique IPs in last 5 minutes
  const recentIps = new Set<string>();
  const allIps = new Set<string>();
  let totalDuration = 0;
  let totalBytes = 0;

  // Hourly: map hour → Set<ip>
  const hourlyMap = new Map<number, Set<string>>();

  // User-agent counts
  const uaMap = new Map<string, number>();

  for (const e of entries) {
    allIps.add(e.ip);
    totalDuration += e.durationSecs;
    totalBytes += e.bytesSent;

    if (e.timestamp.getTime() >= fiveMinAgo) {
      recentIps.add(e.ip);
    }

    const hour = e.timestamp.getHours();
    if (!hourlyMap.has(hour)) hourlyMap.set(hour, new Set());
    hourlyMap.get(hour)!.add(e.ip);

    // Simplify user-agent for grouping
    let ua = "Other";
    const raw = e.userAgent;
    if (raw.includes("Chrome") && !raw.includes("Edg")) ua = "Chrome";
    else if (raw.includes("Safari") && !raw.includes("Chrome")) ua = "Safari";
    else if (raw.includes("Firefox")) ua = "Firefox";
    else if (raw.includes("Edg")) ua = "Edge";
    else if (raw.includes("VLC")) ua = "VLC";
    else if (raw.includes("okhttp")) ua = "Android App";
    else if (raw.includes("Lavf") || raw.includes("ffmpeg")) ua = "FFmpeg/Lavf";
    else if (raw.includes("python")) ua = "Python";
    uaMap.set(ua, (uaMap.get(ua) || 0) + 1);
  }

  // Hourly breakdown
  const hourlyBreakdown: { hour: number; listeners: number }[] = [];
  let peakHour = 0;
  let peakListeners = 0;
  for (let h = 0; h < 24; h++) {
    const count = hourlyMap.get(h)?.size ?? 0;
    hourlyBreakdown.push({ hour: h, listeners: count });
    if (count > peakListeners) {
      peakListeners = count;
      peakHour = h;
    }
  }

  // Top user agents
  const topUserAgents = [...uaMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([agent, count]) => ({ agent, count }));

  return {
    currentListeners: recentIps.size,
    totalUniqueListeners: allIps.size,
    totalListeningHours: Math.round((totalDuration / 3600) * 10) / 10,
    totalRequests: entries.length,
    peakListeners,
    peakHour,
    avgSessionDurationSecs:
      allIps.size > 0 ? Math.round(totalDuration / allIps.size) : 0,
    topUserAgents,
    hourlyBreakdown,
    dataAsOf: new Date().toISOString(),
    logDate,
  };
}

// ---------- Handler ----------

Deno.serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");

    // Build Cir.st URL
    let cirstUrl = `${CIRST_BASE}?stationCallSign=${STATION}&authtoken=${AUTH_TOKEN}&requestType=logRetrieve`;
    if (dateParam) {
      cirstUrl += `&logDate=${dateParam}`;
    }

    // Fetch log
    const resp = await fetch(cirstUrl, {
      signal: AbortSignal.timeout(15_000),
    });

    if (!resp.ok) {
      throw new Error(`Cir.st API returned ${resp.status}`);
    }

    const text = await resp.text();

    // Check for XML error response
    if (text.trim().startsWith("<?xml") || text.trim().startsWith("<error")) {
      throw new Error("Cir.st API returned error response");
    }

    const entries = parseLog(text);
    const logDate = dateParam || new Date().toISOString().slice(0, 10);
    const metrics = computeMetrics(entries, logDate);

    return new Response(JSON.stringify(metrics), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=30" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
