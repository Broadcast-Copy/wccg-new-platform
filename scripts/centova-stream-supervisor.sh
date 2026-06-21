#!/bin/bash
# =============================================================================
# WCCG stream supervisor  —  keeps the Centova/IceCast mounts alive.
#
# WHY: the genre mounts (Vibe/Soul/Yard) intermittently stop on the Centova box
# and stay down (they aren't reboot/crash-supervised), so listeners get
# "connection lost". This script HTTP-health-checks each mount on the box and,
# if any isn't serving audio, runs Centova's built-in supervisor + a targeted
# restart. Run it from cron every 2 minutes as root. It is quiet when healthy.
#
# RUNS ON: the Centova server (67.222.26.128), NOT the Windows broadcast PC.
#
# INSTALL (as root on the Centova box):
#   1. Copy this file to the server:
#        scp -P 2200 centova-stream-supervisor.sh root@67.222.26.128:/usr/local/sbin/
#      (or paste it into  /usr/local/sbin/centova-stream-supervisor.sh )
#   2. chmod 700 /usr/local/sbin/centova-stream-supervisor.sh
#   3. Put the Centova ADMIN password in a root-only file (kept OUT of git):
#        printf '%s' 'YOUR_CENTOVA_ADMIN_PASSWORD' > /usr/local/centovacast/etc/.wccg-admin-pw
#        chmod 600 /usr/local/centovacast/etc/.wccg-admin-pw
#      (Rotate that password if it was ever shared in chat/email.)
#   4. Add to root's crontab  ( crontab -e ):
#        */2 * * * * /usr/local/sbin/centova-stream-supervisor.sh
#   5. Test by hand, then watch the log:
#        /usr/local/sbin/centova-stream-supervisor.sh
#        tail -f /var/log/wccg-stream-supervisor.log
#
# NOTES:
#  - MixSquad (mixsquad1045fm:8008) is intentionally excluded — no media yet.
#  - HOT (wccg1045fm) is included; if it's still running MANUALLY (not
#    ccmanage-managed because its account pw is unknown), reset its account
#    password in Centova so `ccmanage restart wccg1045fm` works, else this
#    script can't recover HOT (it has been the stable one, though).
#  - If `ccmanage` needs a per-account (not admin) password on your build,
#    the `ccmanage check` step still restarts stopped accounts; the targeted
#    `restart` lines simply no-op on auth failure (logged, harmless).
# =============================================================================
set -u

CCM=/usr/local/centovacast/bin/ccmanage
PWFILE=/usr/local/centovacast/etc/.wccg-admin-pw
LOG=/var/log/wccg-stream-supervisor.log

# account:HTTP-port  (the HTTPS listener is HTTP-port + 1; we check the local HTTP mount)
STATIONS="vibe1045fm:8002 soul1045fm:8004 yard1045fm:8006 wccg1045fm:8000"

ts() { date '+%Y-%m-%d %H:%M:%S'; }

ADMIN_PW=""
[ -r "$PWFILE" ] && ADMIN_PW="$(cat "$PWFILE")"

ccm() {  # run ccmanage, piping the admin pw on stdin when we have it
  if [ -n "$ADMIN_PW" ]; then printf '%s\n' "$ADMIN_PW" | "$CCM" "$@"; else "$CCM" "$@"; fi
}

down=""
for s in $STATIONS; do
  acct="${s%%:*}"; port="${s##*:}"
  code=$(curl -s -m 8 -o /dev/null -w '%{http_code}' "http://127.0.0.1:${port}/stream" 2>/dev/null)
  [ "$code" = "200" ] || down="${down} ${acct}:${port}=${code:-000}"
done

# All mounts healthy -> stay silent (don't spam the log).
[ -n "$down" ] || exit 0

echo "$(ts) UNHEALTHY:${down} -- recovering" >> "$LOG"

# 1) Centova's built-in supervisor restarts any account that should be running.
ccm check >> "$LOG" 2>&1

# 2) Targeted restart for each mount that was down.
for s in $down; do
  acct="${s%%:*}"
  echo "$(ts)   restart ${acct}" >> "$LOG"
  ccm restart "$acct" >> "$LOG" 2>&1 || ccm start "$acct" >> "$LOG" 2>&1
done

# 3) Re-check and log the result (give the sources a few seconds to come up).
sleep 8
result=""
for s in $down; do
  acct="${s%%:*}"; port="${s##*:}"
  code=$(curl -s -m 8 -o /dev/null -w '%{http_code}' "http://127.0.0.1:${port}/stream" 2>/dev/null)
  result="${result} ${acct}=${code:-000}"
done
echo "$(ts) after recovery:${result}" >> "$LOG"
