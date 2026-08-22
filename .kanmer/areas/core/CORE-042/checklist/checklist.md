# Checklist — CORE-042

## Preparation

- [x] Read CORE-033's merged proof/review disposition and exact live protection.
- [x] Read ADR-0016, FRD-021, and HZN-007 context.
- [x] Confirm the current tag verification workflow remains read-only.
- [x] Confirm the release command's direct main push is the only defect in scope.

## Protected release flow

- [x] Default prepare mode refuses dirty state and starts from exact local main; invalid invocation probes exit 1 without mutation.
- [x] Prepare mode creates a unique release branch and never pushes main (static source/test rail; non-dry-run publisher not exercised).
- [x] Prepare mode runs the shared verification rail before mutating release files; first dry-run reached the rail and its build failure is retained below.
- [ ] Prepare mode bumps all existing manifests/lockfile and deterministic artifacts.
- [ ] Prepare mode opens a PR targeting exact main and stops before tagging/publishing.
- [x] Publish mode is explicit and requires clean exact main after the PR merge.
- [x] Publish mode validates requested version against merged manifests.
- [x] Publish mode proves the release commit is reachable from merged main; helper/test rail covers full-SHA and ancestry outcomes.
- [x] Publish mode preserves tag publication and pushes only the explicit tag ref; no protected branch push remains.
- [x] Existing visibility, updater, repair, and asset digest checks remain wired and unchanged after the publish boundary.
- [x] Dry-run previews both phases without writing, switching, pushing, or publishing; invalid/probe attempts left the worktree unchanged.

## Tests and handoff

- [x] Focused release-flow node tests pass: 4/4.
- [x] `npm run test:scripts` passes: 87/87.
- [x] Relevant typecheck/build rails were run; build:core passed, build:server and all-workspace typecheck failed on the preserved stale core-dispatch baseline (not PASS).
- [x] `git diff --check` passes.
- [x] AGENTS.md and FRD-021 document the new operator sequence.
- [x] Post-implementation report records exact commands/exits and first failures.
- [x] PR #160 is opened with `Kanmer: CORE-042`; commit aa6f9ddefe05aaa208fe2e00b06da019aaccb6d6 is recorded.
- [x] Stop at Review; no self-review, merge, tag, or hosted release is performed.

## Parked (explicitly deferred)

- [ ] Live GitHub required-check/authorized-merge, tag upload/visibility, and real
  packaged two-version updater evidence require the human/operator post-merge
  publish phase and are not claimed by this implementation lane.
