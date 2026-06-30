import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { SignJWT } from "npm:jose@5";

// livekit-token — mint a short-lived LiveKit join token for the SIGNED-IN user.
//
// The Podcast Studio (apps/web/.../studio/podcast) connects multiple users to a
// shared LiveKit room. The LiveKit API secret must never reach the browser, so
// the token is minted here (Deno edge, service-side) and returned to the client.
//
// POST {room, name?}  (Authorization: Bearer <user jwt>, added automatically by
//                      supabase-js functions.invoke)
//   -> { token, url, identity, room, name }
//
// Identity is ALWAYS the authenticated user's id (never trusted from the client)
// so participants are unique and can't impersonate each other.
//
// Required Supabase secrets (set once, see scripts/STUDIO-LIVEKIT-SETUP.md):
//   LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL (wss://<project>.livekit.cloud)
// Until those are set this returns 503, and the studio stays in solo mode.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(o: unknown, s = 200) {
  return new Response(JSON.stringify(o), {
    status: s,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const API_KEY = Deno.env.get("LIVEKIT_API_KEY");
  const API_SECRET = Deno.env.get("LIVEKIT_API_SECRET");
  const LK_URL = Deno.env.get("LIVEKIT_URL");
  if (!API_KEY || !API_SECRET || !LK_URL) {
    return json({ error: "LiveKit not configured" }, 503);
  }

  // Require an authenticated user (supabase-js forwards the user's JWT).
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json({ error: "unauthorized" }, 401);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: uErr } = await supabase.auth.getUser();
  if (uErr || !user) return json({ error: "unauthorized" }, 401);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* */ }

  // Sanitize the room name to LiveKit-safe characters.
  const room = String(body.room ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  if (!room) return json({ error: "room required" }, 400);

  const identity = user.id;
  const name =
    String(body.name ?? "").trim() ||
    (user.user_metadata?.display_name as string | undefined) ||
    (user.email ?? "Guest");

  const now = Math.floor(Date.now() / 1000);
  const ttl = 6 * 60 * 60; // 6 hours

  const token = await new SignJWT({
    name,
    video: {
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(API_KEY)
    .setSubject(identity)
    .setIssuedAt(now)
    .setNotBefore(now)
    .setExpirationTime(now + ttl)
    .sign(new TextEncoder().encode(API_SECRET));

  return json({ token, url: LK_URL, identity, room, name });
});
