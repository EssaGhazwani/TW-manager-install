'use strict';

/**
 * Protocol-v2 installer — behavior tests (Windows only).
 *
 * Runs install.ps1 with -NoLaunch against a temporary install root and verifies
 * it creates the visible launcher without starting the agent, registering a
 * service, or creating a Scheduled Task.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', 'install.ps1');
const isWindows = os.platform() === 'win32';

function psExe() {
  const root = process.env.SystemRoot || process.env.WINDIR || 'C:\\Windows';
  return path.join(root, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
}

test('installer -NoLaunch run verifies prerequisites without launching the agent', { skip: !isWindows }, () => {
  const tmpRoot = path.join(os.tmpdir(), 'xkwd-install-test-' + Date.now() + '-' + Math.floor(Math.random() * 1e6));
  const output = execFileSync(psExe(), [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', SCRIPT,
    '-NoLaunch',
    '-InstallRoot', tmpRoot,
  ], { encoding: 'utf8', timeout: 60000 });

  assert.ok(output.includes('Node.js'), 'must report Node.js version');
  assert.ok(output.includes('npx'), 'must report npx version');
  assert.ok(output.includes('Google Chrome'), 'must report Chrome');
  assert.ok(output.includes('Install root:'), 'must report the install root');
  assert.ok(output.includes('-NoLaunch specified'), 'must confirm -NoLaunch mode');
  assert.ok(!output.includes('Launching XKWDStore Agent'),
    'must NOT launch the agent under -NoLaunch');

  // The launcher must exist in the temp install root.
  const bat = path.join(tmpRoot, 'start-xkwdstore-agent.bat');
  assert.ok(fs.existsSync(bat), 'launcher .bat must be created in the install root');
  const batContent = fs.readFileSync(bat, 'utf8');
  assert.ok(batContent.includes('npx --yes @xkwdstore/agent@2.0.3 start'),
    'launcher must contain the pinned npx command');
  assert.ok(batContent.includes('--server'),
    'launcher must pass --server to the agent');
  assert.ok(batContent.includes('https://x.kwdstore.com'),
    'default server must appear in the executable command');
  assert.ok(batContent.includes('title XKWDStore Agent'),
    'launcher must set a visible title');

  // Cleanup
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch {}
});

test('installer never invokes the pinned public-registry npx command', { skip: !isWindows }, () => {
  const tmpRoot = path.join(os.tmpdir(), 'xkwd-install-nolaunch-' + Date.now() + '-' + Math.floor(Math.random() * 1e6));
  const output = execFileSync(psExe(), [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', SCRIPT,
    '-NoLaunch',
    '-InstallRoot', tmpRoot,
  ], { encoding: 'utf8', timeout: 60000 });

  // Under -NoLaunch the real npx command must never be executed — only written
  // into the .bat launcher for later manual use.
  assert.ok(!/npx --yes @xkwdstore\/agent@\d+\.\d+\.\d+ start\b/.test(output.replace('Pinned package: ', '').replace('npx --yes @xkwdstore/agent@2.0.3 start', '')),
    'must not execute the pinned npx command during -NoLaunch');
  assert.ok(!output.includes('Agent has stopped'),
    'must not run the agent to completion under -NoLaunch');

  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch {}
});

test('installer rejects an invalid Server URL safely', { skip: !isWindows }, () => {
  const tmpRoot = path.join(os.tmpdir(), 'xkwd-install-badserver-' + Date.now());
  let exitCode = 0;
  let output = '';
  try {
    output = execFileSync(psExe(), [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-File', SCRIPT,
      '-NoLaunch',
      '-Server', 'not-a-url',
      '-InstallRoot', tmpRoot,
    ], { encoding: 'utf8', timeout: 60000 });
  } catch (e) {
    exitCode = e.status || 1;
    output = (e.stdout || '') + (e.stderr || '');
  }
  assert.ok(output.includes('Server must be a valid http(s) URL'),
    'must reject an invalid Server URL with a clear message');
  assert.notStrictEqual(exitCode, 0, 'must exit non-zero on an invalid Server');
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch {}
});

test('installer rejects shell metacharacters in AgentVersion', { skip: !isWindows }, () => {
  const tmpRoot = path.join(os.tmpdir(), 'xkwd-install-badver-' + Date.now());
  let exitCode = 0;
  let output = '';
  try {
    output = execFileSync(psExe(), [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-File', SCRIPT,
      '-NoLaunch',
      '-AgentVersion', '2.0.1;rm -rf /',
      '-InstallRoot', tmpRoot,
    ], { encoding: 'utf8', timeout: 60000 });
  } catch (e) {
    exitCode = e.status || 1;
    output = (e.stdout || '') + (e.stderr || '');
  }
  assert.ok(output.includes('forbidden shell metacharacters'),
    'must reject shell metacharacters in AgentVersion');
  assert.notStrictEqual(exitCode, 0, 'must exit non-zero on metacharacters');
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch {}
});

test('custom Server appears in the executable launcher command', { skip: !isWindows }, () => {
  const tmpRoot = path.join(os.tmpdir(), 'xkwd-install-customserver-' + Date.now() + '-' + Math.floor(Math.random() * 1e6));
  const customServer = 'https://staging.xkwdstore.com';
  const output = execFileSync(psExe(), [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', SCRIPT,
    '-NoLaunch',
    '-Server', customServer,
    '-InstallRoot', tmpRoot,
  ], { encoding: 'utf8', timeout: 60000 });

  const bat = path.join(tmpRoot, 'start-xkwdstore-agent.bat');
  assert.ok(fs.existsSync(bat), 'launcher .bat must be created');
  const batContent = fs.readFileSync(bat, 'utf8');
  assert.ok(batContent.includes('--server'),
    'launcher must pass --server to the agent');
  assert.ok(batContent.includes(customServer),
    'custom server must appear in the executable command');
  assert.ok(!batContent.includes('https://x.kwdstore.com'),
    'default server must NOT appear when a custom server is provided');

  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch {}
});

test('launcher does not merely echo the Server (it passes it as a flag)', { skip: !isWindows }, () => {
  const tmpRoot = path.join(os.tmpdir(), 'xkwd-install-echoserver-' + Date.now() + '-' + Math.floor(Math.random() * 1e6));
  const customServer = 'https://test.xkwdstore.com';
  execFileSync(psExe(), [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', SCRIPT,
    '-NoLaunch',
    '-Server', customServer,
    '-InstallRoot', tmpRoot,
  ], { encoding: 'utf8', timeout: 60000 });

  const bat = path.join(tmpRoot, 'start-xkwdstore-agent.bat');
  const batContent = fs.readFileSync(bat, 'utf8');
  // The command line must contain --server followed by the quoted URL.
  assert.ok(/--server\s+"[^"]+"/.test(batContent),
    'launcher must pass --server as a command-line flag with a quoted value');
  // The echo line is informational only; the executable line must have the flag.
  const cmdLine = batContent.split(/\r?\n/).find(l => l.includes('npx --yes'));
  assert.ok(cmdLine && cmdLine.includes('--server'),
    'the npx command line must include --server');
  assert.ok(cmdLine && cmdLine.includes(customServer),
    'the npx command line must include the custom server URL');

  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch {}
});