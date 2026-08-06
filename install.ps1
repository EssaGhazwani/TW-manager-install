# XKWDStore Agent — Protocol-v2 Windows Installer
#
# Safe download-then-run installation. Do NOT pipe `irm ... | iex` — download
# the script first, inspect it, then execute it.
#
# Download (CMD):
#   curl -L -o install.ps1 https://raw.githubusercontent.com/EssaGhazwani/TW-manager-install/main/install.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File install.ps1
#
# Download (PowerShell):
#   Invoke-WebRequest -Uri https://raw.githubusercontent.com/EssaGhazwani/TW-manager-install/main/install.ps1 -OutFile install.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File install.ps1
#
# Options:
#   -NoLaunch       Install/verify prerequisites only; do not start the agent.
#                   Used by automated tests so the real pinned npx package is
#                   never executed from the public registry during installation.
#   -AgentVersion   Override the pinned agent version (default: 2.0.1).
#   -Server         Override the XKWDStore server origin URL.
#   -InstallRoot    Override the install root directory.
#                   Default: %LOCALAPPDATA%\XKWDStore\Agent
#
# This installer:
#   - Verifies Windows OS.
#   - Verifies Node.js 22+.
#   - Verifies npx.
#   - Verifies an installed Google Chrome.
#   - Creates a visible terminal launcher (no hidden process, no service,
#     no Scheduled Task, no Chromium download).
#   - Validates all inputs safely.

param(
  [switch]$NoLaunch,
  [string]$AgentVersion = '2.0.1',
  [string]$Server = 'https://x.kwdstore.com',
  [string]$InstallRoot = (Join-Path $env:LOCALAPPDATA 'XKWDStore\Agent')
)

$ErrorActionPreference = 'Stop'

# Pinned command — @xkwdstore/agent@2.0.1 is published on npm.
# The --server flag is the CLI's real supported syntax (cli.js flags.server).
$AgentPackage = "@xkwdstore/agent@$AgentVersion"
$AgentCommand = "npx --yes $AgentPackage start --server `"$Server`""

Write-Host ''
Write-Host '  XKWDStore Agent Installer (Protocol v2)' -ForegroundColor Cyan
Write-Host '  ========================================' -ForegroundColor Cyan
Write-Host ''

# ── Step 0: Verify Windows OS ──────────────────────────────────────────────
Write-Host '  [0/5] Checking operating system...' -ForegroundColor Yellow
if (-not $IsWindows -and -not ($PSVersionTable.Platform -eq 'Win32NT') -and -not ($env:OS -eq 'Windows_NT')) {
  Write-Host '  ✗ This installer only runs on Windows.' -ForegroundColor Red
  Write-Host '    On macOS or Linux, install Node.js 22+ and run:' -ForegroundColor Yellow
  Write-Host "      npx --yes $AgentPackage start" -ForegroundColor Yellow
  exit 1
}
$osCaption = (Get-CimInstance -ClassName Win32_OperatingSystem -ErrorAction SilentlyContinue).Caption
if ($osCaption) {
  Write-Host "  ✓ $osCaption" -ForegroundColor Green
} else {
  Write-Host '  ✓ Windows detected' -ForegroundColor Green
}

# ── Step 1: Verify Node.js 22+ ─────────────────────────────────────────────
Write-Host '  [1/5] Checking Node.js...' -ForegroundColor Yellow
try {
  $nodeVer = (node --version 2>$null)
  if (-not $nodeVer) { throw 'node not found' }
  $major = [int]($nodeVer -replace '^v(\d+)\..*', '$1')
  if ($major -lt 22) {
    Write-Host "  ✗ Node.js $nodeVer detected — version 22 or later is required." -ForegroundColor Red
    Write-Host '    Install Node.js 22+ from https://nodejs.org/ and rerun this installer.' -ForegroundColor Yellow
    exit 1
  }
  Write-Host "  ✓ Node.js $nodeVer" -ForegroundColor Green
} catch {
  Write-Host '  ✗ Node.js was not found.' -ForegroundColor Red
  Write-Host '    Install Node.js 22+ from https://nodejs.org/ and rerun this installer.' -ForegroundColor Yellow
  exit 1
}

# ── Step 2: Verify npx (ships with Node.js) ────────────────────────────────
Write-Host '  [2/5] Checking npx...' -ForegroundColor Yellow
try {
  $npxVer = (npx --version 2>$null)
  if (-not $npxVer) { throw 'npx not found' }
  Write-Host "  ✓ npx $npxVer" -ForegroundColor Green
} catch {
  Write-Host '  ✗ npx was not found. It ships with Node.js 22+.' -ForegroundColor Red
  Write-Host '    Reinstall Node.js from https://nodejs.org/ and rerun this installer.' -ForegroundColor Yellow
  exit 1
}

# ── Step 3: Verify installed Google Chrome ─────────────────────────────────
Write-Host '  [3/5] Checking Google Chrome...' -ForegroundColor Yellow
$chromePaths = @(
  "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "${env:LOCALAPPDATA}\Google\Chrome\Application\chrome.exe"
)
$chromeExe = $null
foreach ($p in $chromePaths) {
  if ($p -and (Test-Path -LiteralPath $p)) { $chromeExe = $p; break }
}
if (-not $chromeExe) {
  Write-Host '  ✗ Google Chrome was not found.' -ForegroundColor Red
  Write-Host '    Install Google Chrome from https://www.google.com/chrome/ and rerun this installer.' -ForegroundColor Yellow
  Write-Host '    This installer never downloads Chromium or any other browser.' -ForegroundColor DarkGray
  exit 1
}
$chromeVer = $null
try {
  $fi = Get-Item -LiteralPath $chromeExe -ErrorAction Stop
  $chromeVer = $fi.VersionInfo.ProductVersion
} catch {}
Write-Host "  ✓ Google Chrome$(if ($chromeVer) { " $chromeVer" })" -ForegroundColor Green

# ── Step 4: Validate inputs and create install root ────────────────────────
Write-Host '  [4/5] Preparing install root...' -ForegroundColor Yellow

# Safe input validation — reject control characters and shell metacharacters.
function Test-SafeInput([string]$value, [string]$name) {
  if (-not $value -or $value.Trim().Length -eq 0) {
    Write-Host "  ✗ $name must not be empty." -ForegroundColor Red
    exit 1
  }
  if ($value -match '[\x00-\x1f\x7f]') {
    Write-Host "  ✗ $name contains control characters." -ForegroundColor Red
    exit 1
  }
  if ($value -match '[;&|`$<>]') {
    Write-Host "  ✗ $name contains forbidden shell metacharacters." -ForegroundColor Red
    exit 1
  }
}
Test-SafeInput $AgentVersion 'AgentVersion'
Test-SafeInput $Server 'Server'
Test-SafeInput $InstallRoot 'InstallRoot'

