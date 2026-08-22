# Post-implementation report — CORE-042

## Outcome

Refactored the release command to respect protected exact main without a
bypass. The implementation is commit aa6f9ddefe05aaa208fe2e00b06da019aaccb6d6
on branch core-042-protected-release, worktree .worktrees/core-042, and PR #160:
https://github.com/collisionengineers/kanmer/pull/160

The default preparation phase validates the clean main starting point, creates
release/v<version>, bumps every existing release manifest and deterministic
artifact, builds the GUI, stages all files (including the new flow helper and
tests), commits, pushes only refs/heads/release/v<version>, and opens a PR
targeting exact main. It stops before any tag or publisher call.

The explicit publish phase requires the requested version to already match all
merged manifests, a clean exact main checkout, and a full 40-character
preparation commit SHA that git merge-base --is-ancestor proves reachable from
main. It then creates/pushes only refs/tags/v<version> and retains the existing
single-package publisher, latest-release visibility, updater-package, repair,
and complete asset digest checks. No protected branch push, force push, tag,
release, or merge was performed in this lane.

## Changed files

- scripts/release.mjs — two-phase protected-main release flow and explicit tag
  ref publication.
- scripts/release-flow.mjs — pure argument/ref/full-SHA/ancestry helpers.
- scripts/release-flow.test.mjs — dependency-free regression coverage,
  including source assertions that branch and tag pushes cannot collapse back
  into a plain main push.
- AGENTS.md — command and operator contract.
- docs/functional/frd/FRD-021-auto-update.md — R3 protected-main boundary.

The tag-triggered .github/workflows/release.yml remains unchanged: it has
contents: read and only verifies an already-published tag/release.

## Verification (exact outcomes)

- node --check scripts/release.mjs: PASS (exit 0).
- node --test scripts/release-flow.test.mjs: PASS, 5/5 (exit 0).
- npm run test:scripts: PASS, 88/88 (exit 0).
- npm run verify:skills: PASS (exit 0).
- npm run verify:agents-block: PASS, 31/31 (exit 0).
- git diff --check: PASS (exit 0).
- npm run build:core: PASS (exit 0).
- npm run build:server: FAIL (exit 1) after core build: the linked worktree
  standalone build resolves stale packages/core/dist without
  dispatchDeliverableProven. This is the first build failure and is retained;
  no CORE-042 source is implicated.
- npm run typecheck: FAIL (exit 1) on the same baseline core/server dispatch
  export/options mismatch and the corresponding GUI dispatch typing mismatch.
  Exact diagnostics were retained in scratch/execute; no CORE-042 TypeScript
  source changed.
- $env:GH_TOKEN='dummy'; node scripts/release.mjs 0.3.3 --publish
  --release-commit <current-head> --dry-run: FAIL (exit 1) at the first shared
  npm run build command with the same stale core dispatch export. The dry-run
  did not switch, write, push, tag, publish, or open a PR.
- node scripts/release.mjs 0.4.0 --unknown-option: refusal exit 1; no mutation.
- node scripts/release.mjs 0.4.0 --publish --release-commit abc: refusal exit 1;
  no mutation.

The full authoritative verify rail is therefore not claimed PASS: its first
build/typecheck baseline failure is preserved. PR #160 hosted verify was
IN_PROGRESS and kanmer-gate QUEUED at handoff; no hosted PASS is claimed.

## External evidence boundaries

Live GitHub required-check enforcement, authorized merge, post-merge tag and
publisher upload, latest-release visibility, hosted tag verification, and a
real packaged two-version updater cycle are INCONCLUSIVE until an authorized
operator runs the post-merge publish phase and records those outcomes. No
release was cut to manufacture that evidence.

## Handoff

The implementation is Review-ready at PR #160/head
aa6f9ddefe05aaa208fe2e00b06da019aaccb6d6. Independent review must verify the
two-phase ref policy, full-SHA ancestry guard, staging of new files, dry-run
non-mutation, and preservation of existing publication/verification checks.
Author stops at Review and will not self-review, merge, publish, or clean up.
