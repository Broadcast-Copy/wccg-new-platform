# WCCG Studio-Sync — scheduled-task wrapper (credential-free).
#
# Runs sync-dj-drops.py, which pulls DJ portal uploads from the PUBLIC dj-drops
# bucket to the broadcast carts (M:\JBMusic) + dated archive (D:\WCCG\b-mixshows)
# and marks each published via the secret-gated studio-sync edge function. No
# admin password / DPAPI credential needed — the old studio-sync-watcher.py path
# (which logged into the platform with the owner's password) is retired because
# it failed unattended whenever that credential was missing/expired.
#
# Wired to Task Scheduler job "WCCG Studio Sync" (every ~5 min). Output is
# appended to a dated log; sync-dj-drops.py also keeps its own dj-drops-sync.log.

$ErrorActionPreference = "Stop"
$logDir = "D:\WCCG\sync-logs"
$script = Join-Path $PSScriptRoot "sync-dj-drops.py"
New-Item -ItemType Directory -Force $logDir | Out-Null
$log = Join-Path $logDir ("studio-sync-" + (Get-Date -Format "yyyyMMdd") + ".log")

function Write-Log($msg) {
  ("[" + (Get-Date -Format "HH:mm:ss") + "] " + $msg) | Out-File -FilePath $log -Append -Encoding utf8
}

try {
  if (Get-Command py -ErrorAction SilentlyContinue) {
    & py -3 $script 2>&1 | Out-File -FilePath $log -Append -Encoding utf8
  } else {
    & python $script 2>&1 | Out-File -FilePath $log -Append -Encoding utf8
  }
  Write-Log ("sync exit code " + $LASTEXITCODE)
  exit $LASTEXITCODE
} catch {
  Write-Log ("wrapper error: " + $_.Exception.Message)
  exit 1
}
