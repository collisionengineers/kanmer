---
kind: review-attestation
pr: "266"
head_sha: "45b7c649adf332bbb59d0e4aa92d6ba09889403f"
verdict: needs-changes
reviewer: "codex-doc021-review"
independent: true
plan_hash: "14a3e94c0e563ecc"
ticket_updated: "2026-08-25T07:43:21.770Z"
findings:
  - id: F-001
    severity: major
    summary: "Native runtime convention was absent from AGENTS.md"
    disposition: fixed
  - id: F-002
    severity: major
    summary: "Private wrapper did not preserve a configured board branch"
    disposition: fixed
  - id: F-003
    severity: major
    summary: "Manual conflated GUI controls with native runtime supervision"
    disposition: fixed
  - id: F-004
    severity: major
    summary: "Current native runtime JSON-status acceptance was not independently re-proven"
    disposition: fixed
  - id: F-005
    severity: major
    summary: "Previous branch reverts GUI-139 persisted-profile safeguards and regression coverage"
    disposition: fixed
  - id: F-006
    severity: major
    summary: "Committed packaged plugin runtime was stale after changing the canonical managed AGENTS body"
    disposition: fixed
  - id: F-007
    severity: major
    summary: "Generic wrapper hard-codes the default board branch without telling custom-branch operators to substitute their saved value"
    disposition: open
---
# Independent review — MCP-049 / PR #266

## Superseded pass

The earlier PASS is superseded by a final GitHub-thread gather. Exact head `45b7c649adf332bbb59d0e4aa92d6ba09889403f` remains correctly rebased, scoped to its six intended files, green in hosted verify (4m10s) and kanmer-gate (1m17s), and locally passes manual freshness, focused manual test, scripts, typecheck, build, plugin synchronization, and diff check. F-001 through F-006 remain fixed exactly as documented in the prior attestation. The two original review threads are resolved.

## Blocking finding

- **F-007 — major, open:** A newly opened unresolved GitHub P1 thread correctly identifies that the generic PowerShell wrapper exports `KANMER_BOARD_BRANCH = "kanmer-board"`, while the immediately following substitution instruction tells the operator to replace paths, profile, alias, environment-variable name, and tunnel id but omits the board branch. For a repository whose saved branch is custom, copying these directions forces the wrong expected branch and causes the documented `get_status` mismatch/stop behavior. Replace the hard-coded example with a clearly generic saved-branch placeholder or explicitly direct operators to substitute their repository's saved `KANMER_BOARD_BRANCH` value, regenerate the manual mirror, and request a fresh exact-head review. Keep the default available only as an explicit fallback, not as an undocumented forced value.

Do not merge while this major thread/finding is open. This record makes no post-merge, release, or proof claim.
