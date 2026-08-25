# Files — GUI-136

## Change scope

| File | Change | Risk |
|---|---|---|
| `packages/mcp-server/src/remote-host.ts` | Return the loopback endpoint alongside the existing public endpoint. | Public callers must retain the current endpoint meaning. |
| `packages/mcp-server/src/remote-cli.ts` | Emit the loopback endpoint in the ready protocol event consumed by the GUI. | A wrong field would keep packaged doctor broken. |
| `packages/mcp-server/src/remote-host.test.mjs` | Assert both endpoint meanings. | Contract regression coverage. |
| `packages/mcp-server/src/smoke-remote.mjs` | Update smoke expectation for the additive return field. | Smoke must continue checking the public URL. |
| `apps/gui/src/main/remoteAccess/manager.test.ts` | Assert ready parsing retains the loopback endpoint and passes it to doctor. | Test should exercise the production parser, not a parallel helper. |

## Context files

| File | Why read it |
|---|---|
| `apps/gui/src/main/remoteAccess/manager.ts` | Defines the canonical-loopback trust check and doctor environment. |
| `packages/mcp-server/src/doctor-cli.ts` | Shows `KANMER_LOCAL_ENDPOINT` is required for public-mode local checks. |
| `docs/functional/frd/FRD-025-remote-access.md` | Requires a loopback-only authenticated origin and truthful end-to-end doctor. |

## Out of scope

No Cloudflare account/DNS mutation, token-format change, secret-storage change, updater change, or new dependency.
