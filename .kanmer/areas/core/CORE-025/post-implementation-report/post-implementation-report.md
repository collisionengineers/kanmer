# Post-implementation report — CORE-025

## Summary

Extended the existing phase-1 `kanmer-gate` evaluator and CLI with phase-2 stage, dependency, review-attestation, and commit-reachability checks. The core evaluator remains read-only and free of Git/GitHub subprocesses. The existing `kanmer-gate` workflow job remains the only job/check; it now fetches the exact PR head/base objects with full history before running the source CLI.

## Changes

| File | Change |
|---|---|
| `packages/core/src/merge-gate.ts` | Preserved phase-1 ticket/question resolution and fields; added typed phase-2 evidence, explicit `error`/`warning` levels, `pass`/`fail`/`warn`/`skipped` outcomes, stable complete checks, stage/dependency filtering, review evidence states, and reachability aggregation. |
| `packages/core/src/merge-gate.test.ts` | Added fixtures for every workflow stage, archived tickets, derived blocker direction/filtering, dangling/multiple blockers, absent/invalid/matching/stale/prefix review SHAs, `needs-changes`, duplicate/empty/reachable/unreachable/indeterminate commits, stable ordering, warning-only pass, and skipped linkage checks. |
| `packages/mcp-server/src/check-pr.mjs` | Reads `scratch/review` through the store, parses frontmatter with gray-matter, gathers semantic stages and derived `blockedBy`, passes typed evidence to core, emits warning/error annotations, preserves JSON stdout and exits 0/1/2. |
| `packages/mcp-server/src/git-reachability.mjs` | New bounded argv-array Git helper: repository setup is fail-closed; `merge-base --is-ancestor` maps exit 0/1/other to reachable/unreachable/indeterminate. |
| `packages/mcp-server/src/check-pr.test.mjs` | Added CLI warning/failure/infrastructure and argv-safety fixtures; included in the canonical `test:http` rail. |
| `packages/mcp-server/package.json`, `package-lock.json` | Declared gray-matter as the CLI's direct runtime dependency and included the boundary test in the existing server rail. |
| `.github/workflows/pr.yml` | Extended only `kanmer-gate`: full checkout plus exact event PR head/base fetch; verify job and job/check name remain unchanged. |
| `docs/functional/frd/FRD-009-interrogative-workflow.md`, `docs/architecture/adr/ADR-0011-gates-may-read-open-questions.md`, `docs/architecture/adr/ADR-0016-compiled-workflow.md` | Documented phase-2 checks, compatibility-period warning policy, and the separation between movement gates and the read-only GitHub merge predicate. |

Production caller chain: GitHub `kanmer-gate` job -> `packages/mcp-server/src/check-pr.mjs` -> `evaluateMergeGate` -> read-only `KanmerStore`; Git ancestry remains at the CLI boundary.

## Governing docs and scope

The implementation follows ADR-0016, ADR-0011, FRD-009, EPIC-009 approval context, and HZN-007 full-board workflow context. CORE-024 behavior is retained: `NO_TICKET`/`OPEN_QUESTIONS`, JSON stdout, escaped stderr annotations, read-only board loading, and exit 0/1/2. No MCP tool surface, stages, profiles, dependency semantics, GUI, plugin bundle, or CORE-024 source was changed.

## Verification

Final focused passes:

- `npm run test -w @kanmer/core -- src/merge-gate.test.ts`: 15/15.
- `node --test packages/mcp-server/src/check-pr.test.mjs`: 2/2.
- `npm run test:http -w @kanmer/mcp-server`: 65/65.
- `npm run typecheck`: all workspaces passed.
- `npm run typecheck -w @kanmer/core`, `npm run typecheck -w @kanmer/mcp-server`: passed.
- `npm run build:core`, `npm run build -w @kanmer/mcp-server`: passed.
- `git diff --check`: passed.