# Validate the Server URL is a well-formed HTTP(S) origin.
try {
  $serverUri = [System.Uri]$Server
  if ($serverUri.Scheme -ne 'http' -and $serverUri.Scheme -ne 'https') {
    throw 'invalid scheme'
  }
} catch {
  Write-Host "  ✗ Server must be a valid http(s) URL: $Server" -ForegroundColor Red
  exit 1
}

if (-not (Test-Path -LiteralPath $InstallRoot)) {
  New-Item -ItemType Directory -Path $InstallRoot -Force | Out-Null
}
Write-Host "  ✓ Install root: $InstallRoot" -ForegroundColor Green

# ── Step 5: Create visible terminal launcher ───────────────────────────────
Write-Host '  [5/5] Creating terminal launcher...' -ForegroundColor Yellow
$batPath = Join-Path $InstallRoot 'start-xkwdstore-agent.bat'
$batContent = @"
@echo off
title XKWDStore Agent
echo Starting XKWDStore Agent (Protocol v2)...
echo.
echo Pinned package: $AgentPackage
echo Server: $Server
echo.
echo Command: $AgentCommand
echo.
$AgentCommand
echo.
echo Agent has stopped. Press any key to close.
pause >nul
"@
Set-Content -Path $batPath -Value $batContent -Encoding ASCII
Write-Host "  ✓ Launcher created: $batPath" -ForegroundColor Green

# Also create a desktop shortcut that points at the visible launcher.
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop 'start-xkwdstore-agent.lnk'
try {
  $wsh = New-Object -ComObject WScript.Shell
  $sc = $wsh.CreateShortcut($shortcutPath)
  $sc.TargetPath = $batPath
  $sc.WorkingDirectory = $InstallRoot
  $sc.WindowStyle = 1  # Normal (visible) window — never hidden.
  $sc.Description = 'XKWDStore Agent (Protocol v2)'
  $sc.Save()
  Write-Host "  ✓ Desktop shortcut created: $shortcutPath" -ForegroundColor Green
} catch {
  Write-Host '  ! Could not create desktop shortcut (non-fatal).' -ForegroundColor DarkGray
}

# ── Launch (unless -NoLaunch) ───────────────────────────────────────────────
if ($NoLaunch) {
  Write-Host ''
  Write-Host '  -NoLaunch specified — prerequisites verified, agent not started.' -ForegroundColor DarkGray
  Write-Host "  To start the agent later, double-click $batPath" -ForegroundColor DarkGray
} else {
  Write-Host '  Launching XKWDStore Agent...' -ForegroundColor Yellow
  # Visible foreground terminal window — never hidden, never a background service.
  Start-Process -FilePath $batPath -WorkingDirectory $InstallRoot -WindowStyle Normal
  Write-Host '  ✓ Agent launcher started (visible terminal window)' -ForegroundColor Green
}

Write-Host ''
Write-Host "  Protocol-v2 installer for Agent $AgentVersion."
Write-Host "  @xkwdstore/agent@$AgentVersion is publicly available on npm."
Write-Host ''
Write-Host '  Then go to your XKWDStore dashboard to authorize this device.' -ForegroundColor Cyan
Write-Host ''
Write-Host '  The agent does NOT auto-update — the pinned version is in the launcher.' -ForegroundColor DarkGray
Write-Host '  No service, no Scheduled Task, no hidden process, no Chromium download.' -ForegroundColor DarkGray
Write-Host ''