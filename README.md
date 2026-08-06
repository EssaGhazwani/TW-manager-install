# TW-manager-install

Public installer script for the XKWDStore Agent — **Protocol-v2 release**.

> **@xkwdstore/agent@2.0.1 is now publicly available on npm.**

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
| `-AgentVersion` | `2.0.1` | Override the pinned agent version. |
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

**Final status: `CODE READY — RELEASE AND DEPLOYMENT REQUIRED`**

The installer code is complete and structurally validated, but the release is
not operational for end users yet. The required release order is:

1. Review and merge the TW-manager hotfix.
2. Publish `@xkwdstore/agent@2.0.1` to npm.
3. Verify the package from a clean temporary environment.
4. Review and merge `TW-manager-install`.
5. Deploy the updated backend.
6. Verify `/api/agent/compatibility` returns Protocol-v2 JSON.
7. Test first-run enrollment on a real Windows computer.

Until steps 1–7 are complete, the release state remains
`CODE READY — RELEASE AND DEPLOYMENT REQUIRED`.

---

## Testing the installer

- **Local tarball validation** — the packed `npm pack` tarball is tested for
  `version`, `help`, and `doctor` commands. The unpublished package is **not**
  tested through public-registry `npx`.
- **Installer launch tests** — use `-NoLaunch` or a mocked `npx` command. The
  real pinned `npx @xkwdstore/agent@2.0.1` command is never executed from the
  public registry during installation validation.

---

## Migration from the EXE-era installer

The previous installer downloaded a ~56 MB `xkwdstore-agent.exe` binary from
GitHub Releases and created hidden-background launch scripts. That model is
**obsolete** and has been replaced by the Protocol-v2 `npx`-pinned launcher.

Key differences:

| Aspect | EXE-era (obsolete) | Protocol-v2 (current) |
|---|---|---|
| Distribution | GitHub Release `.exe` download | `npx --yes @xkwdstore/agent@2.0.1` |
| Size | ~56 MB binary | Small launcher script |
| Updates | Auto-updater scripts | Pinned version in launcher |
| Prerequisites | None checked | Windows OS + Node.js 22+ + npx + Chrome verified |
| Launch | Hidden background process | Visible foreground terminal window |
| Browser | Bundled Chromium download | Uses installed Google Chrome (no download) |
| Persistence | Service / Scheduled Task | None — runs only while the terminal is open |

The `manifest.json` file is retained for historical reference only and no
longer points to a downloadable binary.