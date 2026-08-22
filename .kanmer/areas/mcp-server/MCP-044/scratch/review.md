---
kind: review-attestation
pr: "206"
head_sha: "df78fd9b6ba98b54c2e28ea06dd6fa019f93732b"
base_sha: "34245be039e8fd8395b5e31835602c54e62e98a4"
verdict: pass
reviewer: "codex-root-independent"
independent: true
plan_hash: "2026-08-22T19:04:09.621Z"
ticket_updated: "2026-08-22T19:04:09.621Z"
findings:
  - id: F-001
    severity: blocker
    summary: "Saved board branch reaches every local provider registration"
    disposition: fixed
    reason: "The production IPC Connect caller passes readSettings().kanmerBranch into connectAgent; Codex, installed Electron-as-Node, and provider serializers carry KANMER_BOARD_BRANCH with normalization and focused regressions."
  - id: F-002
    severity: major
    summary: "Managed instructions must explain local versus hosted branch configuration"
    disposition: fixed
    reason: "AGENTS.md, the bundled setup skill, its managed block source, and FRD-012 describe local KANMER_BOARD_BRANCH propagation and the separate Actions variable handoff. Managed-block and skill rails pass."
  - id: F-003
    severity: minor
    summary: "Committed plugin parity is pre-existing on the cumulative target"
    disposition: accepted-risk
    reason: "The ticket changes no MCP server source or plugin artifact; local plugin:check remains the known pre-existing bundle mismatch and is outside MCP-044 scope. No parity assertion was weakened."
  - id: F-004
    severity: minor
    summary: "Undefined check:diff script"
    disposition: accepted-risk
    reason: "The repository has no check:diff script; this preserved packet failure is outside the ticket's production scope and did not gate the authoritative hosted verify."
  - id: F-EXTERNAL
    severity: minor
    summary: "Live provider and hosted handoff proof"
    disposition: accepted-risk
    reason: "No external provider installation, protected-branch mutation, or installer state was changed; deterministic tests and hosted CI prove the local contract only."
---

## Independent cumulative review — PASS — 2026-08-22

Reviewed exact PR #206 head df78fd9b6ba98b54c2e28ea06dd6fa019f93732b against base 34245be039e8fd8395b5e31835602c54e62e98a4. The production Connect IPC caller now reads the saved board branch and threads it through Codex portable, installed Electron-as-Node, and provider registration paths; blank values normalize to kanmer-board. Focused provider/connect tests, the full GUI suite (392/392), all-workspace typecheck/build, manual and managed-block checks, and scripts (88/88) passed. Hosted verify and kanmer-gate passed after the ticket entered Review. No source or external provider state was mutated during review.

Verdict: PASS. Merge PR #206 non-squash into the CORE-043 cumulative branch, then move MCP-044 Review → Verifying and clear its dependency edge. Do not verify or clean up in this review step.

# Independent review — PASS

Reviewer: core041-executor (independent of author gui099-executor)
PR: #206
Head: df78fd9b6ba98b54c2e28ea06dd6fa019f93732b
Target/base: core-043-protection-retarget (CORE-043 head e78323d7fb8ce695e40db80380d189e236726b25)

## Changes checked

- The diff is limited to the MCP-044 packet: provider invocation/connect threading, provider/connect tests, the canonical managed instructions and generated setup-skill copy, and the FRD-012 R1e wording.
- Codex retains the exact rootless portable launcher command and adds only the project-scoped KANMER_BOARD_BRANCH environment value. Electron registrations retain ELECTRON_RUN_AS_NODE and add the same normalized branch. Claude/OpenCode serialization and owned-entry idempotence are covered; native Grok/Antigravity plugin paths and installer/GitHub behavior remain untouched.
- The GUI Connect IPC reads the saved kanmerBranch and passes it through connectAgent/serverInvocation. No CORE-043 source, branch mutation, workflow gate, dependency, or plugin-manifest change is present.

## Evidence and dispositions

- Packet report records focused GUI 96/96, full GUI 45 files/392 tests, all-workspace typecheck, core/server and GUI builds, manual/docs, managed-block, skill and scripts rails as PASS.
- Live hosted protection, provider installation, and installer state are explicitly INCONCLUSIVE; no external state is claimed or mutated.
- The initial hosted kanmer-gate run 32592570994/job 97078544880 failed only because the board ticket was still Implementing and had no review attestation at dispatch; that exact failure is preserved. The ticket is now Review with this scratch, and the failed gate job was rerun as job 97078908213. The authoritative verify job remains 97078544770 and passed.
- The PR was retargeted from main to the required CORE-043 stack before merge; the final diff remains the same nine files and exact head. No blocking code finding remains.

## Verdict

PASS at exact head df78fd9b6ba98b54c2e28ea06dd6fa019f93732b. Safe for authorized non-squash merge into core-043-protection-retarget after the rerun confirms the gate. Do not verify or close MCP-044, and do not merge CORE-043.
