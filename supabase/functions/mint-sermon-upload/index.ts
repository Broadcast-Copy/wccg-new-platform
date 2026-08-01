import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// TEMPORARY bulk-import helper (sermon archive + Tony Neal mixes + DJ bios).
// DELETE AFTER USE via the dashboard.
//
// POST {action:"mint", path, bucket?}        -> signed upload token
// POST {action:"record", ...sermon fields}    -> upsert sermons row
// POST {action:"record-drop", row}            -> insert dj_drops row
// POST {action:"set-dj-bio", slug, bio}       -> set profiles.bio for a DJ by
//   djs.slug (only when the profile's bio is currently empty).

const SECRET = "0493a297c313da1dc41082e7189971725fe76f31aa3100f2";
const BUCKETS = ["sermons", "dj-drops"];

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("nope", { status: 405 });
  if (req.headers.get("x-ingest-secret") !== SECRET) return new Response("forbidden", { status: 403 });
  const body = await req.json().catch(() => ({}));
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  if (body.action === "mint") {
    const bucket = BUCKETS.includes(body.bucket) ? body.bucket : "sermons";
    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(body.path, { upsert: true });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ token: data.token, path: data.path, bucket });
  }

  if (body.action === "record") {
    const { error } = await supabase.from("sermons").upsert(
      { church_code: body.church_code, air_date: body.air_date, storage_path: body.storage_path, format: body.format, size_bytes: body.size_bytes },
      { onConflict: "church_code,air_date" },
    );
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  if (body.action === "record-drop") {
    const { error } = await supabase.from("dj_drops").insert(body.row);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  if (body.action === "set-dj-bio") {
    const { data: dj, error: djErr } = await supabase.from("djs").select("user_id").eq("slug", body.slug).maybeSingle();
    if (djErr) return Response.json({ error: djErr.message }, { status: 500 });
    if (!dj?.user_id) return Response.json({ error: "no user_id for slug " + body.slug }, { status: 404 });
    // Only fill an empty bio (never clobber a self-written one).
    const { data: prof } = await supabase.from("profiles").select("bio").eq("id", dj.user_id).maybeSingle();
    if (prof && (prof.bio ?? "").trim() !== "") return Response.json({ ok: true, skipped: "bio exists" });
    const { error } = await supabase.from("profiles").update({ bio: body.bio }).eq("id", dj.user_id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true, user_id: dj.user_id });
  }

  return Response.json({ error: "unknown action" }, { status: 400 });
});
