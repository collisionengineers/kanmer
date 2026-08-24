---
kind: review-attestation
pr: "251"
head_sha: "fb501a0487dc4314e432054c7ef01336b5d67f25"
verdict: pass
reviewer: "codex-doc021-review"
independent: true
plan_hash: "a3fbd68d0b21dabe"
ticket_updated: "2026-08-24T23:11:16.705Z"
findings: []
---

# Independent review — CORE-100

## Decision

**PASS** for the forward-only source fix. The ticket author did not review or merge this PR.

## Changes checked

- Exact PR #251 head fb501a0487dc4314e432054c7ef01336b5d67f25 changes only AGENTS.md (outside the Kanmer-managed block), apps/gui/electron-builder.yml, and scripts/verify-release-assets.test.mjs.
- win.artifactName explicitly pins Kanmer-Setup-${version}.exe through the productName/Setup/version/ext pattern. The production verifier implementation is unchanged: no dotted-name alias, relaxed presence/state/size/digest check, or weakened latest.yml bridge was introduced.
- The added exact v0.3.6 fixture asserts the four historical errors in full: missing manifest-named installer, blockmap size mismatch, blockmap SHA-256 mismatch, and latest.yml SHA-256 mismatch. Dot-form installer/blockmap and MCPB are informational extras only.
- Detached exact-head review: git diff --check and the 46-test verifier suite exited 0; the changed-file/managed-block/verifier-unchanged scope checks passed.
- HZN-007, FRD-021, the complete ticket packet, and terminal v0.3.6 evidence were reviewed. The public v0.3.6 tag/release remains unchanged and its terminal release-verify run 32785754328 failed at published-asset verification, as the regression requires.
- GitHub has no review comments or threads.

## Hosted-check condition

The initial kanmer-gate result from run 32788167943 predates this Review attestation and is retained as a stale lifecycle snapshot, not accepted. Hosted verify must become terminal; then rerun the failed gate against this exact record. Both required checks must pass on this exact head before a normal protected squash merge.

## Findings

None.
