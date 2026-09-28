<#
.SYNOPSIS
  Rotate the shared secrets of WCCG's secret-gated edge functions - no code edits.

.DESCRIPTION
  Families (function environment names; the values never live in code):
    STUDIO_SYNC_*    studio-sync + dj-setup-link. Callers on this PC read it through
                     scripts\studio_sync_secret.py from C:\AirSuite\secrets\studio-sync.dpapi.
    WIKI_GENERATE_*  wiki-generate (no caller today; new value is not kept - Jev 2026-09-28)
    NOTIFY_SYNC_*    notify-sync   (no caller today; new value is not kept)

  Steps (every one prints a line; no secret is ever printed, logged, or put on a
  command line):
    1  preflight   right Windows user, not Sunday 06:00-15:00, Studio Sync idle,
                   new code present, old values readable, Python, git
    2  Supabase    CLI found (or run through npx), logged in (opens `supabase login`
                   if not), deploy flags detected
    3  state       which secret the callers use today, and whether it works
    4  generate    three new 32-byte secrets from the OS CSPRNG
    5  cutover     `supabase secrets set --env-file <temp file, owner-only ACL,
                   wiped in finally>`: new secrets on, OLD studio-sync secret still
                   accepted (STUDIO_SYNC_ACCEPT_LEGACY=1)
    6  deploy      studio-sync, dj-setup-link, wiki-generate, notify-sync; each is
                   pinged with its new secret; the old wiki/notify values get 403
    7  callers     store C:\AirSuite\secrets\studio-sync.dpapi, then run every
                   caller's own ping (Studio Sync, the watcher's two paths, the DJ
                   reminder, the shared loader for dj-setup-link). Any failure puts
                   the previous file back and stops, with the old secret still valid.
    8  old copies  blanks the retired value in the retired :8108 Production Suite's
                   config.json (+ backups) (Jev 0.94)
    9  legacy off  waits for Studio Sync / a DJ-pack ingest to finish, sets
                   STUDIO_SYNC_ACCEPT_LEGACY=0 (and overwrites the stored old value
                   with random bytes), then proves the OLD secret gets 403 and every
                   caller still answers ok
   10  done        summary; log in D:\WCCG\sync-logs\secret-rotation.log (no secrets)

.PARAMETER DryRun
  Show every step and run only the read-only checks. Changes nothing.

.PARAMETER Rollback
  Turn legacy acceptance back on (STUDIO_SYNC_ACCEPT_LEGACY=1 with the previous
  studio-sync secret), e.g. when a forgotten caller still holds the old one. Undo it
  by running this script again (a fresh rotation).

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\wccg1\dev\wccg-new-platform\scripts\rotate-shared-secrets.ps1
#>
[CmdletBinding()]
param([switch]$DryRun, [switch]$Rollback)

Set-StrictMode -Version 2.0
Import-Module Microsoft.PowerShell.Security -ErrorAction SilentlyContinue
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# ------------------------------------------------------------------ settings --
$ProjectRef   = 'irjiqbmoohklagdegezz'
$FnBase       = "https://$ProjectRef.supabase.co/functions/v1"
$Repo         = Split-Path -Parent $PSScriptRoot
$BridgeCommit = '2111fe00a5ddb12741f8aeb79363661addc3cd86'   # last commit with the old literals
$SecretsDir   = 'C:\AirSuite\secrets'
$StudioDpapi  = Join-Path $SecretsDir 'studio-sync.dpapi'
$StudioPrev   = "$StudioDpapi.previous"
$Functions    = @('studio-sync', 'dj-setup-link', 'wiki-generate', 'notify-sync')
$StudioTask   = 'WCCG Studio Sync'
$StudioLock   = 'D:\WCCG\sync-logs\dj-drops-sync.lock'
$WatcherLog   = 'D:\WCCG\sync-logs\gmail-watcher.log'
$ProdSuiteDir = 'C:\Users\wccg1\dev\wccg-production-suite'
$LogFile      = 'D:\WCCG\sync-logs\secret-rotation.log'
$Python312    = 'C:\Users\wccg1\AppData\Local\Programs\Python\Python312\python.exe'

$script:Sensitive = New-Object System.Collections.Generic.List[string]   # values to redact
$script:Sb = $null
$script:UseApi = $false
$script:StepNo = 0
$TotalSteps = 10

