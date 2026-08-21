# Post-implementation report — GUI-095

## Delivered

Implemented the Cloudflare-only per-project remote-access path in the Electron GUI.

- Added the app-owned `settings.json.remoteAccess` v1 registry keyed by the MCP-compatible `kanmer-proj-v1:<sha256>` fingerprint, with one shared settings-file lock, atomic persistence, explicit reconcile/remove operations, and corrupt/orphan secret cleanup.
- Added secure opaque bearer records through approved Electron `safeStorage` backends (`dpapi`, `keychain`, `gnome_libsecret`, and numbered `kwallet` backends); plaintext/basic-text backends are rejected.
- Added narrow main/preload IPC for registration, overview, reconcile/remove, exact-field config saves, one-time bearer delivery/copy/consumption, start/stop, status subscription, and canonical doctor invocation. Calls enforce exact sender/frame/origin, project binding, and expected config/runtime generations.
- Added a per-project serialized lifecycle queue, deterministic global max-two auto-start semaphore over persisted registrations, missing/moved-project reporting, duplicate hostname/tunnel rejection, exclusive headless-owner detection without takeover, stale owner/temp/token scavenging, bounded child/doctor cleanup, owned-tree force cleanup, stale event filtering, expiring project/frame-bound delivery capabilities, and true-quit cleanup.
- The manager launches the canonical MCP remote-host and MCP-027 doctor CLIs through an allowlisted child environment; it does not spawn cloudflared or reimplement transport/doctor logic. It passes board/repository roots explicitly and checks the returned project fingerprint and canonical loopback endpoint.
- Bearer rotation persists the new encrypted record before activation, restores the old config on persistence failure, invalidates old deliveries only after success, and reports old-record cleanup warnings safely.
- Runtime/doctor DTOs include local/tunnel/public health dimensions, board/listener/auth/session/tunnel/remote health, action/severity, grouped checks with structured repair code/actions/section, persisted safe last summary/time, config generation, and runtime generation.
- Pinned BrowserWindow `contextIsolation: true` and `nodeIntegration: false`; the bearer is masked by default in an accessible one-time dialog, expires/consumes on timeout or unmount, copies only through main-process validation, and clears only an unchanged clipboard value on expiry/quit.
- Added a Cloudflare Tunnel settings tab with registered-project cards, guarded configuration, create/rotate token actions, explicit start/stop, reconcile/remove, safe endpoint copy, independent status dimensions, and grouped redacted doctor results.
- Added packaged CJS `remote-cli` and `doctor-cli` resources. The existing `kanmer-mcp.cjs` plugin artifact was not changed.

## Tests and verification

- `npm test -w @kanmer/gui`: passed — 37 files, 334 tests.
- Focused remote-access tests: 5 files, 16 tests — all passed.
- `npm run typecheck -w @kanmer/gui`: passed.
- `npm run build -w @kanmer/mcp-server`: passed, including standalone `kanmer-mcp.cjs`, `remote-cli.cjs`, and `doctor-cli.cjs`.
- `npm run build -w @kanmer/gui`: passed (Electron main/preload/renderer bundles).
- `git diff --check`: passed on the final branch.
- The existing standalone MCP plugin artifact bytes were not modified. `plugin:check` remains unclaimable from this linked worktree because its documented byte-comparison guard refuses workspace dependencies resolving outside the checkout.

## Explicit limitations / review items

This PR is deliberately Cloudflare-only and does not implement the OpenAI provider lifecycle (`[[GUI-104]]`), account/DNS automation, Access, Quick Tunnels, remote dispatch, provider resource creation, or real public-route evidence against a Cloudflare endpoint. Full public-provider, Windows, and live Electron integration evidence remains follow-up review evidence; no live credentials or public endpoint are fabricated.

## Stop point

Implementation is ready for independent re-review; do not merge this branch.

## Additional rail verification

- The first concurrent MCP HTTP run had one transient `TUNNEL_READINESS_TIMEOUT` (60/61); the isolated readiness test passed, and the subsequent sequential MCP HTTP rerun passed 61/61.
- `npm run test:scripts` passed 66/66.

## Third remediation evidence (0ac5b2dd follow-up)

- Unified remote registry persistence with the existing settings writers through a shared async lock and atomic temp-file/rename writes; concurrent project registration preserves both the remote registry and unrelated settings fields.
- Canonicalized persisted project, board, and repository paths before identity matching (including Windows slash/drive spellings), dropped orphan project/config records, rejected invalid secret ids and unsafe credential paths, and retained collision-safe reconcile/remove behavior.
- Auto-start and overview validate absolute existing project/board roots and surface missing persisted projects without spawning. Doctor temp directories now carry owned PID markers, are cleaned only when stale/dead, and cancellation/timeout/error paths suppress late callbacks and remove token material.
- Tightened development URL validation to require an exact HTTP(S) origin/path without query or fragment for navigation and IPC sender checks. The token dialog now exposes a descriptive accessible name/description, masked/revealed labels, expiry cleanup, and project cards show state/action/severity, health dimensions, doctor summary and open-project action.
- Added registry path/orphan and Windows canonicalization tests plus the renderer accessibility/multi-project integration test.

Final follow-up rails: focused remote tests 5 files/18 tests passed; full GUI suite 37 files/334 tests passed; root typecheck passed; GUI build passed; git diff --check passed. No standalone MCP bundle bytes were changed.
