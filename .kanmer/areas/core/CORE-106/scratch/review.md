---
kind: review-attestation
pr: "270"
head_sha: "9def9c09c4e3b8c04d2880094782533fe48b82cc"
verdict: needs-changes
reviewer: "codex-doc021-review"
independent: true
plan_hash: "d495e81f9d336ec4"
ticket_updated: "2026-08-25T10:17:02.589Z"
findings:
  - id: F-001
    severity: major
    summary: "The publisher made the Release latest before the explicit asset upload, allowing an upload failure to expose a partial updater release."
    disposition: fixed
  - id: F-002
    severity: major
    summary: "The documented GITHUB_RELEASE_TOKEN is accepted by preflight but is not forwarded to gh, so publish can use an unrelated cached login or fail authentication."
    disposition: open
  - id: F-003
    severity: major
    summary: "The release-existence probe treats every gh release view exit-1 failure as release absence, so a transient/API failure can strand an immutable tag after the next create fails."
    disposition: open
---
# Independent review — CORE-106 / PR #270

## Review scope

Freshly reviewed PR #270 at `9def9c09c4e3b8c04d2880094782533fe48b82cc` against the complete CORE-106 packet, HZN-007 control context, and FRD-021. The reviewer is independent of the author role. The nine-file release-only diff remains within the planned publisher/verification scope. Focused local release tests pass 60/60 and exact diff hygiene passes. Hosted full `verify` run `32836402760` passed in 4m10s; the attestation-triggered edited-event gate run `32836821342` passed. A separate full rerun was in progress when the final thread review below found blockers.

## GitHub review/thread gather

The PR is open and mergeable, with no ordinary comments. Three unresolved Codex review threads remain. The first is fixed; the latter two are valid and block merge.

## Findings and dispositions

### F-001 — major — fixed

The prior public-partial-release finding is remediated. The publisher creates a draft, uploads and verifies the exact retained package while hidden, then runs `gh release edit … --draft=false --latest`. The regression asserts `create < upload < verify < publish`, so a failed upload/verification preserves hidden failed evidence rather than serving an incomplete updater release.

### F-002 — major — open — forward the supported publisher token to gh

`release.mjs` intentionally accepts `GITHUB_RELEASE_TOKEN`, `GH_TOKEN`, or `GITHUB_TOKEN` in `tokenVar`, and uses the selected variable for the JS verifier. The `gh release view/create/upload/edit` commands, however, inherit their original environment. GitHub CLI recognizes `GH_TOKEN`/`GITHUB_TOKEN`, not `GITHUB_RELEASE_TOKEN`; with only the documented latter variable, the write commands can fail or use an unrelated persisted account. Normalize the selected secret into the environment seen by every `gh` invocation (without logging it) and add a regression covering the documented variable.

### F-003 — major — open — distinguish verified release absence from generic gh failure

The preflight catches `gh release view` and accepts any exit status 1 as absence. GitHub CLI uses exit 1 for general failures as well as a missing release, so transient network/API/repository errors can be misclassified. The script would push the irreversible tag, then fail release creation and strand a tag that future attempts refuse. Continue only after a reliable not-found result (for example a bounded API response whose 404 is explicit); surface all other failures as inconclusive before any tag mutation. Add a regression for non-404/transport failure.

## Decision

NEEDS CHANGES. Keep CORE-106 in Review. Do not merge, publish, retag, or resolve the two open threads. A corrected head, updated report/packet as needed, terminal exact-head checks, and a new independent attestation are required.
