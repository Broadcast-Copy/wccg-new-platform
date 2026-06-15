<#
  install-gmail-watcher-task.ps1
  Registers the WCCG Gmail Watcher as a 24/7 Scheduled Task that starts at
  logon (so the mapped M:\ / Z:\ drives exist in the session), runs headless
  via pythonw, and auto-restarts if it exits. Idempotent. No admin required.
#>

$ErrorActionPreference = "Stop"
$TaskName = "WCCG Gmail Watcher"
$Script   = "C:\Users\wccg1\dev\wccg-new-platform\scripts\gmail-watcher.py"

# locate pythonw.exe (prefer the per-user Python 3.12 install)
$pythonw = "C:\Users\wccg1\AppData\Local\Programs\Python\Python312\pythonw.exe"
if (-not (Test-Path $pythonw)) {
    $cmd = Get-Command pythonw.exe -ErrorAction SilentlyContinue
    if ($cmd) { $pythonw = $cmd.Source } else { throw "pythonw.exe not found; install Python or fix the path." }
}
if (-not (Test-Path $Script)) { throw "watcher script not found at $Script" }

$me = "$env:USERDOMAIN\$env:USERNAME"

$action  = New-ScheduledTaskAction -Execute $pythonw -Argument "`"$Script`"" `
            -WorkingDirectory (Split-Path $Script)
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $me
$principal = New-ScheduledTaskPrincipal -UserId $me -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet `
            -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
            -StartWhenAvailable -MultipleInstances IgnoreNew `
            -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
            -ExecutionTimeLimit (New-TimeSpan -Seconds 0)   # 0 = run indefinitely

# replace any existing registration
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
    -Principal $principal -Settings $settings `
    -Description "Instant Gmail->RadioSpider sermon sync (gmail-watcher.py). Logs: D:\WCCG\sync-logs\gmail-watcher.log" | Out-Null

Write-Host "Registered scheduled task '$TaskName'."
Write-Host "  runs:  $pythonw `"$Script`""
Write-Host "  start now:  Start-ScheduledTask -TaskName `"$TaskName`""
Write-Host "  log:   D:\WCCG\sync-logs\gmail-watcher.log"
