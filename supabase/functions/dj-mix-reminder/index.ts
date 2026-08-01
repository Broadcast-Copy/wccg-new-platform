import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// RETIRED. DJ mix reminders are sent via scripts/send-dj-reminder.py (Gmail API,
// reuses the gmail-watcher OAuth token). This endpoint is intentionally inert and
// sends no email. Safe to delete from the dashboard.
Deno.serve(() =>
  new Response(
    JSON.stringify({ ok: false, retired: true, use: "scripts/send-dj-reminder.py" }),
    { status: 410, headers: { "Content-Type": "application/json" } },
  )
);