# ------------------------------------------------------------------- output --
function Protect-Text([string]$Text) {
    if (-not $Text) { return '' }
    foreach ($s in $script:Sensitive) { if ($s) { $Text = $Text.Replace($s, '<redacted>') } }
    return $Text
}
function Write-Log([string]$Line) {
    try {
        $dir = Split-Path -Parent $LogFile
        if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
        Add-Content -LiteralPath $LogFile -Value ('[' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + '] ' + (Protect-Text $Line)) -Encoding ASCII
    } catch { }
}
function Write-Step([string]$Title) {
    $script:StepNo++
    $t = "[$($script:StepNo)/$TotalSteps] $Title"
    if ($DryRun) { $t = "$t   (dry run)" }
    Write-Host ''
    Write-Host $t -ForegroundColor Cyan
    Write-Log $t
}
function Write-Ok([string]$Msg)   { Write-Host "    OK    $(Protect-Text $Msg)" -ForegroundColor Green; Write-Log "OK $Msg" }
function Write-Info([string]$Msg) { Write-Host "    ..    $(Protect-Text $Msg)"; Write-Log "   $Msg" }
function Write-Would([string]$Msg){ Write-Host "    WOULD $(Protect-Text $Msg)" -ForegroundColor Yellow; Write-Log "WOULD $Msg" }
function Write-Warn2([string]$Msg){ Write-Host "    WARN  $(Protect-Text $Msg)" -ForegroundColor Yellow; Write-Log "WARN $Msg" }
function Stop-Rotation([string]$Msg, [string]$Advice = '') {
    Write-Host "    STOP  $(Protect-Text $Msg)" -ForegroundColor Red
    Write-Log "STOP $Msg"
    if ($Advice) { Write-Host "          $Advice" -ForegroundColor Red; Write-Log "     $Advice" }
    exit 1
}

# ------------------------------------------------------------------ helpers --
function ConvertTo-ArgString([string[]]$ArgList) {
    ($ArgList | ForEach-Object {
        if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
    }) -join ' '
}

# Run a program with redirected output and no window. Secrets are NEVER passed in
# $ArgList - only file paths, names and flags.
function Invoke-Native([string]$Exe, [string[]]$ArgList, [string]$Cwd = $Repo) {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $Exe
    $psi.Arguments = ConvertTo-ArgString $ArgList
    $psi.WorkingDirectory = $Cwd
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true
    $p = [System.Diagnostics.Process]::Start($psi)
    $o = $p.StandardOutput.ReadToEndAsync()
    $e = $p.StandardError.ReadToEndAsync()
    $p.WaitForExit()
    return @{ Code = $p.ExitCode; Out = ($o.Result + $e.Result) }
}

function Resolve-SupabaseCli {
    $c = Get-Command supabase -ErrorAction SilentlyContinue | Where-Object { $_.CommandType -eq 'Application' } | Select-Object -First 1
    if ($c) { return @{ Exe = $c.Source; Prefix = @(); How = "supabase ($($c.Source))" } }
    $node = Get-Command node -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($node) {
        $npxCli = Join-Path (Split-Path -Parent $node.Source) 'node_modules\npm\bin\npx-cli.js'
        if (Test-Path -LiteralPath $npxCli) {
            return @{ Exe = $node.Source; Prefix = @($npxCli, '--yes', 'supabase@2'); How = 'npx supabase@2 (downloads the CLI on first use)' }
        }
    }
    return $null
}
function Invoke-Supabase([string[]]$ArgList) {
    return Invoke-Native $script:Sb.Exe (@($script:Sb.Prefix) + $ArgList)
}

function Get-HistoryValue([string]$Path, [string]$Pattern) {
    $git = (Get-Command git -ErrorAction SilentlyContinue | Select-Object -First 1)
    if (-not $git) { return $null }
    $r = Invoke-Native $git.Source @('-C', $Repo, 'show', "${BridgeCommit}:$Path")
    if ($r.Code -ne 0) { return $null }
    $m = [regex]::Match($r.Out, $Pattern)
    if ($m.Success) { return $m.Groups[1].Value }
    return $null
}

function Read-Dpapi([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) { return $null }
    $bstr = [IntPtr]::Zero
    try {
        $sec = ConvertTo-SecureString -String ([IO.File]::ReadAllText($Path).Trim())
        $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    } catch { return $null
    } finally { if ($bstr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) } }
}
function Write-Dpapi([string]$Path, [string]$Value) {
    $dir = Split-Path -Parent $Path
    if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $hex = ConvertTo-SecureString -String $Value -AsPlainText -Force | ConvertFrom-SecureString
    [IO.File]::WriteAllText($Path, $hex, (New-Object Text.ASCIIEncoding))
}

function New-SharedSecret {
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    $s = -join ($bytes | ForEach-Object { $_.ToString('x2') })
    $script:Sensitive.Add($s)
    return $s
}

