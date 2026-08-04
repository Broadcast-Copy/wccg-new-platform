import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// dj-setup-link (verify_jwt=false, shared-secret gated).
// Actions, all server-side via the service-role key (never exposed):
//   action "recovery" (default): admin-generate a recovery CODE (email_otp) +
//     link WITHOUT sending email (bypasses the auth email rate limit). The CODE
//     is scanner-proof but still expires (~OTP expiry).
//   action "setpass": set a strong TEMPORARY password that does NOT expire and
//     cannot be consumed by an email scanner -- the reliable first-login path
//     for DJs who never managed to use a one-time code/link. Delivered via
//     scripts/send-dj-temppass.py. Pass verify:true to prove the credential
//     logs in before it gets mailed (and to record that sign-in as OURS).
//   action "never_signed_in": list active DJs whose auth user has never signed
//     in. Exists so the temp-password scripts stop carrying a hardcoded roster
//     snapshot -- that snapshot went stale and would have clobbered the
//     passwords of DJs who had since logged in. Always ask the server.
//     Verification logins are excluded via user_metadata.temppass_verified_at;
//     without that they'd stamp last_sign_in_at and every DJ would look active.
// POST {secret, action?, email?, user_id?, redirectTo?, verify?}
const SECRET = "c2040f1371c9265c538bdce3547346bd5ae53060";
type AuthUser = {
  id: string;
  email?: string;
  last_sign_in_at: string | null;
  user_metadata?: Record<string, unknown>;
};
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

  if (action === "never_signed_in") {
    const { data: djs, error: derr } = await supabase
      .from("djs").select("display_name, email, user_id, slug").eq("is_active", true);
    if (derr) return json({ error: derr.message }, 500);
    // auth.users isn't reachable over PostgREST -- go through the admin API.
    const seen = new Map<string, { last: string | null; verified: string | null }>();
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
      if (error) return json({ error: error.message }, 500);
      const users = (data as { users?: AuthUser[] })?.users ?? [];
      for (const u of users) {
        seen.set(u.id, {
          last: u.last_sign_in_at ?? null,
          verified: (u.user_metadata?.temppass_verified_at as string | undefined) ?? null,
        });
      }
      if (users.length < 200) break;
    }
    const rows = (djs ?? [])
      .filter((d) => {
        const s = d.user_id ? seen.get(d.user_id) : undefined;
        if (!s) return false;
        if (!s.last) return true;
        // A setpass verification signs in as the DJ, which stamps last_sign_in_at
        // and would otherwise look like the DJ got in. Only a sign-in AFTER the
        // one we performed ourselves counts as the DJ actually showing up.
        return !!s.verified && s.last <= s.verified;
      })
      .map((d) => ({ name: d.display_name, email: d.email, user_id: d.user_id, slug: d.slug }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return json({ ok: true, count: rows.length, djs: rows });
  }

  if (action === "setpass") {
    let userId = String(body.user_id ?? "").trim();
    if (!userId) {
      if (!email) return json({ error: "need user_id or email" }, 400);
      const { data, error } = await supabase.auth.admin.generateLink({ type: "recovery", email });
      if (error) return json({ error: error.message }, 500);
      userId = (data as { user?: { id?: string } })?.user?.id ?? "";
      if (!userId) return json({ error: "user not found" }, 404);
    }
    const customPassword = String(body.password ?? "").trim();
    const password = customPassword.length >= 8 ? customPassword : tempPassword();
    const { data: upd, error: uerr } = await supabase.auth.admin.updateUserById(userId, { password, email_confirm: true });
    if (uerr) return json({ error: uerr.message }, 500);
    const uemail = (upd as { user?: { email?: string } })?.user?.email ?? email;

    // Optionally prove the credential works before anyone mails it out. Done
    // here (not in the caller) so the sign-in this performs can be recorded as
    // ours -- see temppass_verified_at, which keeps "never_signed_in" honest.
    if (body.verify) {
      let verified = false;
      try {
        const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
            "User-Agent": "WCCG-temppass-verify/1.0",
          },
          body: JSON.stringify({ email: uemail, password }),
        });
        verified = r.ok && !!(await r.json())?.access_token;
      } catch { /* treated as unverified */ }

      let stamp: string | null = null;
      if (verified) {
        const { data: after } = await supabase.auth.admin.getUserById(userId);
        stamp = (after as { user?: AuthUser })?.user?.last_sign_in_at ?? null;
        if (stamp) {
          const prev = (after as { user?: AuthUser })?.user?.user_metadata ?? {};
          await supabase.auth.admin.updateUserById(userId, {
            user_metadata: { ...prev, temppass_verified_at: stamp },
          });
        }
      }
      return json({ ok: true, email: uemail, user_id: userId, password, verified, verified_at: stamp });
    }
    return json({ ok: true, email: uemail, user_id: userId, password });
  }

  if (!email) return json({ error: "no email" }, 400);
  const redirectTo = String(body.redirectTo ?? "https://wccg1045fm.com/reset-password");
  const { data, error } = await supabase.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo } });
  if (error) return json({ error: error.message }, 500);
  const props = (data as { properties?: { action_link?: string; email_otp?: string } })?.properties;
  return json({ ok: true, email, code: props?.email_otp ?? null, link: props?.action_link ?? null });
});
