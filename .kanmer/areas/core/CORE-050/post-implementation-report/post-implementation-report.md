# Post-implementation report — CORE-050

## Outcome

CORE-050 hardens the stacked source-lock protocol. Stale ownership is revalidated before every retry after EPERM/EBUSY/EACCES; active replacement markers block third claimants; persisted tokens are validated before marker-path construction; and cleanup errors other than ENOENT surface to the owner. The standalone MCP plugin artifact was regenerated.

## Traceability

- Base: CORE-049 head `8edfede9bdb663171601cb326a67bd03792065e2`
- Commit: `fc8e591e344cb7743204f8261eb5186b76f1d3aa`
- PR: #172, `core-050-lock-revalidation` → `core-049-quarantine-rename-retry`
- No merge performed; independent review is required.

## Verification

- `npm run test -w @kanmer/core -- src/io.test.ts` — PASS, 22/22.
- `npm run test -w @kanmer/core -- src/io.test.ts src/sources.test.ts src/store.test.ts` — PASS, 113/113.
- `npm run typecheck -w @kanmer/core` — PASS.
- `npm run build:core` — PASS.
- `npm run plugin:build` — PASS; standalone artifact regenerated and worktree clean.
- `git diff --check` — PASS.

The inherited broad MCP HTTP readiness rail remains subject to the previously recorded 81/82 `TUNNEL_READINESS_TIMEOUT`; no assertion was weakened. Live Windows handle contention, crash timing, PID reuse, and process-termination evidence remain INCONCLUSIVE.

## Review-thread dispositions

The implementation addresses the transient retry, claimant overlap, cleanup-error, and token-path findings from PR #167. The final independent review must confirm the adversarial cases and resolve any remaining thread with exact evidence.

## Checklist

All eight implementation items are complete. No unrelated GUI/provider or transport changes were made.
