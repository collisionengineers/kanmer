# Files — MCP-017

## Modify

| Path | Responsibility |
|---|---|
| `scripts/check-plugin-sync.mjs` | Use the extracted pure own-checkout resolution guard before plugin validation, preserving existing refusal text and exit behaviour. |

## Add

| Path | Responsibility |
|---|---|
| `scripts/lib/plugin-checkout-guard.mjs` | Dependency-free pure path-containment predicate for the existing `@kanmer/core` ownership contract. |
| `scripts/plugin-checkout-guard.test.mjs` | Node built-in unit cases for local acceptance, external leakage, prefix collision, Windows normalization, POSIX case sensitivity, and strict containment. |

## Inspect only

| Path | Reason |
|---|---|
| `package.json` | Confirms `scripts/*.test.mjs` runs under both `npm run test:scripts` and `npm test`; no change expected. |
| `docs/functional/frd/FRD-022-mcp-server-surface.md` | Governing R6 refusal contract. |
| `AGENTS.md` | Board worktree must not be touched. |

## Explicit non-changes

No board worktree, Git worktree fixture, production build artifact, MCP/core policy, runner, dependency, or governing-document change.
