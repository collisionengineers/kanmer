---
kind: review-attestation
pr: "270"
head_sha: "9def9c09c4e3b8c04d2880094782533fe48b82cc"
verdict: pass
reviewer: "codex-doc021-review"
independent: true
plan_hash: "d495e81f9d336ec4"
ticket_updated: "2026-08-25T10:17:02.589Z"
findings:
  - id: F-001
    severity: major
    summary: "The publisher made the Release latest before the explicit asset upload, allowing an upload failure to expose a partial updater release."
    disposition: fixed
---
# Independent review — CORE-106 / PR #270

## Review scope

Freshly reviewed PR #270 at `9def9c09c4e3b8c04d2880094782533fe48b82cc` against the complete CORE-106 packet, HZN-007 control context, and FRD-021. The reviewer is independent of the author role. The nine-file release-only diff stays within the plan: it replaces concurrent Electron Builder publication with one retained `--publish never` Windows package, explicit bounded GitHub upload, local-to-remote integrity verification, and an independent public-set verifier for tag CI. It makes no runtime updater, credential, dependency, prior-release, tag, or branch-policy change.

## Acceptance evidence

- Exact local focused rail: `node --test scripts/verify-release-assets.test.mjs scripts/release-flow.test.mjs scripts/release-publish.test.mjs` — PASS, 60/60.
- Exact local diff hygiene: `git diff --check 8c8fdb868aed3677b3603b9ba360f304139aee6f...9def9c09c4e3b8c04d2880094782533fe48b82cc` — PASS.
- Hosted PR run `32836402760` at the reviewed head: `verify` PASS in 4m10s; its pre-attestation `kanmer-gate` job also completed successfully in 54s. The gate record correctly notes that the prior review file was bound to the superseded `3ceaf…` head; this new attestation must be synced and the gate rerun before merge.
- GitHub final review gather at this head: PR is open and mergeable; no reviews, comments, or review threads are present.

## Findings and dispositions

### F-001 — major — fixed

The prior review found that the publisher made the release public/latest before its explicit uploads and verification. The corrected flow now creates the release as a draft, uploads the exact retained installer/blockmap/MCPB/manifest set, validates that draft against the same package, and only then executes `gh release edit … --draft=false --latest`. The regression pins the required order `create < upload < verify < publish`. A failed upload or byte check therefore preserves a hidden failed draft rather than offering an incomplete updater release to clients.

## Residual boundary

This review approves the source change and its tests only. CORE-107 owns the future real v0.3.9 publication and installed-product evidence; this ticket neither publishes nor retags any release.

## Decision

PASS, conditional on a post-attestation board sync and exact-head required-check rerun that proves the merge gate sees this attestation.
