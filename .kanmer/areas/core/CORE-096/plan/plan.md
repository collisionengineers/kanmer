# Plan — CORE-096: prepare, publish, and validate v0.3.4

## Objective

Create a ticket-bound v0.3.4 release preparation PR from clean current main, obtain independent review and merge, then publish only from the merged release commit. Preserve public tag-workflow and asset-integrity evidence as the first sequential release needed by [[CORE-036]] and [[CORE-042]].

## Starting state

- origin/main is ef67c04e0f3a20145dcb88497fdcb97a53038ab6; all release-bearing manifests report 0.3.3.
- scripts/release.mjs is the approved protected-main release process: preparation creates the version PR; publish requires its merged SHA and a release token.
- CORE-036 requires a real release-verify green tag run. CORE-042 needs two sequential installed-update releases; this ticket provides only the first version.
- The root checkout contains unrelated user changes and is never used or updated by this release.

## Governing docs

- No PRD, FRD, or ADR changes are required. This executes the existing protected-main release contract in AGENTS.md, scripts/release.mjs, and CORE-036's approved workflow plan.
- The plan does not alter publisher ownership, tag workflow semantics, updater format, signing policy, or provider configuration.

## Required changes

1. Create an isolated clean clone at the exact current origin/main SHA and run the release script dry-run gate for 0.3.4.
2. In that clone, run the preparation phase exactly once with --ticket CORE-096; let the script make only its version-manifest/artifact branch and PR.
3. Record the preparation commit, PR number, exact head SHA, local verification exits, and script-generated changed-file set. Do not amend generated artifacts by hand.
4. Obtain independent ticket/PR review; resolve every finding and ensure GitHub required PR checks pass. The author does not review or merge.
5. After normal merge, create a new clean clone at the recorded merge commit and run only npm run release -- 0.3.4 --publish --release-commit <merged-sha> with a token supplied through the process environment.
6. Observe the v0.3.4 tag release-verify job to a terminal result and independently run the release-asset verifier against the public release.
7. Record sanitized evidence in this ticket. Append the specific green tag/asset facts to CORE-036 and the first-version facts to CORE-042 without treating either ticket as complete unless its own remaining checks pass.

## Expected files

- The release script alone changes version-bearing manifests, lockfile, generated MCP/plugin artifacts, and the release branch/PR.
- Ticket documents and HZN-007 durable run record hold sanitized execution evidence.
- No manual source edit, board-worktree edit, DNS/tunnel change, or release-fixture rewrite is permitted.

## Do not modify

- The dirty root checkout or another ticket worktree.
- scripts/release.mjs, the release workflow, release asset names, signing, publishing semantics, branch protection, or CORE-036/CORE-042 source scope.
- Existing release tags/assets or retained Cloudflare resources.

## Acceptance checks

- Preparation starts at the recorded clean main SHA and opens a normal release PR carrying only generated release changes.
- An independent reviewer approves the exact PR head and required checks pass before merge.
- Publication verifies the supplied release commit is reachable from merged main, creates v0.3.4, and makes a public non-draft release.
- Public assets are uploaded and byte-identical to the one package invocation.
- The tag workflow stable release-verify job is green.
- Evidence is sanitized, every failed attempt is retained, and cleanup leaves no release worktree/branch after merge verification.

## Commands

npm run release -- 0.3.4 --ticket CORE-096 --dry-run
npm run release -- 0.3.4 --ticket CORE-096
npm run release -- 0.3.4 --publish --release-commit <merged-sha>
node scripts/verify-release-assets.mjs 0.3.4
git diff --check

## Failure and deviation rules

- A preflight, PR check, package, publish, tag-workflow, or asset-verifier failure is recorded and stops the corresponding phase. Do not substitute a shorter rail, retag, rerun a second package, or edit public assets outside the release script's one exact-file repair.
- If the preparation PR changes unrelated files, stop and investigate rather than broadening the release.
- If publication is unavailable because credentials or GitHub state fail, retain the failure and keep this ticket in its truthful stage.

## Stop condition

Stop after the release preparation PR reaches Review. Resume publication only after independent review, all required checks, and a normal merge provide the exact merge SHA.
