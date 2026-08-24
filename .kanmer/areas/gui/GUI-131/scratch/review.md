---
kind: review-attestation
pr: "248"
head_sha: "4c2d29e62bf74c053a58898ed14d7f06a838a3a8"
verdict: needs-changes
reviewer: "codex-root-independent-reviewer"
independent: true
plan_hash: "bb2c1fb3f558d422"
ticket_updated: "2026-08-24T21:39:35.756Z"
findings:
  - id: "REV-001"
    severity: major
    summary: "AGENTS.md does not document the new publish-mode pre-tag GUI build and failure boundary."
    disposition: open
---

# Independent review — GUI-131

## Decision

NEEDS CHANGES. The source control-flow change and regression test correctly address the clean-publisher failure, but the repository’s contributor guidance must change in the same PR because this establishes a new release command sequence and failure boundary.

## Confirmed implementation

The exact head changes only `scripts/release.mjs` and `scripts/release-flow.test.mjs`. The synchronous existing GUI build is inside publish mode after its merged-manifest/reachability preconditions and before tag creation/tag push; the source-order test proves build < tag < tag push. It preserves one Electron Builder package and does not touch existing tags, release state, credentials, workflows, or manual recovery behavior.

The focused test, script tests, typecheck, fresh normal-clone authoritative verification, and required hosted checks passed. The initial gate failure was the recorded pre-Review snapshot and its rerun passed.

## Finding

- **REV-001 — major, open:** AGENTS.md must describe that local publish mode builds the GUI before the immutable tag is created/pushed, and that a GUI build failure stops before a tag/release can be created. This is required by the repository rule for PRs that change commands or conventions. Update the ticket plan to include this source-document change, then update AGENTS.md in the same PR, run the applicable documentation/source checks, and request a fresh exact-head review. Do not alter release behavior beyond this established build prerequisite, retry release, tag, publish, or merge.

## Threads

One automated GitHub P1 thread is unresolved and is represented by REV-001. No other threads or comments require action.
