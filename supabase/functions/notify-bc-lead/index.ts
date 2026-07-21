import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * notify-bc-lead  (verify_jwt=false)
 *
 * Fired by the Postgres trigger trg_notify_bc_lead (pg_net) when a bc_leads
 * row is inserted from the broadcastcopy.ai early-access form. Emails the
 * Broadcast Copy team so an inbound prospect is never sitting unseen.
 *
 * Auth model: public endpoint, but anti-spam — it re-fetches the lead by id
 * with the auto-provided service-role key and only emails if the row really
 * exists. An attacker cannot forge a notification without a real lead id.
 * (Same shape as notify-admin-on-drop.)
 *
 * Required project secret:
 *   RESEND_API_KEY     (Dashboard -> Edge Functions -> Secrets)
 * Optional:
 *   BC_LEAD_NOTIFY_EMAIL  (default biggleem@gmail.com)
 *   BC_LEAD_NOTIFY_FROM   (default "Broadcast Copy <noreply@wccg1045fm.com>";
 *                          the FROM domain must be verified at resend.com/domains
 *                          — broadcastcopy.ai is not verified yet, so we send
 *                          from the already-verified station domain.)
 */

/** Base Broadcast tier — keep in sync with apps/marketing PLANS. */
const PRICE_PER_STATION = 49.99;

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json().catch(() => ({}));
    const rec = (payload?.record ?? payload) as Record<string, unknown>;
    const leadId = rec?.id as string | undefined;
    if (!leadId) return json({ ok: false, reason: "no lead id" }, 400);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const q = await fetch(
      `${SUPABASE_URL}/rest/v1/bc_leads?id=eq.${leadId}` +
        `&select=id,created_at,name,email,organization,call_sign,band,station_count,market,message,source`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    );
    const rows = await q.json();
    const lead = Array.isArray(rows) ? rows[0] : null;
    if (!lead) return json({ ok: false, reason: "lead not found" }, 404);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    // Must be the Resend account owner while the account is unverified —
    // in test mode Resend refuses any other recipient. (Same address
    // notify-admin-on-drop uses.) Override once a domain is verified.
    const NOTIFY = Deno.env.get("BC_LEAD_NOTIFY_EMAIL") ?? "wccg1045fm@gmail.com";
    // Default sender is Resend's shared onboarding domain, which needs NO
    // domain verification — wccg1045fm.com is NOT verified on this Resend
    // account (confirmed: 403 validation_error), which is also why
    // notify-admin-on-drop has been failing to deliver. Once a domain is
    // verified at resend.com/domains, set BC_LEAD_NOTIFY_FROM to it.
    const FROM =
      Deno.env.get("BC_LEAD_NOTIFY_FROM") ??
      "Broadcast Copy <onboarding@resend.dev>";
    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY not set; skipping email for lead", leadId);
      return json({ ok: false, reason: "RESEND_API_KEY not set" }, 200);
    }

    const stations = Math.max(1, Number(lead.station_count ?? 1));
    const mrr = (stations * PRICE_PER_STATION).toFixed(2);
    const esc = (v: unknown) =>
      String(v ?? "—").replace(/[<>&]/g, (c) =>
        c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;",
      );

    const row = (label: string, value: unknown) =>
      `<tr><td style="padding:4px 12px 4px 0;color:#888">${label}</td><td style="padding:4px 0"><b>${esc(value)}</b></td></tr>`;

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px">
        <h2 style="margin:0 0 4px">📻 New Broadcast Copy lead</h2>
        <p style="color:#666;margin:0 0 16px">
          Someone requested early access on broadcastcopy.ai.
        </p>
        <table style="border-collapse:collapse;font-size:14px">
          ${row("Name", lead.name)}
          ${row("Email", lead.email)}
          ${row("Organization", lead.organization)}
          ${row("Call sign", lead.call_sign)}
          ${row("Band", lead.band)}
          ${row("Stations", stations)}
          ${row("Market", lead.market)}
          ${row("Est. value", `$${mrr}/mo`)}
        </table>
        ${
          lead.message
            ? `<p style="margin:16px 0 0;padding:10px 12px;background:#f6f6f7;border-left:3px solid #ff4a1c;font-size:14px">${esc(lead.message)}</p>`
            : ""
        }
        <p style="margin:20px 0 0">
          <a href="https://wccg1045fm.com/my/admin/broadcast-copy"
             style="background:#ff4a1c;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-size:14px">
            Open the pipeline
          </a>
        </p>
      </div>`;

    const send = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [NOTIFY],
        reply_to: typeof lead.email === "string" ? lead.email : undefined,
        subject: `New Broadcast Copy lead — ${lead.organization || lead.call_sign || lead.email}`,
        html,
      }),
    });

    if (!send.ok) {
      const detail = await send.text();
      console.error("Resend failed:", send.status, detail);
      // Surface the provider's reason in the response body: pg_net records it
      // in net._http_response, which makes a delivery failure diagnosable
      // without redeploying to add logging.
      return json(
        { ok: false, reason: "resend failed", status: send.status, detail: detail.slice(0, 400) },
        200,
      );
    }

    return json({ ok: true, lead: leadId });
  } catch (err) {
    console.error("notify-bc-lead error:", err);
    return json({ ok: false, reason: String(err) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
