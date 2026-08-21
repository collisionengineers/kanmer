# Post-implementation report — GUI-095

## Delivered

Implemented the Cloudflare-only per-project remote-access path in the Electron GUI.

- Added the app-owned `settings.json.remoteAccess` v1 registry keyed by the MCP-compatible `kanmer-proj-v1:<sha256>` fingerprint.
- Added atomic registry writes, unknown/malformed-record filtering, secure opaque bearer records through approved Electron `safeStorage` backends, and no plaintext fallback.
- Added main/preload IPC for project registration, exact-field config saves, one-time bearer delivery/consumption, start/stop, status subscription, and canonical doctor invocation. Remote calls reject untrusted sender/frame/origin and malformed/unknown arguments.
- Added a per-project serialized manager with shared settings-write serialization, config/runtime generations, duplicate hostname/tunnel rejection, bounded child startup/stop cleanup, stale event filtering, expiring delivery capabilities, and true-quit cleanup.
- The manager launches the canonical MCP remote-host and MCP-027 doctor CLIs; it does not spawn cloudflared or reimplement transport/doctor behavior. It passes the board root and repository root explicitly and checks the returned project fingerprint.
- Added a Cloudflare Tunnel settings tab with guarded configuration, create/rotate token actions, explicit start/stop, safe endpoint copy, independent local/tunnel/public status dimensions, and redacted doctor results. Project switching confirms when a remote runtime is active.
- Added packaged CJS `remote-cli` and `doctor-cli` resources. The existing `kanmer-mcp.cjs` plugin artifact was not changed.

## Tests and verification

- `npm test`: passed — core 256 tests, GUI 328 tests, MCP remote/doctor/HTTP 61 tests, scripts 66 tests.
- `npm run typecheck`: passed for core, MCP server, UI and GUI.
- `npm run build`: passed for core and MCP server; standalone outputs include `kanmer-mcp.cjs`, `remote-cli.cjs`, and `doctor-cli.cjs`.
- `npm run build -w @kanmer/gui`: passed (Electron main/preload/renderer bundles).
- Focused remote-access tests: manager 3, registry 2, identity 2, safe storage 2, clipboard 1 — all passed.
- `git diff --check`: passed.

## Explicit limitations / review items

This PR is deliberately Cloudflare-only and does not implement the OpenAI provider lifecycle (`[[GUI-104]]`), account/DNS automation, Access, Quick Tunnels, remote dispatch, or provider resource creation. Live public-route doctor verification, automatic-start ordering/semaphore, headless-owner discovery, transactional in-place rotation rollback, a dedicated all-project Remote Access overview, and full Electron integration/accessibility/Windows canary evidence remain follow-up review items. The settings tab uses the existing active-project modal; it does not add a new global route.

The packaged CLI additions are required because the installed Electron runtime cannot execute the source ESM CLI entries directly. The existing MCP plugin bundle remains unchanged; `plugin:check` was not used in the linked worktree because its documented byte-comparison guard refuses worktrees whose workspace dependency resolves outside the checkout.

## Stop point

Implementation is ready for independent review; do not merge this branch.
