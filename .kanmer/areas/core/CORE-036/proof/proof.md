# Proof — CORE-036

## Merged artifact

- PR #127 is merged: https://github.com/collisionengineers/kanmer/pull/127, merged 2026-08-21 at squash/merge commit 470b2fad5d16ca4edcc9833b3f674460f994e73d.
- Normal main and origin/main were at 1b5ae0d4546d1b57be393b38f4813f9ecfb6e7d5 during this verification; git merge-base --is-ancestor 470b2fad5d16ca4edcc9833b3f674460f994e73d origin/main exited 0.
- The implementation source commit is 99fb8022b3510e25981c83197ee7f41ca57a95ad; because PR #127 was squash-merged, git merge-base --is-ancestor 99fb8022b3510e25981c83197ee7f41ca57a95ad origin/main exited 1. The earlier proof reachability statement is corrected here; the merged commit is the reachable traceability SHA.
- The merged artifact contains the read-only tag-push workflow and its AGENTS.md operational contract; publishing/repair ownership remains local release.mjs.

## Merged-main verification — 2026-08-21

Commands ran from the normal repository checkout on merged main (not the board worktree):

- git diff --check — exit 0.
- npm run verify — exit 1. Build completed, then the existing core migration test migration: v2 → v3 > resuming still finishes the tickets the interrupted run never reached timed out at the 5-second Vitest default; cleanup also reported ENOTEMPTY for the temporary .kanmer directory. Result: 262 passed, 1 failed of 263 core tests; scripts/verify.mjs stopped at npm test.
- npm run dist:check — exit 1. Core/server and GUI main/preload bundles completed, but the GUI renderer build failed because Vite could not resolve node_modules/vite/dist/node/chunks/dep-D-7KCb9p.js imported by dep-BK3b2jBa.js. The updater-package check was not reached.
- Prior implementation-branch evidence in the report recorded npm run verify and npm run dist:check exit 0; those historical branch results do not replace these merged-main results.

## External release proof

- A real next v<semver> tag green Actions run and a deliberately incomplete disposable-release red run were not run. They require an authorized release/tag cycle and external GitHub release state; they remain INCONCLUSIVE, not PASS. No tag, release, publish, repair, or demotion command was run by this verification lane.

## Conclusion

Independent review and merge are complete, but merged-main verification has two preserved exit-1 results above and the external release runs are unavailable. CORE-036 remains in Verifying; it must not be moved to Done or cleaned up until the verification failures/external evidence are dispositioned by the controlling lane.


## Closeout disposition

PR #127's merged artifact is reachable on main through merge commit `470b2fad5d16ca4edcc9833b3f674460f994e73d`; the source commit is correctly recorded as a squash-unreachable implementation SHA. The merged-main verify/dist failures and unavailable external release/tag cycle remain INCONCLUSIVE/accepted-risk, not PASS. The ticket is closed because no in-scope source work remains; external release proof is preserved as a boundary for the release workflow owner.


## Exact-tag release asset repair — 2026-08-23

- Exact tag 'v0.3.3' resolves to '240e269d5ce1ac05c4e74ac30cc45eeb75968151'. A clean detached checkout rebuilt the tag and npm run dist:check passed (updater package 7 checks).
- The first public integrity check exited 1 because the published installer, blockmap, and latest.yml did not match the exact-tag build. The failed attempt is retained in HZN-007 automation history.
- Using the approved release publisher account, the exact three tag-built assets were uploaded to v0.3.3 with gh release upload --clobber; transient API cache and temporary dotted-name duplicates were removed.
- Final node scripts/verify-release-assets.mjs 0.3.3 --dir apps/gui/release exited 0: exactly the expected installer, blockmap, and latest.yml are present, uploaded, and byte-identical.
- This proves public asset integrity for the existing tag. It does not yet prove the ticket's separate tag-triggered release-verify green workflow or intentionally incomplete disposable-release red run; those remain INCONCLUSIVE and CORE-036 stays Verifying.
