# Checklist — GUI-131

## Planning

- [x] Confirm the differential diagnosis: the clean publisher path has no Electron Vite output because `VERIFY_STEPS` does not build GUI and `--publish` bypasses the preparation-only GUI build.
- [x] Decide and record the ordering contract: publish-mode GUI build must succeed before immutable tag creation and tag push.
- [x] Resolve the non-parked control-flow question in `open-questions`; retain workflow credentials/publishing policy as explicitly deferred.

## Implementation

- [ ] Create GUI-131's dedicated branch/worktree from current `origin/main` only after the Preparing → Implementing gate passes.
- [ ] Add the existing GUI build command to the publish-mode pre-tag control flow in `scripts/release.mjs`, without adding a second package invocation.
- [ ] Add a focused `scripts/release-flow.test.mjs` regression proving the synchronous publish-path GUI build precedes tag creation and tag push.
- [ ] Run `node --test scripts/release-flow.test.mjs` and record its exit.
- [ ] Run `npm run test:scripts` and record its exit.
- [ ] Run `npm run typecheck` and record its exit.
- [ ] Commit only the release control-flow and regression-test changes.
- [ ] From a fresh normal GitHub-origin clone of the exact branch head, run `npm run verify` and record the complete exit/output state.
- [ ] Push the branch, open the PR with `Kanmer: GUI-131`, record commit/PR traceability and the exact diff.
- [ ] Write the post-implementation report and move exactly one stage to Review.

## Boundaries

- [x] Do not run the release publisher, create/push a tag, publish, or package an installer as part of this remediation.
- [x] Do not change release credentials, workflows/permissions, Electron package configuration, manual upload semantics, or retained v0.3.4/v0.3.5 release records.
- [ ] Leave independent review, merge, merged-main proof, and closeout to later governed owners.
