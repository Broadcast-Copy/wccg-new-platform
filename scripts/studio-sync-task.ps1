# WCCG Studio-Sync — scheduled-task wrapper.
# Reads the DPAPI-encrypted admin credential (created once, interactively, by
# the station owner — see STUDIO-SYNC-RUNBOOK.md), runs one watcher pass, and
# appends output to a dated log under D:\WCCG\sync-logs.
#
# One-time credential setup (run yourself; the password is encrypted to YOUR
# Windows account and never leaves this PC):
#   New-Item -ItemType Directory -Force "$env:LOCALAPPDATA\WCCG" | Out-Null
#   Get-Credential -UserName biggleem@gmail.com -Message "WCCG studio-sync" |
#     Export-CliXml "$env:LOCALAPPDATA\WCCG\studio-sync-cred.xml"

$ErrorActionPreference = "Stop"
$credPath = Join-Path $env:LOCALAPPDATA "WCCG\studio-sync-cred.xml"
$logDir = "D:\WCCG\sync-logs"
$script = Join-Path $PSScriptRoot "studio-sync-watcher.py"
New-Item -ItemType Directory -Force $logDir | Out-Null
$log = Join-Path $logDir ("studio-sync-" + (Get-Date -Format "yyyyMMdd") + ".log")

function Write-Log($msg) {
  ("[" + (Get-Date -Format "HH:mm:ss") + "] " + $msg) | Out-File -FilePath $log -Append -Encoding utf8
}

if (-not (Test-Path $credPath)) {
  Write-Log "NO CREDENTIAL at $credPath - run the one-time setup from the runbook."
  exit 2
}

try {
  $cred = Import-CliXml $credPath
  $env:WCCG_ADMIN_EMAIL = $cred.UserName
  $env:WCCG_ADMIN_PASSWORD = $cred.GetNetworkCredential().Password
  & py -3 $script --once -v 2>&1 | Out-File -FilePath $log -Append -Encoding utf8
  Write-Log ("watcher exit code " + $LASTEXITCODE)
  exit $LASTEXITCODE
} catch {
  Write-Log ("wrapper error: " + $_.Exception.Message)
  exit 1
} finally {
  $env:WCCG_ADMIN_PASSWORD = $null
}
