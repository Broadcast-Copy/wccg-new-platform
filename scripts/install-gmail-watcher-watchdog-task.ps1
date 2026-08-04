<#
  install-gmail-watcher-watchdog-task.ps1
  Registers the WCCG Gmail Watcher Watchdog as a Scheduled Task that runs every
  2 minutes (at logon + indefinite repetition) and relaunches the gmail-watcher
  daemon if it has died. Runs hidden via powershell.exe. Idempotent. No admin.

  Mirrors install-gmail-watcher-task.ps1 conventions: same account, Interactive
  logon, Limited run-level, battery/StartWhenAvailable settings, IgnoreNew.
#>

$ErrorActionPreference = "Stop"
$TaskName = "WCCG Gmail Watcher Watchdog"
$Script   = "C:\Users\wccg1\dev\wccg-new-platform\scripts\gmail-watcher-watchdog.ps1"

if (-not (Test-Path $Script)) { throw "watchdog script not found at $Script" }

$powershell = (Get-Command powershell.exe -ErrorAction Stop).Source

$me = "$env:USERDOMAIN\$env:USERNAME"

$action = New-ScheduledTaskAction -Execute $powershell `
            -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Script`"" `
            -WorkingDirectory (Split-Path $Script)

# At-logon trigger with a 2-minute repetition that runs indefinitely.
# (RepetitionDuration left unset => repeats indefinitely, per Task Scheduler semantics.)
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $me
$trigger.Repetition = (New-ScheduledTaskTrigger -Once -At (Get-Date) `
                        -RepetitionInterval (New-TimeSpan -Minutes 2)).Repetition

$principal = New-ScheduledTaskPrincipal -UserId $me -LogonType Interactive -RunLevel Limited

$settings = New-ScheduledTaskSettingsSet `
            -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
            -StartWhenAvailable -MultipleInstances IgnoreNew `
            -ExecutionTimeLimit (New-TimeSpan -Minutes 5)   # watchdog is quick; cap a stuck run

# replace any existing registration
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
    -Principal $principal -Settings $settings `
    -Description "Watchdog: relaunches 'WCCG Gmail Watcher' if it dies. Runs every 2 min. Logs: D:\WCCG\sync-logs\gmail-watcher-watchdog.log" | Out-Null

Write-Host "Registered scheduled task '$TaskName'."
Write-Host "  runs:    $powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Script`""
Write-Host "  every:   2 minutes (at-logon trigger + repetition)"
Write-Host "  log:     D:\WCCG\sync-logs\gmail-watcher-watchdog.log"
