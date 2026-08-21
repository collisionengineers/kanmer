# Files — GUI-104

## Where the change lands

| Path | Why |
|---|---|
| New `apps/gui/src/main/openai-tunnel.ts` plus tests | Own profile validation, command construction, doctor execution, child lifecycle, redaction, health state, and quit cleanup. |
| `apps/gui/src/shared/ipc.ts`, preload bridge, and main IPC registration | Add typed project-scoped profile/status/start/stop/doctor operations and status events. |
| `apps/gui/src/main/settings.ts` | Persist only non-secret per-project profile metadata in app-global user data. |
| `apps/gui/src/renderer/src/components/Settings.tsx` plus tests/styles | Add a separate OpenAI Secure MCP Tunnel surface with prerequisite, profile, doctor, and lifecycle states. |
| `docs/manual/connect.md` and generated manual output | Replace the manual-only workflow with the GUI-supported path while retaining secure fallback instructions. |

## Context files

| Path | What it tells the implementer |
|---|---|
| DOC-010 and its proof | The tested client command, forward-slash requirement, one-profile-per-project rule, and security boundary. |
| `apps/gui/src/main/connect.ts` | How the packaged Kanmer stdio invocation resolves board and repo roots; reuse this invocation builder instead of duplicating it. |
| `apps/gui/src/main/dispatch.ts` | Precedent for tracking owned children, emitting status, tree-killing, and app-quit cleanup. |
| `apps/gui/src/main/index.ts` | IPC ownership and application lifecycle integration points. |
| `docs/functional/frd/FRD-012-connect.md` | Existing Connect responsibilities; it does not yet authorize this tunnel lifecycle. |
| `EPIC-010/context.md` | Requires the OpenAI path to remain independent from Cloudflare named-tunnel HTTP work. |

## Ripple effects

The public preload/API type changes require renderer/main parity tests. Process management affects quit/update behavior and needs redaction tests. User-facing instructions require manual regeneration. No package dependency is needed; use Node/Electron process APIs already present.

## Out of scope

Creating OpenAI tunnels or ChatGPT apps, storing API keys, managing workspace RBAC, downloading/updating `tunnel-client`, Cloudflare Tunnel/Access, Streamable HTTP, public relays, or managing externally started processes.
