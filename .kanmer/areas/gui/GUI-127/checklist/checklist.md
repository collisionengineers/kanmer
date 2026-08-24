# Checklist — GUI-127

## Investigation

- [x] Reproduce the failure through canonical local `npm run verify`.
- [x] Inspect the real-Git fixture, production helper, prior GUI-085 documents, and root rail.
- [x] Confirm no live Git child remains after the failure.
- [x] Confirm historical temporary roots are outside this ticket's cleanup scope.

## Implementation

- [ ] Replace synchronous fixture deletion with awaited bounded cleanup.
- [ ] Give only the real-Git cleanup hook a named bounded timeout.
- [ ] Assert controlled fixture roots are absent after cleanup.
- [ ] Keep all existing real-Git/product assertions and test cases intact.
- [ ] Make no production `kanmerGit.ts`, global timeout, skip, sleep, or test-retry change.

## Verification

- [ ] Run the focused test repeatedly on Windows and capture exits/durations.
- [ ] Confirm no roots from controlled runs remain.
- [ ] Run the full GUI test suite.
- [ ] Run root `npm run verify`.
- [ ] Run root `npm run typecheck`.
- [ ] Run `git diff --check`.
- [ ] Open a PR and record the existing Windows authoritative workflow result.
- [ ] Write the post-implementation report with failures, results, and scope disposition.

## Closeout

- [ ] Hand the PR to independent review; do not self-merge.
