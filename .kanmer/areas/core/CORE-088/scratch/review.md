---
kind: review-attestation
pr: "218"
head_sha: "8d62176216d8c886779217fd846149f0b04b1655"
base_sha: "f2e694a4f9ce689c0949814ea88c2910ddb93f37"
verdict: pass
reviewer: "codex-gui099-executor"
independent: true
plan_hash: "1a709b066d0678b1"
ticket_updated: "2026-08-22T22:08:20.428Z"
findings:
  - id: F-006
    severity: major
    disposition: fixed-in-PR
    reason: "Source-cache validation now rejects symlinked cache paths/files, malformed or oversized cache content, wrong-origin documents, invalid URL identity, and aggregate document payloads; focused source regressions pass."
  - id: F-007
    severity: major
    disposition: fixed-in-PR
    reason: "Orphan migration now serializes cleanup, fingerprints the expected board, refuses dirty source state before quarantine, restores the quarantine on failure, and preserves cleanup/restore errors; focused GUI Git regressions pass."
  - id: F-008
    severity: major
    disposition: fixed-in-PR
    reason: "DNS preflight is applied to every request/redirect hop and the approved address is bound into the HTTPS request; IPv4/IPv6/private-destination coverage is in the source suite."
  - id: F-009
    severity: major
    disposition: fixed-in-PR
    reason: "Core lock ownership now uses owner leases, stale-marker/future-timestamp handling, inode revalidation, bounded rename retry, and callback-plus-release error propagation; core IO regressions pass."
  - id: hosted-checks
    severity: minor
    disposition: accepted-risk
    reason: "PR #218 has no hosted status checks attached; local deterministic rails and exact diff audit are the available evidence."
  - id: live-environment
    severity: minor
    disposition: accepted-risk
    reason: "Live external DNS/rebinding, Windows cross-device/EPERM behavior, packaged MCPB/provider, and installed-host evidence remain INCONCLUSIVE because those environments are unavailable; the ticket report preserves these boundaries."
---

## Independent review — CORE-088 / PR #218

Reviewed exact head 8d62176216d8c886779217fd846149f0b04b1655 against base f2e694a4f9ce689c0949814ea88c2910ddb93f37. The cumulative diff is bounded to source-cache/DNS/orphan-cleanup and the required core lock/error propagation seams, plus deterministic tests and the generated plugin artifact. PR #218 is mergeable and has no hosted checks; the automated Codex review submitted no actionable inline finding.

Exact local evidence:

- npm test -- --run src/io.test.ts in packages/core: exit 0, 32/32 PASS;
- node --test src/sources.test.mjs in packages/mcp-server: exit 0, 32/32 PASS;
- npm test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts: exit 0, 31/31 PASS;
- npm run typecheck: exit 0;
- npm run verify:docs: exit 0, 22 chapters current;
- git diff --check f2e694a4...8d621762: exit 0;
- npm run plugin:build: exit 0; generated plugin artifact remained clean/deterministic afterward.

The source audit confirms cache lstat/symlink/origin/size/aggregate bounds, validator-preserving 304 refresh, all-hop DNS preflight and pinned requests, and bounded redirect/deadline handling. The orphan path serializes migration, checks source dirtiness and board fingerprint, avoids deleting a replacement, and restores or surfaces cleanup failures. Core locking preserves active owners, revalidates the inode before stale quarantine, handles future timestamps through filesystem age, and reports callback/release error combinations. No in-scope blocker remains. Verdict: PASS; merge PR #218 non-squash into core-026-project-declared-sources, then move CORE-088 to Verifying.
