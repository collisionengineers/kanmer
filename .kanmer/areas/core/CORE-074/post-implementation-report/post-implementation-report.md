# Post-implementation report

## Change

Ignore reconciliation now uses an append-only merge. It never rewrites a
stale snapshot: it appends only missing or re-invalidated managed rules in one
`O_APPEND` operation, preserving concurrent human/process lines and retaining
the existing symlink refusal. A later negation can be followed by a future
managed append without losing the intervening edit.

## Verification

- First full GUI Git rail after the append-only change: FAIL, one assertion still expected the old canonical line position; this was a stale test expectation, not a product failure.
- Corrected full GUI Git rail: `npm test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts` — PASS, 25/25.
- GUI typecheck after clean workspace install and core build — PASS.
- Core build: `npm run build:core` — PASS.
- Script suite: `npm run test:scripts` — PASS, 88/88.
- `git diff --check` — PASS.

## Regression

The deterministic helper regression proves only missing or re-invalidated
managed rules are selected for append, while already-effective rules are left
alone. The real-Git rail proves later negations remain followed by effective
managed exclusions without rewriting human lines.

## Limitations

Hosted Windows GUI and remote proof remain unavailable in this run.
