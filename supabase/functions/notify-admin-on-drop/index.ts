import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * notify-admin-on-drop  (deployed; verify_jwt=false)
 *
 * Fired by the Postgres trigger trg_notify_admin_on_drop (pg_net) when a
 * dj_drops row is inserted with status='uploaded'. Emails the station admin
 * that a new mix drop arrived.
 *
 * Auth model: public endpoint, but anti-spam — it re-fetches the drop by id
 * with the auto-provided service-role key and only emails if the row really
 * exists. An attacker can't forge a notification without a real drop id.
 *
 * Required project secret:
 *   RESEND_API_KEY   (Dashboard → Edge Functions → Secrets)
 * Optional:
 *   DROP_NOTIFY_EMAIL  (default biggleem@gmail.com)
 *   DROP_NOTIFY_FROM   (default "WCCG Drops <onboarding@resend.dev>")
 */

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json().catch(() => ({}));
    const rec = (payload?.record ?? payload) as Record<string, unknown>;
    const dropId = rec?.id as string | undefined;
    if (!dropId) return json({ ok: false, reason: "no drop id" }, 400);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const q = await fetch(
      `${SUPABASE_URL}/rest/v1/dj_drops?id=eq.${dropId}` +
        `&select=id,file_code,week_of,status,size_bytes,source,djs(display_name,slug)`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    );
    const rows = await q.json();
    const drop = Array.isArray(rows) ? rows[0] : null;
    if (!drop) return json({ ok: false, reason: "drop not found" }, 404);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const NOTIFY = Deno.env.get("DROP_NOTIFY_EMAIL") ?? "biggleem@gmail.com";
    const FROM = Deno.env.get("DROP_NOTIFY_FROM") ?? "WCCG Drops <onboarding@resend.dev>";
    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY not set; skipping email for", drop.file_code);
      return json({ ok: false, reason: "RESEND_API_KEY not set" }, 200);
    }

    const dj = drop.djs ?? {};
    const djName = dj.display_name ?? drop.dj_id ?? "a DJ";
    const sizeMb = drop.size_bytes ? (Number(drop.size_bytes) / 1048576).toFixed(1) + " MB" : "—";

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:520px">
        <h2 style="margin:0 0 4px">🎧 New mix drop uploaded</h2>
        <p style="color:#666;margin:0 0 16px">A DJ just uploaded a file to the WCCG portal.</p>
        <table style="border-collapse:collapse;font-size:14px">
          <tr><td style="padding:4px 12px 4px 0;color:#888">DJ</td><td style="padding:4px 0"><b>${djName}</b></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#888">File code</td><td style="padding:4px 0"><code>${drop.file_code}</code></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#888">Week of</td><td style="padding:4px 0">${drop.week_of}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#888">Size</td><td style="padding:4px 0">${sizeMb}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#888">Source</td><td style="padding:4px 0">${drop.source}</td></tr>
        </table>
        <p style="color:#888;font-size:12px;margin-top:16px">The studio-sync watcher will pull this to the on-air folders automatically.</p>
      </div>`;

    const send = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [NOTIFY],
        subject: `🎧 New drop: ${drop.file_code} — ${djName}`,
        html,
      }),
    });
    const body = await send.text();
    console.log("resend status", send.status, body.slice(0, 200));
    return json({ ok: send.ok, file_code: drop.file_code, resend_status: send.status }, send.ok ? 200 : 502);
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: String(e) }, 500);
  }
});

function json(obj: unknown, status: number): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
