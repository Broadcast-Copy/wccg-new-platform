import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// studio-sync (verify_jwt=false, shared-secret gated). Lets the broadcast PC's
// hourly sync pull DJ portal uploads to local disk + playout WITHOUT the admin
// password (the old studio-sync-watcher needed it). The dj-drops bucket is
// PUBLIC so the file bytes download with no auth; this function (service role)
// only does the things anon can't: list pre-publish drops, mark a drop
// published, and return the on-air mixshow DJ roster (with PII email) for the
// weekly upload reminder.
//
// POST {secret, action:"pending"}      -> uploaded/validated drops + dj slug + slot day
// POST {secret, action:"publish", id}  -> mark a drop published (now playable on the site)
// POST {secret, action:"roster"}       -> active mixshow DJs (>=1 active slot): {slug,name,email}

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

  if (body.action === "roster") {
    // Active on-air mixshow DJs (those holding >=1 active slot) + email, for the
    // weekly "upload your mix" reminder. Service-role read so PII email is
    // available. `!inner` returns only DJs that actually have an active slot.
    const { data, error } = await supabase
      .from("djs")
      .select("slug,display_name,email,dj_slots!inner(status)")
      .eq("is_active", true)
      .eq("dj_slots.status", "active")
      .not("email", "is", null);
    if (error) return json({ error: error.message }, 500);
    const seen = new Set<string>();
    const djs = (data ?? [])
      .filter((d) => {
        const e = (d as { email?: string }).email;
        const slug = (d as { slug: string }).slug;
        if (!e || !String(e).trim() || seen.has(slug)) return false;
        seen.add(slug);
        return true;
      })
      .map((d) => {
        const r = d as { slug: string; display_name: string; email: string };
        return { slug: r.slug, name: r.display_name, email: String(r.email).trim() };
      });
    return json({ ok: true, count: djs.length, djs });
  }

  return json({ error: "unknown action" }, 400);
});
