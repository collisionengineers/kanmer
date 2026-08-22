# Proof — GUI-101

## Merged-main deterministic verification

- PR #129 merged by squash at merge commit c362217a43056622b7e5f3cd42bf79d91a661e81; implementation commit 92a26fceb5058d9a3f0882445c86e48c58d18a42 is reachable from main.
- On the implementation branch before merge: npm run dist:check — PASS (updater package 8/8); synthetic package fixtures 4/4; launcher session parser 13/13; workspace typecheck, manual/doc-numbering, and diff-check PASS.
- The packaged artifact was rebuilt and inspected; recorded hashes remain in the post-implementation report.

## Scope and limitations

The merged change extends the existing package checker with --probe, extraFiles, and NSIS lifecycle/ownership markers and adds a focused installed-child session regression. It does not change production session detection, registration, provider serialization, the release feed, or GUI-102.

A real installed NSIS update/two-location Codex host proof is INCONCLUSIVE: this machine has no safe HKCU Kanmer installation/feed/second host, and the read-only packaged probe returned exit 65 with no user-state mutation. The Codex project file remains ignored; no real-host continuity or shareability claim is made. This ticket remains Verifying pending an authorized disposable Windows/VM/feed proof lane.


2026-08-22 closure disposition: merged-main deterministic package, launcher, parser, workspace, manual and diff rails are PASS. The authorized real NSIS/HKCU/update/two-location host sequence was not available; the packaged probe refusal and absence of an installed registration were observed read-only and remain INCONCLUSIVE. This is an evidence boundary owned by the downstream GUI-102 end-to-end lane, not an unrecorded failure of the packaged contract. GUI-101 may advance to Done with the limitation preserved; GUI-102 remains the ticket for any authorized disposable-host acceptance.
