# Post-implementation report — CORE-035

## Scope

CORE-035 ran the compiled-workflow spine against a disposable private GitHub repository and fresh `kanmer-board` worktree. Production source and production board were not changed. Disposable source was seeded at `c8ea0b778895b0a76d9e32152a1f58c7b3b3d77b`.

Run ID: `20260822t075446z-78e5ba65`
Disposable repository: `collisionengineers/kanmer-spine-integration-20260822t075446z-78e5ba65`
Board branch: `kanmer-board`
Implementation branch: `int-004-spine-fixture`
Fixture commit: `f9dcfbb6c34a90c0b91be44e5ee50ea5151bb27a`
Disposable PR #1: https://github.com/collisionengineers/kanmer-spine-integration-20260822t075446z-78e5ba65/pull/1
No-ticket probe PR #2: https://github.com/collisionengineers/kanmer-spine-integration-20260822t075446z-78e5ba65/pull/2

## Change

The disposable implementation contains exactly `scripts/spine-fixture.mjs` and `scripts/spine-fixture.test.mjs`. The fixture compiles every observed gate outcome into a strict record and fails closed for abbreviated identities or an unprotected merge claim. Focused tests pass 2/2; this is not a production source change.

## Evidence

Exact-source authoritative verify passed: build, core 283/283, GUI 375/375, HTTP 68/68, scripts 83/83, all-workspace typecheck, MCP smoke 224/224, headless smoke, MCPB parity, protocol 46/46, discovery 13/13, skills, managed AGENTS block, and plugin synchronization.

Disposable fixture test and typecheck passed. Disposable root `test:scripts` reached 84/85: its sole failure was the existing release-notes test resolving the disposable `origin` URL instead of canonical `collisionengineers/kanmer`. Disposable `mcpb:check` could not run because the temporary worktree did not expose `@anthropic-ai/mcpb/dist/cli/cli.js`. Both exact failures are retained in scratch.

Hosted gate evidence:
- Run 32561444965 / gate job 97003509121: WRONG_STAGE error for preparing, with NO_REVIEW_RECORD warning.
- Run 32561602861 / gate job 97003919089: NO_TICKET error, exit 1.
- Run 32561623106 / gate job 97003970442: WRONG_STAGE error for implementing.
- Runs 32561715790, 32561734355, 32561757685, and 32561789133 retain warning-only gate records including review absence/staleness and unreachable-commit evidence.
- Local check-pr reproduced DEPENDENCY_BLOCKED for live INT-005 and OPEN_QUESTIONS for one unchecked question, then PASS after normal resolution. Final local gate used review stage, checked questions, exact current review head `94f859b51329f85830d34285ce7fb56bb80f870b`, and reachable implementation commit.

## Blocker and disposition

GitHub rejected branch protection for both disposable branches with HTTP 403: `Upgrade to GitHub Pro or make this repository public to enable this feature.` No protection was applied. Therefore protected conversation refusal, protected merge, exact merge SHA, detached merged verification, and proof on merged main were not observed and are explicitly INCONCLUSIVE. No bypass, public fallback, fabricated status, or merge is allowed.

The disposable PR remains open for independent review. CORE-035 stops at Review; it is not Done.

## Final hosted rerun

Rerun `32561867341` completed with gate job `97005242239` SUCCESS (only Node 20 deprecation annotation) and verify job `97005242134` FAILURE. Verify reported `release notes turn shorthand PR refs into repository links` not ok; scripts summary was 85 tests, 84 pass, 1 fail; `Error: Command failed: npm test`, exit 1. This is the disposable-origin URL mismatch described above. PR #1 remains OPEN/UNSTABLE at head `94f859b51329f85830d34285ce7fb56bb80f870b`.
