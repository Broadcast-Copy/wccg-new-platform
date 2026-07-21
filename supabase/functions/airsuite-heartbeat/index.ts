// airsuite-heartbeat: receives status pushes from on-prem AirSuite engines.
// Auth: per-station key (x-airsuite-key) checked against airsuite_station_keys
// (service-role-only table). Upserts airsuite_station_status.
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const key = req.headers.get("x-airsuite-key") ?? "";
  let body: { station_id?: string; engine_version?: string; status?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response("bad json", { status: 400 });
  }
  const stationId = body.station_id ?? "";
  if (!stationId || !key) return new Response("unauthorized", { status: 401 });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: row, error } = await admin
    .from("airsuite_station_keys")
    .select("key")
    .eq("station_id", stationId)
    .single();
  if (error || !row || row.key !== key) return new Response("unauthorized", { status: 401 });

  const { error: upErr } = await admin.from("airsuite_station_status").upsert({
    station_id: stationId,
    updated_at: new Date().toISOString(),
    engine_version: body.engine_version ?? null,
    status: body.status ?? {},
  });
  if (upErr) return new Response(JSON.stringify({ error: upErr.message }), { status: 500 });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
