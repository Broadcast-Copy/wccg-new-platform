# WCCG — remaining actions that need server / dashboard access

Status as of 2026-06-22. The Centova/IceCast **server items (#1, #2, #4) are DONE** —
completed over SSH (key access is now installed: `~/.ssh/wccg_centova`). The three
items left all need the Supabase dashboard or a password reset, which the assistant
can't/shouldn't do.

## ✅ 1. Stream supervisor — DONE (the flapping is fixed)
Root cause of Vibe/Soul/Yard (and HOT) dropping: the AutoDJ **ezstream source
processes hang** — still running but disconnected from IceCast (`/autodj` gone) —
while Centova still reports them `sourcestate:1`, so nothing restarted them. On top
of that, the existing watchdog had a **cron-PATH bug** (`ss` lives in `/usr/sbin`,
not in cron's PATH) that made it misfire every 2 min for 7 days (1016×/station)
without ever truly checking state. Fixes:
- Rewrote `/usr/local/bin/wccg-stream-heal.sh` to **v2**: checks the real `/autodj`
  mount via `status-json.xsl` (not just the process), and on a hung source it kills
  the stuck ezstream + `ccmanage restart` (run as the `centovacast` user).
- Added `export PATH=...` so cron finds `ss`.
- Restarted all four stations clean — all broadcasting. Verified the cron now runs
  with zero false heals.

## ✅ 2. IceCast CORS header — DONE
Added `<http-headers><header name="Access-Control-Allow-Origin" value="*"/></http-headers>`
to every station's `server.conf` AND the skel template
(`/usr/local/centovacast/system/servers/IceCast/skel/etc/server.conf`, so it
survives a reconfigure). Live-reloaded via SIGHUP (no downtime). Verified
end-to-end over HTTPS: HOT/Vibe/Soul/Yard return the header + live song titles.

## ✅ 4. HOT ccmanage-managed — DONE
HOT (`wccg1045fm`) authenticates and is covered by the watchdog. It had actually
been **silent** (orphaned/hung AutoDJ source) — now fixed and broadcasting.

## 3. Rotate the passwords shared in chat (security) — OWNER
Server root (retrieved/typed this week — rotate it), Centova `admin`, the
per-station passwords (stored in the watchdog script), and the 3 mailbox passwords
(noreply@/info@/contact@wccg1045fm.com).

## 5. Finish Supabase custom SMTP (task #43) — OWNER
Supabase dashboard → Auth → SMTP Settings → host `mail.wccg1045fm.com`, port 465
(SSL) or 587 (TLS), username `noreply@wccg1045fm.com`, paste its password → Save.

## 6. Supabase Site URL → apex (task #42 dashboard half) — OWNER
Supabase dashboard → Auth → URL Configuration → Site URL = `https://wccg1045fm.com`
(+ redirect URLs). `app.` already 301s to apex so auth links work either way.
(Codebase SITE_URL is already on apex.)

## Bonus note — HOT account config (optional cleanup)
HOT's `wccg1045fm` IceCast config still carries Centova defaults (`hostname
example.com`, `bind 0.0.0.0`, source IP `.129`). It works fine, but for consistency
reconfigure the HOT account in the Centova panel so its config regenerates to match
the other three.
