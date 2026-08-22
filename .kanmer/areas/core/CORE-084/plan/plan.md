# Plan — CORE-084: manual Retry production-caller safety

## Objective

Prove the CORE-080 manual Retry safety invariant through the production caller, closing the independent review finding without changing the already-correct implementation.

## Starting state

CORE-080 PR #201 head `0e1be5f32efad1da57ee27bd2a2fe80033976bd1` is stacked on `core-043-protection-retarget`. The helper-level tests pass, but the review is NEEDS-CHANGES because no test drives `syncProject`'s manual Retry branch.

## Required changes

1. Add a deterministic real-Git regression that invokes the production `syncProject` Retry path with a mismatched live branch.
2. Assert the paused/mismatch result, that `syncBoard` is not invoked, and that no branch/ref mutation occurs.
3. Preserve existing exact-destination and genuine-error assertions; update the CORE-080/CORE-043 packet and report exact evidence.

## Constraints

- Reuse the existing GUI test seams and no new dependencies.
- Do not weaken or delete assertions, change unrelated production behavior, or bypass protected branch rules.
- Stop at Review after opening the remediation PR; independent review must merge it into the CORE-043 branch.

## Verification

- `npm test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts`
- `npm run typecheck -w @kanmer/gui`
- `npm run test:scripts`
- `git diff --check`
- Preserve inherited full-suite/provider failures if encountered.
