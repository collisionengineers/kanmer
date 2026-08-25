---
kind: review-attestation
pr: "270"
head_sha: "05083f4075d0588ceec633725e40774d0badd5a5"
verdict: pass
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
---
# Independent review — CORE-106 / PR #270

## Review scope

Reviewed PR #270 at `05083f4075d0588ceec633725e40774d0badd5a5` against the complete CORE-106 packet, HZN-007 control context, and FRD-021. The reviewer is independent of the author role. The nine-file release-only diff remains within the ticket's one-package publisher and public-coherence verification scope; it does not change runtime updater behaviour, dependencies, credentials, historic assets/tags, or branch policy.

## Acceptance evidence

- `node --test scripts/verify-release-assets.test.mjs scripts/release-flow.test.mjs scripts/release-publish.test.mjs` — PASS, 60/60 on the reviewed head.
- `git diff --check 8c8fdb868aed3677b3603b9ba360f304139aee6f...05083f4075d0588ceec633725e40774d0badd5a5` — PASS.
- Hosted exact-head run `32837275332`: `verify` PASS in 4m29s and initial `kanmer-gate` PASS in 1m11s. The gate was necessarily taken before this attestation and reported the old SHA; sync and rerun are required before merge.
- Final GitHub gather: PR open and mergeable, no regular comments, and all three review threads resolved.

## Findings and dispositions

### F-001 — major — fixed

The explicit publisher creates a draft, uploads the exact retained package, verifies it while hidden, and only then makes it public/latest. The regression pins `create < upload < verify < publish`.

### F-002 — major — fixed

Publish mode normalizes the selected supported credential into `GH_TOKEN` before each `gh` command and uses the same selected token for REST verification, without logging the token.

### F-003 — major — fixed

The pre-tag release check now uses typed REST failure handling rather than ambiguous `gh release view` exit statuses. Only an explicit `not-found` result proceeds; auth, rate-limit, malformed, and other errors refuse before tag mutation.

### F-004 — major — fixed

The typed lookup now passes `tag: releaseTag(version)`, and the source regression pins that exact request argument. It queries the actual release tag rather than `undefined`.

## Residual boundary

This source review does not publish, tag, or prove a real v0.3.9 release. Those external release and installed-product claims remain CORE-107 work.

## Decision

PASS, conditional on a synced, post-attestation exact-head merge-gate run.
