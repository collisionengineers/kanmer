# Post-implementation report — MCP-022

## Outcome

Implemented optional, fail-closed project identity protection for every MCP mutation.

- Added `projectIdentity()`: canonical board/repo roots, exact ordered SHA-256 payload, and `kanmer-proj-v1:<hex>` fingerprint.
- `get_status` now exposes `project` plus `compat.expectedProject: "optional"`.
- Central registration decorates all 18 mutating schemas with call-level `expected_project`; bulk `create_items.items[]` remains clean.
- `write()` validates and strips the token before actor attribution, initialization, confirmation, or handlers.
- Added the only three structured error codes: `WRONG_PROJECT`, `REVISION_CONFLICT`, and `GATE_BLOCKED`, preserving legacy text.
- Updated the canonical MCP tool reference and rebuilt the committed plugin bundle.

## Traceability

- Commit: `7283abf` (`feat(mcp): guard writes by project fingerprint`)
- Production callers: `get_status` and the central `write()` wrapper in `packages/mcp-server/src/index.ts`.
- No core/frontmatter, dependency, project-ID, or MCP-023 changes.

## Evidence

- `npm run typecheck` — pass (all workspaces).
- `npm run build` — pass.
- `node packages/mcp-server/src/smoke.mjs` — 184/184 checks pass, including exact fingerprint vectors, all write schemas, fresh-root byte-for-byte wrong-token rejection, no metadata persistence, conflict and both gate paths.
- `npm run smoke:protocol` — 42/42 checks pass across supported protocol revisions; raw JSON-RPC preserves `WRONG_PROJECT` structured content.
- `npm run smoke:discovery` — 13/13 checks pass.
- `npm run test:http -w @kanmer/mcp-server` — 3/3 pass.
- `git diff --check` — pass.
- `npm run plugin:build` — completed in the ticket worktree; normal-checkout `plugin:check` is reserved for merged-main verification because it intentionally refuses linked worktrees.

## Review focus

Please verify that the central schema override remains safe for future tool registrations, and inspect the deliberately narrow gate-error classifier.
