# TW-manager-install

Public installer script for the XKWDStore Agent — **Protocol-v2 release**.

> **@xkwdstore/agent@2.1.8 is the canonical installer version.**

---

## What this installer does

The Protocol-v2 installer replaces the obsolete EXE-era download model with a
lightweight, pinned `npx` launcher:

1. Verifies the **Windows operating system**.
2. Verifies **Node.js 22+** is installed.
3. Verifies **npx** is available (ships with Node.js).
4. Verifies an **installed Google Chrome** (never downloads Chromium).
5. Validates all inputs safely (rejects control characters and shell
   metacharacters in `-AgentVersion`, `-Server`, and `-InstallRoot`).
6. Creates a **visible terminal launcher** at
   `%LOCALAPPDATA%\XKWDStore\Agent\start-xkwdstore-agent.bat` and a desktop
   shortcut pointing at it.
7. Optionally launches the agent (skip with `-NoLaunch`).

No large binary download, no auto-updater, no service, no Scheduled Task, no
hidden process, and no GitHub Release `.exe` is involved. The agent version is
pinned inside the launcher for reproducibility.

### Installer options

| Option | Default | Purpose |
|---|---|---|
| `-NoLaunch` | (switch) | Verify prerequisites only; do not start the agent. |
| `-AgentVersion` | `2.1.8` | Override the pinned agent version. |
| `-Server` | `https://x.kwdstore.com` | Override the XKWDStore server origin URL. |
| `-InstallRoot` | `%LOCALAPPDATA%\XKWDStore\Agent` | Override the install root directory. |

---

## Usage

**Do not pipe `irm ... | iex`** — download the script first, inspect it, then
run it. This is the safe download-then-run pattern.

### Download-then-run (CMD)

```cmd
curl -L -o install.ps1 https://raw.githubusercontent.com/EssaGhazwani/TW-manager-install/main/install.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File install.ps1
```

### Download-then-run (PowerShell)

```powershell
Invoke-WebRequest -Uri https://raw.githubusercontent.com/EssaGhazwani/TW-manager-install/main/install.ps1 -OutFile install.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File install.ps1
```

### Prerequisites only (no launch)

```powershell
Invoke-WebRequest -Uri https://raw.githubusercontent.com/EssaGhazwani/TW-manager-install/main/install.ps1 -OutFile install.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File install.ps1 -NoLaunch
```

The `-NoLaunch` switch verifies prerequisites and creates the launcher without
starting the agent. Automated tests use this to avoid executing the real pinned
`npx` package from the public registry before publication.

---

## Staged-release status

**Final status: `AGENT 2.1.8 INSTALLER PIN`**

The Protocol-v2 installer pins the canonical agent release **2.1.8**:

1. Review and merge the TW-manager hotfix. ✔ done
2. Publish the agent release to npm. ✔ 2.1.8 published as `latest` (2.1.0 and
   2.1.1 are published but **not** usable — see below)
3. Verify the package from a clean temporary environment. ✔ verified, including
   a real Windows host install (broker starts and connects to production)
4. Promote `TW-manager-install` to the canonical pin. ✔ installer pinned to 2.1.8
5. Deploy the updated backend. ✔ deployed (serves `recommendedAgentVersion` 2.1.8)
6. Verify `/api/agent/compatibility` returns Protocol-v2 JSON. ✔ returns
   Protocol-v2 JSON (`recommendedAgentVersion` = 2.1.8)
7. Test first-run enrollment on a real Windows computer. — owner acceptance
   step

Steps 1–6 are complete. Step 7 (first-run enrollment on a clean Windows host)
remains an owner acceptance action outside this installer repository.

> **Known limitation (owner action).** This installer still creates a *visible
> per-user launcher*. Agent 2.1.x is a MACHINE-WIDE generation (a Windows
> service plus a per-session worker, state under `%ProgramData%`). Promoting it
> to the machine-wide installer described in
> `TW-manager/reports/PUBLIC-INSTALLER-2.1.0-DESIGN.md` is a **separate, pending
> change**: where a machine-wide service is already installed, a launcher-run
> broker exits immediately on the machine's global broker mutex. Until that
> redesign lands, 2.1.8 through this launcher is correct in *code* but not in
> *install shape*.

### Why 2.1.8 and not `@latest`, 2.0.5, or 2.1.0/2.1.1

- **2.0.3 is harmful.** Its `_startSession` did not forward the complete schema-4
  identity tuple (`serverUuid`/`tenantUuid`) to `resolveProfileDir`, so every
  launch failed with `profile identity is missing or malformed: serverUuid`.
- **2.0.4 fixed the schema-4 identity forwarding** and remained canonical until
  the 2.1.x machine-wide generation.
- **2.0.5 is not adoptable.** It is published on npm, but its shipped
  `sessionHandler.js` is **not reproducible** from reviewed repository
  commits/tags and has no proven producing commit (`gitHead` absent). Installing
  it would distribute unreviewed code.
