# Checklist — GUI-127

## Investigation

- [x] Reproduce the failure through canonical local `npm run verify`.
- [x] Inspect the real-Git fixtures, production helper, prior GUI-085 documents, and root rail.
- [x] Confirm no live Git child remains after the failure.
- [x] Confirm historical temporary roots are outside this ticket's cleanup scope.
- [x] Identify the companion `index.sync.test.ts` fixture as the same cleanup defect.
- [x] Keep the unrelated `settings.test.ts` atomic-write failure out of GUI-127 scope.

## Implementation

- [x] Replace synchronous fixture deletion with awaited bounded cleanup in both real-Git fixtures.
- [x] Give only the real-Git cleanup hooks named bounded timeouts.
- [x] Assert controlled fixture roots are absent after cleanup.
- [x] Preserve all existing real-Git/product assertions and test cases.
- [x] Make no production `kanmerGit.ts`, global timeout, skip, sleep, or test-retry change.
- [x] Preserve the companion fixture's timer/context teardown before removal.

## Verification

- [x] Run `kanmerGit.test.ts` in isolation: 48/48 PASS; no roots from the controlled run remained.
- [ ] Run both focused files with process exit 0: `index.sync.test.ts` assertions are 11/11 PASS and leaves no controlled root, but the process correctly exits 1 for the separately filed GUI-128 Notification mock error.
- [x] Confirm no roots from controlled runs remain.
- [ ] Run the full GUI test suite: attempted through root verify; it is not PASS because GUI-128 and a separate settings atomic-write failure remain.
- [ ] Run root `npm run verify`: attempted; it is not PASS for the same out-of-scope failures and one concurrent-orphan assertion that must be rechecked after dependent remediation.
- [x] Run root `npm run typecheck`: PASS.
- [x] Run `git diff --check`: PASS.
- [ ] Open a PR and record the existing Windows authoritative workflow result.
- [ ] Write the post-implementation report with failures, results, and scope disposition.

## Closeout

- [ ] Hand the PR to independent review; do not self-merge.
