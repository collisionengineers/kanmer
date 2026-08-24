# Checklist — GUI-127

## Investigation

- [x] Reproduce the failure through canonical local npm run verify.
- [x] Inspect the real-Git fixtures, production helper, prior GUI-085 documents, and root rail.
- [x] Confirm no live Git child remains after the failure.
- [x] Confirm historical temporary roots are outside this ticket's cleanup scope.
- [x] Identify the companion index.sync.test.ts fixture as the same cleanup defect.
- [x] Keep the unrelated settings.test.ts atomic-write failure out of GUI-127 scope.

## Implementation

- [x] Replace synchronous fixture deletion with awaited bounded cleanup in both real-Git fixtures.
- [x] Give only the real-Git cleanup hooks named bounded timeouts.
- [x] Assert controlled fixture roots are absent after cleanup.
- [x] Preserve all existing real-Git/product assertions and test cases.
- [x] Make no production kanmerGit.ts, global timeout, skip, sleep, or test-retry change.
- [x] Preserve the companion fixture's timer/context teardown before removal.

## Verification

- [x] Run kanmerGit.test.ts in isolation: 48/48 PASS; no roots from the controlled run remained.
- [x] Run both focused files with process exit 0 after GUI-128 supplied the missing Electron Notification mock.
- [x] Confirm no roots from controlled runs remain.
- [x] Run the full GUI suite on merged main: 462/462 PASS, including index.sync 11/11 and kanmerGit 48/48.
- [x] Run root npm run verify on merged main: PASS, explicit exit 0.
- [x] Run root npm run typecheck: PASS as part of canonical verify.
- [x] Run git diff --check: PASS before commit.
- [x] Open PR #236 and record the Windows authoritative workflow: verify and kanmer-gate PASS.
- [x] Write the post-implementation report with failures, results, and scope disposition.
- [x] Record author self-review under the user's standing approval; no findings in scope.

## Closeout

- [x] Merge the approved PR, write proof from merged main, and release the ticket assignment.
