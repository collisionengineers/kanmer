---
kind: review-attestation
pr: "270"
head_sha: "ff0f6033e1db279fd95356f64e5f09ee9e6b2cb6"
verdict: needs-changes
reviewer: "codex-doc021-review"
independent: true
plan_hash: "d495e81f9d336ec4"
ticket_updated: "2026-08-25T10:25:35.921Z"
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
    summary: "The new typed release-existence probe passes version instead of the helper's required tag argument, so it requests /releases/tags/undefined and always infers absence."
    disposition: open
---
# Independent review — CORE-106 / PR #270

## Review scope

Freshly reviewed PR #270 at `ff0f6033e1db279fd95356f64e5f09ee9e6b2cb6` against the complete CORE-106 packet, HZN-007 control context, and FRD-021. This is a release-only, two-file remediation on top of the existing bounded publisher/verifier work. The reviewer is independent of the author role.

## Evidence

- The focused release suite was independently re-run: `node --test scripts/verify-release-assets.test.mjs scripts/release-flow.test.mjs scripts/release-publish.test.mjs` — PASS, 60/60.
- `git diff --check 8c8fdb868aed3677b3603b9ba360f304139aee6f...ff0f6033e1db279fd95356f64e5f09ee9e6b2cb6` — PASS.
- Fresh required CI was still in progress at this review point; it cannot clear the source finding below.

## Findings and dispositions

### F-001 — major — fixed

The publisher creates a hidden draft, uploads and verifies the retained package, then makes it public/latest. The ordering regression remains present.

### F-002 — major — fixed

Publish mode now normalizes the chosen documented credential into `process.env.GH_TOKEN` before any `gh` command while retaining that credential for REST verification. This avoids a cached unrelated identity and does not log the secret.

### F-003 — major — fixed

The ambiguous `gh release view` exit-code branch has been replaced by typed REST failure handling: only `kind: not-found` is eligible to proceed; auth, rate-limit, malformed, server, and other failures refuse before the tag mutation.

### F-004 — major — open — use the helper's required tag argument

`fetchReleaseAssets` destructures `tag` and constructs `/releases/tags/${tag}`. The new preflight calls it with `{ version, owner, repo, token }`, not `tag: releaseTag(version)`. The request is therefore made to `/releases/tags/undefined`; its 404 is treated as real release absence. This defeats the claimed typed release lookup and leaves the new test as a static source assertion rather than proof of the actual tag request. Pass `tag: releaseTag(version)` and add an argument/URL-level regression, then rerun review and CI.

## Decision

NEEDS CHANGES. Keep CORE-106 in Review; do not merge, publish, retag, or move the ticket.
