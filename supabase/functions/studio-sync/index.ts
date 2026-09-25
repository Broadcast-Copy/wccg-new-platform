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
// POST {secret, action:"converted", id, from, size_bytes?}
//                                     -> record that the studio PC transcoded a
//                                        non-mp3 upload to mp3 (see migration 111)
// POST {secret, action:"roster"}       -> active mixshow DJs (>=1 active slot): {slug,name,email}
//
// Email ingest (gmail-watcher.py; DJs who email a pack instead of using the portal):
// POST {secret, action:"ingest", dj_slug, file_code, week_of, size_bytes, format,
//       checksum_sha256, source:"email"}
//                                     -> checks the code is in one of that DJ's ACTIVE
//                                        slots, returns {upload_url, storage_path,
//                                        drop_id, existing} — a signed (2 h) upsert
//                                        upload URL at the portal's storage_path.
//                                        No DB write yet.
// POST {same fields, action:"ingested"} -> after the PUT: confirms the object is in the
//                                        bucket at size_bytes, then upserts the
//                                        dj_drops row on (slot_id,file_code,week_of)
//                                        as status 'uploaded', source 'email',
//                                        published_at cleared -> Studio Sync files it.

const SECRET = "c2040f1371c9265c538bdce3547346bd5ae53060";

function json(o: unknown, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } }); }

const CODE_RE = /^DJB_\d{5}$/;
const WEEK_RE = /^\d{4}-\d{2}-\d{2}$/;
const SHA_RE = /^[0-9a-f]{64}$/;
const INGEST_FORMATS = new Set(["mp3", "wav", "aiff", "flac"]);
const MAX_BYTES = 1073741824; // dj-drops bucket file_size_limit (migration 111)

interface IngestTarget {
  dj_id: string; slug: string; slot_id: string; file_code: string; week_of: string;
  format: string; size_bytes: number; checksum_sha256: string; storage_path: string;
}

type Resolved = { ok: true; t: IngestTarget } | { ok: false; error: string; status: number };

