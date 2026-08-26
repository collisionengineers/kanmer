---
kind: review-attestation
pr: "282"
head_sha: "257bb47a6fc9a895a23a5f1b89a723ed6632d71f"
verdict: needs-changes
reviewer: "mcp053-independent-review"
independent: true
plan_hash: "6ac5041eff20b092"
ticket_updated: "2026-08-26T12:42:41.355Z"
findings:
  - id: F-001
    severity: note
    summary: "Exact branch/worktree resumption is an explicit local workflow confirmation, not an authorization boundary between MCP clients."
    disposition: accepted-risk
    reason: "MCP client names and readable ticket locations are not credentials; exact values are a deliberate bounded confirmation rather than a security control."
  - id: F-002
    severity: major
    summary: "The advertised resumed path still attempts to create and take an already-recorded worktree and ticket, so it cannot complete."
    disposition: open
  - id: F-003
    severity: major
    summary: "AGENTS.md does not document the new occupied-ticket resume convention required for contributors and agents."
    disposition: open
---

# Independent review — MCP-053

## Scope and evidence

PR #282 at `257bb47a6fc9a895a23a5f1b89a723ed6632d71f` is narrowly scoped to the execution-packet API, real stdio smoke coverage, plugin bundle, and caller guidance. Independent commands passed: `npm run build:server`; `node packages/mcp-server/src/smoke.mjs` (226/226); and `npm run plugin:check`. `verify` is green for this SHA. The original phase-2 gate raced the board sync and review evidence; it is not a substitute for the open findings below.

## Required remediation

### F-002 — major, open

The new retry receives a ready packet but `kanmer-execute` then continues into the fresh-start flow: `git worktree add ... -b ...` fails because the exact worktree/branch already exists, and `take_ticket` rejects an existing `taken_at` without force. Split resumed execution from fresh execution: validate and reuse the recorded worktree/branch, and use a supported handoff/release path only if ownership must change. Add execution-level coverage that exercises the full resumed workflow rather than only packet retrieval.

### F-003 — major, open

This change establishes a public packet parameter and a new resume convention. Update AGENTS.md in the same PR so the canonical operating guide describes how an exact resumed packet is validated and reused, consistent with the repository rule requiring command/convention changes to update AGENTS.md.

## Residual risk

F-001 remains accepted risk. The exact pair is a local workflow confirmation, not identity authorization; that is documented and does not excuse the executable resume-path failure in F-002.

## Verdict

Needs changes. Do not merge. Re-review against the new PR head after both major findings are resolved and all required checks are green.
