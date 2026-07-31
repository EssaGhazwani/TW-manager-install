'use strict';

/**
 * Protocol-v2 installer — static parse tests for install.ps1.
 *
 * Verifies the installer script declares and enforces every required
 * prerequisite and safety property without executing it. These tests run on
 * any platform because they only read and parse the script text.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const SCRIPT = fs.readFileSync(path.join(__dirname, '..', 'install.ps1'), 'utf8');

// ── Parameter declarations ───────────────────────────────────────────────────

test('1. -NoLaunch switch is declared', () => {
  assert.ok(SCRIPT.includes('[switch]$NoLaunch'), '-NoLaunch switch must be declared');
});

test('2. -AgentVersion parameter is declared with default 2.0.1', () => {
  assert.ok(SCRIPT.includes("[string]$AgentVersion = '2.0.1'"),
    '-AgentVersion must be declared with default 2.0.1');
});

test('3. -Server parameter is declared with default origin', () => {
  assert.ok(SCRIPT.includes("[string]$Server = 'https://x.kwdstore.com'"),
    '-Server must be declared with the default XKWDStore origin');
});

test('4. -InstallRoot parameter is declared with default LOCALAPPDATA path', () => {
  assert.ok(SCRIPT.includes('Join-Path $env:LOCALAPPDATA'),
    '-InstallRoot must default to a LOCALAPPDATA-based path');
  assert.ok(SCRIPT.includes("'XKWDStore\\Agent'"),
    '-InstallRoot default must be %LOCALAPPDATA%\\XKWDStore\\Agent');
});

// ── Prerequisite verifications ───────────────────────────────────────────────

test('5. Windows OS verification is present', () => {
  assert.ok(SCRIPT.includes('Verify Windows OS'), 'OS verification step must exist');
  assert.ok(/IsWindows|Win32NT|Windows_NT/.test(SCRIPT),
    'OS check must test a Windows indicator');
  assert.ok(SCRIPT.includes('This installer only runs on Windows'),
    'must reject non-Windows with a clear message');
});

test('6. Node.js 22+ verification is present', () => {
  assert.ok(SCRIPT.includes('node --version'), 'must call node --version');
  assert.ok(SCRIPT.includes('-lt 22'), 'must enforce major version >= 22');
});

test('7. npx verification is present', () => {
  assert.ok(SCRIPT.includes('npx --version'), 'must call npx --version');
});

test('8. Installed Google Chrome verification is present', () => {
  assert.ok(SCRIPT.includes('Google Chrome'), 'Chrome verification step must exist');
  assert.ok(SCRIPT.includes('chrome.exe'), 'must check chrome.exe');
  assert.ok(SCRIPT.includes('ProgramFiles'), 'must check ProgramFiles Chrome path');
});

test('9. Default install root is %LOCALAPPDATA%\\XKWDStore\\Agent', () => {
  assert.ok(SCRIPT.includes('XKWDStore\\Agent'),
    'default install root must be XKWDStore\\Agent');
});

// ── Visible launcher, no hidden process ──────────────────────────────────────

test('10. Visible terminal launcher is created', () => {
  assert.ok(SCRIPT.includes('start-xkwdstore-agent.bat'),
    'must create a .bat launcher');
  assert.ok(SCRIPT.includes('title XKWDStore Agent'),
    'launcher must set a visible title');
});

test('11. Launcher window is visible (WindowStyle Normal), not hidden', () => {
  assert.ok(SCRIPT.includes('WindowStyle Normal'),
    'launch must use a visible window style');
  assert.ok(!SCRIPT.includes('WindowStyle Hidden'),
    'must never launch a hidden window');
  assert.ok(!/WindowStyle\s+0\b/.test(SCRIPT),
    'must never launch with WindowStyle 0 (hidden)');
});

test('12. No service is created', () => {
  assert.ok(!SCRIPT.includes('New-Service'), 'must not create a Windows service');
  assert.ok(!SCRIPT.includes('sc.exe'), 'must not use sc.exe');
  assert.ok(!SCRIPT.includes('Install-Service'), 'must not install a service');
});

test('13. No Scheduled Task is created', () => {
  assert.ok(!SCRIPT.includes('schtasks'), 'must not create a Scheduled Task');
  assert.ok(!SCRIPT.includes('Register-ScheduledTask'),
    'must not use Register-ScheduledTask');
  assert.ok(!SCRIPT.includes('New-ScheduledTask'),
    'must not use New-ScheduledTask');
});

test('14. No Chromium or browser download', () => {
  assert.ok(!SCRIPT.includes('playwright install'),
    'must not run playwright install');
  assert.ok(!/Invoke-WebRequest.*chrome/i.test(SCRIPT),
    'must not download Chrome via Invoke-WebRequest');
  assert.ok(!/curl.*chrome/i.test(SCRIPT),
    'must not download Chrome via curl');
  assert.ok(SCRIPT.includes('never downloads Chromium'),
    'must state it never downloads Chromium');
});

// ── Safe input validation ────────────────────────────────────────────────────

test('15. Safe input validation rejects control characters and metacharacters', () => {
  assert.ok(SCRIPT.includes('Test-SafeInput'),
    'must define a Test-SafeInput function');
  assert.ok(SCRIPT.includes('[\\x00-\\x1f\\x7f]'),
    'must reject control characters');
  assert.ok(SCRIPT.includes('[;&|`$<>]'),
    'must reject shell metacharacters');
  assert.ok(SCRIPT.includes('Test-SafeInput $AgentVersion'),
    'must validate AgentVersion');
  assert.ok(SCRIPT.includes('Test-SafeInput $Server'),
    'must validate Server');
  assert.ok(SCRIPT.includes('Test-SafeInput $InstallRoot'),
    'must validate InstallRoot');
});

test('16. Server URL is validated as http(s)', () => {
  assert.ok(SCRIPT.includes('[System.Uri]$Server'),
    'must parse the Server as a URI');
  assert.ok(SCRIPT.includes("Scheme -ne 'http'"),
    'must validate the scheme is http or https');
});

// ── No irm | iex one-line piping ─────────────────────────────────────────────

test('17. No irm | iex one-line piping in the script header', () => {
  // The header must document download-then-run, not irm | iex piping.
  assert.ok(!SCRIPT.includes('irm https://') || SCRIPT.includes('Do NOT pipe'),
    'irm piping must be replaced with download-then-run');
  assert.ok(SCRIPT.includes('curl -L -o install.ps1'),
    'must document curl download-then-run');
  assert.ok(SCRIPT.includes('Invoke-WebRequest'),
    'must document Invoke-WebRequest download-then-run');
  assert.ok(SCRIPT.includes('-ExecutionPolicy Bypass -File install.ps1'),
    'must document -File execution');
});