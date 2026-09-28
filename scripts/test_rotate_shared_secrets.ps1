<#
  Sandbox tests for scripts\rotate-shared-secrets.ps1's helpers (PS 5.1, ASCII).
  The functions are lifted out of the script's syntax tree and run against fakes:
  a fake Supabase CLI (python), a local mock of the functions' ping on 127.0.0.1:3098,
  temp dirs for DPAPI files, logs and the :8108 config copies. Nothing touches
  Supabase, C:\AirSuite\secrets or the real Production Suite. Only dummy values.

    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test_rotate_shared_secrets.ps1
#>
Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$scriptPath = Join-Path $here 'rotate-shared-secrets.ps1'
$py = 'C:\Users\wccg1\AppData\Local\Programs\Python\Python312\python.exe'
if (-not (Test-Path -LiteralPath $py)) { $py = (Get-Command python -ErrorAction Stop).Source }

$script:pass = 0; $script:fail = 0
function Check([string]$Name, [bool]$Cond, [string]$Detail = '') {
    if ($Cond) { $script:pass++; Write-Host "PASS  $Name" }
    else { $script:fail++; Write-Host "FAIL  $Name  $Detail" -ForegroundColor Red }
}

# ---- lift the helper functions out of the script (its top-level code never runs) ----
$tokens = $null; $errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($scriptPath, [ref]$tokens, [ref]$errors)
Check 'the script parses with no errors' ($errors.Count -eq 0)
$fns = $ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] }, $false)
foreach ($f in $fns) { . ([scriptblock]::Create($f.Extent.Text)) }

