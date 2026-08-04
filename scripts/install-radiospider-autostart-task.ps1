<#
  install-radiospider-autostart-task.ps1
  Registers the "Radio Spider" syndication downloader (RadioSpider.exe) as a
  Scheduled Task that starts at logon, so it self-recovers after a reboot
  (previously it had NO autostart and stayed down until launched by hand,
  which silently stopped syndication downloads after an unexpected reboot).

  The action runs a tiny inline launcher (powershell -Command) that GUARDS
  against duplicates: if a RadioSpider.exe process is already running it does
  nothing, otherwise it starts the exe. This does not rely on the app's own
  single-instance behavior.

  Idempotent. No admin required. Matches the WCCG Gmail Watcher installer's
  account/run-level conventions (current user, Interactive, Limited run level,
  battery-friendly settings).

  NOTE: registering this task does NOT launch the downloader now. It only
  takes effect at the NEXT logon.
#>

$ErrorActionPreference = "Stop"
$TaskName = "WCCG RadioSpider Autostart"
$Exe      = "C:\DJBRadioSpider\RadioSpider.exe"

if (-not (Test-Path $Exe)) { throw "RadioSpider.exe not found at $Exe" }

$me = "$env:USERDOMAIN\$env:USERNAME"

# Guarded launcher: only start RadioSpider.exe if it is not already running.
# Kept on a single line so it embeds cleanly as a scheduled-task argument.
$exeName = [System.IO.Path]::GetFileNameWithoutExtension($Exe)
$launch  = "if (-not (Get-Process -Name '$exeName' -ErrorAction SilentlyContinue)) { Start-Process -FilePath '$Exe' -WorkingDirectory '$(Split-Path $Exe)' }"

$action  = New-ScheduledTaskAction -Execute "powershell.exe" `
            -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command `"$launch`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $me
$principal = New-ScheduledTaskPrincipal -UserId $me -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet `
            -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
            -StartWhenAvailable -MultipleInstances IgnoreNew `
            -ExecutionTimeLimit (New-TimeSpan -Seconds 0)   # 0 = no time limit

# replace any existing registration (idempotent)
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
    -Principal $principal -Settings $settings `
    -Description "Autostart the Radio Spider syndication downloader (RadioSpider.exe) at logon so it self-recovers after a reboot. Guards against duplicate instances." | Out-Null

Write-Host "Registered scheduled task '$TaskName'."
Write-Host "  trigger:    AtLogOn ($me)"
Write-Host "  runs:       $Exe (only if not already running)"
Write-Host "  NOTE:       takes effect at NEXT logon; this installer does NOT launch the app now."
