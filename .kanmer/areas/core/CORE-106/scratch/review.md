---
kind: review-attestation
pr: "270"
head_sha: "61010005cc0829bfb6cfd272072cd5e4bfbdddf5"
verdict: needs-changes
reviewer: "codex-doc021-review"
independent: true
plan_hash: "d495e81f9d336ec4"
ticket_updated: "2026-08-25T10:38:47.356Z"
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
    summary: "Remote-coherent verification used a second asset-name list that could drift from actual package outputs."
    disposition: fixed
  - id: F-008
    severity: major
    summary: "The publisher pushes the immutable tag before building and validating its one package, so a local packaging failure strands a retry-blocking tag."
    disposition: open
  - id: F-009
    severity: major
    summary: "Unqualified gh release commands can honor GH_REPO and create/upload a release in a repository different from the tag and REST-verification repository."
    disposition: open
---
# Independent review — CORE-106 / PR #270

## Review scope and evidence

Freshly reviewed PR #270 at `61010005cc0829bfb6cfd272072cd5e4bfbdddf5` against the complete CORE-106 packet, HZN-007 context, FRD-021, full diff, hosted checks, and every GitHub review thread. The reviewer is independent of the author role. Focused tests pass 62/62, exact diff hygiene passes, and hosted run `32838236035` reports `verify` PASS in 4m35s and `kanmer-gate` PASS in 51s. These checks do not clear the source findings below.

## Disposed findings

F-001 through F-007 are fixed. In particular, the shared canonical set is now enforced by the publisher before upload and consumed by remote verification. The F-005 through F-007 review threads have the code remedy needed, but must be resolved with the next clean review.

## F-008 — major — open — validate the package before pushing the retry-blocking immutable tag

The publish path checks tag absence then immediately creates and pushes `v<version>`, before running Electron Builder, copying the MCPB, updater package checks, and local artifact coherence. Any of those local failures leaves the tag on origin without a release. The following invocation refuses the existing tag, so an otherwise unpublished version cannot be retried and must be abandoned. Build and validate the one package generation first; only then create/push the immutable tag and draft release. A concurrent tag creation during packaging must fail safely before any release mutation. Add an ordering regression.

## F-009 — major — open — pin every gh release command to the verified repository

The tag push and REST verification are bound to the local origin / `collisionengineers/kanmer`, but `gh release create`, `upload`, and `edit` have no `--repo`. GitHub CLI honours `GH_REPO`, so a caller environment can create a tag, draft release, and assets in a different repository before later verification fails against Kanmer. Pass the same explicit repository to create, upload, and edit, and pin it with a regression.

## Decision

NEEDS CHANGES. Keep CORE-106 in Review. Do not merge, publish, retag, move the ticket, or resolve F-008/F-009 until a corrected head has fresh CI and independent review.
