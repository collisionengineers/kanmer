## Disposable protected-repository verification — 2026-08-24

Executed against a temporary repository seeded from the merged source and a separately pushed disposable `kanmer-board` branch. No project repository, board branch, or production protection setting was changed.

- A PR-body `edited` event ran the independent `kanmer-gate` job while the full `verify` job was skipped, as designed.
- The first gate run resolved CORE-024 from its footer and separately fetched the board worktree; it failed only because the cloned ticket was deliberately still in `verifying`, proving stage enforcement.
- The disposable board copy was changed to `review` and pushed directly. After a wait/poll, the repository had **0** pull-request workflow runs for that direct `kanmer-board` push.
- The compliant rerun passed `kanmer-gate` (run `32726022217`); `verify` was skipped because the event was body-only.
- Branch protection initially omitted the “require pull request” rule and therefore allowed an empty direct `main` push; this was a test-policy setup error, not counted as protection evidence. After adding the required-PR rule with admin enforcement, a subsequent direct `main` push was rejected and the passing PR merged successfully through the protected path.
- A synchronized compliant current-head PR run `32726323865` passed `kanmer-gate` but failed the authoritative `verify` rail: 308 tests passed; two existing Windows timeout/cleanup cases failed in `docs.test.ts` and `store.test.ts` (including `ENOTEMPTY`). This is retained as FAIL, not offset by the passing gate.

The external integration/protection evidence is now present, but the required full verification is still not green, so the ticket remains Verifying.
