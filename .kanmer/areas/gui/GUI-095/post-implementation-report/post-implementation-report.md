# Post-implementation report — GUI-095

## Delivered

Implemented the Cloudflare-only per-project remote-access path in the Electron GUI.

- Added the app-owned `settings.json.remoteAccess` v1 registry keyed by the MCP-compatible `kanmer-proj-v1:<sha256>` fingerprint, with serialized registration/settings persistence and explicit reconcile/remove operations.
- Added atomic registry writes, unknown/malformed-record filtering, secure opaque bearer records through approved Electron `safeStorage` backends (including `gnome_libsecret` and `kwallet*`), and no plaintext fallback.
- Added main/preload IPC for project registration, overview, reconcile/remove, exact-field config saves, one-time bearer delivery/consumption, start/stop, status subscription, and canonical doctor invocation. Remote calls enforce exact sender/frame/origin, project binding, and expected config/runtime generations.
- Added a per-project serialized lifecycle queue, a deterministic global max-two auto-start semaphore, duplicate hostname/tunnel rejection, exclusive headless-owner detection without takeover, bounded child/doctor cleanup, owned-tree force cleanup, stale event filtering, expiring project/frame-bound delivery capabilities, and true-quit cleanup.
- The manager launches the canonical MCP remote-host and MCP-027 doctor CLIs through an allowlisted child environment; it does not spawn cloudflared or reimplement transport/doctor behavior. It passes board/repository roots explicitly and checks the returned project fingerprint.
- Bearer rotation persists the new encrypted record before activation, restores the old config on persistence failure, invalidates old deliveries only after success, and reports old-record cleanup warnings safely.
- Runtime/doctor DTOs now include local/tunnel/public health dimensions, board/listener/auth/session/tunnel/remote health, action/severity, repair and safe last summary/time, config generation and runtime generation.
- Pinned BrowserWindow `contextIsolation: true` and `nodeIntegration: false`; the bearer delivery is masked by default in the renderer, expires/consumes on timeout or unmount, and supports guarded clipboard cleanup after explicit copy.
- Added a Cloudflare Tunnel settings tab with registered-project overview, guarded configuration, create/rotate token actions, explicit start/stop, reconcile/remove, safe endpoint copy, independent status dimensions, and redacted doctor results.
- Added packaged CJS `remote-cli` and `doctor-cli` resources. The existing `kanmer-mcp.cjs` plugin artifact was not changed.

## Tests and verification

- `npm test -w @kanmer/gui`: passed — 37 files, 332 tests.
- Focused remote-access tests: 5 files, 14 tests (manager 6, registry 2, identity 2, safe storage 3, clipboard 1) — all passed.
- `npm run typecheck`: passed for core, MCP server, UI and GUI.
- `npm run build -w @kanmer/mcp-server`: passed, including standalone `kanmer-mcp.cjs`, `remote-cli.cjs`, and `doctor-cli.cjs`.
- `npm run build -w @kanmer/gui`: passed (Electron main/preload/renderer bundles).
- `git diff --check`: passed.
- Existing standalone MCP plugin artifact bytes were not modified. `plugin:check` remains unclaimable from this linked worktree because its documented byte-comparison guard refuses workspace dependencies resolving outside the checkout.

## Explicit limitations / review items

This PR is deliberately Cloudflare-only and does not implement the OpenAI provider lifecycle (`[[GUI-104]]`), account/DNS automation, Access, Quick Tunnels, remote dispatch, provider resource creation, or real public-route evidence against a Cloudflare endpoint. Full Electron integration/accessibility/Windows canary evidence remains follow-up review evidence; no live credentials or public endpoint are fabricated.

## Stop point

Implementation is ready for independent re-review; do not merge this branch.

## Additional rail verification

- The first concurrent `npm run test:http -w @kanmer/mcp-server` run had one transient `TUNNEL_READINESS_TIMEOUT` (60/61); the isolated readiness test passed, and the subsequent full `test:http` rerun passed 61/61. `npm run test:scripts` passed 66/66 and the remote CLI smoke passed.
