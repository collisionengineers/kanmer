---
kind: review-attestation
pr: "266"
head_sha: "4d815a73d573aca8f55f1c6957399fc6c32456b2"
verdict: needs-changes
reviewer: "codex-doc021-review"
independent: true
plan_hash: "14a3e94c0e563ecc"
ticket_updated: "2026-08-25T07:33:41.525Z"
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
    summary: "PR branch reverts GUI-139 persisted-profile safeguards and their regression coverage from current main"
    disposition: open
---
# Independent review — MCP-049 / PR #266

## Scope and evidence

Reviewed exact head `4d815a73d573aca8f55f1c6957399fc6c32456b2` against the full MCP-049 packet, HZN-007 context, FRD-025, current main, the post-implementation report, exact diff, GitHub reviews, and every current review thread. The reviewer is a distinct agent role from the author.

F-001 through F-004 are fixed in this head. The canonical managed AGENTS body, its installed-skill mirror, and generated AGENTS.md now define the native `runtimes connect/status/stop/remove` boundary and distinguish it from GUI `init/doctor/run`. The private wrapper example now exports both `KANMER_PROVIDER_CWD` and `KANMER_BOARD_BRANCH`. The report retains bounded, redacted operational evidence: a fresh native status query exited 0 and reported process-running, healthy, ready, and non-stale, without identifiers, credentials, paths, PIDs, URLs, or log tails. The changed manual/source mirror contains no credential or provider-specific operational value.

The previous two GitHub P1 threads remain unresolved at this review point but are covered by F-001 and F-002 as fixed; they may be resolved only after the author rebases/corrects the current PR and a fresh review confirms the new head. The exact-head kanmer-gate is green; hosted verify was still in progress at the review decision.

## Blocking finding

- **F-005 — major, open:** The branch has not been rebased onto current main. Its merge base is `700ae9c46904cd5417abe81dd3b256f6d33000d0`, while PR base `bb6e8f47d5aa2bffc5830d0c447fbfca15caa4d6` is the GUI-139 merge. Consequently the exact PR diff deletes GUI-139's persisted incomplete/default-profile recovery tests and restores the older `openaiTunnel.ts` implementation: it removes the safe leading-name normalization, strict default-profile recovery/diagnostic validation, and the `OPENAI_PROFILE_INCOMPLETE` checks before Initialize and Doctor. MCP-049's plan permits documentation/mirror changes and inspection of the existing GUI manager; it does not authorize rolling back GUI-139. Squash-merging this PR would regress the already merged GUI-139 remediation. Rebase the current branch onto `origin/main`, preserve GUI-139's source and tests unchanged, regenerate/confirm the manual mirror, and request a new exact-head review. Do not resolve this by weakening or deleting the GUI-139 assertions.

No merge is authorized. This review records no post-merge, release, or proof claim.
