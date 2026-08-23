---
kind: proof-record
merged_sha: "a8cc6b01ca95340f1186bccc9770238036d080d8"
prs:
  - "168"
environment: "origin/main; GitHub Actions windows-latest; local Windows merged-main worktree"
verified_at: "2026-08-23T01:27:00Z"
result: PASS
---

## Merged-main verification

PR #168 was independently merged non-squash from final reviewed head `b59fad2f819e38b686df439362a93d6bee588839` into base `fdaededcf8bff0c5d5867e386782d8bdc32324e9`, producing merge commit `a8cc6b01ca95340f1186bccc9770238036d080d8`. The final head is an ancestor of the merged target (exit 0), and `git diff --check fdaededc..a8cc6b01` passed (exit 0).

Hosted verification at the exact final head passed in run `32607472961`: kanmer-gate job `97114733111` PASS and verify job `97114733014` PASS. The hosted rail recorded GUI 49 files / 459 tests, core 15 files / 310 tests, scripts 89 tests, all-workspace typecheck, 224/224 contract checks, plugin/mcpb/manual/docs rails PASS.

Merged-main local checks also passed: `npm run typecheck` exit 0; focused `settings.test.ts` 5/5; ancestry and diff checks exit 0. The final settings fix marks both user-scoped native providers for reconnect when a custom board branch is first observed without a prior branch record.

## Retained boundaries

Live GitHub protection mutation, installed native/provider runtime behavior, packaged runtime, and visual evidence were unavailable; they remain explicitly INCONCLUSIVE/accepted-risk under ADR-0016 and FRD-020. No external PASS is claimed for those boundaries.