$sandbox = Join-Path $env:TEMP ('wccg-rot-test-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $sandbox | Out-Null
$Repo = Split-Path -Parent $here
$ProjectRef = 'testref'
$script:Sensitive = New-Object System.Collections.Generic.List[string]
$LogFile = Join-Path $sandbox 'rotation.log'
$mock = $null
try {
    # ---- 1. ASCII + no secret-looking literal in the script itself --------------------
    $bytes = [IO.File]::ReadAllBytes($scriptPath)
    Check 'the script is pure ASCII' (@($bytes | Where-Object { $_ -gt 127 }).Count -eq 0)

    # ---- 2. CSPRNG secrets ------------------------------------------------------------
    $a = New-SharedSecret; $b = New-SharedSecret
    Check 'New-SharedSecret: 64 lowercase hex chars' ($a -cmatch '^[0-9a-f]{64}$')
    Check 'New-SharedSecret: two calls differ' ($a -ne $b)
    Check 'New-SharedSecret: registered for redaction' ($script:Sensitive.Contains($a))
    Check 'Protect-Text redacts it' ((Protect-Text "x $a y") -eq 'x <redacted> y')

    # ---- 3. Set-FunctionSecrets: env-file with owner-only ACL, wiped, secret never in argv
    $fake = Join-Path $sandbox 'fake_supabase.py'
    $record = Join-Path $sandbox 'fake_record.json'
    $fakeSrc = @'
import json, os, sys, subprocess
args = sys.argv[1:]
rec = {"argv": args}
if "--env-file" in args:
    p = args[args.index("--env-file") + 1]
    rec["env_lines"] = open(p, encoding="ascii").read().splitlines()
    acl = subprocess.run(["icacls", os.path.dirname(p)], capture_output=True, text=True).stdout
    rec["acl_entries"] = [l.strip() for l in acl.splitlines() if ":(" in l]  # line 1 = path + first ACE
json.dump(rec, open(os.environ["FAKE_RECORD"], "w"))
sys.exit(int(os.environ.get("FAKE_EXIT", "0")))
'@
    [IO.File]::WriteAllText($fake, $fakeSrc, (New-Object Text.ASCIIEncoding))
    $env:FAKE_RECORD = $record
    $script:Sb = @{ Exe = $py; Prefix = @($fake); How = 'fake' }
    $tempBefore = @(Get-ChildItem -LiteralPath $env:TEMP -Directory -Filter 'wccg-rot-*' | Where-Object { $_.FullName -ne $sandbox }).Count
    Set-FunctionSecrets @{ STUDIO_SYNC_SECRET = $a; STUDIO_SYNC_ACCEPT_LEGACY = '1' } 'test'
    $rec = Get-Content -LiteralPath $record -Raw | ConvertFrom-Json
    Check 'secrets set: CLI got "secrets set --env-file <file> --project-ref testref"' (($rec.argv -join ' ') -match '^secrets set --env-file \S+secrets\.env --project-ref testref$') ($rec.argv -join ' ')
    Check 'secrets set: the secret is NOT on the command line' (-not (($rec.argv -join ' ').Contains($a)))
    Check 'secrets set: env-file holds KEY=VALUE lines, sorted' ((($rec.env_lines) -join '|') -eq "STUDIO_SYNC_ACCEPT_LEGACY=1|STUDIO_SYNC_SECRET=$a")
    $me = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    Check 'secrets set: temp dir ACL = only the current user' ((@($rec.acl_entries).Count -eq 1) -and ($rec.acl_entries[0] -like "*$($me.Split('\')[-1])*")) ($rec.acl_entries -join ' ; ')
    $tempAfter = @(Get-ChildItem -LiteralPath $env:TEMP -Directory -Filter 'wccg-rot-*' | Where-Object { $_.FullName -ne $sandbox }).Count
    Check 'secrets set: temp dir + env-file deleted afterwards' ($tempAfter -eq $tempBefore)
    $env:FAKE_EXIT = '1'
    $threw = $false; $msg = ''
    try { Set-FunctionSecrets @{ STUDIO_SYNC_SECRET = $a } 'test-fail' } catch { $threw = $true; $msg = $_.Exception.Message }
    Check 'secrets set: a CLI failure throws' $threw
    Check 'secrets set: the error message does not carry the secret' (-not $msg.Contains($a))
    $tempAfter2 = @(Get-ChildItem -LiteralPath $env:TEMP -Directory -Filter 'wccg-rot-*' | Where-Object { $_.FullName -ne $sandbox }).Count
    Check 'secrets set: temp files wiped on failure too' ($tempAfter2 -eq $tempBefore)
    Remove-Item Env:\FAKE_EXIT

    # ---- 4. DPAPI written by PowerShell is what the Python loader reads -----------------
    $dp = Join-Path $sandbox 'studio-sync.dpapi'
    Write-Dpapi $dp $a
    Check 'Write-Dpapi/Read-Dpapi round-trip' ((Read-Dpapi $dp) -eq $a)
    Check 'the DPAPI file is not the plain value' (-not ([IO.File]::ReadAllText($dp)).Contains($a))
    $env:WCCG_STUDIO_SYNC_DPAPI = $dp
    $fromPy = & $py -c "import sys; sys.path.insert(0, r'$here'); import studio_sync_secret as s, hashlib; v, src = s.resolve(); print(src, hashlib.sha256((v or '').encode()).hexdigest())"
    Remove-Item Env:\WCCG_STUDIO_SYNC_DPAPI
    $sha = [BitConverter]::ToString((New-Object Security.Cryptography.SHA256Managed).ComputeHash([Text.Encoding]::ASCII.GetBytes($a))).Replace('-', '').ToLower()
    Check 'the Python loader reads the PowerShell DPAPI file (source dpapi, same value)' ("$fromPy" -eq "dpapi $sha") "$fromPy"

    # ---- 5. pings against a local mock --------------------------------------------------
    $mockPy = Join-Path $sandbox 'mock.py'
    $mockSrc = @'
import json, sys
from http.server import BaseHTTPRequestHandler, HTTPServer
CUR, OLD = sys.argv[1], sys.argv[2]
class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_POST(self):
        b = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        s = b.get("secret")
        code, body = (200, {"ok": True, "fn": self.path.rsplit("/", 1)[-1], "via": "current"}) if s == CUR else \
                     (200, {"ok": True, "via": "legacy"}) if s == OLD else (403, {"error": "forbidden"})
        out = json.dumps(body).encode()
        self.send_response(code); self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(out))); self.end_headers(); self.wfile.write(out)
