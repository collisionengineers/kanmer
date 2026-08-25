---
kind: review-attestation
pr: "270"
head_sha: "05083f4075d0588ceec633725e40774d0badd5a5"
verdict: needs-changes
reviewer: "codex-doc021-review"
independent: true
plan_hash: "d495e81f9d336ec4"
ticket_updated: "2026-08-25T10:27:13.254Z"
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
    summary: "The draft publisher can make a release public when GitHub omits an asset SHA-256 digest, despite the release invariant requiring every asset digest."
    disposition: open
  - id: F-006
    severity: minor
    summary: "Tag CI treats a not-yet-public draft asset download as non-retryable exit 2, creating a race with draft publication."
    disposition: open
  - id: F-007
    severity: minor
    summary: "Remote-coherent verification hard-codes a second asset-name list, so newly added or renamed package outputs can escape strict remote validation."
    disposition: open
---
# Independent review — CORE-106 / PR #270

## Review scope and evidence

Freshly reviewed PR #270 at `05083f4075d0588ceec633725e40774d0badd5a5` against the complete CORE-106 packet, HZN-007 context, FRD-021, full diff, hosted checks, and all GitHub review threads. The reviewer is independent of the author role. The exact-head focused release rail passes 60/60, diff hygiene passes, and hosted run `32837275332` reports `verify` PASS in 4m29s and post-attestation `kanmer-gate` PASS in 51s. Those checks do not clear the findings below.

## Disposed prior findings

F-001 through F-004 are fixed: the release remains a draft until exact upload/verification completes; the selected documented token is normalized for `gh`; the ambiguous CLI release probe is replaced by typed REST classification; and that lookup now passes `tag: releaseTag(version)`. Their GitHub threads are resolved.

## Findings

### F-005 — major — open — reject a draft whose asset digest is missing

The publisher's pre-publication `verifyRelease` calls `verifyAssets`. For a null or non-SHA-256 GitHub `digest`, that function records only a warning, keeps `check.ok` true, and lets the draft become public. That conflicts with the current AGENTS release convention: “A missing asset or digest remains a hard failure,” and denies the claimed exact byte-integrity proof. Make usable SHA-256 digest mandatory for every published asset in this publisher path and update the legacy degrade tests accordingly.

### F-006 — minor — open — make an unpublished-draft download retryable for tag CI

Tag CI begins as soon as the immutable tag is pushed, before the local publisher finishes packaging and makes its draft public. If remote verification observes uploaded draft metadata then follows the anonymous `browser_download_url`, GitHub can return 404 until `gh release edit --draft=false` completes. `fetchAssetBytes` currently throws an `http` error, mapping the CLI to exit 2; `release.yml` treats exit 2 as inconclusive and deliberately does not retry. The normal release race is thus promoted to a permanent failed CI attempt. Classify transient unavailable public bytes in remote-coherent mode as an incomplete release (exit 1) so the existing bounded poll retries; retain distinct non-retryable auth/API failures.

### F-007 — minor — open — use one canonical asset-set definition

`expectedAssets` derives the publisher's expected outputs from the actual package directory, but `requiredRemoteAssetNames` repeats only the current four names. A future target addition or artifact rename is either incorrectly rejected or reported as informational and receives neither state/digest nor coherence validation. Reuse a shared/canonical package asset-name source for both paths (without comparing independently signed installer bytes) and add a regression that proves the remote required set widens with a valid added output.

## Decision

NEEDS CHANGES. Keep CORE-106 in Review. Do not merge, publish, retag, move the ticket, or resolve F-005 through F-007 until a corrected head receives fresh CI and independent review.
