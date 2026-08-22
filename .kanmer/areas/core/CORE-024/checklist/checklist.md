# Checklist — CORE-024

## Core question read

- [x] Add one public read-only open-question count method on `KanmerStore`.
- [x] Locate through existing validated ticket resolution; call no initialization/mutation.
- [x] Delegate to the one `countCheckboxes(...,{stopAtParked:true})` implementation.
- [x] Return checked/total/open and document missing/legacy behavior.
- [x] Test absent, zero-box, checked, unchecked, parked, nested/multi-file, and no-write cases.

## Merge-gate evaluator

- [x] Add/export `merge-gate.ts` with extensible PR input/result/finding types.
- [x] Define phase-1 codes exactly `NO_TICKET` and `OPEN_QUESTIONS`, both error-level.
- [x] Compute `ok` from error findings and retain future warning support.
- [x] Parse whole-line CRLF/LF body footers bottom-up and normalize IDs uppercase.
- [x] Collapse identical repeated footers and reject distinct footer IDs as ambiguous.
- [x] Give explicit footer priority; invalid explicit footer must not fall back to branch.
- [x] Apply exact alphanumeric branch-prefix regex only when footer is absent.
- [x] Require resolved item to exist and be type ticket.
- [x] Count questions regardless of stage/profile and emit exact counts/details.
- [x] Keep evaluator free of stdout, exits, environment, GitHub, initialization, and writes.
- [x] Test all footer/branch/missing/non-ticket/ambiguity/casing/prefix cases.
- [x] Test open questions fail, parked/checked/absent pass, and warning-only `ok` semantics.
- [x] Snapshot/compare board bytes/activity around evaluator tests.

## CLI

- [x] Add import-safe `packages/mcp-server/src/check-pr.mjs`.
- [x] Parse only required `--board` and `--event` flags; reject unknown/missing/duplicate values.
- [x] Require valid `pull_request.number/head.sha/head.ref`; map null body to empty string.
- [x] Construct read-only store at the supplied board path; never create/init.
- [x] Emit exactly one compact evaluated verdict JSON line on stdout.
- [x] Escape GitHub workflow-command data and emit one error annotation per error finding on stderr.
- [x] Exit 0 for evaluated pass, 1 for evaluated gate failure, and 2 for infrastructure/could-not-run.
- [x] Keep infrastructure diagnostic distinct from normal gate result and omit unsafe stack/path data.
- [x] Prove board/event failures exit 2 and ordinary red gates exit 1.

## GitHub workflow

- [x] Rebase on CORE-032 and preserve workflow trigger, permissions, Bash default, and `verify` job.
- [x] Add exactly one independent Windows job ID/display name `kanmer-gate`.
- [x] Use checkout v4, setup-node v4 Node 20, `npm ci`, and `npm run build:core`.
- [x] Fetch `origin/kanmer-board` and add it at quoted `$RUNNER_TEMP/kanmer-board`.
- [x] Assert board temp path cannot alias `$GITHUB_WORKSPACE`.
- [x] Run CLI with quoted board path and `$GITHUB_EVENT_PATH`.
- [x] Do not add `needs`, draft skip, write permissions, cache, retry, matrix, artifact, push trigger, or fake stub.
- [x] Preserve exit status if any cleanup step is added.

## Real proof and scope

