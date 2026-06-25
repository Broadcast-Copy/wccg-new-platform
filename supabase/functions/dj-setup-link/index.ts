import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// dj-setup-link (verify_jwt=false, shared-secret gated).
// Admin-generates a password setup (recovery) credential for a DJ WITHOUT
// sending an email — so it bypasses the Supabase auth email rate limit
// (over_email_send_rate_limit). Returns BOTH a 6-digit code (email_otp) and a
// link. The CODE is the robust path: email scanners pre-fetch one-time links and
// consume them before the DJ clicks (-> "link expired" white screen), but a code
// can't be used up by a scanner. The DJ enters email + code on /reset-password
// (verifyOtp type=recovery) and sets a password. Delivered via the Gmail pipeline
// (scripts/send-dj-setup.py).
//
// POST {secret, email, redirectTo?} -> { ok, email, code, link }

const SECRET = "c2040f1371c9265c538bdce3547346bd5ae53060";
function json(o: unknown, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } }); }

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* */ }
  if (body.secret !== SECRET) return json({ error: "forbidden" }, 403);
  const email = String(body.email ?? "").trim();
  if (!email) return json({ error: "no email" }, 400);
  const redirectTo = String(body.redirectTo ?? "https://wccg1045fm.com/reset-password");
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });
  if (error) return json({ error: error.message }, 500);
  const props = (data as { properties?: { action_link?: string; email_otp?: string } })?.properties;
  return json({ ok: true, email, code: props?.email_otp ?? null, link: props?.action_link ?? null });
});
