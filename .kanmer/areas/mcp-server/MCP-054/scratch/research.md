Research notes (lane-1, run 20260827T133106Z-claude-code). origin/main 97dfc9f3.
- Server binding: `resolveRoot()` in index.ts reads `--root`/`KANMER_ROOT` once at boot; `lastProject` per-process; `assertExpectedProject` is the single WRONG_PROJECT point used by `write()`, dispatch, migrate_board.
- `inspectBoardBranch`/`inspectBoardSync` are module-private in index.ts (take a root arg) — reusable per registry entry if exported or moved.
- HttpReadyEvent (http.ts) carries only `projectFingerprint`; remote-host regex-checks it; remote-cli owner file + ready line also fingerprint only.
- Core: `claimState(item)` (types.ts:627) classifies live/expired claims; tickets carry assignee/branch/worktree/claim_expires_at → "active controllers/workspaces" observable now.
- Home-dir convention: dispatch logs default `~/.kanmer/dispatch` (KANMER_DISPATCH_LOG_DIR override) — registry can follow: `KANMER_ENDPOINT_REGISTRY` else `~/.kanmer/endpoints.json`.
- Tool count pinned in AGENTS.md §4 ("38 tools"), connect.md ("38 tools"), plugin:check compares tool names vs tool-reference "## Read tools" section.
