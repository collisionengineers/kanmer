# Post-implementation report — CORE-095

## Summary

CORE-095 makes the core Vitest runner serialise test files, eliminating the cross-file filesystem contention observed on protected Windows verification while preserving every existing test assertion, the default 5-second individual-test bound, and all production core behavior. The focused three-file run and full core suite pass from the isolated ticket worktree.

## Changes

| File | Change | Why |
|---|---|---|
| `packages/core/package.json` | Added Vitest's supported `--no-file-parallelism` option to both `test` and `test:watch`. | Core tests perform real temporary-directory, rename, link, and lock work. Serialising files removes cross-file Windows filesystem scheduling pressure without increasing timeouts, adding retries, or changing test semantics. |
| `AGENTS.md` | Documented the intentional serial core-file policy beside `npm test`. | The test command's behavior is a contributor convention; the rationale prevents a future reintroduction of nondeterministic file parallelism. |

No production runtime source, test assertion, test timeout, retry count, workflow, CORE-035 fixture configuration, or plugin-bundle artifact changed.

## Governing docs

- `docs/functional/frd/FRD-006-typed-proof.md`: this change preserves the distinction between evidence and claim. The existing protected-fixture failure remains retained; a clean exact-head Windows pass is still required after merge. No FRD/ADR change is needed because this is test-execution isolation, not a user-visible product behavior change.
- `AGENTS.md`: updated in the same diff because this PR changes a command-maintenance convention, as required by the repository rule.

## Risks / follow-ups

- Serial core files make the suite less parallel. The local full run completed in 55.96 seconds; the clean protected Windows PR result remains the decision evidence.
- The exact Windows execution cause is not over-claimed beyond observed concurrent filesystem pressure. If the protected run still times out with file parallelism disabled, stop and open the recorded evidence rather than increasing a global timeout or weakening assertions.
- CORE-035 remains the integration verifier. Its existing fixture, branch protection, and failed PR #1 evidence were not modified.

## Verification hand-off

Implementation worktree base: `9a75bd690a80bf070bb8ddc372b3a95fa03ec789`.

Passed from the explicit ticket-worktree prefix:

- `npm --prefix C:\\Users\\Alex\\Documents\\GitHub\\kanmer\\.worktrees\\core-095 run test -w @kanmer/core -- src/io.test.ts src/docs.test.ts src/store.test.ts` — exit 0; 3 files / 167 tests; 79.67 s. The three former timeout cases passed in 2.065 s, 2.113 s, and 1.969 s, respectively.
- `npm --prefix C:\\Users\\Alex\\Documents\\GitHub\\kanmer\\.worktrees\\core-095 run test -w @kanmer/core` — exit 0; 15 files / 310 tests; 55.96 s.
- `npm --prefix C:\\Users\\Alex\\Documents\\GitHub\\kanmer\\.worktrees\\core-095 run typecheck -w @kanmer/core` — exit 0.
- `npm --prefix C:\\Users\\Alex\\Documents\\GitHub\\kanmer\\.worktrees\\core-095 run build -w @kanmer/core` — exit 0.
- `git diff --check` — exit 0.

Do not treat the local worktree as full-rail proof: `plugin:check` deliberately refuses linked worktrees. Review the PR's clean `windows-latest` `npm ci && npm run verify` result, then after merge rerun CORE-035's already-created protected fixture at the reviewed exact head. Preserve its earlier failed PR #1 run alongside the new pass.
