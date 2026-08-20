# Post-implementation report — MCP-018

## Summary

`plugin:check` now tests the property its old worktree refusal only approximated: `@kanmer/core` must ESM-resolve and realpath beneath the checkout running the check. It additionally validates the actual Claude-installable plugin payload from a copied, isolated temporary location by completing MCP `initialize` and `tools/list`; the pre-existing committed-versus-fresh bundle byte comparison remains in place.

## Changes

| File | Change | Why |
|---|---|---|
| `scripts/check-plugin-sync.mjs` | Replaced the linked-worktree pathname refusal with an ESM-resolution/realpath ownership guard; invoked the isolated payload checker after the byte comparison. | A correctly installed worktree can now validate its own bundle, while any checkout borrowing another workspace's core still fails with an actionable install fix. |
| `scripts/lib/plugin-isolation.mjs` | Added manifest-driven isolated payload copy, sanitized environment, disposable cwd/board, raw JSON-RPC initialize/tools-list handshake, bounded timeouts, child termination, diagnostics, and cleanup. | Proves shipped plugin bytes resolve and start without repository, workspace, global module, or cwd assistance. |
| `scripts/plugin-isolation.test.mjs` | Added success and regression coverage for path-with-spaces, missing entry, external-only dependency, timeout/termination, and cleanup. | Keeps the isolation property from regressing without altering the shipped MCP bundle. |

## Governing docs

MCP-018 currently has no linked governing document and retains `docs_todo: true`; this ticket changes only verification tooling and does not alter the MCP protocol, tool surface, provider registration, or any governed functional behaviour. No PRD/FRD/ADR was modified.

## Risks / follow-ups

- `npm run typecheck` remains blocked by the existing unrelated UI fixture error in `packages/ui/src/demo.tsx` (missing required `documentPaths` in a `TicketDocsInfo` test stub).
- `npm run verify` is absent on current `origin/main`; [[CORE-031]] owns that shared rail. The PR's CI is the remaining Windows execution context.
- The isolated check intentionally accepts the documented `node` / `${KANMER_NODE:-node}` manifest command forms and invokes the current absolute Node executable, avoiding PATH/global-resolution as a test dependency.

## Verification hand-off

Run on merged `main`:

```bash
npm run build
npm run plugin:check
node --test scripts/plugin-isolation.test.mjs
npm run test:scripts
npm run smoke:protocol
npm run verify:skills
git diff --check
```

Expected: `plugin:check` reports bundle bytes match and an isolated MCP handshake listing 30 tools; the four isolation tests pass; protocol smoke reports 26/26 checks. `npm run typecheck` currently fails only at the pre-existing UI fixture described above, and `npm run verify` remains unavailable until [[CORE-031]] merges.
