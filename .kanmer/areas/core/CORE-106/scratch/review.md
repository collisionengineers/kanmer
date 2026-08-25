---
kind: review-attestation
pr: "270"
head_sha: "5b3b61af85359c3a4f2c9d708856d1b3d1920964"
verdict: needs-changes
reviewer: "codex-doc021-review"
independent: true
plan_hash: "d495e81f9d336ec4"
ticket_updated: "2026-08-25T10:37:33.622Z"
findings:
  - id: F-001
    severity: major
    summary: "The publisher made the Release latest before the explicit asset upload, allowing an upload failure to expose a partial updater release."
    disposition: fixed
  - id: F-002
    severity: major
    summary: "The documented GITHUB_RELEASE_TOKEN was accepted by preflight but was not forwarded to gh."
    disposition: fixed
  - id: F-003
    severity: major
    summary: "The release-existence probe treated every gh release view exit-1 failure as release absence."
    disposition: fixed
  - id: F-004
    severity: major
    summary: "The typed release-existence probe passed version instead of the helper's required tag argument, so it requested /releases/tags/undefined and always inferred absence."
    disposition: fixed
  - id: F-005
    severity: major
    summary: "The draft publisher could make a release public when GitHub omitted an asset SHA-256 digest."
    disposition: fixed
  - id: F-006
    severity: minor
    summary: "Tag CI treated a not-yet-public draft asset download as non-retryable exit 2."
    disposition: fixed
  - id: F-007
    severity: minor
    summary: "Remote-coherent verification hard-codes a second asset-name list, so newly added or renamed package outputs can escape strict remote validation."
    disposition: open
---
# Independent review — CORE-106 / PR #270

## Review scope and evidence

Freshly reviewed PR #270 at `5b3b61af85359c3a4f2c9d708856d1b3d1920964` against the full CORE-106 packet, HZN-007 context, FRD-021, diff, and GitHub threads. The reviewer is independent of the author role. The focused release suite was independently re-run and passes 62/62; exact diff hygiene passes. Fresh hosted checks were in progress and cannot clear the remaining source finding.

## Dispositions

F-001 through F-006 are fixed. The publisher now rejects unusable GitHub digests before public release; remote mode maps absent release/draft asset 404s to the workflow's bounded retry exit while preserving auth/API failures as inconclusive; tests cover both. Prior related threads remain pending final resolution after the current finding is handled.

## F-007 — minor — open — make the actual publisher and remote verifier share one asset-set contract

The added `releaseAssetNames(version)` is imported only by `verify-release-assets.mjs`; `release.mjs` still obtains its upload set from independently directory-derived `expectedAssets()`, and `exactUploadSpecs()` merely maps that set without consuming or validating `releaseAssetNames`. Thus the claimed canonical helper does not bind the publisher: a newly produced artifact can be uploaded by the publisher but received as an informational remote extra with no strict state/digest/coherence verification. Make the publisher's expected/upload set and remote required set use the same contract (or derive remote names from that exact local set without comparing independently signed bytes), with an integration-level regression.

## Decision

NEEDS CHANGES. Keep CORE-106 in Review; do not merge, publish, retag, move the ticket, or resolve the remaining thread until F-007 has a corrected head and fresh review.
