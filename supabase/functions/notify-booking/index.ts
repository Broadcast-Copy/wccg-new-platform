import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * notify-booking  (deployed; verify_jwt=false)
 *
 * Fired by the Postgres trigger trg_notify_on_booking (pg_net) when a
 * dj_bookings row is inserted with status='pending'. Emails the station that a
 * new DJ booking request came in (so staff don't have to watch the admin
 * console). No email on status changes — the trigger is INSERT-only.
 *
 * Auth model: public endpoint, but anti-spam — it re-fetches the booking by id
 * with the auto-provided service-role key and only emails if the row really
 * exists. An attacker can't forge a notification without a real booking id.
 *
 * Required project secret:
 *   RESEND_API_KEY     (Dashboard → Edge Functions → Secrets)
 * Optional:
 *   BOOKING_NOTIFY_EMAIL  (default wccg1045fm@gmail.com — Resend test-mode owner)
 *   BOOKING_NOTIFY_FROM   (default "WCCG Bookings <onboarding@resend.dev>")
 */

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json().catch(() => ({}));
    const rec = (payload?.record ?? payload) as Record<string, unknown>;
    const bookingId = rec?.id as string | undefined;
    if (!bookingId) return json({ ok: false, reason: "no booking id" }, 400);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const q = await fetch(
      `${SUPABASE_URL}/rest/v1/dj_bookings?id=eq.${bookingId}` +
        `&select=id,event_name,event_date,event_time,duration,venue_name,city,state,` +
        `location_type,music_type,needs_host,needs_sound,contact_name,contact_email,` +
        `contact_phone,message,status,djs(display_name,slug)`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    );
    const rows = await q.json();
    const b = Array.isArray(rows) ? rows[0] : null;
    if (!b) return json({ ok: false, reason: "booking not found" }, 404);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    // Resend test mode (from onboarding@resend.dev) only delivers to the Resend
    // account owner's address. Verify a domain at resend.com/domains to notify
    // arbitrary addresses (then set BOOKING_NOTIFY_FROM + BOOKING_NOTIFY_EMAIL).
    const NOTIFY = Deno.env.get("BOOKING_NOTIFY_EMAIL") ?? "wccg1045fm@gmail.com";
    const FROM = Deno.env.get("BOOKING_NOTIFY_FROM") ?? "WCCG Bookings <onboarding@resend.dev>";
    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY not set; skipping email for booking", b.id);
      return json({ ok: false, reason: "RESEND_API_KEY not set" }, 200);
    }

    const dj = b.djs ?? {};
    const djName = dj.display_name ?? "a DJ";
    const esc = (v: unknown) =>
      String(v ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));
    const when = [b.event_date, b.event_time].filter(Boolean).join(" ") || "—";
    const place = [b.venue_name, [b.city, b.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "—";
    const extras = [b.needs_host ? "needs host" : null, b.needs_sound ? "needs sound" : null]
      .filter(Boolean).join(", ") || "—";

    const row = (label: string, val: string) =>
      `<tr><td style="padding:4px 12px 4px 0;color:#888;white-space:nowrap">${label}</td>` +
      `<td style="padding:4px 0">${val}</td></tr>`;

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px">
        <h2 style="margin:0 0 4px">📅 New booking request</h2>
        <p style="color:#666;margin:0 0 16px">Someone requested <b>${esc(djName)}</b> via the WCCG site.</p>
        <table style="border-collapse:collapse;font-size:14px">
          ${row("DJ", `<b>${esc(djName)}</b>`)}
          ${row("Event", `<b>${esc(b.event_name)}</b>`)}
          ${row("When", esc(when))}
          ${row("Duration", esc(b.duration || "—"))}
          ${row("Where", esc(place))}
          ${row("Type", esc([b.location_type, b.music_type].filter(Boolean).join(" · ") || "—"))}
          ${row("Needs", esc(extras))}
          ${row("Contact", `${esc(b.contact_name)} — <a href="mailto:${esc(b.contact_email)}">${esc(b.contact_email)}</a>` +
            (b.contact_phone ? ` · <a href="tel:${esc(b.contact_phone)}">${esc(b.contact_phone)}</a>` : ""))}
          ${b.message ? row("Message", esc(b.message)) : ""}
        </table>
        <p style="color:#888;font-size:12px;margin-top:16px">Review & manage it in the admin console → DJ Bookings.</p>
      </div>`;

    const send = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [NOTIFY],
        subject: `📅 Booking request: ${b.event_name} — ${djName}`,
        html,
      }),
    });
    const body = await send.text();
    console.log("resend status", send.status, body.slice(0, 200));
    return json({ ok: send.ok, booking_id: b.id, resend_status: send.status }, send.ok ? 200 : 502);
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
