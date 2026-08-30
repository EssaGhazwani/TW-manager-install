# TW-manager-install

Public installer script for the XKWDStore Agent — **Protocol-v2 release**.

> **@xkwdstore/agent@2.0.3 is now publicly available on npm.**

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
| `-AgentVersion` | `2.0.3` | Override the pinned agent version. |
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

**Final status: `AGENT 2.0.3 PUBLISHED`**

The Protocol-v2 release order is complete for npm publication:

1. Review and merge the TW-manager hotfix. ✔ done
2. Publish `@xkwdstore/agent@2.0.3` to npm. ✔ published (latest = 2.0.3)
3. Verify the package from a clean temporary environment. ✔ verified
   (`--version` prints 2.0.3, exit 0; `doctor` vs production exit 0)
4. Review and merge `TW-manager-install`. ✔ installer promoted to 2.0.3
5. Deploy the updated backend. — separate owner action (not part of installer
   promotion)
6. Verify `/api/agent/compatibility` returns Protocol-v2 JSON. ✔ returns
   Protocol-v2 JSON; `recommendedAgentVersion` reflects 2.0.2 until the backend
   deployment in step 5 completes
7. Test first-run enrollment on a real Windows computer. — owner acceptance
   step

Steps 1–4 are complete; steps 5 and 7 remain owner deployment/acceptance
actions outside this installer repository.

---

## Testing the installer

- **Local tarball validation** — the packed `npm pack` tarball is tested for
  `version`, `help`, and `doctor` commands. The unpublished package is **not**
  tested through public-registry `npx`.
- **Installer launch tests** — use `-NoLaunch` or a mocked `npx` command. The
  real pinned `npx @xkwdstore/agent@2.0.3` command is never executed from the
  public registry during installation validation.

---

## Migration from the EXE-era installer

The previous installer downloaded a ~56 MB `xkwdstore-agent.exe` binary from
GitHub Releases and created hidden-background launch scripts. That model is
**obsolete** and has been replaced by the Protocol-v2 `npx`-pinned launcher.

Key differences:

| Aspect | EXE-era (obsolete) | Protocol-v2 (current) |
|---|---|---|
| Distribution | GitHub Release `.exe` download | `npx --yes @xkwdstore/agent@2.0.3` |
| Size | ~56 MB binary | Small launcher script |
| Updates | Auto-updater scripts | Pinned version in launcher |
| Prerequisites | None checked | Windows OS + Node.js 22+ + npx + Chrome verified |
| Launch | Hidden background process | Visible foreground terminal window |
| Browser | Bundled Chromium download | Uses installed Google Chrome (no download) |
| Persistence | Service / Scheduled Task | None — runs only while the terminal is open |

The `manifest.json` file is retained for historical reference only and no
longer points to a downloadable binary.