# TW-manager-install

Public installer script for the XKWDStore Agent — **Protocol-v2 staged release**.

> **Protocol-v2 installer prepared for Agent 2.0.1. Public installation becomes
> active after `@xkwdstore/agent@2.0.1` is published to npm.**
>
> Version 2.0.1 is **not usable through the public installer** until it is
> published to npm. Do not run the launcher expecting a working agent until
> publication is complete.

---

## What this installer does

The Protocol-v2 installer replaces the obsolete EXE-era download model with a
lightweight, pinned `npx` launcher:

1. Verifies **Node.js 22+** is installed.
2. Verifies **npx** is available (ships with Node.js).
3. Creates a desktop launcher (`start-xkwdstore-agent.bat`) that runs the pinned
   command:
   ```
   npx --yes @xkwdstore/agent@2.0.1 start
   ```
4. Optionally launches the agent (skip with `-NoLaunch`).

No large binary download, no auto-updater, and no GitHub Release `.exe` is
involved. The agent version is pinned inside the launcher for reproducibility.

---

## Usage

### One-line install (CMD)

```cmd
powershell -Command "irm https://raw.githubusercontent.com/EssaGhazwani/TW-manager-install/main/install.ps1 | iex"
```

### One-line install (PowerShell)

```powershell
irm https://raw.githubusercontent.com/EssaGhazwani/TW-manager-install/main/install.ps1 | iex
```

### Prerequisites only (no launch)

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/EssaGhazwani/TW-manager-install/main/install.ps1))) -NoLaunch
```

The `-NoLaunch` switch verifies prerequisites and creates the desktop launcher
without starting the agent. Automated tests use this to avoid executing the
real pinned `npx` package from the public registry before publication.

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
| Prerequisites | None checked | Node.js 22+ + npx verified |
| Launch | Hidden background process | Foreground terminal window |

The `manifest.json` file is retained for historical reference only and no
longer points to a downloadable binary.