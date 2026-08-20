# Files — MCP-017

## Modify

| Path | Exact responsibility |
|---|---|
| `scripts/worktree-guard.mjs` | Canonical guard implementation: expose or isolate a pure classification function without changing production refusal semantics; keep Git/environment discovery in a thin adapter. If the repository's canonical guard has a different existing filename, modify that file and record the discovered path in the implementation report rather than creating a duplicate. |
| `scripts/test.mjs` | Register/discover the new guard test through the existing scripts test runner, only if its current glob/list does not already include it. Preserve existing runner output/exit behavior. |
| `package.json` | Confirm the existing scripts-test command is included by `npm test`/`npm run verify`; modify only if the canonical runner is currently unreachable. Do not add a parallel uncalled command. |
| `scripts/verify.mjs` | Inspect the shared CORE-031 rail. Modify only if the canonical scripts tests are omitted; avoid duplicate execution. |

## Add

| Path | Purpose |
|---|---|
| `scripts/worktree-guard.test.mjs` | Exhaustive pure path/branch classification tests plus a bounded disposable-Git integration proving board-worktree refusal occurs before the protected action and ordinary ticket/main checkout acceptance. If the scripts runner requires a `scripts/test/` or `scripts/tests/` directory, use that existing canonical directory and do not retain both paths. |

## Inspect / consider

| Path | Reason |
|---|---|
| `scripts/lib/worktree-guard.mjs` | Some repository layouts keep the guard under `scripts/lib/`; if present, this is the canonical implementation and `scripts/worktree-guard.mjs` may only be an entry point. Extend the existing structure, never duplicate policy. |
| `scripts/release.mjs` | Identify how the guard is invoked and prove refusal precedes bump/build/pack writes. Do not change release behavior in this ticket. |
| `scripts/build-plugin.mjs` and plugin check/build scripts | Identify all guarded callers and ensure tests cover the exported contract they rely on. Do not run generation in the real board worktree. |
| `packages/mcp-server/src/index.ts` | Inspect any MCP-side board-worktree preflight wording/logic for semantic alignment. No MCP tool-surface change is required. |
| `packages/core/src/worktree-guard.ts` | CORE-034's pure store guard when available. Reuse test vectors/normalization semantics without moving Git subprocesses into core. |
| `packages/core/src/worktree-guard.test.ts` | Avoid duplicate vectors drifting; share a fixture table only where package boundaries remain clean. |
| `packages/mcp-server/src/root.ts` | Board/repo root resolution and `.worktrees/kanmer` convention. |
| `AGENTS.md` | Board-worktree invariant and verification rail. Preserve managed text unless a documented mismatch is discovered. |
| `docs/functional/frd/FRD-022-mcp-server-surface.md` | Governing safety behavior and refusal contract. |
| `.gitignore` | Test fixtures must use OS temporary paths; no repository-local fixture debris should need ignoring. |

## Test fixture contract

The test helper must:

- create a disposable repository under the OS temp directory;
- configure local identity/default branch;
- make an initial commit;
- create a worktree literally named `kanmer` and one named for an ordinary ticket;
- call the guard/classifier with absolute, relative, nested, trailing-separator, mixed-separator, and Windows-case vectors;
- install a marker callback/file representing the guarded operation;
- assert the marker is absent after refusal and present after allowed execution;
- remove worktrees and directories in guaranteed teardown.

## Do not modify

- `takeTicket` behavior or `get_status.boardWorktree` (CORE-034).
- Stage/profile/gate configuration.
- Release/build output semantics.
- The real `.worktrees/kanmer` path, branch, or files.
- The global test framework or dependencies.
- User-facing refusal wording/exit code without a governing requirement.
- Add sleeps/retries or network access.