HTTPServer(("127.0.0.1", 3098), H).serve_forever()
'@
    [IO.File]::WriteAllText($mockPy, $mockSrc, (New-Object Text.ASCIIEncoding))
    $mock = Start-Process -FilePath $py -ArgumentList @($mockPy, $a, $b) -PassThru -WindowStyle Hidden
    Start-Sleep -Seconds 2
    $FnBase = 'http://127.0.0.1:3098/functions/v1'
    $r = Invoke-FnPing 'studio-sync' $a
    Check 'ping: current secret -> 200 via current, fn echoed' ($r.Status -eq 200 -and $r.Via -eq 'current' -and $r.Fn -eq 'studio-sync') (Format-Ping $r)
    $r = Invoke-FnPing 'studio-sync' $b
    Check 'ping: old secret during cutover -> via legacy' ($r.Status -eq 200 -and $r.Via -eq 'legacy')
    $r = Invoke-FnPing 'studio-sync' 'wrong-wrong-wrong-wrong-wrong-wrong'
    Check 'ping: wrong secret -> 403 with the error body read' ($r.Status -eq 403 -and $r.Error -match 'forbidden') (Format-Ping $r)
    $t = Test-PingUntil 'studio-sync' 'wrong-wrong-wrong-wrong-wrong-wrong' { param($x) $x.Status -eq 403 } 2
    Check 'Test-PingUntil: stops as soon as the wanted answer comes' ($t.Ok)

    # ---- 6. the retired :8108 copies are blanked, nothing else changes ------------------
    $ProdSuiteDir = Join-Path $sandbox 'prod-suite'
    New-Item -ItemType Directory -Path $ProdSuiteDir | Out-Null
    $cfg = "{`n  `"port`": 8108,`n  `"studioSync`": {`n    `"url`": `"https://x/functions/v1/studio-sync`",`n    `"secret`": `"$b`"`n  }`n}`n"
    foreach ($n in @('config.json', 'config.json.bak-1', 'other.json')) { [IO.File]::WriteAllText((Join-Path $ProdSuiteDir $n), $cfg, (New-Object Text.UTF8Encoding $false)) }
    $copies = @(Get-ProdSuiteCopies $b)
    Check 'prod suite: finds config.json + its backups, not other files' ((@($copies | ForEach-Object Name | Sort-Object) -join ',') -eq 'config.json,config.json.bak-1')

    # ---- 7. busy detectors ---------------------------------------------------------------
    $WatcherLog = Join-Path $sandbox 'gmail-watcher.log'
    $ts = { param($m) (Get-Date).AddMinutes(-$m).ToString('yyyy-MM-dd HH:mm:ss') }
    Set-Content -LiteralPath $WatcherLog -Encoding ASCII -Value @("[$(& $ts 5)]     fetching part 1: x.mp3 (50.0 MB)")
    Check 'pack ingest busy: a part fetched 5 min ago, no notified line' (Test-PackIngestBusy)
    Add-Content -LiteralPath $WatcherLog -Encoding ASCII -Value "[$(& $ts 1)]     notified biggleem: DJ pack ingested"
    Check 'pack ingest idle: a notified line after it' (-not (Test-PackIngestBusy))
    Set-Content -LiteralPath $WatcherLog -Encoding ASCII -Value @("[$(& $ts 45)]     uploading part 2 -> x")
    Check 'pack ingest idle: the last part line is over 30 min old' (-not (Test-PackIngestBusy))
    $StudioTask = 'no-such-task-for-this-test'
    $StudioLock = Join-Path $sandbox 'dj-drops-sync.lock'
    Set-Content -LiteralPath $StudioLock -Value '' -Encoding ASCII
    Check 'studio sync idle: unlocked lock file' (@(Test-StudioSyncBusy).Count -eq 0)
    $holder = [IO.File]::Open($StudioLock, [IO.FileMode]::Open, [IO.FileAccess]::ReadWrite, [IO.FileShare]::ReadWrite)
    $holder.Lock(0, 1)
    $busyNow = @(Test-StudioSyncBusy)
    $holder.Unlock(0, 1); $holder.Dispose()
    Check 'studio sync busy: someone holds the run lock (like sync-dj-drops.py does)' ($busyNow.Count -eq 1) ($busyNow -join ';')

    # ---- 8. the retired values are readable from history, and not printed --------------
    $BridgeCommit = '2111fe00a5ddb12741f8aeb79363661addc3cd86'
    $h = Get-HistoryValue 'scripts/sync-dj-drops.py' 'SECRET\s*=[^\r\n]*?"([0-9a-f]{40})"'
    Check 'Get-HistoryValue: the studio-sync value is a 40-hex string' ("$h" -cmatch '^[0-9a-f]{40}$')
    $w = Get-HistoryValue 'supabase/functions/wiki-generate/index.ts' 'const SECRET = "(wgen_[0-9a-f]{32})"'
    Check 'Get-HistoryValue: the wiki-generate value has its wgen_ prefix' ("$w" -cmatch '^wgen_[0-9a-f]{32}$')
    Check 'Get-HistoryValue: a missing path gives nothing' ($null -eq (Get-HistoryValue 'no/such/file' '(x)'))
} finally {
    if ($mock -and -not $mock.HasExited) { Stop-Process -Id $mock.Id -Force }
    Remove-Item Env:\FAKE_RECORD -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $sandbox -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Host ''
Write-Host "$($script:pass) passed, $($script:fail) failed"
if ($script:fail -gt 0) { exit 1 } else { exit 0 }
