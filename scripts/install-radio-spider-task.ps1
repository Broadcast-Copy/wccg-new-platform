# Registers "WCCG Radio Spider Sync" as an at-logon background daemon
# (pythonw radio-spider-sync.py --loop) that auto-restarts. The script has NO
# external deps (stdlib only), so plain pythonw works. Baseline-seeded on first
# run, so it only syncs deliveries NEWER than what's already in the folders.
$ErrorActionPreference = 'Stop'

$script = 'C:\Users\wccg1\dev\wccg-new-platform\scripts\radio-spider-sync.py'
$taskName = 'WCCG Radio Spider Sync'

$pyw = (Get-Command pythonw.exe -ErrorAction SilentlyContinue).Source
if (-not $pyw) { $pyw = 'C:\Users\wccg1\AppData\Local\Programs\Python\Python312\pythonw.exe' }
if (-not (Test-Path $pyw)) { throw "pythonw.exe not found at $pyw" }
if (-not (Test-Path $script)) { throw "script not found at $script" }

$action  = New-ScheduledTaskAction -Execute $pyw -Argument "`"$script`" --loop"
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit ([TimeSpan]::Zero)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

try {
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger `
        -Settings $settings -Principal $principal -Force -ErrorAction Stop | Out-Null
} catch {
    Write-Output "FAILED to register '$taskName': $($_.Exception.Message)"
    Write-Output "Task registration needs an ELEVATED PowerShell. Re-run this script as Administrator:"
    Write-Output "    powershell -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit 1
}
Start-ScheduledTask -TaskName $taskName
Get-ScheduledTask -TaskName $taskName | Select-Object TaskName, State | Format-Table -AutoSize
Write-Output "Installed + started '$taskName' (pythonw --loop, at logon, auto-restart)."
