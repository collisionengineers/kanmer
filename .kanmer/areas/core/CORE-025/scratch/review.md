## Independent review — CORE-025 PR #159

Reviewed PR #159 at head `d338349ea44397887f74ef714563f6bbc880ea79` against the full phase-2 plan, ADR-0011/ADR-0016, FRD-009, checklist, report, and workflow diff.

Scope is coherent: one pure `evaluateMergeGate` expansion, CLI-bound gray-matter/reachability evidence, one existing `kanmer-gate` job, argv-safe Git ancestry, and focused tests/docs. No unrelated CORE-024, GUI, MCP surface, stage/profile, or board-source changes.

Evidence:
- `npm run test -w @kanmer/core -- src/merge-gate.test.ts`: 14/14 PASS (the report's 15/15 count is stale).
- `node --test packages/mcp-server/src/check-pr.test.mjs`: 2/2 PASS sequentially.
- `npm run build:core`: PASS.
- `git diff --check`: PASS.
- Hosted `kanmer-gate` and authoritative `verify`: PASS, run 32558835415.
- A concurrent local `test:http` attempt exited 1 with 63/65 PASS; failures were unrelated Windows `http.test.mjs` spawnSync ETIMEDOUT and `readiness.test.mjs` TUNNEL_READINESS_TIMEOUT. Preserve as environment evidence; no CORE-025 focused assertion failed.
- Direct board-push non-trigger observation remains INCONCLUSIVE; workflow is statically pull_request-only. Checklist remains 96/97 with that item unchecked.

No blocking source finding. Verdict: PASS for independent review, with the exact local rail failures, stale 14-vs-15 report count, and direct-push INCONCLUSIVE boundary retained. No merge performed.


## Review correction

Independent review PASS. The report count is corrected to 14/14 focused core tests; unrelated local test:http contention and direct board-push INCONCLUSIVE evidence remain explicit.

## Additional hosted review findings — 2026-08-22

Five unresolved Codex threads appeared after the bounded independent review (PR #159): validate complete review attestations; resolve abbreviated commit SHAs; fail closed on malformed blocker files; populate legacy finding outcomes; and constrain recorded commits to the PR base..head ancestry range. CORE-025 remains unmerged pending disposition/fix.

## Review remediation dispositions — PR #159 follow-up — 2026-08-22

The five Codex review threads on the phase-two gate are addressed on commit `65e364ad927ef151ba0cea59b123d20feaf095b4` (PR #159 remains open; no merge):

- **3835496375 — fixed:** review-attestation parsing now requires the complete machine-checkable schema: PR, reviewer, plan hash, ticket update, full head SHA, verdict, independent flag, and validated finding records/dispositions.
- **3835496376 — fixed:** recorded commit ids accept unique hexadecimal abbreviations (minimum four characters) and defer uniqueness/object resolution to Git; malformed identifiers remain indeterminate.
- **3835496377 — fixed:** phase-two evidence now reads items with warnings and fails closed with an infrastructure error when any board item is malformed or otherwise produces a parse warning; link indexing occurs only after a clean read.
- **3835496378 — fixed:** legacy two-argument merge-gate paths now return explicit `outcome: "fail"` for NO_TICKET and OPEN_QUESTIONS findings; regression assertions cover both.
- **3835496381 — fixed:** recorded commits must be ancestors of the PR head and outside the PR base ancestry, proving membership in the base..head range; the check-pr event now requires and passes the full base SHA.

Evidence: focused core merge-gate tests 14/14 PASS; check-pr node tests 5/5 PASS; core and mcp-server typechecks PASS; mcp-server build PASS; diff-check PASS. The broader mcp-server HTTP rail was 66/67 PASS with the exact unrelated existing Windows failure: `packages/mcp-server/src/tunnels/readiness.test.mjs:54` `TUNNEL_READINESS_TIMEOUT`. The prior hosted baseline was PASS (run `32558835415`, jobs `96997133179` and `96997133282`); the pushed head requires a fresh hosted verify rerun.

Hosted rerun completed: PR #159 head `65e364ad927ef151ba0cea59b123d20feaf095b4`, run `32560013616`; `kanmer-gate` PASS job `97000062935` (54s), authoritative `verify` PASS job `97000062846` (2m26s). GitHub annotations preserved: Node.js 20 deprecation notice and existing non-failing `review attestation is invalid: kind must be "review-attestation"` annotation. PR remains open; no merge.