- **2.1.0 and 2.1.1 are published but broken.** Both shipped an incomplete
  package. 2.1.0 omitted the two C# sources that `install-machine-agent.ps1`
  compiles, and both omitted `src/brokerConnectionSupervisor.js`, which `cli.js`
  requires unconditionally — installing either on a real Windows host left the
  broker **crash-looping** with `Cannot find module './brokerConnectionSupervisor'`
  while the service still reported `Running`.
- **2.1.2 installed with no dependencies at all.** A normal `npm install
  @xkwdstore/agent` hoists dependencies to the caller's `node_modules`, so the
  package directory ships none, and the installer copied only what happened to
  sit beside it. With no prior install the broker crash-looped with
  `Cannot find module 'playwright-core'`.
- **2.1.3 could not open a browser.** Profile directories were ACL-locked to the
  applying process's own SID + Administrators + SYSTEM, but Chromium runs as the
  **interactive session user** (the worker is started with
  `CreateProcessAsUser(WTSQueryUserToken(active session))`). Every launch failed
  with `Failed to create a ProcessSingleton for your profile directory ... Lock
  file can not be created: Access is denied. (0x5)`, and the profile was
  unreadable and unwritable by that user.
- **2.1.8 is canonical.** It adds two fixes on top of the 2.1.7 browser-connectivity
  generation. A bounded navigation now owns its own budget, so the agent's own
  stall guard can no longer cancel a slow-but-recoverable document with its
  diagnostic page (previously a page that committed at 31 s, or that was
  committed and still loading, was replaced and reported as failed); a
  committed-but-slow document is reported as success, and one transport blip is
  retried once. Previously: Through a credential-bearing HTTP CONNECT proxy, Chromium opened the
  main-frame HTTP/2 stream to Google properties and never received HEADERS, so
  Google Search, Chrome Web Store, Google accounts, gstatic, clients2 and
  update.googleapis.com stayed on `about:blank` until the caller timed out, while
  x.com and example.com loaded through the same proxy. 2.1.7 pinned HTTP/1.1 for
  proxy-required sessions that carry credentials, in all three runtimes, without
  relaxing TLS/certificate validation, DNS pinning, QUIC/WebRTC suppression or
  proxy routing, and keeps HTTP/2 for direct sessions and unauthenticated proxies.
  Verified end to end through a real production proxy with the production launch
  args: Google, Chrome Web Store and X all 200, cookies and localStorage survive a
  full browser restart, and a second profile shares nothing. 2.1.8 was also
  verified in the affected managed browser profile on the affected machine: all
  six required URL variants loaded 20/20 with no guard stall.
- **2.1.5 was canonical before it.** It added bounded navigation with a main-frame
  stall guard (a stalled document is replaced by a typed diagnostic page instead of
  an indefinite `about:blank`), capability-based proxy health across every
  Google/Chrome Web Store endpoint, bounded authentication retries that keep the
  device identity, and same-device recovery.
- **2.1.4 was canonical before it.** It replaces the hand-enumerated `files` list with the
  whole `src/` tree, fixes a broken relative `require` in
  `scripts/worker-entry.js`, makes the machine-wide installer provision its own
  dependency tree (`npm ci --omit=dev`, probed, failing closed), and grants the
  active console user access to the browser profile. Pinned by an npm-tarball
  test (every relative require resolves), an installer test for the dependency
  step, and five profile-ACL regression tests. Verified end to end on two real
  Windows hosts — a browser opens, stays open, and uses the centrally assigned
  proxy.
- **`@latest` is forbidden.** A pinned installer must never let a future npm
  publication silently change the code a user installs.

---

## Testing the installer

- **Local tarball validation** — the packed `npm pack` tarball is tested for
  `version`, `help`, and `doctor` commands. The unpublished package is **not**
  tested through public-registry `npx`.
- **Installer launch tests** — use `-NoLaunch` or a mocked `npx` command. The
  real pinned `npx @xkwdstore/agent@2.1.8` command is never executed from the
  public registry during installation validation.

---

## Migration from the EXE-era installer

The previous installer downloaded a ~56 MB `xkwdstore-agent.exe` binary from
GitHub Releases and created hidden-background launch scripts. That model is
**obsolete** and has been replaced by the Protocol-v2 `npx`-pinned launcher.

Key differences:

| Aspect | EXE-era (obsolete) | Protocol-v2 (current) |
|---|---|---|
| Distribution | GitHub Release `.exe` download | `npx --yes @xkwdstore/agent@2.1.8` |
| Size | ~56 MB binary | Small launcher script |
| Updates | Auto-updater scripts | Pinned version in launcher |
| Prerequisites | None checked | Windows OS + Node.js 22+ + npx + Chrome verified |
| Launch | Hidden background process | Visible foreground terminal window |
| Browser | Bundled Chromium download | Uses installed Google Chrome (no download) |
| Persistence | Service / Scheduled Task | None — runs only while the terminal is open |

The `manifest.json` file is retained for historical reference only and no
longer points to a downloadable binary.