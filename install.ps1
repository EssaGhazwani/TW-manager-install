# XKWDStore Agent — Protocol-v2 One-Line Installer (staged release)
# Usage (paste into CMD):
#   powershell -Command "irm https://raw.githubusercontent.com/EssaGhazwani/TW-manager-install/main/install.ps1 | iex"
#
# Or in PowerShell:
#   irm https://raw.githubusercontent.com/EssaGhazwani/TW-manager-install/main/install.ps1 | iex
#
# Options:
#   -NoLaunch   Install/verify prerequisites only; do not start the agent.
#               Used by automated tests so the real pinned npx package is
#               never executed from the public registry during installation.
#
# Release state:
#   Protocol-v2 installer prepared for Agent 2.0.1. Public installation
#   becomes active after @xkwdstore/agent@2.0.1 is published to npm.

param(
  [switch]$NoLaunch
)

$ErrorActionPreference = 'Stop'

# Pinned future command — do not change until the package is published.
$AgentPackage = '@xkwdstore/agent@2.0.1'
$AgentCommand = "npx --yes $AgentPackage start"

$desktop = [Environment]::GetFolderPath('Desktop')
$batPath = Join-Path $desktop 'start-xkwdstore-agent.bat'

Write-Host ''
Write-Host '  XKWDStore Agent Installer (Protocol v2)' -ForegroundColor Cyan
Write-Host '  ========================================' -ForegroundColor Cyan
Write-Host ''

# ── Step 1: Verify Node.js 22+ ─────────────────────────────────────────────
Write-Host '  [1/3] Checking Node.js...' -ForegroundColor Yellow
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
Write-Host '  [2/3] Checking npx...' -ForegroundColor Yellow
try {
  $npxVer = (npx --version 2>$null)
  if (-not $npxVer) { throw 'npx not found' }
  Write-Host "  ✓ npx $npxVer" -ForegroundColor Green
} catch {
  Write-Host '  ✗ npx was not found. It ships with Node.js 22+.' -ForegroundColor Red
  Write-Host '    Reinstall Node.js from https://nodejs.org/ and rerun this installer.' -ForegroundColor Yellow
  exit 1
}

# ── Step 3: Create desktop launcher ────────────────────────────────────────
Write-Host '  [3/3] Creating desktop launcher...' -ForegroundColor Yellow
$batContent = @"
@echo off
title XKWDStore Agent
echo Starting XKWDStore Agent (Protocol v2)...
echo.
echo Pinned package: $AgentPackage
echo.
$AgentCommand
echo.
echo Agent has stopped. Press any key to close.
pause >nul
"@
Set-Content -Path $batPath -Value $batContent -Encoding ASCII
Write-Host "  ✓ Launcher created: $batPath" -ForegroundColor Green

# ── Launch (unless -NoLaunch) ───────────────────────────────────────────────
if ($NoLaunch) {
  Write-Host ''
  Write-Host '  -NoLaunch specified — prerequisites verified, agent not started.' -ForegroundColor DarkGray
  Write-Host '  To start the agent later, double-click start-xkwdstore-agent.bat.' -ForegroundColor DarkGray
} else {
  Write-Host '  Launching XKWDStore Agent...' -ForegroundColor Yellow
  Start-Process -FilePath $batPath -WorkingDirectory $desktop
  Write-Host '  ✓ Agent launcher started' -ForegroundColor Green
}

Write-Host ''
Write-Host '  Protocol-v2 installer prepared for Agent 2.0.1.' -ForegroundColor Cyan
Write-Host '  Public installation becomes active after @xkwdstore/agent@2.0.1 is published to npm.' -ForegroundColor Cyan
Write-Host ''
Write-Host '  Then go to your XKWDStore dashboard to authorize this device.' -ForegroundColor Cyan
Write-Host ''
Write-Host '  The agent does NOT auto-update — the pinned version is in the launcher.' -ForegroundColor DarkGray
Write-Host ''