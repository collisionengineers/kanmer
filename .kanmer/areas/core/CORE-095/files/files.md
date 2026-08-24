# Files — CORE-095

| Path | Change | Why |
|---|---|---|
| `packages/core/package.json` | Add Vitest's supported `--no-file-parallelism` option to `test` and `test:watch`. | Make all core test entry points use the same file-level isolation policy on Windows and locally, without changing individual test timeouts or assertions. |
| `AGENTS.md` | Document that core Vitest files run serially because the core suite exercises real filesystem/lock behavior on Windows. | The PR changes a test-command convention; contributors need the reason before reintroducing parallel file execution. |

## Read-only context

| Path | Relevance |
|---|---|
| `packages/core/src/io.test.ts` | Keeps the stale-dead-owner recovery assertion and its 5-second finite bound unchanged. |
| `packages/core/src/docs.test.ts` | Keeps profile-precedence assertions unchanged. |
| `packages/core/src/store.test.ts` | Keeps area ID/folder-placement assertions unchanged. |
| `packages/core/src/migrate.test.ts` | Uses the same temporary-filesystem pattern and benefits from the same package execution policy; no assertion edit is planned. |
| `scripts/verify.mjs` | The authoritative rail runs root `npm test`, which invokes the core package script; no new CI job or verification pyramid is needed. |
| `.github/workflows/pr.yml` | The existing `windows-latest` verify job already runs `npm ci && npm run verify`; do not add or weaken workflow gates. |
| `docs/functional/frd/FRD-006-typed-proof.md` | Requires honest merged-main/protected-run evidence; it is referenced by the ticket and needs no change. |

## Deliberately untouched

- `packages/core/src/io.ts`, `store.ts`, `docs.ts`, migration logic, and all production behavior.
- The three named test assertions, their test data, and Vitest's 5-second default test timeout.
- CORE-035's disposable fixture, branch-protection configuration, and canonical-origin setup.
- Plugin bundle artifacts: a package-script/guide-only change does not alter bundled MCP/core runtime bytes.
