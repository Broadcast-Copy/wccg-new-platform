<#
  gmail-watcher-watchdog.ps1
  Watchdog for the "WCCG Gmail Watcher" daemon (gmail-watcher.py / pythonw).
  The daemon's built-in Scheduled-Task auto-restart proved unreliable: it once
  died on a transient ssl.SSLEOFError during an OAuth token refresh and stayed
  dead ~36 h. This watchdog runs every ~2 min and relaunches the watcher if it
  is not running.

  Health signals:
    (a) PRIMARY  - is there a pythonw process whose CommandLine contains
                   "gmail-watcher.py"?  (Get-CimInstance Win32_Process)
                   No matching process => definitely down => restart.
    (b) SECONDARY (heuristic only, never triggers a restart) - has the log
                   D:\WCCG\sync-logs\gmail-watcher.log been written within
                   ~5 min?  A quiet log is NORMAL when there is no new mail,
                   so staleness is only NOTED in the log, never acted upon.

  Restart is done via the existing Scheduled Task (we never spawn pythonw
  directly), so we inherit the watcher's logon/working-dir conventions.

  Safe to run repeatedly and concurrently: a single-instance mutex prevents
  two watchdogs from racing to restart at the same time.

  Idempotent, no admin required. Additive only - does NOT touch the watcher
  process, its script, or the "WCCG Gmail Watcher" task definition.
#>

$ErrorActionPreference = "Stop"

$TaskName    = "WCCG Gmail Watcher"
$WatcherTag  = "gmail-watcher.py"        # CommandLine substring that identifies the daemon
$LogFile     = "D:\WCCG\sync-logs\gmail-watcher.log"
$WatchdogLog = "D:\WCCG\sync-logs\gmail-watcher-watchdog.log"
$StaleMin    = 5                          # log-staleness heuristic threshold (minutes)

function Write-WatchdogLog {
    param([string]$Message)
    $ts   = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "$ts  $Message"
    try {
        $dir = Split-Path $WatchdogLog
        if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
        Add-Content -Path $WatchdogLog -Value $line -Encoding utf8
    } catch {
        # last resort: don't let logging failure crash the watchdog
    }
}

# --- single-instance guard (named mutex) so concurrent runs never double-restart ---
$mutex = New-Object System.Threading.Mutex($false, "Global\WCCG-GmailWatcher-Watchdog")
$haveLock = $false
try {
    try { $haveLock = $mutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $haveLock = $true }
    if (-not $haveLock) {
        Write-WatchdogLog "skip: another watchdog instance is already running."
        return
    }

    # --- PRIMARY signal: is the watcher process alive? ---
    $proc = $null
    try {
        $proc = Get-CimInstance Win32_Process -Filter "Name='pythonw.exe'" -ErrorAction Stop |
                Where-Object { $_.CommandLine -and $_.CommandLine -match [regex]::Escape($WatcherTag) } |
                Select-Object -First 1
    } catch {
        Write-WatchdogLog "error: querying processes failed: $($_.Exception.Message)"
        return
    }

    # --- SECONDARY signal: log freshness (heuristic, informational only) ---
    $logNote = ""
    try {
        if (Test-Path $LogFile) {
            $ageMin = [math]::Round(((Get-Date) - (Get-Item $LogFile).LastWriteTime).TotalMinutes, 1)
            if ($ageMin -gt $StaleMin) { $logNote = " (log quiet ${ageMin}m - normal if no new mail)" }
            else                       { $logNote = " (log fresh ${ageMin}m)" }
        } else {
            $logNote = " (log file missing)"
        }
    } catch { $logNote = "" }

    if ($proc) {
        # Healthy: process exists. Do NOT restart, even if the log is stale.
        Write-WatchdogLog "alive: pythonw PID $($proc.ProcessId) running gmail-watcher.py.$logNote"
        return
    }

    # --- No matching process => definitely down => restart via the Scheduled Task ---
    Write-WatchdogLog "DOWN: no pythonw process matching '$WatcherTag'.$logNote Restarting via Scheduled Task '$TaskName'."
    try {
        $out = & schtasks /Run /tn "$TaskName" 2>&1
        $rc  = $LASTEXITCODE
        if ($rc -eq 0) {
            Write-WatchdogLog "restarted: schtasks /Run '$TaskName' OK. ($($out -join ' '))"
        } else {
            Write-WatchdogLog "error: schtasks /Run '$TaskName' exit $rc. ($($out -join ' '))"
        }
    } catch {
        Write-WatchdogLog "error: restart attempt threw: $($_.Exception.Message)"
    }
}
finally {
    if ($haveLock) { try { $mutex.ReleaseMutex() } catch {} }
    try { $mutex.Dispose() } catch {}
}
