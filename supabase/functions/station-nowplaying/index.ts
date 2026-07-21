// station-nowplaying: receives the live now-playing from a station's on-prem
// bridge and upserts the public station_now_playing row.
// Auth: per-station key (x-airsuite-key) checked against airsuite_station_keys.
import { createClient } from "jsr:@supabase/supabase-js@2";

type NowPlayingBody = {
  station_id?: string;
  artist?: string;
  title?: string;
  cut?: string;
  category?: string;
  started_at?: string;
  duration?: string;
  next_artist?: string;
  next_title?: string;
  source?: string;
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const key = req.headers.get("x-airsuite-key") ?? "";
  let body: NowPlayingBody;
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

  const { error: upErr } = await admin.from("station_now_playing").upsert({
    station_id: stationId,
    updated_at: new Date().toISOString(),
    artist: body.artist ?? null,
    title: body.title ?? null,
    cut: body.cut ?? null,
    category: body.category ?? null,
    started_at: body.started_at ?? null,
    duration: body.duration ?? null,
    next_artist: body.next_artist ?? null,
    next_title: body.next_title ?? null,
    source: body.source ?? "djb",
  });
  if (upErr) return new Response(JSON.stringify({ error: upErr.message }), { status: 500 });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
