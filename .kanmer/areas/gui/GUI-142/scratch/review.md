---
kind: review-attestation
pr: "281"
head_sha: "b1d31fd41de390ee58930b826f23b58bafb76bb7"
verdict: needs-changes
reviewer: "independent-reviewer-gpt-5.6"
independent: true
plan_hash: "2c67e6b03988d751"
ticket_updated: "2026-08-26T11:01:20.092Z"
findings:
  - id: REV-GUI142-001
    severity: blocker
    summary: "Required kanmer-gate is red because the fetched board does not resolve GUI-142."
    disposition: open
  - id: REV-GUI142-002
    severity: major
    summary: "PowerShell probe does not propagate the launcher's non-zero exit status."
    disposition: open
  - id: REV-GUI142-003
    severity: major
    summary: "FRD-012 R1e still mandates the replaced cmd.exe descriptor."
    disposition: open
  - id: REV-GUI142-004
    severity: minor
    summary: "Staleness detection treats non-Windows Codex registrations as legacy."
    disposition: open
  - id: REV-GUI142-005
    severity: minor
    summary: "The manual fallback command is not safely quoted and staleness only token-matches the descriptor."
    disposition: open
---

# Independent review

Reviewed PR #281 at `b1d31fd41de390ee58930b826f23b58bafb76bb7`, ticket GUI-142 at `2026-08-26T11:01:20.092Z`, and plan version `2c67e6b03988d751`.

## Evidence

- The bounded source change matches the ticket's local-Windows STDIO scope and contains a normal-argv Windows MCP handshake regression test. I independently ran the focused GUI tests (103 passed) and core staleness tests (42 passed).
- GitHub check `verify` is green. Required `kanmer-gate` is red: its job fetched a board that did not contain GUI-142 and failed with `NO_TICKET`; therefore the PR cannot pass or merge.
- All five active GitHub review threads were examined. Their dispositions are recorded below; none is resolved.

## Findings and dispositions

1. `REV-GUI142-001` — blocker, open. The required `kanmer-gate` check fails because its fetched board cannot resolve GUI-142. Fix the CI/board-fetch visibility fault and re-run the gate.
2. `REV-GUI142-002` — major, open. The PowerShell probe must explicitly return the child launcher's exit status; otherwise a failed launcher can be treated as healthy and Connect can mutate registration.
3. `REV-GUI142-003` — major, open. FRD-012 R1e still specifies the exact cmd.exe descriptor that this PR replaces. Update the governing FRD in this PR to approve the portable PowerShell contract, with aligned acceptance language.
4. `REV-GUI142-004` — minor, open. Scope Windows-specific descriptor staleness to Windows or recognize supported non-Windows registrations.
5. `REV-GUI142-005` — minor, open. Quote the copyable PowerShell payload so it is pasteable, and parse/compare the complete Kanmer TOML invocation rather than matching only substrings.

## Residual risk

The desired Windows descriptor is not safe to release while probe failures can be misclassified and the functional specification contradicts it. The PR also has a required red check.

## Decision

Needs changes. No merge performed; GUI-142 remains in Review. A fresh independent review is required after all findings are resolved, all threads are dispositioned, and every required check is green.
