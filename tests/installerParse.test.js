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
const README = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');

// ── Canonical agent version ─────────────────────────────────────────────────
//
// The canonical install version is 2.0.7: 2.0.3 contains the schema-4 identity
// defect ("profile identity is missing or malformed: serverUuid"), and npm 2.0.5
// is published but NOT reproducible from reviewed source, so it must not be
// distributed. `@latest` is forbidden because a pinned installer must never let
// a future publication silently change the installed code.
const CANONICAL_AGENT_VERSION = '2.0.7';

// ── Parameter declarations ───────────────────────────────────────────────────

test('1. -NoLaunch switch is declared', () => {
  assert.ok(SCRIPT.includes('[switch]$NoLaunch'), '-NoLaunch switch must be declared');
});

test('2. -AgentVersion parameter is declared with the canonical default', () => {
  assert.ok(SCRIPT.includes(`[string]$AgentVersion = '${CANONICAL_AGENT_VERSION}'`),
    `-AgentVersion must be declared with default ${CANONICAL_AGENT_VERSION}`);
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

// ── Server is passed to the agent launcher ───────────────────────────────────

test('18. Agent command includes --server flag (the CLI real supported syntax)', () => {
  assert.ok(SCRIPT.includes('--server'),
    'agent command must include the --server flag');
  assert.ok(SCRIPT.includes('$AgentPackage start --server'),
    'the --server flag must be appended to the start command');
});

test('19. Default Server appears in the executable command', () => {
  // The default server https://x.kwdstore.com must flow into the agent command.
  assert.ok(SCRIPT.includes("'https://x.kwdstore.com'"),
    'default server origin must be declared');
  // The command must interpolate $Server into the --server flag.
  assert.ok(SCRIPT.includes('--server `"$Server`"'),
    'Server must be passed via --server with safe quoting');
});

test('20. Server value is safely quoted in the command', () => {
  // The backtick-escaped double quotes prevent command injection in the .bat.
  assert.ok(SCRIPT.includes('`"$Server`"'),
    'Server must be wrapped in backtick-escaped double quotes');
});

// ── Agent version pin consistency (drift guards) ─────────────────────────────
//
// These guards are deterministic and platform-independent: they read the script
// and README text only, so they run everywhere and cannot be affected by the
// host machine's state.

test('21. install.ps1 pins the canonical agent version exactly once', () => {
  assert.ok(SCRIPT.includes(`[string]$AgentVersion = '${CANONICAL_AGENT_VERSION}'`),
    `install.ps1 must pin ${CANONICAL_AGENT_VERSION}`);
  // Every OTHER literal x.y.z agent version in the script must be the canonical
  // one — a stray older/newer literal is exactly the drift this guards against.
  const versionLiterals = [...SCRIPT.matchAll(/['"]?@xkwdstore\/agent@(\d+\.\d+\.\d+)/g)].map((m) => m[1]);
  for (const v of versionLiterals) {
    assert.equal(v, CANONICAL_AGENT_VERSION,
      `install.ps1 must not reference agent version ${v}`);
  }
});

test('22. install.ps1 never uses @latest or an unpinned package spec', () => {
  assert.ok(!/@xkwdstore\/agent@latest/.test(SCRIPT),
    'install.ps1 must never use @latest');
  // The only package spec must interpolate the pinned $AgentVersion variable.
  assert.ok(SCRIPT.includes('$AgentPackage = "@xkwdstore/agent@$AgentVersion"'),
    'the package spec must be built from the pinned $AgentVersion variable');
  assert.ok(!/"@xkwdstore\/agent"/.test(SCRIPT),
    'install.ps1 must not use the bare (unpinned) package name as a spec');
});

test('23. the documentation option table matches the pinned default', () => {
  const row = README.match(/\|\s*`-AgentVersion`\s*\|\s*`([^`]+)`\s*\|/);
  assert.ok(row, 'README must document the -AgentVersion default');
  assert.equal(row[1], CANONICAL_AGENT_VERSION,
    `README documents -AgentVersion default ${row[1]} but the pin is ${CANONICAL_AGENT_VERSION}`);
});

test('24. no EXECUTABLE / CURRENT-INSTALL surface resolves to 2.0.3 or 2.0.5', () => {
  // SEMANTICS (important — this test does NOT ban prose).
  // ---------------------------------------------------------------------------
  // Historical/explanatory prose MUST be allowed to name 2.0.3 and 2.0.5, because
  // that provenance is what stops a future editor from "simplifying" the pin to
  // @latest or bumping it to an unreviewed version. Banning the strings outright
  // would destroy useful documentation to satisfy a regex.
  //
  // What must never happen is an EXECUTABLE or CURRENT-INSTRUCTION reference to a
  // non-canonical version. So this test derives the set of versions that actually
  // appear in an install/package-spec position and constrains THAT set, instead of
  // pattern-matching the file text.
  //
  // An occurrence counts as an install surface only when it is:
  //   - a `@xkwdstore/agent@<version>` package spec, or
  //   - a `npx ... @xkwdstore/agent@<version>` invocation, or
  //   - an `-AgentVersion` default/value.
  // Comments and prose are excluded (they are stripped before matching).
  const stripComments = (text) =>
    text.split(/\r?\n/).map((l) => l.replace(/(^|\s)#.*$/, '')).join('\n');

  const specPatterns = [
    /@xkwdstore\/agent@(\d+\.\d+\.\d+)/g,          // explicit package spec
    /npx\s+(?:--yes\s+)?@xkwdstore\/agent@(\d+\.\d+\.\d+)/g, // npx invocation
  ];

  for (const [name, raw] of [['install.ps1', SCRIPT], ['README.md', README]]) {
    const text = stripComments(raw);

    // (a) Every version that appears in a package-spec position must be canonical.
    for (const re of specPatterns) {
      for (const m of text.matchAll(re)) {
        assert.equal(m[1], CANONICAL_AGENT_VERSION,
          `${name} has a package-spec reference to agent ${m[1]}; only ${CANONICAL_AGENT_VERSION} may appear in an install spec`);
      }
    }

    // (b) @latest must never appear in an executable spec position at all.
    assert.ok(!/@xkwdstore\/agent@latest/.test(text),
      `${name} must never use @latest in an install spec`);

    // (c) The documented -AgentVersion value must be canonical. This is the
    // executable DEFAULT and therefore the authoritative current install version.
    const declared = raw.match(/\[string\]\$AgentVersion\s*=\s*'([^']+)'/);
    if (declared) {
      assert.equal(declared[1], CANONICAL_AGENT_VERSION,
        `${name} declares -AgentVersion ${declared[1]} but the canonical version is ${CANONICAL_AGENT_VERSION}`);
    }
    const tableRow = raw.match(/\|\s*`-AgentVersion`\s*\|\s*`([^`]+)`\s*\|/);
    if (tableRow) {
      assert.equal(tableRow[1], CANONICAL_AGENT_VERSION,
        `${name} documents -AgentVersion ${tableRow[1]} but the canonical version is ${CANONICAL_AGENT_VERSION}`);
    }
  }
});

test('24b. historical provenance prose is PRESERVED (not deleted to satisfy a regex)', () => {
  // The counterpart to test 24: the explanatory record must keep existing, so a
  // future reader knows WHY 2.0.7 is pinned and why 2.0.5 was not adopted.
  assert.ok(/2\.0\.3/.test(README), 'README must retain the 2.0.3 provenance explanation');
  assert.ok(/2\.0\.5/.test(README), 'README must retain the 2.0.5 provenance explanation');
  assert.ok(/2\.0\.3/.test(SCRIPT), 'install.ps1 must retain the 2.0.3 pin rationale');
  assert.ok(/2\.0\.5/.test(SCRIPT), 'install.ps1 must retain the 2.0.5 non-adoption rationale');
});

test('25. the documentation states why the version is pinned', () => {
  // The pin must be justified in-repo, so a future editor does not "simplify" it
  // to @latest or bump it to an unreviewed version.
  assert.ok(/not reproducible|reproducible/i.test(README),
    'README must explain that 2.0.5 is not reproducible from reviewed source');
  assert.ok(/@latest/i.test(README),
    'README must explicitly forbid @latest');
});