A full `npm run verify` attempt before the final helper/test additions passed its complete rail, including core 283 tests, GUI 362 tests, MCP 65 tests, scripts 83/83, all smokes/protocol/discovery, typechecks/builds, mcpb:check, plugin:check, skills and AGENTS checks. The final rerun was intentionally retained as FAIL rather than suppressed: the shared Windows workspace was heavily contended and Vitest timed out unrelated existing tests (`src/store.test.ts > blocks / order > orders...`, plus an unhandled dispatch-supervisor fixture ENOENT); no assertion failure was reported in the CORE-025 focused suite. The final full rerun exited 1 at `npm test`; rerun on the hosted PR is required. No live hosted result is claimed in this pre-merge report.

Local disposable CLI evidence: absent review warning exits 0 with `::warning [NO_REVIEW_RECORD]`; open questions/live blocker exits 1 with `::error`; malformed/wrong-kind review exits 0 with `::warning [STALE_REVIEW]`; unknown arguments exit 2 with `infrastructureError:true`; stdout is one JSON line and annotations are stderr-only. Direct board-push non-trigger observation remains unavailable/inconclusive.

## Handoff

Implementation is ready for independent review. The ticket remains pre-merge; no merge, protection change, hosted-result claim, or CORE-035 work was performed.

## Hosted verification

PR #159 at head d338349ea44397887f74ef714563f6bbc880ea79 completed hosted run 32558835415 with kanmer-gate PASS (job 96997133179, 53s) and verify PASS (job 96997133282, 2m28s). The hosted gate and authoritative verify are green for this exact head. PR remains open for independent review; no merge performed.


## Independent review correction — 2026-08-22

- Corrected focused core evaluator count: 14/14 PASS (the earlier 15/15 line was a stale count; no test assertion was weakened).
- Independent review PASS: no blocking source finding. Hosted kanmer-gate and verify remain PASS for run 32558835415. The unrelated Windows test:http contention failures and direct-board-push INCONCLUSIVE boundary remain preserved.

## Review remediation follow-up — PR #159 head 65e364ad927ef151ba0cea59b123d20feaf095b4

Five Codex review findings were addressed within CORE-025 scope:

- `3835496375` — fixed complete review-attestation validation in `check-pr.mjs`. The parser now requires the documented kind, non-empty PR/reviewer/plan/ticket fields, exact verdict enum, boolean independent flag, findings array, and finding severity/disposition requirements. Added parser regression coverage.
- `3835496376` — fixed abbreviated hexadecimal commit ids in `git-reachability.mjs`. Unique 4–40 character hexadecimal abbreviations are passed to Git; ambiguous/missing objects remain indeterminate.
- `3835496377` — fixed fail-closed dependency evidence. The CLI now consumes `listItemsWithWarnings` and refuses to evaluate a partial link graph when any board item file is malformed. Added malformed-board infrastructure-error coverage.
- `3835496378` — fixed legacy phase-1 finding runtime shape. `NO_TICKET` and legacy `OPEN_QUESTIONS` findings now carry `outcome: "fail"`; core regression expectations were updated.
- `3835496381` — fixed PR-range binding. The workflow event base SHA is parsed and passed through; each recorded commit must be an ancestor of PR head and not an ancestor of PR base, i.e. in `base..head`. Added base exclusion and abbreviated-id tests.

Documentation in ADR-0011, ADR-0016, and FRD-009 now states the complete attestation and `base..head` contract.

## Follow-up verification

- Commit: `65e364ad927ef151ba0cea59b123d20feaf095b4`
- Focused core merge-gate: 14/14 PASS.
- Focused CLI/helper: 5/5 PASS.
- `npm run typecheck -w @kanmer/core`: PASS.
- `npm run typecheck -w @kanmer/mcp-server`: PASS.
- `npm run build:core`: PASS.
- `npm run build -w @kanmer/mcp-server`: PASS.
- `git diff --check`: PASS.
- `npm run test:http -w @kanmer/mcp-server`: 66/67 PASS; retained exact unrelated Windows readiness failure: `src\\tunnels\\readiness.test.mjs:54`, `TUNNEL_READINESS_TIMEOUT`. No CORE-025 test failed.
- Prior hosted run for d338349e was PASS (run 32558835415); hosted rerun for 65e364ad is required and not yet claimed.
- PR #159 remains open; no merge performed.
