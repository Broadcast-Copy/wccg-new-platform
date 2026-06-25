import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// dj-setup-link (verify_jwt=false, shared-secret gated).
// Admin-generates a password setup (recovery) link for a DJ WITHOUT sending an
// email — so it bypasses the Supabase auth email rate limit (over_email_send_
// rate_limit). The link is delivered via the Gmail pipeline (scripts/send-dj-
// setup.py) instead. The DJ clicks it, lands on /reset-password with a valid
// session, and sets a password.
//
// POST {secret, email, redirectTo?} -> { ok, link, email }

const SECRET = "c2040f1371c9265c538bdce3547346bd5ae53060";
function json(o: unknown, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } }); }

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* */ }
  if (body.secret !== SECRET) return json({ error: "forbidden" }, 403);
  const email = String(body.email ?? "").trim();
  if (!email) return json({ error: "no email" }, 400);
  const redirectTo = String(body.redirectTo ?? "https://app.wccg1045fm.com/reset-password");
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });
  if (error) return json({ error: error.message }, 500);
  const link = (data as { properties?: { action_link?: string } })?.properties?.action_link ?? null;
  return json({ ok: true, email, link });
});
