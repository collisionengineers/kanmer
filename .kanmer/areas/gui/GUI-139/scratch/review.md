---
kind: review-attestation
pr: "265"
head_sha: "8b61a6e8859b2b2b0063dd6d334aab7b7fc9b7d6"
verdict: needs-changes
reviewer: "codex-doc021-review"
independent: true
plan_hash: "9af7da453bc2b0c7"
ticket_updated: "2026-08-25T06:43:36.345Z"
findings:
  - id: F-001
    severity: major
    summary: "Incomplete-profile exception is broader than the product-owned default"
    disposition: open
---
# Independent review — GUI-139 / PR #265

## Scope and evidence

Reviewed exact PR head 8b61a6e8859b2b2b0063dd6d334aab7b7fc9b7d6 against the GUI-139 packet, FRD-025, and HZN-007 context. The diff is limited to the persisted OpenAI-tunnel reader and its regression test. Local evidence passed: focused openaiTunnel tests (13/13), GUI typecheck, and git diff --check against 700ae9c46904cd5417abe81dd3b256f6d33000d0.

At review time, hosted verify was in progress and kanmer-gate had failed only because no SHA-bound review attestation existed yet. There were no GitHub review threads or ordinary PR comments.

## Findings

- **F-001 — major, open:** normalizeProfile treats every profile with an empty tunnelId and generation, enabled: false, and autoStart: false as a productDefault, while it permits arbitrary individually-safe profileName, executable, credentialEnv, and healthAddress values. That accepts safe-but-user/tamper-populated incomplete profiles that the product did not create. The packet requires the exact product-owned empty/default state and continued rejection of partial profiles; its new test changes only tunnelId, so it does not exercise this bypass. Restrict the persistence exception to the canonical default generated for the persisted project (or equivalently prove every remaining field is canonical), and add regressions for altered safe executable, credential, health, and profile-name values. Keep save/start/doctor completeness checks intact.

No merge decision is authorized while F-001 remains open. This attestation makes no post-merge, release, or proof claim.
