---
kind: review-attestation
pr: "208"
head_sha: "8fdececeb6a71ddc0b457b02750a0ac14b938496"
base_sha: "30ed38aa7052ccf01a34d6859e67ba3e5deee6b5"
verdict: pass
reviewer: "codex-root-independent"
independent: true
plan_hash: "2026-08-22T20:48:00Z"
ticket_updated: "2026-08-22T20:48:00Z"
findings:
  - id: F-001
    severity: blocker
    summary: "Existing project registrations follow a saved board-branch change"
    disposition: fixed
    reason: "applyGitPreferences refreshes matching open projects only; provider-owned registration state is checked, malformed entries fail without mutation, and Codex/Claude/OpenCode merges preserve unrelated entries. Focused production-caller and registration tests pass."
  - id: F-002
    severity: blocker
    summary: "Native Grok and Antigravity descriptors carry the normalized board branch"
    disposition: fixed
    reason: "Native connects stage a disposable descriptor copy, inject KANMER_BOARD_BRANCH, validate/install from that copy, and remove it in finally; focused native lifecycle tests pass and the shipped source bundle remains unchanged."
  - id: F-003
    severity: minor
    summary: "Hosted provider installation and packaged parity"
    disposition: accepted-risk
    reason: "Real provider credentials/host lifecycle, hosted protection mutation, plugin:check, and mcpb:check are unavailable in this linked-worktree environment; the packet preserves those INCONCLUSIVE results without weakening assertions."
---

## Independent review — PASS — 2026-08-22

Reviewed exact PR #208 head 8fdececeb6a71ddc0b457b02750a0ac14b938496 against CORE-043 cumulative base 30ed38aa7052ccf01a34d6859e67ba3e5deee6b5. The diff is scoped to provider-owned registration reconciliation, native descriptor staging/cleanup, production Settings wiring, provider descriptors, tests, and the managed convention text. No unrelated project mutation or source-bundle write is introduced.

Independent evidence: focused connect/index rail 35/35; full GUI 417/417; core 283/283; all-workspace typecheck; core/MCP and GUI builds; scripts 89/89; manual/docs/managed-block/skills rails; and git diff check all pass. The packet preserves plugin:check/mcpb:check and real hosted/provider lifecycle as INCONCLUSIVE. No source or external provider state was changed during review.

Verdict: PASS. Merge PR #208 non-squash into core-043-protection-retarget, then move GUI-113 Review → Verifying and clear its CORE-043 dependency edge. Do not verify or clean up in this review step.

--- Prior review history ---
