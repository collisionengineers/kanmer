# Post-implementation report — CORE-024

## Outcome

Implemented the phase-1 check-pr merge gate on branch core-024-check-pr. The production chain is:

`kanmer-gate` (independent Windows PR job) → `packages/mcp-server/src/check-pr.mjs` → `evaluateMergeGate` → read-only `KanmerStore.getItem/getOpenQuestionCount` → the existing `countCheckboxes(..., { stopAtParked: true })` parser.

The evaluator never initializes a board, writes files, prints, exits, reads environment variables, calls GitHub, or mutates the activity log. The CLI reads the separately supplied board path and event JSON, emits one compact JSON verdict on stdout, emits escaped GitHub error annotations on stderr, and distinguishes exit 0 (pass), 1 (gate failure), and 2 (could not run).

## Changed files

- `packages/core/src/types.ts`: exported `OpenQuestionCount` shape.
- `packages/core/src/store.ts`: public read-only `getOpenQuestionCount`; null for missing/legacy/non-ticket layouts; delegates to the existing parked-aware checkbox parser.
- `packages/core/src/merge-gate.ts`: normalized footer/branch resolution, ambiguity and explicit-footer precedence, phase-1 finding codes, result types, and warning-safe `ok` calculation.
- `packages/core/src/merge-gate.test.ts`: deterministic evaluator/store/no-write coverage.
- `packages/core/src/index.ts`: core export.
- `packages/mcp-server/src/check-pr.mjs`: import-safe CLI around the built checkout-local core.
- `packages/mcp-server/src/check-pr.test.mjs`: CLI exit/verdict/annotation/sanitized-infrastructure integration fixture.
- `.github/workflows/pr.yml`: preserved `verify` and added exactly one independent Windows `kanmer-gate` job with quoted temporary board worktree and alias assertion.

No files or behavior in CORE-025/033/035, MCP tools/plugins, GUI, dependencies/lockfiles, profiles/gates, phase 2, protection, or GitHub writes were changed.

## Deterministic evidence

- `npx vitest run packages/core/src/merge-gate.test.ts`: exit 0, 10/10.
- `npm run test -w @kanmer/core`: exit 0, 14 files / 279 tests.
- `node --test packages/mcp-server/src/check-pr.test.mjs`: exit 0, 1/1.
- `npm run build:core`: exit 0.
- `npm run typecheck` with a ticket-local junction `node_modules/@kanmer/core` → this worktree's `packages/core`: exit 0 across core, mcp-server, ui, and gui. The junction was temporary and removed before handoff.
- `npm run build:server` with that same temporary local package resolution: exit 0, including standalone CJS bundle.
- `npm run verify` with corrected local package resolution reached the full rails: core 279 tests, GUI 39 files / 362 tests, MCP HTTP 61 tests, scripts 83 tests, typechecks, builds, protocol/headless smoke (224/224), then exited 1 at `check-mcpb-sync` because the generated MCPB server differs from the distributed plugin copy. Updating that plugin artifact is outside CORE-024 and explicitly out of scope.
- Before the local junction, the first full typecheck and server build exited 1 because the shared root workspace resolved a stale `node_modules/@kanmer/core`; the direct CLI was likewise first rejected for that stale export resolution. The CLI now uses `packages/core/dist/index.js` relative to the checkout, and the clean ticket-local check proved the source is green. The failed attempts remain preserved here rather than erased.
- CLI controls: compliant fixture exit 0 with one JSON line; open-question fixture exit 1 with one escaped `::error title=kanmer-gate::` annotation; unknown flag, missing board, and missing event each exit 2 with a sanitized infrastructure JSON/diagnostic and no path/stack leak.
- Workflow YAML parse and `git diff --check`: exit 0.

## Evidence boundaries

Local fixtures prove footer priority, CRLF/LF normalization, repeated-footer collapse, ambiguity and invalid-footer rejection, anchored branch fallback, missing/non-ticket behavior, open/checked/parked/absent/nested/multi-file questions, warning-only `ok` behavior, no-write board/activity snapshots, CLI JSON/annotations/exit status, and a separate-board path.

A hosted GitHub run is now recorded below. Direct board-push behavior, protection staging, CORE-033 authorized observation, real no-link PR, and live production open-question/parked PR remain INCONCLUSIVE; no such evidence is claimed.
### Hosted kanmer-gate evidence — 2026-08-22\n\n- GitHub Actions run **32554223189**, Windows job **kanmer-gate / 96985770996**, completed successfully at PR #155 head 'b041e944ececdf433925b9e4168e003a4623fbce'.\n- The job ran on Windows Server 2025 with Node 20.20.2, fetched board commit 'a02554cd' into a separate '$RUNNER_TEMP/kanmer-board' worktree, and passed the distinct-path assertion.\n- Its exact CLI stdout was one JSON line: '{"ok":true,"ticketId":"CORE-024","source":"footer","pr":{"number":155,"headSha":"b041e944ececdf433925b9e4168e003a4623fbce","branch":"core-024-check-pr","body":"## Summary ... Kanmer: CORE-024\\n"},"questions":{"checked":16,"total":16,"open":0},"findings":[]}'.\n- The hosted job exit was 0 with no error annotation. Sibling verify job 96985771083 completed with exit 1 at check-mcpb-sync (distributed plugin artifact mismatch); no overall hosted verify PASS is claimed.

## Review handoff

The PR footer will carry `Kanmer: CORE-024`. This lane stops at Review for independent review; it does not merge, start CORE-025, or clean the ticket worktree/branch.


### Hosted verify completion — 2026-08-22

- GitHub Actions run 32554223189, Windows verify job 96985771083, completed with exit 1 at PR #155 head b041e944ececdf433925b9e4168e003a4623fbce.
- The authoritative rail reached all suites, typechecks, builds, MCP smokes and MCPB packaging/manifest validation. It failed only at scripts/check-mcpb-sync.mjs:44 / npm run mcpb:check: MCPB server differs from distributed plugin copy.
- This is the same pre-existing distributed-plugin parity failure seen in the local full-verify attempt and is outside CORE-024's eight-file scope. It is preserved as a hosted FAIL; no overall hosted verify PASS is claimed.
