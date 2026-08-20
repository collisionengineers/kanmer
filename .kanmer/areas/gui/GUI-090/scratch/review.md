## Independent review — 2026-08-20

**Verdict: PASS** — PR [#76](https://github.com/collisionengineers/kanmer/pull/76) is a focused implementation of GUI-090 and is ready for the ticket owner’s merge decision. No ticket state or PR state was changed by this review.

### Scope and governing-contract check

- The patch adds a **separate, cold** `getRepoStaleness` IPC handler. It is not part of `snapshotOf()` or watcher-driven refresh, satisfying the ticket’s hot-path constraint.
- The handler calls core’s existing `detectStaleness()` through the board-worktree store whose `repoRoot` is the source checkout. The dedicated regression test verifies that source files, not the separate board worktree, are evaluated.
- The renderer keys the banner on `!report.upToDate`; therefore a compensated-only report remains quiet, as ADR-0015 requires. Its disclosure renders the canonical per-row state, detail, and fix rather than inventing repair logic.
- `STALENESS_PROVIDER_PATHS` is core-owned and the GUI provider registry consumes the owned registration/skills paths. Legacy Claude `.mcp.json` detection remains covered while `.claude/skills` is correctly excluded after CORE-030.
- The implementation is read-only and leaves reconciliation to the existing setup/Connect flows, consistent with ADR-0015 and FRD-013. HZN-005 has no `context.md` content imposing additional constraints.

### Independent validation

- `npm test -w @kanmer/core -- staleness.test.ts` — **40 passed**.
- `npm test -w @kanmer/gui -- repoStaleness.test.ts providers.test.ts` — **68 passed**.
- `npm run typecheck -w @kanmer/core` — passed.
- `npm run typecheck -w @kanmer/gui` — passed.
- `npm run build -w @kanmer/gui` — passed.
- `git diff --check main...HEAD` — passed.

The PR is clean against `main` and has no GitHub status checks configured. No blocking or non-blocking findings.
