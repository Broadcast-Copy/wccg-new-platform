<#
  install-dj-reminder-task.ps1
  Registers "WCCG DJ Mix Reminder" — a WEEKLY Scheduled Task that emails the
  "upload your mix" reminder to every on-air mixshow DJ (those holding an active
  slot, fetched live from the studio-sync edge function). Mondays 9:00 AM local.
  Headless via pythonw; the script logs to D:\WCCG\sync-logs\dj-reminder.log.
  Idempotent. No admin required.
#>

$ErrorActionPreference = "Stop"
$TaskName = "WCCG DJ Mix Reminder"
$Script   = "C:\Users\wccg1\dev\wccg-new-platform\scripts\send-dj-reminder.py"

# locate pythonw.exe (prefer the per-user Python 3.12 install)
$pythonw = "C:\Users\wccg1\AppData\Local\Programs\Python\Python312\pythonw.exe"
if (-not (Test-Path $pythonw)) {
    $cmd = Get-Command pythonw.exe -ErrorAction SilentlyContinue
    if ($cmd) { $pythonw = $cmd.Source } else { throw "pythonw.exe not found; install Python or fix the path." }
}
if (-not (Test-Path $Script)) { throw "reminder script not found at $Script" }

$me = "$env:USERDOMAIN\$env:USERNAME"

$action  = New-ScheduledTaskAction -Execute $pythonw -Argument "`"$Script`" blast" `
            -WorkingDirectory (Split-Path $Script)
# Weekly, Mondays at 9:00 AM local. Change -DaysOfWeek / -At to retime.
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 9:00AM
$principal = New-ScheduledTaskPrincipal -UserId $me -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet `
            -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
            -StartWhenAvailable -MultipleInstances IgnoreNew `
            -ExecutionTimeLimit (New-TimeSpan -Minutes 15)

# replace any existing registration
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
    -Principal $principal -Settings $settings `
    -Description "Weekly 'upload your mix' reminder to on-air mixshow DJs (send-dj-reminder.py blast). Log: D:\WCCG\sync-logs\dj-reminder.log" | Out-Null

Write-Host "Registered scheduled task '$TaskName' (weekly Mondays 9:00 AM)."
Write-Host "  runs:      $pythonw `"$Script`" blast"
Write-Host "  run now:   Start-ScheduledTask -TaskName `"$TaskName`""
Write-Host "  next run:  $((Get-ScheduledTaskInfo -TaskName $TaskName).NextRunTime)"
Write-Host "  log:       D:\WCCG\sync-logs\dj-reminder.log"