- [x] Update AGENTS.md only for the real local check/read-only-board/exit convention if applicable.
- [x] Observe `kanmer-gate` on a real PR before adding it to protection. (Hosted PASS: run 32554223189, job 96985770996.)
- [x] Record exact displayed check name, run ID, PR head, stdout JSON, annotations, and exits. (Exact hosted JSON, no annotation, exit 0 recorded in the report.)
- [x] Prove no-link `NO_TICKET` red.
- [x] Prove explicit footer resolves and has priority.
- [x] Prove branch-prefix fallback resolves without footer.
- [x] Prove unparked question `OPEN_QUESTIONS` red.
- [x] Prove parked-only questions pass.
- [x] Prove board fetch/path/event failure exits 2 and fails closed.
- [ ] Prove a compliant current-head PR is green. Hosted kanmer-gate passed, but sibling verify failed at check-mcpb-sync (run 32554223189/job 96985771083); overall hosted PR is not green.
- [ ] Follow CORE-033’s observed-once authorized procedure before requiring the check.
- [ ] Confirm direct `kanmer-board` pushes create no PR workflow run.
- [ ] Run focused core tests, typecheck, build, CLI fixtures, full `npm run verify`, and `git diff --check`.
- [x] Confirm no MCP tool/plugin/reference, GUI, dependency/lock, profile/gate, phase-2, auto-merge, or GitHub write behavior changed.
- [x] Write implementation report naming `kanmer-gate → check-pr.mjs → evaluateMergeGate/KanmerStore` as the production caller chain.
- [x] Open PR with `Kanmer: CORE-024` and stop at independent review; do not merge or begin CORE-025.

## Progress notes

Append test fixture IDs/counts, before/after board hashes, CLI JSON/exit examples, workflow/check/run/head evidence, protection staging, and every failed attempt.

### 2026-08-22 execution evidence

- Implemented the phase-1 read-only count, evaluator, source CLI, CLI integration test, and independent Windows `kanmer-gate` job on `core-024-check-pr`.
- Green: focused merge-gate tests 10/10; core suite 14 files / 278 tests; CLI integration 1/1; build:core; workflow YAML parse and diff-check.
- CLI local controls: compliant JSON verdict exit 0; open-question verdict exit 1 with one escaped `::error` annotation; invalid board/event and unknown argument exit 2 with sanitized diagnostics.
- Full workspace typecheck and mcp-server build pass with a temporary ticket-local @kanmer/core junction; the first shared-root failure is preserved above. Full verify reaches check-mcpb-sync then exits 1 because the distributed plugin artifact is stale, outside CORE-024. Hosted kanmer-gate PASS and hosted verify FAIL at the same parity check are recorded above; no overall hosted verify PASS is claimed.


### Rebase and fresh verification — 2026-08-22

- Rebased the CORE-024 branch by merging origin/main b6c8eb02 (GUI-106 recovery/main update) into the original implementation b041e944; merge commit is 9e7ab6299314cb3a7a9b0eb66ea70af630bf5b2c.
- The post-merge diff against origin/main remains exactly the eight CORE-024 files (484 added lines); no GUI-106/MCP-028 source is part of the ticket diff.
- Local PASS: focused merge-gate 10/10; CLI 1/1; core 279/279; all-workspace typecheck; build:core; build:server; GUI 39 files/362 tests; scripts 83/83; manual freshness; stdio 224/224; headless; protocol 46/46; discovery 13/13; skills; AGENTS block; diff-check; focused HTTP 5/5 and readiness 7/7.
- Preserved local failures: first npm run verify exited 1 in npm test at HTTP project-resolution spawnSync node.exe ETIMEDOUT; a broad npm run test:http -w @kanmer/mcp-server retry exited 1 with 61/63 (the same ETIMEDOUT plus readiness TUNNEL_READINESS_TIMEOUT), while both focused retries passed. With the temporary verifier-local mcpb package junction, npm run mcpb:check exited 1 at scripts/check-mcpb-sync.mjs:44 because the distributed plugin copy differs; npm run plugin:check exited 1 for the same committed-plugin parity drift.
- Hosted kanmer-gate PASS: run 32555645841 / Windows job 96989232191, PR #155 head 9e7ab6299314cb3a7a9b0eb66ea70af630bf5b2c, exit 0. Hosted verify FAIL: run 32555645841 / Windows job 96989232096, exit 1 at scripts/check-mcpb-sync.mjs:44 with MCPB server differs from distributed plugin copy; all preceding hosted suites/builds/package validation passed.
- The hosted gate JSON and full verify failure are external evidence for this head; no overall hosted verify PASS is claimed. No merge or cleanup is performed; independent Review remains required.
