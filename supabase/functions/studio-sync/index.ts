import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// studio-sync (verify_jwt=false, shared-secret gated). Lets the broadcast PC's
// hourly sync pull DJ portal uploads to local disk + playout WITHOUT the admin
// password (the old studio-sync-watcher needed it). The dj-drops bucket is
// PUBLIC so the file bytes download with no auth; this function (service role)
// only does the two things anon can't: list pre-publish drops and mark a drop
// published once it's safely on local disk.
//
// POST {secret, action:"pending"}      -> uploaded/validated drops + dj slug + slot day
// POST {secret, action:"publish", id}  -> mark a drop published (now playable on the site)

const SECRET = "c2040f1371c9265c538bdce3547346bd5ae53060";

function json(o: unknown, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } }); }

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* */ }
  if (body.secret !== SECRET) return json({ error: "forbidden" }, 403);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  if (body.action === "pending") {
    const { data, error } = await supabase
      .from("dj_drops")
      .select("id,file_code,storage_path,format,week_of,status,size_bytes,djs(slug,display_name),slot:dj_slots(day_of_week,start_time)")
      .in("status", ["uploaded", "validated"])
      .not("storage_path", "is", null)
      .order("uploaded_at", { ascending: true })
      .limit(300);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, drops: data ?? [] });
  }

  if (body.action === "publish") {
    if (!body.id) return json({ error: "no id" }, 400);
    const { error } = await supabase
      .from("dj_drops")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", body.id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  return json({ error: "unknown action" }, 400);
});
