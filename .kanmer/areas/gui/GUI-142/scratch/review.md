---
kind: review-attestation
pr: "281"
head_sha: "328d80bf04eb98aa362da649e6ddb1c8ed933824"
verdict: pass
reviewer: "operator-bounded-independent-reviewer-gpt-5.6"
independent: true
plan_hash: "a515461542a97c26"
ticket_updated: "2026-08-26T18:09:37.209Z"
findings:
  - id: F-001
    severity: blocker
    summary: "The Kanmer CI gate could not find GUI-142 on the remote board."
    disposition: fixed
  - id: F-002
    severity: major
    summary: "The probe did not propagate a non-zero launcher exit status."
    disposition: fixed
  - id: F-003
    severity: major
    summary: "FRD-012 contradicted the PowerShell registration contract."
    disposition: fixed
  - id: F-004
    severity: minor
    summary: "Windows descriptor staleness created non-Windows false positives."
    disposition: fixed
  - id: F-005
    severity: minor
    summary: "The copied fallback was unsafe and staleness did not compare the complete command contract."
    disposition: fixed
  - id: F-006
    severity: major
    summary: "A missing or non-invocable launcher could make the probe report success."
    disposition: fixed
  - id: F-007
    severity: minor
    summary: "The production invocation does not explicitly return the native launcher exit value."
    disposition: rejected-with-reason
    reason: "Direct Windows execution against an exit-19 launcher returns a non-zero PowerShell result, sufficient for Codex failure detection; exact native exit-value preservation is outside this ticket's requirement."
  - id: F-008
    severity: minor
    summary: "The copied PowerShell fallback expanded its script payload in the caller shell."
    disposition: fixed
  - id: F-009
    severity: minor
    summary: "Windows staleness interpreted TOML args as JSON and rejected valid inline comments or trailing commas."
    disposition: fixed
  - id: F-010
    severity: minor
    summary: "The legacy-descriptor test failed on non-Windows platforms."
    disposition: fixed
  - id: F-011
    severity: major
    summary: "The canonical Codex argument contract was duplicated between GUI and core."
    disposition: fixed
  - id: F-012
    severity: minor
    summary: "A TOML-valid trailing comment on the Kanmer table header bypassed the registration-staleness verdict."
    disposition: fixed
  - id: F-013
    severity: major
    summary: "Required GitHub Actions checks had not run for the previously reviewed exact head."
    disposition: fixed
  - id: F-014
    severity: minor
    summary: "Quoted TOML table-key components bypassed Kanmer registration recognition."
    disposition: fixed
  - id: F-015
    severity: major
    summary: "Descriptor staleness accepts forbidden fields that can change the effective launcher contract."
    disposition: fixed
  - id: F-016
    severity: minor
    summary: "An unrelated TOML array-of-tables after the Kanmer entry is treated as descriptor content and produces a false stale verdict."
    disposition: deferred-to-ticket
    ticket: CORE-112
    reason: "Explicit operator authorization classifies this current-head P2 as a non-blocking false-staleness risk; GUI-142's generated launcher and MCP acceptance remain valid."
  - id: F-017
    severity: minor
    summary: "The detector rejects inline or dotted spellings of the permitted board-branch environment."
    disposition: deferred-to-ticket
    ticket: CORE-112
    reason: "Explicit operator authorization classifies this current-head P2 as the same non-blocking semantic-TOML parser class and directs one comprehensive smol-toml follow-up."
---

# Final bounded independent review

I independently reviewed GUI-142 / PR #281 at exact head `328d80bf04eb98aa362da649e6ddb1c8ed933824`, plan version `a515461542a97c26`, and ticket revision `2026-08-26T18:09:37.209Z`. This review is bounded to the approved outcome and acceptance checks, exact-head checks and current GitHub findings, the explicit operator dispositions, and blocker/P1/major regression or safety defects. It does not restart open-ended repository ideation or resurrect obsolete-head findings.

## Exact-head and required-check evidence

- The PR remains open and mergeable at the expected exact head; the implementation worktree is clean at that SHA.
- Exact-head GitHub Actions run `32997726797` passed required `verify` job `98271222206` and required `kanmer-gate` job `98271222415`.
- A later board-metadata-triggered run at the unchanged head passed `kanmer-gate` job `98279025963`; its code `verify` job was correctly skipped because the code head did not change. The exact-head successful verify remains current evidence for the unchanged bytes.
- The PR body names the correct final remediation head and records the CORE-112 deferral.
- The complete 11-file diff remains 623 additions / 53 deletions and is wired through production callers, tests, governing FRD, user documentation, example configuration, and regenerated plugin bundle.

## Approved outcome and acceptance

The reviewed implementation satisfies GUI-142's core acceptance:

- Connect generates the rootless portable PowerShell registration from the shared canonical command/argument contract.
- Normal argv serialization launches the installer-owned launcher and the recorded Windows regression reaches MCP `initialize`, `tools/list`, and `get_status`.
- The probe uses terminating error behavior and preserves launch failures before configuration mutation.
- Reconnect replaces the known legacy generated descriptor through the owned merge path.
- Windows staleness recognizes the generated descriptor and rejects behavior-changing descriptor fields, while non-Windows registrations are not judged by the Windows migration rule.
- The implementation report records focused, typecheck, full repository, plugin parity, and isolated-handshake passes; exact-head required CI independently confirms the checked revision.

No current blocker, P1, or major regression or safety defect is open.

## Current-head GitHub findings and durable dispositions

GitHub has exactly two non-outdated current-head review threads; both are resolved only after their dispositions became durable in `scratch/controller.md` and [[CORE-112]] existed with the full semantic-parser scope.

- **F-016 / PRRT_kwDOT2PEds6ckRi8 — minor, deferred-to-ticket → [[CORE-112]].** The complete finding is retained in `scratch/controller.md`: an unrelated `[[hooks]]` array-of-tables is not recognized as a section boundary and can produce a false stale verdict. Explicit operator authorization classifies this P2 as non-blocking because it affects manually formatted equivalent TOML, not the generated registration or runtime handshake.
- **F-017 / PRRT_kwDOT2PEds6ckRjH — minor, deferred-to-ticket → [[CORE-112]].** The complete finding is retained in `scratch/controller.md`: inline or dotted encodings of the sole permitted `KANMER_BOARD_BRANCH` environment are semantically equivalent but rejected by the hand-written scanner. Explicit operator authorization classifies it as the same non-blocking parser class.

CORE-112 requires the repository's existing `smol-toml` parser and covers quoted/bare keys, comments/trailing commas, unrelated normal and array tables, inline/dotted/child-table environment encodings, exact command/argument equality, the sole permitted board-branch environment entry, and rejection of other behavior-changing fields. No further regex patch is accepted as the disposition.

## Residual risk and verdict

Residual risk remains explicit: until CORE-112 lands, manually formatted but semantically equivalent TOML may receive a false reconnect/staleness warning. That risk does not invalidate Connect's generated portable descriptor, normal-argv launch, probe failure propagation, MCP handshake, legacy reconnect replacement, or exact-head required checks.

Verdict: **pass**. The expected head is unchanged, required exact-head checks are green, no current blocker/P1/major finding is open, both current P2 findings are durably deferred to the single linked CORE-112 follow-up under operator authorization, and GUI-142's approved acceptance checks are met.

This attestation does not implement, push, merge, or move the ticket.
