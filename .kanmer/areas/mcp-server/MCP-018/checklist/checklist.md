# Checklist — MCP-018

## Artifact contract

- [x] Read canonical build/check scripts and root script routing.
- [x] Read actual plugin manifest/entry metadata.
- [x] Identify exact installable payload.
- [x] Preserve committed-vs-fresh file/byte comparison.
- [x] Reuse/extract one pure payload metadata helper only if needed.
- [x] Reject payload paths escaping plugin root.

## Isolated installation

- [x] Create OS-temp parent containing a space.
- [x] Copy only installable payload.
- [x] Keep copied root outside repository.
- [x] Use unrelated empty child cwd.
- [x] Resolve entry from copied manifest.
- [x] Assert entry remains inside copied plugin root.
- [x] Do not copy root node_modules/source/.git/.kanmer/cache.

## Process environment and handshake

- [x] Remove `NODE_PATH`.
- [x] Remove development `NODE_OPTIONS`/loaders.
- [x] Remove repository-specific resolution variables.
- [x] Set noninteractive deterministic environment.
- [x] Spawn with argument array, no shell.
- [x] Reuse a raw MCP protocol client.
- [x] Complete initialize sequence.
- [x] Complete `tools/list`/canonical discovery assertion.
- [x] Use only a disposable board/root if a tool call is needed.
- [x] Enforce bounded timeout.
- [x] Terminate child/process tree on failure.
- [x] Capture entry/cwd/stdout/stderr diagnostics.
- [x] Close client/streams and await exit.
- [x] Remove temp payload on success and failure.

## Regression tests

- [x] Real plugin isolated success test.
- [x] Path-with-spaces success test.
- [x] Missing manifest/entry failure test.
- [x] External-only dependency fixture fails in isolation.
- [x] Timeout fixture terminates cleanly.
- [x] Cleanup is asserted after failures.
- [x] No shipped behavior/test hook was added solely for tracing.

## Rail and verification

- [x] Keep one `plugin:check` script.
- [ ] Ensure root `verify` calls it exactly once. *(Blocked externally: current origin/main has no `verify` script; CORE-031 owns it.)*
- [x] Ensure no pre-check build overwrites drift.
- [x] Add no separate Actions job.
- [x] Run scripts/check tests.
- [x] Run `npm run plugin:check` from normal main checkout.
- [x] Run `npm test`.
- [ ] Run `npm run typecheck`. *(Ran; blocked by pre-existing `packages/ui/src/demo.tsx` missing `documentPaths`.)*
- [x] Run `npm run build`.
- [ ] Run `npm run verify`. *(Blocked externally: current origin/main has no `verify` script; CORE-031 owns it.)*
- [ ] Run Windows PR job. *(CI-only; pending PR.)*
- [x] Confirm passing check leaves generated artifacts unchanged.
- [x] Run `git diff --check` and `git status --short`.
- [x] Record isolated-path/handshake/negative-fixture evidence.
- [x] Stop before merge.

## Progress notes

- Replaced the linked-worktree proxy with the intended check: ESM-resolve `@kanmer/core`, realpath it, and require it to be beneath this checkout's `packages/core`. A correctly installed worktree passes; a main or worktree borrowing another checkout fails with an actionable `npm install` fix.
- `scripts/lib/plugin-isolation.mjs` copies the installed plugin payload under an OS-temp parent containing a space, reads the Claude manifest/config for the relative entry, uses an unrelated disposable cwd and sanitized environment, then performs `initialize` and `tools/list` directly over stdio.
- Regression evidence: real copied bundle listed 30 tools; an external-only fixture, missing entry, and non-responsive fixture all failed and cleaned their temporary payloads.

---

## Closeout — MCP-018

- [x] PR merge verified (`gh pr view --json state,mergedAt`)
- [x] proof.md finalised (PR URL + merge date appended)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body (PR link, follow-ups)
- [x] cd out of worktree; `git worktree remove .worktrees/mcp-018`
- [x] `git branch -d mcp-018-isolated-plugin-check` (`-D` if squash/rebase-merged)
- [x] `git fetch --prune` + `git worktree prune`
- [x] `take_ticket action: "release"`
