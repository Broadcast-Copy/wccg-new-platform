// fleet-ingest: receives the on-prem hub's fleet snapshot and mirrors it into
// the bc_devices / bc_device_agents / bc_device_peripherals / bc_device_installs
// tables (migration 105).
//
// AUTH: same model as airsuite-heartbeat — a per-station key in x-airsuite-key,
// checked against airsuite_station_keys (service-role-only). One credential per
// station, held by the hub. Individual machines never talk to this endpoint.
//
// SNAPSHOT SEMANTICS: every POST is a FULL snapshot and every write is an
// idempotent upsert. A station that was offline for a day recovers by sending
// its next snapshot; there is no delta to miss and no replay to get wrong.
//
// DELIBERATELY NOT DELETING: devices absent from a snapshot are left in place
// with their old last_seen rather than removed. A machine that is switched off,
// or a hub that momentarily cannot see it, must not silently vanish from the
// operator's plant view — going quiet and ceasing to exist are different facts,
// and only one of them is true. Removal is an explicit human action.
import { createClient } from "jsr:@supabase/supabase-js@2";

type AgentIn = {
  agent_id: string;
  agent_version?: string | null;
  last_report?: string | null;
  watch?: Record<string, boolean>;
  commands?: unknown[];
};

type PeripheralIn = {
  kind: string;
  label: string;
  detail?: string | null;
  identifier?: string | null;
  present?: boolean;
  meta?: Record<string, unknown>;
};

type InstallIn = {
  package: string;
  version?: string | null;
  channel?: string | null;
  install_path?: string | null;
  installed_at?: string | null;
};

type DeviceIn = {
  device_key: string;
  hostname?: string | null;
  display_name?: string | null;
  role?: string | null;
  room?: string | null;
  lan_ip?: string | null;
  aoip_ip?: string | null;
  os?: string | null;
  is_critical?: boolean;
  last_seen?: string | null;
  status?: Record<string, unknown>;
  agents?: AgentIn[];
  peripherals?: PeripheralIn[];
  installs?: InstallIn[];
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const key = req.headers.get("x-airsuite-key") ?? "";
  let body: { station_id?: string; devices?: DeviceIn[] };
  try {
    body = await req.json();
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const stationId = body.station_id ?? "";
  const devices = Array.isArray(body.devices) ? body.devices : [];
  if (!stationId || !key) return new Response("unauthorized", { status: 401 });

  // A runaway hub must not be able to write unbounded rows.
  if (devices.length > 200) {
    return new Response(JSON.stringify({ error: "too many devices in one snapshot" }), {
      status: 413,
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: keyRow, error: keyErr } = await admin
    .from("airsuite_station_keys")
    .select("key")
    .eq("station_id", stationId)
    .single();
  if (keyErr || !keyRow || keyRow.key !== key) {
    return new Response("unauthorized", { status: 401 });
  }

  const now = new Date().toISOString();
  const result = { devices: 0, agents: 0, peripherals: 0, installs: 0 };
  const problems: string[] = [];

  for (const d of devices) {
    if (!d || typeof d.device_key !== "string" || d.device_key.length === 0) {
      problems.push("device with no device_key skipped");
      continue;
    }

    const { data: devRow, error: devErr } = await admin
      .from("bc_devices")
      .upsert(
        {
          station_id: stationId,
          device_key: d.device_key,
          hostname: d.hostname ?? null,
          display_name: d.display_name ?? null,
          role: d.role ?? null,
          room: d.room ?? null,
          lan_ip: d.lan_ip ?? null,
          aoip_ip: d.aoip_ip ?? null,
          os: d.os ?? null,
          is_critical: d.is_critical === true,
          last_seen: d.last_seen ?? now,
          status: d.status ?? {},
        },
        { onConflict: "station_id,device_key" },
      )
      .select("id")
      .single();

    if (devErr || !devRow) {
      problems.push(`device ${d.device_key}: ${devErr?.message ?? "no row"}`);
      continue;
    }
    result.devices++;
    const deviceId = devRow.id as string;

    const agents = Array.isArray(d.agents) ? d.agents.slice(0, 10) : [];
    if (agents.length > 0) {
      const rows = agents
        .filter((a) => a && typeof a.agent_id === "string" && a.agent_id.length > 0)
        .map((a) => ({
          device_id: deviceId,
          agent_id: a.agent_id,
          agent_version: a.agent_version ?? null,
          last_report: a.last_report ?? null,
          watch: a.watch ?? {},
          commands: a.commands ?? [],
        }));
      if (rows.length > 0) {
        const { error } = await admin
          .from("bc_device_agents")
          .upsert(rows, { onConflict: "device_id,agent_id" });
        if (error) problems.push(`agents ${d.device_key}: ${error.message}`);
        else result.agents += rows.length;
      }
    }

    const peripherals = Array.isArray(d.peripherals) ? d.peripherals.slice(0, 60) : [];
    if (peripherals.length > 0) {
      const rows = peripherals
        .filter((p) => p && typeof p.kind === "string" && typeof p.label === "string")
        .map((p) => ({
          device_id: deviceId,
          kind: p.kind,
          label: p.label,
          detail: p.detail ?? null,
          identifier: p.identifier ?? null,
          present: p.present !== false,
          meta: p.meta ?? {},
        }));
      if (rows.length > 0) {
        const { error } = await admin
          .from("bc_device_peripherals")
          .upsert(rows, { onConflict: "device_id,kind,label" });
        if (error) problems.push(`peripherals ${d.device_key}: ${error.message}`);
        else result.peripherals += rows.length;
      }
    }

    const installs = Array.isArray(d.installs) ? d.installs.slice(0, 60) : [];
    if (installs.length > 0) {
      const rows = installs
        .filter((i) => i && typeof i.package === "string" && i.package.length > 0)
        .map((i) => ({
          device_id: deviceId,
          package: i.package,
          version: i.version ?? null,
          channel: i.channel ?? null,
          install_path: i.install_path ?? null,
          installed_at: i.installed_at ?? null,
          last_seen: now,
        }));
      if (rows.length > 0) {
        const { error } = await admin
          .from("bc_device_installs")
          .upsert(rows, { onConflict: "device_id,package" });
        if (error) problems.push(`installs ${d.device_key}: ${error.message}`);
        else result.installs += rows.length;
      }
    }
  }

  // Partial success is reported as success with a problems list: the hub must
  // not retry a whole snapshot because one machine had a bad row, and an
  // operator needs to see which one it was.
  return new Response(JSON.stringify({ ok: true, ...result, problems }), {
    headers: { "Content-Type": "application/json" },
  });
});
