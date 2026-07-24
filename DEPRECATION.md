# XKWDStore Desktop Agent — Deprecation Notice

## Status

The XKWDStore desktop agent (`.exe` installer) is being replaced by a
**terminal-only CLI** that uses cryptographic key authentication instead of
pairing codes.

The terminal CLI is **not yet published**. The desktop agent remains the only
supported distribution until the CLI is published and migration is proven.

## Timeline

### Stage A (current)

- Protocol v2 enrollment + Ed25519 challenge-response implemented in the backend.
- Legacy pairing/ticket paths preserved behind a feature flag.
- Terminal CLI developed but not published.
- **Desktop agent remains fully functional.**

### Stage B (future)

- Terminal CLI published to npm as `@xkwdstore/agent`.
- Legacy devices shown as "migration required" in the dashboard.
- Legacy agent can generate an Ed25519 key and request dashboard approval.
- Desktop agent remains functional during migration.

### Stage C (future, owner-approved)

- Confirm zero active legacy devices.
- Disable pairing-code generation.
- Remove ticket and pairing stores.
- **Retire this repository** (archive, not delete).

## What changes

| Aspect | Desktop Agent (legacy) | Terminal CLI (protocol v2) |
|--------|----------------------|---------------------------|
| Distribution | `.exe` on Desktop | `npx --yes @xkwdstore/agent@2.0.0 start` |
| Auth | Pairing code | Ed25519 key + browser approval |
| Updates | Auto-updater (GitHub manifest) | Pinned version in npx command |
| Browser | Auto-downloaded Chromium | System Google Chrome |
| Data location | Desktop + `~/.xkwdstore-agent/` | OS standard app-data directory |

## Current desktop version

- Last supported version: `20260628151954` (2026-06-28)
- This is the **final** desktop agent version. No new desktop builds will be
  produced after the terminal CLI is published.

## Migration path

When the terminal CLI is published:

1. Run `npx --yes @xkwdstore/agent@2.0.0 start` in a terminal.
2. Approve the computer in the XKWDStore dashboard.
3. Verify browser sessions work.
4. Delete the desktop `.exe` and `start.bat` from your Desktop.
5. The terminal CLI connects automatically on future runs — no desktop app needed.

## Do NOT

- Do not delete or archive this repository yet.
- Do not remove the existing `agent-latest` release.
- Do not link to an unpublished npm package.
- Do not disable the auto-updater in the current desktop agent until
  Stage C is owner-approved.