---
kind: review-attestation
pr: "270"
head_sha: "3ceafecd24c768d169b2a5cfaf803783f09eed13"
verdict: needs-changes
reviewer: "codex-doc021-review"
independent: true
plan_hash: "d495e81f9d336ec4"
ticket_updated: "2026-08-25T10:13:09.817Z"
findings:
  - id: F-001
    severity: major
    summary: "The publisher makes the Release latest before the explicit asset upload, allowing an upload failure to expose a partial updater release."
    disposition: open
---
# Independent review — CORE-106 / PR #270

## Review scope

Reviewed PR #270 at `3ceafecd24c768d169b2a5cfaf803783f09eed13` against CORE-106's full packet, HZN-007 context, and FRD-021. The change is within the expected release-system files, retains the no-publish implementation scope, and the focused script rail passed 60/60. At this review point, the initial `kanmer-gate` is green and hosted `verify` is still running; neither result clears the finding below.

## Findings

### F-001 — major — public partial release is exposed before upload succeeds

`scripts/release.mjs` pushes the tag, then calls `gh release create v<version> --latest` (lines 476–479) before the subsequent `gh release upload` command (line 480). If upload fails or only partially succeeds, GitHub's `/releases/latest` immediately exposes the incomplete release to updater clients. The later local-to-remote check refuses, but it runs only after the exposure; this recreates the user-facing failure CORE-106 is meant to prevent.

The publisher must stage the release as non-visible (for example, create it as a draft), upload and verify the exact single package generation, and only then make it latest/non-draft. On failure it may remain preserved as failed evidence, but it must not be served as the latest update. Add deterministic ordering/failure regression coverage for that visibility boundary.

## Other evidence

- `node --test scripts/verify-release-assets.test.mjs scripts/release-flow.test.mjs scripts/release-publish.test.mjs`: PASS, 60/60.
- The remote-coherent verifier correctly avoids comparing independently signed builds. It requires each named core asset exactly once and verifies manifest/installer bytes when those prerequisite checks pass.
- No GitHub reviews, comments, or review threads were present in the initial gather.

## Disposition

NEEDS CHANGES. Keep CORE-106 in Review; do not merge or publish. A corrected PR head, updated report/packet as needed, terminal exact-head checks, and a new independent attestation are required.
