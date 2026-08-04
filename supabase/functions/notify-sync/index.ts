import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// notify-sync (verify_jwt=false, shared-secret gated). A small mailer the
// scheduled email-mix-sermon watch task calls at the end of a run to email a
// human-readable summary of what it downloaded + synced (sermons, DJ mixes).
//
// Sends from a verified WCCG domain (default noreply@wccg1045fm.com). Override
// the sender with NOTIFY_FROM (must be a verified domain at resend.com/domains)
// and the recipient with SYNC_NOTIFY_EMAIL. Requires the RESEND_API_KEY project
// secret; if it's unset the send is skipped gracefully.
//
// POST {secret, subject, text}  ->  emails the summary. `text` is plain text;
// newlines become <br>. Returns {ok, resend_status}.

const SECRET = "a9cb4759107247736bb11de8c8de0d00304c3726";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty */ }
  if (body.secret !== SECRET) return json({ ok: false, error: "forbidden" }, 403);

  const subject = (typeof body.subject === "string" && body.subject.trim()) || "WCCG sync update";
  const text = typeof body.text === "string" ? body.text : "";
  if (!text.trim()) return json({ ok: false, error: "empty text" }, 400);

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const NOTIFY = Deno.env.get("SYNC_NOTIFY_EMAIL") ?? "wccg1045fm@gmail.com";
  const FROM = Deno.env.get("NOTIFY_FROM") ?? "WCCG Auto-Sync <noreply@wccg1045fm.com>";
  if (!RESEND_API_KEY) {
    console.log("RESEND_API_KEY not set; skipping email for", subject);
    return json({ ok: false, reason: "RESEND_API_KEY not set" }, 200);
  }

  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px">` +
    `<h2 style="margin:0 0 4px">\u{1F4FB} WCCG auto-sync</h2>` +
    `<div style="font-size:14px;line-height:1.5;color:#222;white-space:normal">${esc(text).replace(/\n/g, "<br>")}</div>` +
    `<p style="color:#999;font-size:12px;margin-top:16px">Sent by the WCCG email-mix-sermon watch task on the broadcast PC.</p></div>`;

  const send = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [NOTIFY], subject, html, text }),
  });
  const rb = await send.text();
  console.log("resend", send.status, rb.slice(0, 200));
  return json({ ok: send.ok, to: NOTIFY, resend_status: send.status }, send.ok ? 200 : 502);
});

function json(obj: unknown, status: number): Response {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}
