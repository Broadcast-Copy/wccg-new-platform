/**
 * AirSuite engine-status helpers. The engine's `status` JSON shape is owned by
 * AirSuite and still evolving, so everything here reads it DEFENSIVELY —
 * unknown/missing fields degrade to null rather than throwing.
 */

export type EngineAlert = { text: string; level: string };

export type EngineSummary = {
  mode: string | null;
  currentTitle: string | null;
  uptimeSec: number | null;
  rendererAlive: boolean | null;
  muted: boolean | null;
  host: string | null;
  alerts: EngineAlert[];
};

/** A heartbeat within this window counts as "live". */
const ENGINE_ONLINE_MS = 5 * 60 * 1000;

export function isEngineOnline(updatedAt: string): boolean {
  const t = Date.parse(updatedAt);
  if (Number.isNaN(t)) return false;
  return Date.now() - t < ENGINE_ONLINE_MS;
}

export function lastSeen(updatedAt: string): string {
  const t = Date.parse(updatedAt);
  if (Number.isNaN(t)) return "unknown";
  const secs = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function formatUptime(sec: number | null): string | null {
  if (sec === null || !Number.isFinite(sec)) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}
function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function asBool(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}
function asObject(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

export function summarizeEngine(
  status: Record<string, unknown> | null,
): EngineSummary {
  const s = status ?? {};
  const current = asObject(s.current);
  const rawAlerts = Array.isArray(s.alerts) ? s.alerts : [];
  const alerts: EngineAlert[] = rawAlerts
    .map((entry) => asObject(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null)
    .map((entry) => ({
      text: asString(entry.text) ?? "",
      level: asString(entry.level) ?? "info",
    }))
    .filter((alert) => alert.text.length > 0);

  return {
    mode: asString(s.mode),
    currentTitle: current !== null ? asString(current.title) : null,
    uptimeSec: asNumber(s.uptimeSec),
    rendererAlive: asBool(s.rendererAlive),
    muted: asBool(s.muted),
    host: asString(s.host),
    alerts,
  };
}
