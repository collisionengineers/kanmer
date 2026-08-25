---
kind: review-attestation
pr: "265"
head_sha: "04774ce2e618ad2cf1e943c048a65b1de61a3b2b"
verdict: needs-changes
reviewer: "codex-doc021-review"
independent: true
plan_hash: "9af7da453bc2b0c7"
ticket_updated: "2026-08-25T06:47:21.268Z"
findings:
  - id: F-001
    severity: major
    summary: "Incomplete-profile exception is broader than the product-owned default"
    disposition: fixed
  - id: F-002
    severity: major
    summary: "Doctor or Initialize makes the product-created incomplete profile unloadable"
    disposition: open
---
# Independent re-review — GUI-139 / PR #265

## Scope and evidence

Reviewed exact PR head 04774ce2e618ad2cf1e943c048a65b1de61a3b2b against the full GUI-139 packet, FRD-025, and HZN-007 context. The two-file diff remains within scope. Local evidence passed: npm exec vitest run -- src/main/openaiTunnel.test.ts (13/13), npm run typecheck (all workspaces), and git diff --check against base 700ae9c46904cd5417abe81dd3b256f6d33000d0.

Hosted kanmer-gate is green. Hosted verify remained in progress at the final gather. There are no GitHub review threads, reviews, or ordinary PR comments.

## Findings

- **F-001 — major, fixed:** The reader now derives the expected default from the persisted project and compares all structural/default fields. The updated regression rejects altered safe tunnel id, executable, and profile name. This closes the prior over-broad incomplete-profile admission.
- **F-002 — major, open:** The same exact-default predicate requires lastSummary, lastError, and lastDoctorAt to remain null. Yet the GUI enables Initialize and Run doctor whenever an unchanged profile exists, including the registered incomplete default. Both operations invoke finishDoctor, which writes and persists those diagnostic fields even when prerequisites are incomplete. On the next app restart, readOpenAITunnelSettings rejects that still-product-owned default as OPENAI_TUNNEL_SETTINGS_INVALID, recreating the ticket's startup failure after a normal exposed action. Make incomplete defaults safe across those operations: either require complete configuration before Initialize/Doctor and prove no metadata is persisted, or allow product-owned diagnostic metadata without widening the structural incomplete-profile exception. Add a register → Doctor/Initialize → restart regression.

No merge decision is authorized while F-002 remains open. This attestation makes no post-merge, release, or proof claim.
