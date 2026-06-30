import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  EncodingOptionsPreset,
  EgressStatus,
} from "npm:livekit-server-sdk@2";

// livekit-egress — start/stop/refresh a WHOLE-ROOM recording of a Podcast Studio
// session (LiveKit Room Composite Egress). The finished MP4 is uploaded by
// LiveKit to the private `studio-recordings` Supabase bucket (S3-compatible
// endpoint), and tracked in public.studio_recordings (owner-only / "My Studio").
//
// POST {action:"start", room, title?}      -> { ok, egressId, recordingId, storage_path }
// POST {action:"stop",  egressId}          -> { ok }
// POST {action:"status"}                    -> { ok, updated }  (refresh this user's pending recordings)
//
// Auth: requires a signed-in user (supabase-js forwards the JWT). The recording
// is always owned by that user.
//
// Required secrets: LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL (shared with
// livekit-token) PLUS SUPABASE_S3_ACCESS_KEY, SUPABASE_S3_SECRET_KEY (Supabase
// Storage S3 access keys — see scripts/STUDIO-LIVEKIT-SETUP.md). Returns 503
// until they exist.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(o: unknown, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
}

const RECORDINGS_BUCKET = "studio-recordings";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const API_KEY = Deno.env.get("LIVEKIT_API_KEY");
  const API_SECRET = Deno.env.get("LIVEKIT_API_SECRET");
  const LK_URL = Deno.env.get("LIVEKIT_URL");
  if (!API_KEY || !API_SECRET || !LK_URL) return json({ error: "LiveKit not configured" }, 503);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

  // Auth: who is recording?
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json({ error: "unauthorized" }, 401);
  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: uErr } = await userClient.auth.getUser();
  if (uErr || !user) return json({ error: "unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const egress = new EgressClient(LK_URL.replace("wss://", "https://"), API_KEY, API_SECRET);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* */ }
  const action = String(body.action ?? "");

  // ── START ────────────────────────────────────────────────────────────────
  if (action === "start") {
    const S3_KEY = Deno.env.get("SUPABASE_S3_ACCESS_KEY");
    const S3_SECRET = Deno.env.get("SUPABASE_S3_SECRET_KEY");
    if (!S3_KEY || !S3_SECRET) return json({ error: "recording storage not configured" }, 503);

    const room = String(body.room ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
    if (!room) return json({ error: "room required" }, 400);

    const filepath = `${user.id}/${Date.now()}-${room}.mp4`;
    const output = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath,
      output: {
        case: "s3",
        value: {
          accessKey: S3_KEY,
          secret: S3_SECRET,
          bucket: RECORDINGS_BUCKET,
          region: "us-east-1",
          endpoint: `${SUPABASE_URL}/storage/v1/s3`,
          forcePathStyle: true,
        },
      },
    });

    let egressId: string;
    try {
      const info = await egress.startRoomCompositeEgress(room, output, {
        layout: "grid",
        encodingOptions: EncodingOptionsPreset.H264_720P_30,
        audioOnly: false,
      });
      egressId = info.egressId;
    } catch (e) {
      return json({ error: `egress start failed: ${(e as Error).message}` }, 502);
    }

    const { data, error } = await admin
      .from("studio_recordings")
      .insert({
        owner_id: user.id,
        room,
        title: String(body.title ?? "").trim() || "Studio Session",
        egress_id: egressId,
        status: "recording",
        storage_path: filepath,
        format: "mp4",
      })
      .select("id")
      .single();
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true, egressId, recordingId: data?.id, storage_path: filepath });
  }

  // ── STOP ─────────────────────────────────────────────────────────────────
  if (action === "stop") {
    const egressId = String(body.egressId ?? "");
    if (!egressId) return json({ error: "egressId required" }, 400);
    try {
      await egress.stopEgress(egressId);
    } catch (e) {
      // Already stopped/ended is fine; record the attempt and move on.
      console.warn("stopEgress:", (e as Error).message);
    }
    await admin
      .from("studio_recordings")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("egress_id", egressId)
      .eq("owner_id", user.id);
    return json({ ok: true });
  }

  // ── STATUS (poll LiveKit for this user's pending recordings) ───────────────
  if (action === "status") {
    const { data: pending } = await admin
      .from("studio_recordings")
      .select("id, egress_id")
      .eq("owner_id", user.id)
      .in("status", ["recording", "processing"])
      .not("egress_id", "is", null);

    let updated = 0;
    for (const r of pending ?? []) {
      try {
        const list = await egress.listEgress({ egressId: r.egress_id as string });
        const info = Array.isArray(list) ? list[0] : list;
        if (!info) continue;
        if (info.status === EgressStatus.EGRESS_COMPLETE) {
          const file = info.fileResults?.[0];
          await admin.from("studio_recordings").update({
            status: "ready",
            duration_seconds: file?.duration ? Math.round(Number(file.duration) / 1e9) : null,
            size_bytes: file?.size ? Number(file.size) : null,
            updated_at: new Date().toISOString(),
          }).eq("id", r.id);
          updated++;
        } else if (
          info.status === EgressStatus.EGRESS_FAILED ||
          info.status === EgressStatus.EGRESS_ABORTED
        ) {
          await admin.from("studio_recordings").update({
            status: "failed",
            error: info.error || "egress failed",
            updated_at: new Date().toISOString(),
          }).eq("id", r.id);
          updated++;
        }
      } catch (e) {
        console.warn("status check:", (e as Error).message);
      }
    }
    return json({ ok: true, updated });
  }

  return json({ error: "unknown action" }, 400);
});
