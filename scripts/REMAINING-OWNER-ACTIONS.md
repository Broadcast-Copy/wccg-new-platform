# WCCG — remaining actions that need server / dashboard access

Everything app-side is done (apex cutover, WCCG live titles, sermon syncs,
hardened gmail-watcher, sermon-summary email sent). These six need the Centova
box, the Supabase dashboard, or the shared passwords — which the assistant
cannot/should not handle. In rough priority order.

## 1. Install the stream supervisor  ← highest impact (stops Vibe/Soul/Yard dropping)
On the Centova box (`root@67.222.26.128 -p 2200`):
```
scp -P 2200 "C:\Users\wccg1\dev\wccg-new-platform\scripts\centova-stream-supervisor.sh" root@67.222.26.128:/usr/local/sbin/
ssh -p 2200 root@67.222.26.128
chmod 700 /usr/local/sbin/centova-stream-supervisor.sh
printf '%s' 'YOUR_CENTOVA_ADMIN_PW' > /usr/local/centovacast/etc/.wccg-admin-pw && chmod 600 /usr/local/centovacast/etc/.wccg-admin-pw
( crontab -l 2>/dev/null; echo '*/2 * * * * /usr/local/sbin/centova-stream-supervisor.sh' ) | crontab -
/usr/local/sbin/centova-stream-supervisor.sh && tail /var/log/wccg-stream-supervisor.log
```

## 2. IceCast CORS header (so HOT/Vibe/Soul/Yard show song titles like WCCG now does)
In each station's `<vhost>/etc/server.conf` (the same files the SSL block was added to),
add inside the root `<icecast>` element, then restart that station:
```
<http-headers>
    <header name="Access-Control-Allow-Origin" value="*" />
</http-headers>
```
Restart: `printf '%s\n' 'ADMIN_PW' | /usr/local/centovacast/bin/ccmanage restart <user>`
(accounts: vibe1045fm, soul1045fm, yard1045fm, wccg1045fm). Note: if Centova
regenerates server.conf, re-apply (the SSL edits persisted, so this should too).

## 3. Rotate the passwords shared in chat (security)
Server root, Centova `admin`, the per-station source/admin passwords, and the 3
mailbox passwords (noreply@/info@/contact@wccg1045fm.com).

## 4. Make HOT ccmanage-managed
Reset the `wccg1045fm` (HOT) account password in Centova so the supervisor can
restart it (it's been running manually). Then it survives reboots/AutoSSL restarts.

## 5. Finish Supabase custom SMTP (task #43)
Supabase dashboard → Auth → SMTP Settings → host `mail.wccg1045fm.com`, port 465
(SSL) or 587 (TLS), username `noreply@wccg1045fm.com`, paste its password → Save.

## 6. Supabase Site URL → apex (optional; cosmetic)
Supabase dashboard → Auth → URL Configuration → Site URL = `https://wccg1045fm.com`
(+ redirect URLs). `app.` already 301s to apex so auth links work either way; this
just makes them link to apex directly. (Codebase SITE_URL is already on apex.)
