import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// dj-setup-link (verify_jwt=false, shared-secret gated).
// Two actions, both server-side via the service-role key (never exposed):
//   action "recovery" (default): admin-generate a recovery CODE (email_otp) +
//     link WITHOUT sending email (bypasses the auth email rate limit). The CODE
//     is scanner-proof but still expires (~OTP expiry).
//   action "setpass": set a strong TEMPORARY password that does NOT expire and
//     cannot be consumed by an email scanner -- the reliable first-login path
//     for DJs who never managed to use a one-time code/link. Delivered via
//     scripts/send-dj-temppass.py.
// POST {secret, action?, email?, user_id?, redirectTo?}
const SECRET = "c2040f1371c9265c538bdce3547346bd5ae53060";
function json(o: unknown, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } }); }
function tempPassword(): string {
  const cs = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const a = new Uint32Array(9); crypto.getRandomValues(a);
  let s = ""; for (let i = 0; i < 9; i++) s += cs[a[i] % cs.length];
  return "Wccg-" + s; // e.g. Wccg-7KdMq3RtP : upper+lower+digit, 14 chars
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* */ }
  if (body.secret !== SECRET) return json({ error: "forbidden" }, 403);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const action = String(body.action ?? "recovery");
  const email = String(body.email ?? "").trim();

  if (action === "setpass") {
    let userId = String(body.user_id ?? "").trim();
    if (!userId) {
      if (!email) return json({ error: "need user_id or email" }, 400);
      const { data, error } = await supabase.auth.admin.generateLink({ type: "recovery", email });
      if (error) return json({ error: error.message }, 500);
      userId = (data as { user?: { id?: string } })?.user?.id ?? "";
      if (!userId) return json({ error: "user not found" }, 404);
    }
    const password = tempPassword();
    const { data: upd, error: uerr } = await supabase.auth.admin.updateUserById(userId, { password, email_confirm: true });
    if (uerr) return json({ error: uerr.message }, 500);
    const uemail = (upd as { user?: { email?: string } })?.user?.email ?? email;
    return json({ ok: true, email: uemail, user_id: userId, password });
  }

  if (!email) return json({ error: "no email" }, 400);
  const redirectTo = String(body.redirectTo ?? "https://wccg1045fm.com/reset-password");
  const { data, error } = await supabase.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo } });
  if (error) return json({ error: error.message }, 500);
  const props = (data as { properties?: { action_link?: string; email_otp?: string } })?.properties;
  return json({ ok: true, email, code: props?.email_otp ?? null, link: props?.action_link ?? null });
});
