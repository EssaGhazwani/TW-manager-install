# XKWDStore Agent — One-Line Installer
# Usage (paste into CMD):
#   powershell -Command "irm https://raw.githubusercontent.com/EssaGhazwani/TW-manager-install/main/install.ps1 | iex"
#
# Or in PowerShell:
#   irm https://raw.githubusercontent.com/EssaGhazwani/TW-manager-install/main/install.ps1 | iex

$ErrorActionPreference = 'Stop'
$repo = 'EssaGhazwani/TW-manager'
$releaseUrl = "https://github.com/$repo/releases/download/agent-latest/xkwdstore-agent.exe"
$desktop = [Environment]::GetFolderPath('Desktop')
$exePath = Join-Path $desktop 'xkwdstore-agent.exe'
$batPath = Join-Path $desktop 'start.bat'

Write-Host ''
Write-Host '  XKWDStore Agent Installer' -ForegroundColor Cyan
Write-Host '  ==========================' -ForegroundColor Cyan
Write-Host ''

# ── Step 1: Download the agent .exe from GitHub Releases ──
Write-Host '  [1/3] Downloading XKWDStore Agent...' -ForegroundColor Yellow
try {
    # Use Invoke-WebRequest which follows GitHub's 302 redirects to the CDN.
    # WebClient is unreliable for redirected downloads on PowerShell 7.
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $releaseUrl -OutFile $exePath -UseBasicParsing
    $sizeMB = [math]::Round((Get-Item $exePath).Length / 1MB, 1)
    Write-Host "  ✓ Downloaded xkwdstore-agent.exe ($sizeMB MB)" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Download failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ''
    Write-Host '  Try downloading manually from:' -ForegroundColor Yellow
    Write-Host "  $releaseUrl" -ForegroundColor Gray
    exit 1
}

# ── Step 2: Create start.bat ──
Write-Host '  [2/3] Creating start.bat...' -ForegroundColor Yellow
$batContent = @"
@echo off
title XKWDStore Agent
echo Starting XKWDStore Agent...
echo.
echo First run will auto-download Firefox (~120 MB, one-time).
echo.
xkwdstore-agent.exe
echo.
echo Agent has stopped. Press any key to close.
pause >nul
"@
Set-Content -Path $batPath -Value $batContent -Encoding ASCII
Write-Host '  ✓ start.bat created' -ForegroundColor Green

# ── Step 3: Launch the agent ──
Write-Host '  [3/3] Launching XKWDStore Agent...' -ForegroundColor Yellow
Start-Process -FilePath $exePath -WorkingDirectory $desktop
Write-Host '  ✓ Agent launched!' -ForegroundColor Green

Write-Host ''
Write-Host '  The agent will auto-download Firefox on first run (~120 MB).' -ForegroundColor Cyan
Write-Host '  Then go to your XKWDStore dashboard to pair this device.' -ForegroundColor Cyan
Write-Host ''
Write-Host '  The agent auto-updates automatically — no manual updates needed.' -ForegroundColor DarkGray
Write-Host ''