# supabase secrets set via a temp env-file: owner-only ACL, wiped in finally.
function Set-FunctionSecrets([hashtable]$Pairs, [string]$Label) {
    $dir = Join-Path $env:TEMP ('wccg-rot-' + [guid]::NewGuid().ToString('N'))
    $file = Join-Path $dir 'secrets.env'
    New-Item -ItemType Directory -Path $dir | Out-Null
    try {
        $acl = New-Object System.Security.AccessControl.DirectorySecurity
        $acl.SetAccessRuleProtection($true, $false)
        $me = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
        $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule($me, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')))
        Set-Acl -LiteralPath $dir -AclObject $acl
        $lines = foreach ($k in ($Pairs.Keys | Sort-Object)) { "$k=$($Pairs[$k])" }
        [IO.File]::WriteAllText($file, (($lines -join "`n") + "`n"), (New-Object Text.ASCIIEncoding))
        $r = Invoke-Supabase @('secrets', 'set', '--env-file', $file, '--project-ref', $ProjectRef)
        if ($r.Code -ne 0) { throw "supabase secrets set ($Label) failed: $(Protect-Text $r.Out)" }
    } finally {
        if (Test-Path -LiteralPath $file) {
            try { [IO.File]::WriteAllBytes($file, (New-Object byte[] ((Get-Item -LiteralPath $file).Length))) } catch { }
            Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue
        }
        Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# POST {secret, action:"ping"}; the secret is in the request body only.
function Invoke-FnPing([string]$Fn, [string]$Secret) {
    $body = @{ secret = $Secret; action = 'ping' } | ConvertTo-Json -Compress
    try {
        $resp = Invoke-WebRequest -Uri "$FnBase/$Fn" -Method Post -Body $body -ContentType 'application/json' -UseBasicParsing -TimeoutSec 60
        $j = $resp.Content | ConvertFrom-Json
        $via = $null; $name = $null
        if ($j.PSObject.Properties['via']) { $via = $j.via }
        if ($j.PSObject.Properties['fn'])  { $name = $j.fn }
        return @{ Status = [int]$resp.StatusCode; Via = $via; Fn = $name; Error = '' }
    } catch {
        $status = 0; $err = $_.Exception.Message
        $resp = $null
        if ($_.Exception.PSObject.Properties['Response']) { $resp = $_.Exception.Response }
        if ($resp) { $status = [int]$resp.StatusCode }
        # PS 5.1 has already read the error body into ErrorDetails; the stream is empty by now
        if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $err = $_.ErrorDetails.Message }
        elseif ($resp) {
            try { $sr = New-Object IO.StreamReader($resp.GetResponseStream()); $err = $sr.ReadToEnd(); $sr.Dispose() } catch { }
        }
        return @{ Status = $status; Via = $null; Fn = $null; Error = (Protect-Text $err) }
    }
}
function Test-PingUntil([string]$Fn, [string]$Secret, [scriptblock]$Want, [int]$Tries = 8) {
    $r = $null
    for ($i = 0; $i -lt $Tries; $i++) {
        $r = Invoke-FnPing $Fn $Secret
        if (& $Want $r) { return @{ Ok = $true; R = $r } }
        Start-Sleep -Seconds 5
    }
    return @{ Ok = $false; R = $r }
}
function Format-Ping($r) {
    if ($r.Status -eq 200) { return "HTTP 200 via $($r.Via)" }
    return "HTTP $($r.Status) $($r.Error)"
}

function Test-StudioSyncBusy {
    $why = @()
    try {
        $t = Get-ScheduledTask -TaskName $StudioTask -ErrorAction Stop
        if ($t.State -eq 'Running') { $why += "task '$StudioTask' is running" }
    } catch { }
    if (Test-Path -LiteralPath $StudioLock) {
        $fs = $null
        try {
            $fs = [IO.File]::Open($StudioLock, [IO.FileMode]::Open, [IO.FileAccess]::ReadWrite, [IO.FileShare]::ReadWrite)
            try { $fs.Lock(0, 1); $fs.Unlock(0, 1) } catch [System.IO.IOException] { $why += 'its run lock is held (a DJ drop is being filed)' }
        } catch { } finally { if ($fs) { $fs.Dispose() } }
    }
    return $why
}
function Wait-StudioSyncIdle([int]$Minutes) {
    $until = (Get-Date).AddMinutes($Minutes)
    while ($true) {
        $why = @(Test-StudioSyncBusy)
        if ($why.Count -eq 0) { return $true }
        if ((Get-Date) -gt $until) { return $false }
        Write-Info ("waiting: Studio Sync busy - " + ($why -join '; '))
        Start-Sleep -Seconds 30
    }
}
# A DJ-pack ingest started before step 7 may still hold the old secret. The watcher
# logs "fetching part" / "uploading part" while it works and "notified" when a pack
# is done; busy = the newest part line is newer than the newest notified line and
# under 30 minutes old.
function Test-PackIngestBusy {
    if (-not (Test-Path -LiteralPath $WatcherLog)) { return $false }
    $lines = Get-Content -LiteralPath $WatcherLog -Tail 400 -ErrorAction SilentlyContinue
    $lastPart = $null; $lastDone = $null
    foreach ($l in $lines) {
        $m = [regex]::Match($l, '^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]')
        if (-not $m.Success) { continue }
        $ts = [datetime]::ParseExact($m.Groups[1].Value, 'yyyy-MM-dd HH:mm:ss', $null)
        if ($l -match '(fetching|uploading) part') { $lastPart = $ts }
        if ($l -match 'notified |NOT ingested|pack\(s\) already handled') { $lastDone = $ts }
    }
    if (-not $lastPart) { return $false }
    if ($lastDone -and $lastDone -ge $lastPart) { return $false }
    return ((Get-Date) - $lastPart).TotalMinutes -lt 30
}

function Get-PythonExe {
    if (Test-Path -LiteralPath $Python312) { return @{ Exe = $Python312; Prefix = @() } }
    $py = Get-Command py -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($py) { return @{ Exe = $py.Source; Prefix = @('-3') } }
    return $null
}

# Every caller's own ping (never a secret in argv). Returns @{Ok; Lines; Source}.
function Invoke-CallerPings($Py) {
    $checks = @(
        @('scripts\studio_sync_secret.py', '--ping'),
        @('scripts\sync-dj-drops.py', '--ping'),
        @('scripts\gmail-watcher.py', '--ping-studio-sync'),
        @('scripts\send-dj-reminder.py', 'ping'))
    $all = @(); $ok = $true; $source = 'none'
    foreach ($c in $checks) {
        $r = Invoke-Native $Py.Exe (@($Py.Prefix) + $c)
        $pingLines = @(($r.Out -split "`r?`n") | Where-Object { $_ -match '^(PING|SOURCE) ' })
        if ($pingLines.Count -eq 0) { $pingLines = @("PING $($c[0]) fail (no answer, exit $($r.Code))") }
        foreach ($l in $pingLines) {
            if ($l -match '^SOURCE (\S+)') { $source = $Matches[1]; continue }
            $all += $l
            if ($l -notmatch ' ok current$') { $ok = $false }
        }
        if ($r.Code -ne 0) { $ok = $false }
    }
    return @{ Ok = $ok; Lines = $all; Source = $source }
}

function Get-ProdSuiteCopies([string]$Value) {
    if (-not $Value -or -not (Test-Path -LiteralPath $ProdSuiteDir)) { return @() }
    $files = @(Get-ChildItem -LiteralPath $ProdSuiteDir -File | Where-Object { $_.Name -eq 'config.json' -or $_.Name -like 'config.json.bak-*' })
    return @($files | Where-Object { ([IO.File]::ReadAllText($_.FullName)).Contains('"' + $Value + '"') })
}

# ====================================================================== run ==
$mode = 'ROTATE'; if ($Rollback) { $mode = 'ROLLBACK' }
Write-Host "WCCG shared-secret rotation - $mode$(if ($DryRun) { ' - DRY RUN, nothing will change' })  ($(Get-Date -Format 'ddd yyyy-MM-dd HH:mm'))"
Write-Log "==== start $mode dryrun=$([bool]$DryRun) user=$env:USERNAME"

# ---- 1 preflight -------------------------------------------------------------
Write-Step 'Preflight'
$taskUser = $null
try { $taskUser = (Get-ScheduledTask -TaskName $StudioTask -ErrorAction Stop).Principal.UserId } catch { }
if ($taskUser -and ($taskUser -ne $env:USERNAME)) {
    Stop-Rotation "you are '$env:USERNAME' but the station tasks run as '$taskUser'" "Log on as $taskUser and run this again (the DPAPI file only opens for the user who stored it)."
}
Write-Ok "Windows user '$env:USERNAME' (the station tasks run as '$taskUser')"

$now = Get-Date
$sermonWindow = ($now.DayOfWeek -eq [DayOfWeek]::Sunday -and $now.Hour -ge 6 -and $now.Hour -lt 15)
if ($sermonWindow -and -not $Rollback) {
    if ($DryRun) { Write-Warn2 'Sunday 06:00-15:00 is the sermon air window: a real run would refuse now' }
    else { Stop-Rotation 'it is Sunday between 06:00 and 15:00 (the sermon air window)' 'Run it after 3 PM, or on a weekday.' }
} else { Write-Ok 'not the Sunday sermon window' }

$busy = @(Test-StudioSyncBusy)
if ($busy.Count -gt 0 -and -not $Rollback) {
    if ($DryRun) { Write-Warn2 ("Studio Sync is busy now (" + ($busy -join '; ') + "): a real run would refuse") }
    else { Stop-Rotation ("Studio Sync is filing a DJ drop right now (" + ($busy -join '; ') + ")") 'Wait a few minutes and run it again.' }
} else { Write-Ok 'Studio Sync is idle (no DJ drop being filed)' }

$needed = @('supabase\functions\_shared\shared-secret.ts', 'scripts\studio_sync_secret.py')
foreach ($n in $needed) { if (-not (Test-Path -LiteralPath (Join-Path $Repo $n))) { Stop-Rotation "this checkout has no $n" 'Pull the branch that makes the secrets rotatable first.' } }
if (-not (Select-String -LiteralPath (Join-Path $Repo 'scripts\studio_sync_secret.py') -Pattern '--ping' -SimpleMatch -Quiet)) {
    Stop-Rotation 'scripts\studio_sync_secret.py has no --ping (old code)' 'Pull the latest main into this checkout first.'
}
Write-Ok "new code present in $Repo"

$histStudio = Get-HistoryValue 'scripts/sync-dj-drops.py' 'SECRET\s*=[^\r\n]*?"([0-9a-f]{40})"'
$histWiki   = Get-HistoryValue 'supabase/functions/wiki-generate/index.ts' 'const SECRET = "(wgen_[0-9a-f]{32})"'
$histNotify = Get-HistoryValue 'supabase/functions/notify-sync/index.ts' 'const SECRET = "([0-9a-f]{40})"'
foreach ($v in @($histStudio, $histWiki, $histNotify)) { if ($v) { $script:Sensitive.Add($v) } }
if (-not ($histStudio -and $histWiki -and $histNotify)) {
    Stop-Rotation "the retired values could not be read from commit $($BridgeCommit.Substring(0,7)) in git history" 'Run it from the platform checkout (C:\Users\wccg1\dev\wccg-new-platform) with git installed.'
}
Write-Ok "the three retired values are readable from git history (commit $($BridgeCommit.Substring(0,7)); not printed)"

$py = Get-PythonExe
if (-not $py) { Stop-Rotation 'Python not found' 'Install Python 3.12 (the station tasks use it).' }
Write-Ok "Python: $($py.Exe)"

# ---- 2 Supabase CLI --------------------------------------------------------------
Write-Step 'Supabase CLI and login'
$script:Sb = Resolve-SupabaseCli
if (-not $script:Sb) { Stop-Rotation 'neither the supabase CLI nor Node/npx is installed' 'Install Node.js LTS, then run this again.' }
Write-Ok "CLI: $($script:Sb.How)"
$cliRunnable = $true
if ($DryRun -and $script:Sb.Prefix.Count -gt 0) {
    $cliRunnable = $false
    Write-Would 'download the Supabase CLI through npx on first use (skipped in a dry run)'
    Write-Would "check the login with 'supabase projects list'; if needed open 'supabase login' in your browser"
    Write-Would "detect whether 'functions deploy' supports --use-api (bundles without Docker)"
}
if ($cliRunnable) {
    $login = Invoke-Supabase @('projects', 'list')
    if ($login.Code -ne 0) {
        if ($DryRun) { Write-Warn2 "not logged in to Supabase: a real run opens 'supabase login' (your browser) first" }
        else {
            Write-Info "not logged in to Supabase - opening 'supabase login' (finish it in your browser)"
            & $script:Sb.Exe @($script:Sb.Prefix) login
            $login = Invoke-Supabase @('projects', 'list')
            if ($login.Code -ne 0) { Stop-Rotation 'still not logged in to Supabase' "Run 'supabase login' (or 'npx supabase login'), then run this again." }
        }
    }
    if ($login.Code -eq 0) {
        if ($login.Out -notmatch $ProjectRef) { Stop-Rotation "your Supabase login cannot see project $ProjectRef" 'Log in with the account that owns the WCCG project.' }
        Write-Ok "logged in; project $ProjectRef visible"
    }
    $help = Invoke-Supabase @('functions', 'deploy', '--help')
    $script:UseApi = ($help.Out -match '--use-api')
    Write-Ok ("deploy will " + $(if ($script:UseApi) { 'bundle server-side (--use-api, no Docker needed)' } else { 'use the CLI default bundler' }))
}

# ---- 3 current state -------------------------------------------------------------
Write-Step 'Current state'
$dpapiNow = Read-Dpapi $StudioDpapi
if ($dpapiNow) { $script:Sensitive.Add($dpapiNow) }
$prevNow = Read-Dpapi $StudioPrev
if ($prevNow) { $script:Sensitive.Add($prevNow) }
# The secret the callers use today is the one the cutover must keep accepting.
$oldStudio = $histStudio; $oldSource = 'the retired value (git history bridge)'
if ($dpapiNow) { $oldStudio = $dpapiNow; $oldSource = "the DPAPI file from the last rotation" }
$probe = Invoke-FnPing 'studio-sync' $oldStudio
switch ($probe.Status) {
    200     { Write-Ok "studio-sync already runs the rotatable code; the callers' secret ($oldSource) answers via $($probe.Via)" }
    400     { Write-Ok "studio-sync still runs the old code (secret in code); the callers' secret ($oldSource) is accepted" }
    403     { if ($dpapiNow) { Write-Warn2 'the DPAPI secret on this PC is NOT accepted; falling back to the retired value for the cutover'; $oldStudio = $histStudio; $oldSource = 'the retired value from git history' }
              else { Write-Warn2 'the retired value is not accepted any more (already rotated?)' } }
    default { Write-Warn2 "studio-sync did not answer the probe: $(Format-Ping $probe)" }
}
Write-Info "legacy value for the cutover: $oldSource"
$copies = @(Get-ProdSuiteCopies $histStudio)
Write-Info "retired :8108 Production Suite copies holding the old value: $($copies.Count)"
Write-Info 'AirSuite Library (:8107) studio-sync board: not configured (no URL, no secret) - nothing to change'

# ---- Rollback mode -----------------------------------------------------------------
if ($Rollback) {
    $rb = $histStudio; $rbSource = 'the retired value from git history'
    if ($prevNow) { $rb = $prevNow; $rbSource = 'the previous DPAPI value (studio-sync.dpapi.previous)' }
    Write-Step 'Rollback: accept the previous studio-sync secret again'
    if ($DryRun) { Write-Would "set STUDIO_SYNC_LEGACY_SECRET=<$rbSource> and STUDIO_SYNC_ACCEPT_LEGACY=1"; Write-Would 'ping studio-sync + dj-setup-link with it and expect via legacy'; exit 0 }
    Set-FunctionSecrets @{ STUDIO_SYNC_LEGACY_SECRET = $rb; STUDIO_SYNC_ACCEPT_LEGACY = '1' } 'rollback'
    foreach ($f in @('studio-sync', 'dj-setup-link')) {
        $t = Test-PingUntil $f $rb { param($r) $r.Status -eq 200 -and $r.Via -eq 'legacy' }
        if ($t.Ok) { Write-Ok "$f accepts $rbSource again" } else { Stop-Rotation "$f does not accept it: $(Format-Ping $t.R)" }
    }
    Write-Host ''; Write-Host 'ROLLBACK DONE. The previous secret works again. Run this script again (no switch) to finish a rotation.' -ForegroundColor Green
    Write-Log '==== rollback done'
    exit 0
}

# ---- 4 generate -------------------------------------------------------------------
Write-Step 'Generate new secrets'
if ($DryRun) { Write-Would 'generate 3 secrets of 32 random bytes each (OS CSPRNG) - held in memory only' }
else {
    $newStudio = New-SharedSecret; $newWiki = New-SharedSecret; $newNotify = New-SharedSecret
    Write-Ok '3 new secrets generated (32 bytes each, CSPRNG; never shown)'
}

# ---- 5 cutover secrets --------------------------------------------------------------
Write-Step 'Set the function secrets (old studio-sync secret still accepted)'
$cutKeys = 'STUDIO_SYNC_SECRET, STUDIO_SYNC_LEGACY_SECRET, STUDIO_SYNC_ACCEPT_LEGACY=1, WIKI_GENERATE_SECRET, WIKI_GENERATE_ACCEPT_LEGACY=0, NOTIFY_SYNC_SECRET, NOTIFY_SYNC_ACCEPT_LEGACY=0'
if ($DryRun) { Write-Would "supabase secrets set --env-file <temp file, owner-only ACL, wiped afterwards>: $cutKeys" }
else {
    Set-FunctionSecrets @{
        STUDIO_SYNC_SECRET = $newStudio; STUDIO_SYNC_LEGACY_SECRET = $oldStudio; STUDIO_SYNC_ACCEPT_LEGACY = '1'
        WIKI_GENERATE_SECRET = $newWiki; WIKI_GENERATE_ACCEPT_LEGACY = '0'
        NOTIFY_SYNC_SECRET = $newNotify; NOTIFY_SYNC_ACCEPT_LEGACY = '0'
    } 'cutover'
    Write-Ok "set: $cutKeys"
}

# ---- 6 deploy + verify functions ------------------------------------------------------
Write-Step 'Deploy the four functions and verify each'
$newFor = @{ 'studio-sync' = $null; 'dj-setup-link' = $null; 'wiki-generate' = $null; 'notify-sync' = $null }
if (-not $DryRun) { $newFor = @{ 'studio-sync' = $newStudio; 'dj-setup-link' = $newStudio; 'wiki-generate' = $newWiki; 'notify-sync' = $newNotify } }
$oldFor = @{ 'wiki-generate' = $histWiki; 'notify-sync' = $histNotify }
foreach ($f in $Functions) {
    $deployArgs = @('functions', 'deploy', $f, '--project-ref', $ProjectRef, '--no-verify-jwt')
    if ($script:UseApi) { $deployArgs += '--use-api' }
    if ($DryRun) {
        Write-Would ("supabase " + ($deployArgs -join ' ') + "   (from $Repo)")
        if ($f -in @('studio-sync', 'dj-setup-link')) { Write-Would "ping $f with the new secret (expect via current) and with the old one (expect via legacy)" }
        else { Write-Would "ping $f with its new secret (expect via current); its retired value must get 403" }
        continue
    }
    $d = Invoke-Supabase $deployArgs
    if ($d.Code -ne 0 -and $d.Out -match 'config\.toml') {
        # Some CLI versions want a config file; give it a minimal one for this call only.
        $cfg = Join-Path $Repo 'supabase\config.toml'
        if (-not (Test-Path -LiteralPath $cfg)) {
            try { [IO.File]::WriteAllText($cfg, "project_id = `"$ProjectRef`"`n", (New-Object Text.ASCIIEncoding)); $d = Invoke-Supabase $deployArgs }
            finally { Remove-Item -LiteralPath $cfg -Force -ErrorAction SilentlyContinue }
        }
    }
    if ($d.Code -ne 0) {
        Stop-Rotation "deploy of $f failed: $(Protect-Text (($d.Out -split "`r?`n" | Select-Object -Last 6) -join ' | '))" 'Nothing is broken: the callers still use the old secret, which every deployed function still accepts. Fix the error and run this again.'
    }
    $t = Test-PingUntil $f $newFor[$f] { param($r) $r.Status -eq 200 -and $r.Via -eq 'current' }
    if (-not $t.Ok) { Stop-Rotation "$f deployed but the new secret does not work: $(Format-Ping $t.R)" 'The callers still use the old secret (accepted). Run this again.' }
    Write-Ok "$f deployed; new secret -> $(Format-Ping $t.R)"
    if ($f -in @('studio-sync', 'dj-setup-link')) {
        $t = Test-PingUntil $f $oldStudio { param($r) $r.Status -eq 200 -and $r.Via -eq 'legacy' }
        if (-not $t.Ok) { Stop-Rotation "$f does not accept the old secret during the cutover: $(Format-Ping $t.R)" 'Run this script with -Rollback, then run it again.' }
        Write-Ok "$f still accepts the callers' old secret for the cutover -> via legacy"
    } else {
        $t = Test-PingUntil $f $oldFor[$f] { param($r) $r.Status -eq 403 }
        if ($t.Ok) { Write-Ok "$f rejects its retired value -> 403" } else { Write-Warn2 "$f answered the retired value with $(Format-Ping $t.R)" }
    }
}

# ---- 7 callers -----------------------------------------------------------------------
Write-Step 'Store the new studio-sync secret for this PC and verify every caller'
if ($DryRun) {
    Write-Would "write $StudioDpapi (DPAPI for '$env:USERNAME'); keep the previous file as $(Split-Path -Leaf $StudioPrev)"
    Write-Would 'run each caller''s own ping and require "ok current" + source dpapi:'
    Write-Would '  scripts\studio_sync_secret.py --ping        (shared loader -> studio-sync + dj-setup-link; send-dj-setup/temppass/fix-dj-login use it)'
    Write-Would '  scripts\sync-dj-drops.py --ping             (Studio Sync, the 5-minute DJ-mix filing to air)'
    Write-Would '  scripts\gmail-watcher.py --ping-studio-sync (watcher: DJ-pack ingest + sermon website path)'
    Write-Would '  scripts\send-dj-reminder.py ping            (Monday DJ reminder)'
    $pre = Invoke-CallerPings $py
    Write-Info "read-only preview of those pings with today's secret (source: $($pre.Source)):"
    Write-Info '  (before the rotation the live functions are the old code: accepted-old-code is the expected answer)'
    foreach ($l in $pre.Lines) { Write-Info "  $l" }
} else {
    if (Test-Path -LiteralPath $StudioDpapi) { Copy-Item -LiteralPath $StudioDpapi -Destination $StudioPrev -Force }
    Write-Dpapi $StudioDpapi $newStudio
    Write-Ok "stored $StudioDpapi (DPAPI, only '$env:USERNAME' can read it)"
    $c = Invoke-CallerPings $py
    foreach ($l in $c.Lines) { Write-Info $l }
    if (-not $c.Ok -or $c.Source -ne 'dpapi') {
        if (Test-Path -LiteralPath $StudioPrev) { Copy-Item -LiteralPath $StudioPrev -Destination $StudioDpapi -Force } else { Remove-Item -LiteralPath $StudioDpapi -Force }
        Stop-Rotation "a caller did not answer ok with the new secret (source: $($c.Source))" 'The previous state is restored and the old secret is still accepted - nothing is broken. Paste the lines above into the Claude chat and run this again later.'
    }
    Write-Ok 'every caller answers ok with the new secret (source: dpapi)'
}

# ---- 8 old copies ------------------------------------------------------------------------
Write-Step 'Remove the retired value from the retired :8108 Production Suite config'
if ($copies.Count -eq 0) { Write-Ok 'no copy found' }
foreach ($file in $copies) {
    if ($DryRun) { Write-Would "blank studioSync.secret in $($file.FullName)" ; continue }
    $text = [IO.File]::ReadAllText($file.FullName)
    [IO.File]::WriteAllText($file.FullName, $text.Replace('"' + $histStudio + '"', '""'), (New-Object Text.UTF8Encoding $false))
    Write-Ok "blanked in $($file.Name)"
}
if ($copies.Count -gt 0) { Write-Info 'its read-only DJ board now reports the upstream as not configured (the native AirSuite board replaces it)' }

# ---- 9 legacy off -------------------------------------------------------------------------
Write-Step 'Turn off the old studio-sync secret and prove it is dead'
if ($DryRun) {
    Write-Would 'wait until Studio Sync is idle and no DJ-pack ingest is in flight (max 30 min)'
    Write-Would 'supabase secrets set --env-file <temp>: STUDIO_SYNC_ACCEPT_LEGACY=0, STUDIO_SYNC_LEGACY_SECRET=<random, overwrites the old value>'
    Write-Would 'expect 403 for the old secret on studio-sync and dj-setup-link, "via current" for the new one, and every caller ping ok again'
} else {
    if (-not (Wait-StudioSyncIdle 30)) { Stop-Rotation 'Studio Sync stayed busy for 30 minutes' 'Everything works (new secret stored, old one still accepted). Run this again to finish.' }
    $until = (Get-Date).AddMinutes(30)
    while (Test-PackIngestBusy) {
        if ((Get-Date) -gt $until) { Stop-Rotation 'a DJ-pack ingest stayed in progress for 30 minutes' 'Everything works (old secret still accepted). Run this again to finish.' }
        Write-Info 'waiting: the watcher is ingesting a DJ pack'
        Start-Sleep -Seconds 30
    }
    Set-FunctionSecrets @{ STUDIO_SYNC_ACCEPT_LEGACY = '0'; STUDIO_SYNC_LEGACY_SECRET = (New-SharedSecret) } 'legacy off'
    Write-Ok 'legacy acceptance is off'
    foreach ($f in @('studio-sync', 'dj-setup-link')) {
        foreach ($old in (@($oldStudio, $histStudio) | Select-Object -Unique)) {
            $t = Test-PingUntil $f $old { param($r) $r.Status -eq 403 } 12
            if (-not $t.Ok) { Stop-Rotation "$f still accepts an old secret: $(Format-Ping $t.R)" 'Run this again in a minute; if it repeats, paste this output into the Claude chat.' }
        }
        $t = Test-PingUntil $f $newStudio { param($r) $r.Status -eq 200 -and $r.Via -eq 'current' }
        if (-not $t.Ok) { Stop-Rotation "$f no longer answers the new secret: $(Format-Ping $t.R)" 'Run this script with -Rollback right away, then paste this output into the Claude chat.' }
        Write-Ok "${f}: old secret -> 403, new secret -> via current"
    }
    $c = Invoke-CallerPings $py
    foreach ($l in $c.Lines) { Write-Info $l }
    if (-not $c.Ok) { Stop-Rotation 'a caller failed after the old secret was turned off' 'Run this script with -Rollback right away, then paste this output into the Claude chat.' }
    Write-Ok 'every caller still answers ok'
}

# ---- 10 done ----------------------------------------------------------------------------
Write-Step 'Done'
if ($DryRun) {
    Write-Host ''
    Write-Host 'DRY RUN finished - nothing was changed. Run it without -DryRun to rotate.' -ForegroundColor Green
} else {
    Write-Host ''
    Write-Host 'ROTATION DONE. New secrets are live, every caller uses them, and the old ones no longer work.' -ForegroundColor Green
    Write-Host "  Undo the last step only if something that is not on this PC still needs the old secret:" -ForegroundColor Green
    Write-Host "    powershell -NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Rollback" -ForegroundColor Green
}
Write-Log "==== end $mode dryrun=$([bool]$DryRun)"
exit 0
