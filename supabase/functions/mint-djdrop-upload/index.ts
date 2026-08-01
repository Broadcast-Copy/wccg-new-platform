import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Secret-gated minter of signed upload URLs for the public `dj-drops` bucket.
// Lets a trusted server-side caller (DJ email-mix sync) push a DJ's mix into
// the platform the same way the browser DJ-portal upload does. verify_jwt is
// off; access is gated by the x-ingest-secret header.
const SECRET = "wccg-djdrop-ingest-9fK2xQ7";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  }
  if (req.headers.get("x-ingest-secret") !== SECRET) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }
  let path: unknown;
  try {
    ({ path } = await req.json());
  } catch {
    return new Response(JSON.stringify({ error: "bad json" }), { status: 400 });
  }
  if (typeof path !== "string" || !path.startsWith("dj-") || path.includes("..")) {
    return new Response(JSON.stringify({ error: "invalid path" }), { status: 400 });
  }
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await sb.storage
    .from("dj-drops")
    .createSignedUploadUrl(path, { upsert: true });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ token: data.token, path: data.path }), {
    headers: { "Content-Type": "application/json" },
  });
});
