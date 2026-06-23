# XKWDStore Agent — One-Line Installer
# Usage (paste into CMD):
#   powershell -Command "irm https://raw.githubusercontent.com/EssaGhazwani/TW-manager-install/main/install.ps1 | iex"
#
# Or in PowerShell:
#   irm https://raw.githubusercontent.com/EssaGhazwani/TW-manager-install/main/install.ps1 | iex

$ErrorActionPreference = 'Stop'
$repo = 'EssaGhazwani/TW-manager-install'
$releaseUrl = "https://github.com/$repo/releases/download/agent-latest/xkwdstore-agent.exe"
$desktop = [Environment]::GetFolderPath('Desktop')
$exePath = Join-Path $desktop 'xkwdstore-agent.exe'
$batPath = Join-Path $desktop 'start.bat'
$launchPath = Join-Path $desktop 'launch-agent.ps1'

function Clear-XkwdStuckUpdater {
    param([string]$AgentDir)

    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -match 'xkwdstore-update|xkwdstore-restart' } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

    $parents = @($env:USERPROFILE, (Split-Path $AgentDir -Parent))
    foreach ($parent in ($parents | Select-Object -Unique)) {
        foreach ($name in '.xkwdstore-update.bat', '.xkwdstore-restart.bat') {
            $file = Join-Path $parent $name
            if (Test-Path $file) {
                Remove-Item $file -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

function Start-XkwdAgentHidden {
    param(
        [string]$ExePath,
        [string]$WorkDir
    )

    Clear-XkwdStuckUpdater -AgentDir $WorkDir

    $running = Get-Process -Name 'xkwdstore-agent' -ErrorAction SilentlyContinue
    if ($running) {
        Write-Host '  Agent already running — skipping duplicate launch.' -ForegroundColor Yellow
        return $false
    }

    Start-Process -FilePath $ExePath -WorkingDirectory $WorkDir -WindowStyle Hidden | Out-Null
    return $true
}

Write-Host ''
Write-Host '  XKWDStore Agent Installer' -ForegroundColor Cyan
Write-Host '  ==========================' -ForegroundColor Cyan
Write-Host ''

# ── Step 0: Stop stuck updater terminals from older agent versions ──
Write-Host '  [0/4] Cleaning up stuck updater terminals...' -ForegroundColor Yellow
Clear-XkwdStuckUpdater -AgentDir $desktop
Write-Host '  ✓ Cleanup done' -ForegroundColor Green

# ── Step 1: Download the agent .exe from GitHub Releases ──
Write-Host '  [1/4] Downloading XKWDStore Agent...' -ForegroundColor Yellow
try {
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

# ── Step 2: Create launch-agent.ps1 + start.bat ──
Write-Host '  [2/4] Creating launch scripts...' -ForegroundColor Yellow

$launchContent = @'
$ErrorActionPreference = 'SilentlyContinue'
$desktop = Split-Path -Parent $MyInvocation.MyCommand.Path
$exePath = Join-Path $desktop 'xkwdstore-agent.exe'

function Clear-XkwdStuckUpdater {
    param([string]$AgentDir)
    Get-CimInstance Win32_Process |
        Where-Object { $_.CommandLine -match 'xkwdstore-update|xkwdstore-restart' } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    $parents = @($env:USERPROFILE, (Split-Path $AgentDir -Parent))
    foreach ($parent in ($parents | Select-Object -Unique)) {
        foreach ($name in '.xkwdstore-update.bat', '.xkwdstore-restart.bat') {
            $file = Join-Path $parent $name
            if (Test-Path $file) { Remove-Item $file -Force -ErrorAction SilentlyContinue }
        }
    }
}

Clear-XkwdStuckUpdater -AgentDir $desktop

$running = Get-Process -Name 'xkwdstore-agent' -ErrorAction SilentlyContinue
if ($running) { exit 0 }

Start-Process -FilePath $exePath -WorkingDirectory $desktop -WindowStyle Hidden | Out-Null
'@

Set-Content -Path $launchPath -Value $launchContent -Encoding UTF8

$batContent = @"
@echo off
title XKWDStore Agent
echo Starting XKWDStore Agent (background)...
powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0launch-agent.ps1"
echo Agent started in the background. You can close this window.
timeout /t 3 /nobreak >nul
"@

Set-Content -Path $batPath -Value $batContent -Encoding ASCII
Write-Host '  ✓ launch-agent.ps1 + start.bat created' -ForegroundColor Green

# ── Step 3: Launch the agent (hidden, single instance) ──
Write-Host '  [3/4] Launching XKWDStore Agent...' -ForegroundColor Yellow
if (Start-XkwdAgentHidden -ExePath $exePath -WorkDir $desktop) {
    Write-Host '  ✓ Agent launched in background' -ForegroundColor Green
} else {
    Write-Host '  ✓ Existing agent left running' -ForegroundColor Green
}

Write-Host ''
Write-Host '  The agent will auto-download Firefox on first run (~120 MB).' -ForegroundColor Cyan
Write-Host '  Then go to your XKWDStore dashboard to pair this device.' -ForegroundColor Cyan
Write-Host ''
Write-Host '  To start later: double-click start.bat on your Desktop.' -ForegroundColor DarkGray
Write-Host '  The agent auto-updates automatically — no manual updates needed.' -ForegroundColor DarkGray
Write-Host ''
