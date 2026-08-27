---
kind: checklist
ticket: CORE-113
revision: controlled-post-delta-replan
---

# Final remediation checklist

- [x] Extend the typed evidence model and pure policy for authentic proof, required-only checks, exact merge-target reachability, workspace identity, and non-fabricated release evidence.
- [x] Harden MCP collection with fixed-argv PR selection, required-check querying, commit reachability, proof validation, precise filesystem classification, and source/branch/clean-worktree checks.
- [x] Make policy and apply share the legacy-claim predicate; record controller transition details in the reconciliation audit trail.
- [x] Preserve safe merged Review → Verifying recovery with a dirty-worktree warning, while preventing unsafe terminal claim release.
- [x] Correct reconciliation `openWorldHint` metadata and include reconciliation tests in the normal MCP test rail without changing the 39-tool roster.
- [x] Add focused core and MCP regression coverage for all thirteen current review-thread conditions and their fail-closed outcomes.
- [x] Regenerate required build artefacts; run focused tests, build/smoke/plugin checks, and `npm run verify` in `.worktrees/core-113`.
- [x] Record exact evidence in the post-implementation report, update the ticket commit list, and create and push the one final remediation commit `db63fb4b150e956dafb88c75c99ff3088a0b72cc` for PR #286.
- [x] Push the candidate and complete the one fresh bounded independent delta review; it returned needs-changes with terminal F-015, while exact-head CI remains non-passing.

- [ ] Await an operator decision on terminal F-015 / GH-3867261017; do not merge or make another CORE-113 remediation commit automatically.
