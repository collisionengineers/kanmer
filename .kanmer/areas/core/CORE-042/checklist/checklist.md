# Checklist — CORE-042

## Preparation

- [ ] Read CORE-033's merged proof/review disposition and exact live protection.
- [ ] Read ADR-0016, FRD-021, and HZN-007 context.
- [ ] Confirm the current tag verification workflow remains read-only.
- [ ] Confirm the release command's direct main push is the only defect in scope.

## Protected release flow

- [ ] Default prepare mode refuses dirty state and starts from exact local main.
- [ ] Prepare mode creates a unique release branch and never pushes main.
- [ ] Prepare mode runs the shared verification rail before mutating release files.
- [ ] Prepare mode bumps all existing manifests/lockfile and deterministic artifacts.
- [ ] Prepare mode opens a PR targeting exact main and stops before tagging/publishing.
- [ ] Publish mode is explicit and requires clean exact main after the PR merge.
- [ ] Publish mode validates requested version against merged manifests.
- [ ] Publish mode proves the release commit is reachable from merged main.
- [ ] Publish mode preserves tag publication and pushes no protected branch.
- [ ] Existing visibility, updater, repair, and asset digest checks remain wired.
- [ ] Dry-run previews both phases without writing, switching, pushing, or publishing.

## Tests and handoff

- [ ] Focused release-flow node tests pass.
- [ ] `npm run test:scripts` passes.
- [ ] Relevant typecheck/build rails pass.
- [ ] `git diff --check` passes.
- [ ] AGENTS.md and FRD-021 document the new operator sequence.
- [ ] Post-implementation report records exact commands/exits and first failures.
- [ ] PR is opened with `Kanmer: CORE-042` and ticket commit/PR traceability.
- [ ] Stop at Review; no self-review, merge, tag, or hosted release is performed.

## Parked (explicitly deferred)

- [ ] Live GitHub required-check/authorized-merge, tag upload/visibility, and real
  packaged two-version updater evidence require the human/operator post-merge
  publish phase and are not claimed by this implementation lane.