// Shared by "ingest" and "ingested": validate the request and pin it to a real,
// ACTIVE slot of that DJ. storage_path mirrors the portal's uploadFile():
// `${slug}/${week_of}/${code}.${ext}`, so Studio Sync can't tell the two apart.
// deno-lint-ignore no-explicit-any
async function resolveIngest(supabase: any, body: Record<string, unknown>): Promise<Resolved> {
  const bad = (error: string, status = 400): Resolved => ({ ok: false, error, status });
  const slug = String(body.dj_slug ?? "").trim();
  const code = String(body.file_code ?? "").trim().toUpperCase();
  const week = String(body.week_of ?? "").trim();
  const format = String(body.format ?? "").trim().toLowerCase().replace(/^\./, "");
  const size = Number(body.size_bytes);
  const sum = String(body.checksum_sha256 ?? "").trim().toLowerCase();
  if ((body.source ?? "email") !== "email") return bad("source must be 'email'");
  if (!slug) return bad("no dj_slug");
  if (!CODE_RE.test(code)) return bad("file_code must look like DJB_12345");
  const monday = new Date(`${week}T12:00:00Z`);
  if (!WEEK_RE.test(week) || Number.isNaN(monday.getTime()) || monday.getUTCDay() !== 1) {
    return bad("week_of must be the ISO Monday (YYYY-MM-DD) of the air week");
  }
  if (!INGEST_FORMATS.has(format)) return bad(`format '${format}' not accepted`);
  if (!Number.isInteger(size) || size <= 0 || size > MAX_BYTES) return bad("size_bytes out of range");
  if (!SHA_RE.test(sum)) return bad("checksum_sha256 must be 64 lowercase hex chars");

  const { data: dj, error: djErr } = await supabase.from("djs").select("id,slug").eq("slug", slug).maybeSingle();
  if (djErr) return bad(djErr.message, 500);
  if (!dj) return bad(`unknown dj ${slug}`, 404);
  const { data: slots, error: slotErr } = await supabase
    .from("dj_slots").select("id,file_codes").eq("dj_id", dj.id).eq("status", "active");
  if (slotErr) return bad(slotErr.message, 500);
  const slot = ((slots ?? []) as Array<{ id: string; file_codes: string[] | null }>)
    .find((s) => (s.file_codes ?? []).includes(code));
  if (!slot) return bad(`${code} is not in an active slot for ${slug}`, 409);
  return {
    ok: true,
    t: {
      dj_id: dj.id, slug, slot_id: slot.id, file_code: code, week_of: week, format,
      size_bytes: size, checksum_sha256: sum, storage_path: `${slug}/${week}/${code}.${format}`,
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* */ }
  if (body.secret !== SECRET) return json({ error: "forbidden" }, 403);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  if (body.action === "pending") {
    const { data, error } = await supabase
      .from("dj_drops")
      .select("id,file_code,storage_path,format,week_of,status,size_bytes,convert_to_mp3,converted_at,source_format,djs(slug,display_name),slot:dj_slots(day_of_week,start_time)")
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

  if (body.action === "converted") {
    // The file that actually went to air is now an mp3. Rewrite `format` so a
    // re-sync looks for CODE.mp3 on disk rather than the original CODE.aiff,
    // and keep what it used to be in source_format.
    if (!body.id) return json({ error: "no id" }, 400);
    const patch: Record<string, unknown> = {
      format: "mp3",
      converted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (body.from) patch.source_format = String(body.from).toLowerCase();
    // size_bytes described the AIFF; the mp3 on disk is much smaller and the
    // sync's file_ok() size check compares against whatever is stored here.
    if (typeof body.size_bytes === "number") patch.size_bytes = body.size_bytes;
    const { error } = await supabase.from("dj_drops").update(patch).eq("id", body.id);
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

  if (body.action === "ingest") {
    const r = await resolveIngest(supabase, body);
    if (!r.ok) return json({ error: r.error }, r.status);
    const t = r.t;
    // Existing row for this (slot, code, week), so the caller can skip a part it
    // already ingested (same checksum at the same path) instead of re-uploading.
    const { data: existing, error: exErr } = await supabase
      .from("dj_drops")
      .select("id,status,source,storage_path,size_bytes,checksum_sha256")
      .eq("slot_id", t.slot_id).eq("file_code", t.file_code).eq("week_of", t.week_of)
      .maybeSingle();
    if (exErr) return json({ error: exErr.message }, 500);
    const { data: up, error: upErr } = await supabase.storage
      .from("dj-drops")
      .createSignedUploadUrl(t.storage_path, { upsert: true });
    if (upErr || !up) return json({ error: `signed upload url: ${upErr?.message ?? "none"}` }, 500);
    return json({
      ok: true,
      upload_url: up.signedUrl,
      storage_path: t.storage_path,
      drop_id: existing?.id ?? null,
      existing: existing ?? null,
    });
  }

  if (body.action === "ingested") {
    const r = await resolveIngest(supabase, body);
    if (!r.ok) return json({ error: r.error }, r.status);
    const t = r.t;
    // Don't flip the row to 'uploaded' unless the bytes really landed: Studio
    // Sync downloads whatever sits at storage_path the moment it sees the row.
    const cut = t.storage_path.lastIndexOf("/");
    const folder = t.storage_path.slice(0, cut);
    const name = t.storage_path.slice(cut + 1);
    const { data: objs, error: lsErr } = await supabase.storage
      .from("dj-drops").list(folder, { search: name, limit: 20 });
    if (lsErr) return json({ error: `list: ${lsErr.message}` }, 500);
    const obj = ((objs ?? []) as Array<{ name: string; metadata: { size?: number } | null }>)
      .find((o) => o.name === name);
    if (!obj) return json({ error: `object ${t.storage_path} not found — upload first` }, 409);
    const got = Number(obj.metadata?.size ?? -1);
    if (got !== t.size_bytes) {
      return json({ error: `object is ${got} bytes, expected ${t.size_bytes}` }, 409);
    }
    const now = new Date().toISOString();
    const { data: row, error: rowErr } = await supabase
      .from("dj_drops")
      .upsert(
        {
          dj_id: t.dj_id,
          slot_id: t.slot_id,
          file_code: t.file_code,
          week_of: t.week_of,
          status: "uploaded",
          source: "email",
          storage_path: t.storage_path,
          size_bytes: t.size_bytes,
          format: t.format,
          checksum_sha256: t.checksum_sha256,
          convert_to_mp3: t.format !== "mp3",
          source_format: null,
          converted_at: null,
          rejection_reason: null,
          uploaded_at: now,
          updated_at: now,
          validated_at: null,
          // cleared so the portal/admin show it as new and Studio Sync re-files it
          published_at: null,
        },
        { onConflict: "slot_id,file_code,week_of" },
      )
      .select("id")
      .single();
    if (rowErr) return json({ error: rowErr.message }, 500);
    return json({ ok: true, id: row.id, storage_path: t.storage_path });
  }

  return json({ error: "unknown action" }, 400);
});
