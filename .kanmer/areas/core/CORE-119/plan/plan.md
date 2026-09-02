# Plan — CORE-119: golden-board evaluations and stable→candidate promotion/rollback proof

## Objective

Ship one reproducible golden-board evaluation (`npm run golden`, hermetic, in `VERIFY_STEPS`) that executes every FRD-035 scenario class against disposable fixture boards and reports PASS/FAIL per scenario with a machine-readable transcript, plus one scripted promotion/rollback rehearsal contract (`npm run golden:promotion`) whose pure decision function is pinned by the recorded v0.4.0 transcript and which CORE-137 runs as its 0.4.1 promotion acceptance.

## Starting state

- Evidence: `research/research.md`@`79899b7cf7bb86b6`, `files/files.md`@`a5751b44e052eee7`. Audited source base: `main` @ `7e114cd1` (= released v0.4.0).
- `VERIFY_STEPS` (`scripts/verify.mjs:12-30`) has 13 entries; `scripts/release.mjs:45,308` imports and runs the same array; `.github/workflows/pr.yml:42` and `release.yml:75` run `npm run verify` on `windows-latest`. Nothing runs outside that rail.
- No golden harness exists. `packages/mcp-server/src/smoke.mjs` is 4132 lines with zero exports; `smoke-protocol.mjs:50` `startServer(sandbox)` is the reusable transport; `smoke-discovery.mjs:26` deletes `KANMER_ROOT` from the child env; `reconciliation.test.mjs:122` `directoryDigest(root)` is the inertness oracle; `packages/core/src/io.ts:687` `removeTreeWithRetry` is the Windows teardown.
- Refusals: only the eight `KanmerErrorCode` values (`packages/mcp-server/src/errors.ts:1-13`) appear in `structuredContent.error.code`; `WORKSPACE_OCCUPIED`, `REVIEW_RETURN_NEEDS_ATTESTATION`, `REMEDIATION_BUDGET_EXHAUSTED` and the `BATCH_*` family are message prefixes (`errors.ts:27-38`, `:47-60`).
- The first golden promotion instance already exists: CORE-136 `proof/proof.md`@`2b12c27d1cd31641`, `merged_sha` `7e114cd117ef720c20797e2bf9f5cf58643a94e6`, `result: PASS`, 16 typed attempts. It was driven by an un-versioned out-of-repo client, `C:\Users\Alex\Documents\KanmerBackups\tools\mcp-call.mjs`.
- **Ordering dependency:** CORE-133 (plan `f8170a38e306f706`) must be merged before Step 8. Its Step 2 makes `missing + unavailable` and `not-recorded + not-applicable` recoverable; GB-15 asserts that behaviour directly. HZN-008's 2026-09-02 order already places CORE-133 before CORE-119.
- **Soft dependency:** SKILL-039 adds `obsolete-after-change` to `DISPOSITIONS` in `packages/core/src/review-attestation.ts` and the FRD-034 Amendment. GB-18 test D asserts that value; if SKILL-039 has not merged, GB-18 D is recorded `unavailable` (never PASS) and the runner exits 1 in the rail. Implement Step 7 after SKILL-039's merge.

## Governing docs

- **FRD-035 — Meets.** AC1: the runner executes every class named in the Behaviour paragraph, enforced mechanically by a startup coverage self-check over an exported `FRD_035_CLASSES` list, and retains exact command/tool evidence and a terminal result per scenario in the transcript. AC2: the runner only ever binds `mkdtemp` roots, deletes `KANMER_ROOT` from the child env and refuses to start against any other root — a candidate can never become the live authority during golden work. AC3: `PROMOTION_STEPS` encodes backup → install → migration/reconciliation → the complete workflow acceptance sequence, and `evaluatePromotion` returns PASS only when every required step has a passing attempt. AC4: the contract requires a rollback step and a retained prior-stable installer; the negative fixtures prove a record with a failed cut-over and a completed rollback is a recorded FAIL that keeps its immutable attempts. AC5: the rail entry puts `golden` inside `pr.yml verify`, so a promotion record's required checks cover it. Edge cases: a scenario with no offline source is recorded `simulated` (with the injected evidence printed) or `unavailable`, never a provider pass; GB-12 asserts a superseded attempt stays readable and names its successor.
- **ADR-0021 — Meets.** "Candidate test harnesses must use explicit disposable/copied board locations" becomes GB-00, a hard refusal rather than a convention. The rehearsal drives a *copied* board and reports; installing, stopping stable and marking a candidate stable stay operator actions in CORE-137.
- **PRD-002 requirement 8 — Meets.** Golden boards plus the promotion procedure demonstrate the model with recorded command evidence.
- **FRD-028/029/030/031/032/033/034 — Meets, no modification.** Each contributes the exact refusal codes and acceptance wording the scenarios assert. No new tool, stage, field or workflow engine.
- **No modification and no new ADR.** `MASTERPLAN.md:43,346` lists "golden-board eval harness (quarry)" as a non-goal; MASTERPLAN is the superseded v0.3 plan and PRD-002 requirement 8 governs this horizon. Recorded as a residual doc inconsistency in `open-questions` → Parked, not edited.
- **HZN-008 scope discipline.** Every artefact here is required by a named FRD-035 acceptance criterion. Nothing else is added, and no reviewer finding becomes a new ticket unless it is a blocker/major or blocks a named FRD acceptance criterion.

## Required changes

1. One new harness module providing a disposable-board factory that **refuses any root that is not a fresh `mkdtemp` path**, a child env with `KANMER_ROOT` deleted and `KANMER_ENDPOINT_REGISTRY` pinned, a raw JSON-RPC `startServer`, a `call()` that reads `content[0].text` for successes and `structuredContent.error.code` for refusals, a whole-board digest oracle, a scenario recorder, and `removeTreeWithRetry` teardown.
2. Three fixture-board materializers — `fresh`, `seeded` (with a `legacy` variant lacking `project.json`), and `repo` (an offline `git init` with a feature branch, an added worktree, a deleted worktree directory and a `.worktrees/kanmer` board-worktree stand-in) — all under `kanmer-golden-*` temp roots, secrets-free, generated by `KanmerStore.init()` plus a handful of tool calls rather than copied from any real backup.
3. One runner exporting `SCENARIOS` and `FRD_035_CLASSES`, failing closed when a class has no scenario, enforcing `KANMER_GOLDEN_BUDGET_MS` (default 300 000), grouping scenarios by fixture so one server process serves many scenarios, writing a transcript with `--out`, emitting `::error title=kanmer/golden [ID]::` annotations, and exiting 0 (pass) / 1 (a scenario failed or a required capability was unavailable) / 2 (the run could not start).
4. Twenty scenarios, GB-00 … GB-19, each declaring its FRD-035 classes, sibling-FRD acceptance criteria, fixture and mode (`live` | `simulated` | `contract`).
5. One promotion rehearsal module exporting `PROMOTION_STEPS`, `RECORDED_TRANSCRIPTS` (the v0.4.0 attempts transcribed from CORE-136 `proof/proof.md`) and a **pure** `evaluatePromotion({steps, attempts})`, plus an `isMain` operator shell that runs the rehearsal against a copied board and an installed launcher and appends typed attempts. Every environment-specific value is a flag or env var with no repo-local default.
6. One `node:test` file covering the pure half against `RECORDED_TRANSCRIPTS["0.4.0"]` and three negative mutations.
7. Two `package.json` scripts, one `VERIFY_STEPS` entry, and four lines of `AGENTS.md`.

## Expected files

| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Add | `packages/mcp-server/src/golden-harness.mjs` | Transport, disposable-board guard, child env, `call()`, digest oracle, scenario recorder, teardown. Not generated; not bundled (`.mjs` under `src/` is invisible to `tsc` and to the esbuild standalone bundle, as `smoke.mjs` already is). |
| Add | `packages/mcp-server/src/golden-fixtures.mjs` | `fresh`, `seeded`, `legacy` and `repo` fixture materializers. Not generated. |
| Add | `packages/mcp-server/src/golden-board.mjs` | Runner entry point, `SCENARIOS`, `FRD_035_CLASSES`, coverage self-check, budget guard, transcript, exit codes. Not generated. |
| Add | `scripts/golden-promotion.mjs` | `PROMOTION_STEPS`, `RECORDED_TRANSCRIPTS`, pure `evaluatePromotion`, operator shell. Not generated. |
| Add | `scripts/golden-promotion.test.mjs` | `node:test` cover for the pure half; auto-discovered by `scripts/test-scripts.mjs`. Not generated. |
| Modify | `scripts/verify.mjs` | One appended `VERIFY_STEPS` entry plus its reason comment. |
| Modify | `package.json` | `golden` and `golden:promotion` scripts. No dependency change, so `package-lock.json` stays untouched. |
| Modify | `AGENTS.md` | Two §6 command rows and one §10 checklist line. Outside the `agents-block.mjs` managed block, so `verify:agents-block` is unaffected. |

## Do not modify

- `.worktrees/**`
- `.kanmer/**`
- `packages/core/src/**`
- `packages/mcp-server/src/index.ts`
- `packages/mcp-server/src/errors.ts`
- `packages/mcp-server/src/reconciliation.ts`
- `packages/mcp-server/src/release.ts`
- `packages/mcp-server/src/smoke.mjs`
- `packages/mcp-server/src/smoke-protocol.mjs`
- `packages/mcp-server/src/smoke-headless.mjs`
- `packages/mcp-server/src/smoke-discovery.mjs`
- `packages/mcp-server/src/check-pr.mjs`
- `scripts/release.mjs`
- `scripts/verify-release-assets.mjs`
- `scripts/test-scripts.mjs`
- `package-lock.json`
- `MASTERPLAN.md`
- `apps/**`
- `plugins/**`
- `docs/**`
- `mcpb/**`
- `.github/**`

## Constraints

- **Disposable boards only.** Every board root is a fresh `mkdtemp` under `os.tmpdir()` with the prefix `kanmer-golden-`. `KANMER_ROOT` is deleted from every child env. The runner refuses to start if `--root` is supplied at all. This is ADR-0021 enforced mechanically, not by convention.
- **No network.** No `fetch`, no `gh`, no `git fetch/push/clone`. `git init`/`add`/`commit`/`branch`/`worktree` only, always with `-c user.email=golden@example.invalid -c user.name=golden` inline so no global config is required, and always with `windowsHide: true`.
- **No production source change.** If a scenario cannot be expressed against the shipped surface, it is recorded `unavailable` and reported; the product is not widened to accommodate it.
- **Assert codes for codes, prefixes for messages.** `structuredContent.error.code` for the eight `KanmerErrorCode` values; a message-prefix match for `WORKSPACE_OCCUPIED:`, `REVIEW_RETURN_NEEDS_ATTESTATION:`, `REMEDIATION_BUDGET_EXHAUSTED:` and the `BATCH_*`/`RECOVERY_REFUSED:` families.
- **Read `content[0].text` for successes**, never `structuredContent`, so MCP-055 can land before or after this ticket without touching the harness.
- **Windows cost.** One server process per fixture board (the first locked write costs ~1 s per process for PowerShell identity resolution; the lock-retry ladder is 2145 ms; FS work slows 3–5× under a concurrent rail — `packages/core/vitest.config.ts:1-30`). Teardown uses `removeTreeWithRetry`, never raw `fs.rm`. Never `process.exit()` after any `fetch()`; set `process.exitCode` and let the loop drain.
- **Fail closed on budget.** `KANMER_GOLDEN_BUDGET_MS` (default 300 000) is checked between scenarios; exhaustion is exit 1 with the elapsed time and the remaining scenario ids, so the rail can never silently grow.
- **No new dependency.** `node:*` plus imports from `packages/core/dist/index.js` and `packages/mcp-server/dist/*.js` only.

## Ordered steps

### Step 1 — Harness module

- Preconditions: `npm run build` is green at the audited base; `research` and `files` are current.
- Files: `packages/mcp-server/src/golden-harness.mjs`
- Change: create the module with, at minimum — `disposableBoard(kind)` returning `{root, close()}` where `root` is `mkdtempSync(join(tmpdir(), "kanmer-golden-"))` and `close()` calls `removeTreeWithRetrySync`; `assertDisposable(root)` throwing unless `root` starts with the realpath of `os.tmpdir()` and contains `kanmer-golden-`; `childEnv({registry})` cloning `process.env`, **deleting `KANMER_ROOT`**, setting `KANMER_ENDPOINT_REGISTRY` when given, and honouring `KANMER_SERVER` and `KANMER_NODE`+`ELECTRON_RUN_AS_NODE=1`; `startServer({root, env})` copied from `smoke-protocol.mjs:50-119` returning `{send, notify, parseErrors, stderr, stop}` with a 20 000 ms per-request timeout; `initialize(server)`; `call(server, tool, args)` returning `{ok, code, message, text, payload, ms}` — `payload` from `JSON.parse(content[0].text)` on success, `code` from `structuredContent.error.code` on refusal; `digest(root)` (recursive sorted sha256, copied from `reconciliation.test.mjs:122`); `Recorder()` producing `{check(name, cond, detail), calls, results, counters}` where `counters` carries the FRD-035 measurement fields (`corrections`, `planDeviations`, `reviewCycles`, `stuckStages`, `recoveredLeases`, `wrongProjectAttempts`, `duplicateWork`, `toolCalls`, `elapsedMs`).
- Preserved behaviour: no existing file changes; the module has no top-level side effects and is safe to import.
- Forbidden: importing `smoke.mjs`; any `fetch`; any global git config write; a default board root anywhere other than `mkdtemp`.
- Negative cases: `assertDisposable` must throw for the repository root, for `.worktrees/kanmer`, and for a path only *containing* `tmpdir` as a substring; `call` on a refusal must not throw; `startServer` must reject with `timed out waiting for tools/call` rather than hanging.
- Tests: exercised by `packages/mcp-server/src/golden-board.mjs` GB-00 in Step 3.
- Commands: `node -e "import('./packages/mcp-server/src/golden-harness.mjs').then(m=>console.log(Object.keys(m)))"`
- Expected output: the exported names print; the process exits 0 with no board created.
- Done when: the module imports cleanly with no side effects and `assertDisposable` refuses all three negative paths.
- Deviation stop: if any idiom cannot be copied without editing an existing smoke, stop and report — extraction is out of scope.

### Step 2 — Fixture boards

- Preconditions: Step 1 done.
- Files: `packages/mcp-server/src/golden-fixtures.mjs`
- Change: export `freshFixture()` (a `mkdtemp` root plus `.kanmer/version.json` = `{"format":3}`, the `verify.mjs:45-47` skeleton); `seededFixture({legacy})` (`new KanmerStore(root)` + `await store.init()`, then a small census — two areas, one group, six tickets covering `backlog`/`preparing`/`implementing`/`review`/`verifying`/`done`, one capture, one `feature`-profile ticket with `research`/`files`/`plan`/`checklist` written and one structured `### Step 1 — …` plan — and, when `legacy` is true, `project.json` deleted afterwards, the `smoke.mjs:725-775` idiom); `repoFixture()` (`seededFixture()` plus offline `git init`, one commit on `main`, a `feature/golden` branch, one `git worktree add` that is kept, one `git worktree add` whose directory is then deleted on disk, and a `.worktrees/kanmer` directory registered as a worktree to stand in for the board worktree). Every fixture returns `{root, close(), meta}` with `meta` naming the ids the scenarios use, so no scenario hard-codes a ticket id it did not create.
- Preserved behaviour: no fixture copies any real board, backup or credential; total on-disk size stays under a few hundred kilobytes.
- Forbidden: `fs.cpSync` from `.worktrees/kanmer` or from any path outside `os.tmpdir()`; reading `KanmerBackups`; any global `git config`; any network git operation.
- Negative cases: `repoFixture()` must record `git: "unavailable"` rather than throwing if `git --version` fails, so Step 8 can report `unavailable` instead of crashing.
- Tests: exercised by GB-01/GB-02 (Step 4) and GB-14/GB-15 (Step 8).
- Commands: `node -e "import('./packages/mcp-server/src/golden-fixtures.mjs').then(async m=>{const f=await m.seededFixture({});console.log(f.root,f.meta);await f.close();})"`
- Expected output: a `kanmer-golden-*` path and the census meta print; the directory is gone afterwards.
- Done when: all four fixture shapes materialize and tear down cleanly on Windows, and `repoFixture()` reports `git` availability rather than throwing.
- Deviation stop: if the git fixture needs a network call or a global config write, stop and report.

### Step 3 — Runner skeleton, roster, coverage self-check, budget guard, transcript

- Preconditions: Steps 1–2 done.
- Files: `packages/mcp-server/src/golden-board.mjs`
- Change: export `FRD_035_CLASSES` (the twelve class ids transcribed from the FRD-035 Behaviour paragraph) and `SCENARIOS` (initially GB-00 only), plus `coverageGaps(scenarios, classes)`. Add the `isMain` shell: parse `--out <path>` and `--only <id,…>` strictly (reject unknown or duplicate flags, and reject `--root` outright); refuse to run when `coverageGaps` is non-empty; group scenarios by `fixture` so one `startServer` serves every scenario on that fixture; check the elapsed clock against `KANMER_GOLDEN_BUDGET_MS` (default 300 000) between scenarios and abort with the remaining ids; write the transcript JSON (`{version, startedAt, finishedAt, serverInfo, budgetMs, elapsedMs, counters, scenarios:[{id,title,classes,frd,ac,fixture,mode,result,calls:[{tool,code,ms}],checks:[{name,pass,detail}]}]}`) to `--out` or `dist/golden/golden-<stamp>.json`; print one `PASS`/`FAIL`/`SIMULATED`/`UNAVAILABLE` line per scenario, a `n/m scenarios passed` summary and `::error title=kanmer/golden [ID]::detail` per failure; set `process.exitCode` to 0, 1 (a scenario failed **or** a required capability was `unavailable`), or 2 (the run could not start). Implement GB-00: assert `assertDisposable` refuses the repository root, `.worktrees/kanmer` and a tmpdir-substring path; assert the child env has no `KANMER_ROOT`; assert `get_status.projectRoot` equals the fixture root and `rootSource` is `flag`.
- Preserved behaviour: importing the module exposes `SCENARIOS` without running anything (the `verify.mjs:39` / `verify-release-assets.mjs:610` guard).
- Forbidden: `process.exit()`; a `--root` flag; running a scenario whose class list contains an id absent from `FRD_035_CLASSES`; a partial run reporting exit 0.
- Negative cases: an unknown flag ⇒ exit 2 with usage; a coverage gap ⇒ exit 2 naming the uncovered class; a deliberately failing scenario ⇒ exit 1 with the annotation.
- Tests: the runner is its own test; verified by the commands below.
- Commands: `npm run build` then `node packages/mcp-server/src/golden-board.mjs --out %TEMP%\golden.json` and `node packages/mcp-server/src/golden-board.mjs --bogus`
- Expected output: the first prints `1/1 scenarios passed` and exits 0 with a transcript at the given path; the second prints usage and exits 2.
- Done when: GB-00 passes, coverage gaps for the eleven not-yet-covered classes are reported as a startup refusal (exit 2), and the transcript validates as JSON.
- Deviation stop: if the coverage self-check cannot be made to fail closed, stop and report — a runner that silently skips a class cannot satisfy AC1.

### Step 4 — Identity, revision and multi-project scenarios

- Preconditions: Step 3 done.
- Files: `packages/mcp-server/src/golden-board.mjs`
- Change: add GB-01 … GB-05 to `SCENARIOS`, class `multi-project-isolation` (GB-05 also `competing-controllers`).
  - **GB-01** (`fresh`, FRD-029 AC1/AC2): first write allocates `.kanmer/project.json` exactly once; `get_status` reports `project.project_id`, `project.board_id`, `project.fingerprint` and `format: 3`; a second write leaves `project.json` byte-identical.
  - **GB-02** (`legacy`, FRD-029 AC1): a board with no `project.json` is read without error and reports an unassigned identity; the first write allocates `project.json`; every pre-existing ticket file's bytes are unchanged afterwards (per-file sha256 before/after).
  - **GB-03** (`seeded`, FRD-029 AC2): `expected_project` set to a wrong id is refused with `structuredContent.error.code === "WRONG_PROJECT"`, and `digest(root)` is unchanged across the attempt — the refusal precedes any mutation (`index.ts:307-315`).
  - **GB-04** (`seeded`, FRD-029 AC3): a write carrying a stale `revision` is refused with `REVISION_CONFLICT` and the current item is unchanged; a write carrying the current revision succeeds and returns a new one.
  - **GB-05** (`seeded` + `fresh` as a second project, FRD-029 AC4/AC5): with `KANMER_ENDPOINT_REGISTRY` fixed at spawn time and both projects registered, `list_projects` observes both through their own endpoints; a mutation naming the other project's `expected_project` is refused structurally; observing the other endpoint never rebinds this process (`get_status.projectRoot` unchanged, the other root's `.kanmer` untouched); no request supplies a path.
- Preserved behaviour: earlier scenarios keep passing; the fixture is not mutated across scenario boundaries in a way a later scenario depends on implicitly — each scenario creates what it needs.
- Forbidden: reusing a ticket id another scenario created; asserting a code outside the eight-value union.
- Negative cases: each of GB-03, GB-04, GB-05 must fail if the refusal is absent **or** if the board changed.
- Tests: `packages/mcp-server/src/golden-board.mjs` itself.
- Commands: `node packages/mcp-server/src/golden-board.mjs --only GB-00,GB-01,GB-02,GB-03,GB-04,GB-05`
- Expected output: `6/6 scenarios passed`, exit 0.
- Done when: the `multi-project-isolation` class is covered and all six pass.
- Deviation stop: if `WRONG_PROJECT` is observed *after* a mutation, stop and report — that is a product blocker, not a test bug.

### Step 5 — Lease, workspace and batch scenarios

- Preconditions: Step 4 done.
- Files: `packages/mcp-server/src/golden-board.mjs`
- Change: add GB-06 … GB-09, classes `expired-lease-recovery-with-dirty-work`, `competing-controllers`, `batch-execution`.
  - **GB-06** (`repo`, FRD-030 AC2): `take_ticket` acquires a lease with a `lease_id`, revision and expiry; `renew` naming both advances the revision; a renew naming a stale revision is refused with `REVISION_CONFLICT` (`store.ts:3892-3895`); a renew naming a superseded `lease_id` is refused with `LEASE_EXPIRED` (`:3880-3884`); `release` clears it.
  - **GB-07** (`repo`, FRD-030 AC1): a second controller taking the same worktree or branch is refused with a `WORKSPACE_OCCUPIED:` message prefix and a `LEASE_CONFLICT` code (`store.ts:2347`, `errors.ts:38`); a renew by a non-owner is refused; `force` is never used.
  - **GB-08** (`repo`, FRD-030 AC3 + FRD-028 AC4): a lease whose expiry has passed and whose worktree holds an uncommitted change is reported with `DIRTY_WORKSPACE_PRESERVED`; the dirty file still exists and its bytes are unchanged after the recovery path; `recoveredLeases` increments.
  - **GB-09** (`repo`, FRD-030 AC4/AC5): three related tickets declare one frozen batch and share one worktree and branch; a fourth unrelated ticket attempting to join is refused with a `BATCH_*` prefix and `LEASE_CONFLICT`; releasing the workspace is refused until every member is terminal.
- Preserved behaviour: no workspace directory is deleted by any scenario; the dirty file is asserted present at the end.
- Forbidden: `force` on any take/release; deleting a worktree to make an assertion pass.
- Negative cases: GB-07 must fail if the second take succeeds; GB-08 must fail if the dirty file is missing or altered; GB-09 must fail if the unrelated ticket joins.
- Tests: the runner itself.
- Commands: `node packages/mcp-server/src/golden-board.mjs --only GB-06,GB-07,GB-08,GB-09`
- Expected output: `4/4 scenarios passed`, exit 0.
- Done when: the three lease/batch classes are covered.
- Deviation stop: if any scenario needs `force`, or if dirty work is lost, stop and report — that is a blocker against FRD-030 AC3.

### Step 6 — Capture, delivery and release-channel scenarios

- Preconditions: Step 5 done.
- Files: `packages/mcp-server/src/golden-board.mjs`
- Change: add GB-10 … GB-12, classes `capture-exclusion-and-promotion`, `main-only-and-candidate-delivery`, `superseded-release-attempts`, `weak-controller-clears-prepared-work`.
  - **GB-10** (`seeded`, FRD-032 AC1–AC4 + FRD-034 AC1): a capture is created with only its observation and owes no document; it is searchable; it is absent from the roster/readiness selection while a prepared ticket created **before** it is present, and a capture created *after* the roster was read still does not appear in it; promotion records its disposition and only from that decision does the selected profile's gate set apply.
  - **GB-11** (`repo`, FRD-031 AC1–AC3): a main-only delivery policy resolves base branch, PR target and verification target to `main`; a dev→frozen-candidate→main policy resolves the target to `dev`, mints an immutable candidate identity (`candidateIdentity`, `candidateRefFor`) and records final release separately from workflow stage; changing the integration SHA yields a different candidate identity and does not mutate the frozen one (`RELEASE_FROZEN_FIELDS`).
  - **GB-12** (`seeded`, FRD-031 AC4 + FRD-035 edge case 2): `release_channel acquire` mints `main@1` with a candidate identity; a second concurrent owner is refused with `RELEASE_CHANNEL_HELD`; `complete` clears the lease and the immutable attempt remains readable; a superseded attempt remains readable and names its successor; an expired-but-unreleased channel still refuses a second acquire (`store.ts:4158`).
- Preserved behaviour: no release attempt record is deleted or edited in place.
- Forbidden: asserting a `RELEASE_ACTIONS` value outside the six in `packages/mcp-server/src/release.ts:31`; inventing a `RELEASE_INPUT_INVALID:` shape not produced by `validateReleaseChannelRequest`.
- Negative cases: GB-12 must fail if a second acquire succeeds, or if a superseded attempt becomes unreadable or forgets its successor.
- Tests: the runner itself.
- Commands: `node packages/mcp-server/src/golden-board.mjs --only GB-10,GB-11,GB-12`
- Expected output: `3/3 scenarios passed`, exit 0.
- Done when: the capture, delivery and superseded-release classes are covered.
- Deviation stop: if an expired channel lease frees the channel, stop and report against `store.ts:4158`.

### Step 7 — Review-budget, step-packet and anti-churn scenarios

- Preconditions: Step 6 done. **SKILL-039 merged** (GB-18 test D asserts `obsolete-after-change` in `DISPOSITIONS`); if it is not, GB-18 D records `unavailable` and the run exits 1.
- Files: `packages/mcp-server/src/golden-board.mjs`
- Change: add GB-13, GB-17, GB-18, classes `independent-exact-head-review`, `remediation-delta-review-and-replan`, `weak-controller-clears-prepared-work`.
  - **GB-13** (`repo`, FRD-034 AC2/AC3/AC5): a `review → implementing` move with no attestation is refused with a `REVIEW_RETURN_NEEDS_ATTESTATION:` prefix, once for each of the four reasons at `store.ts:2050-2059`; a `needs-changes` attestation bound to the exact PR head authorises it and `review_round` becomes 1 while branch, worktree and PR are unchanged; a `reason` beginning `operator:` authorises it without an attestation; exhausting the budget is refused with `REMEDIATION_BUDGET_EXHAUSTED:`; `reviewCycles` counts the rounds.
  - **GB-17** (`seeded`, FRD-033 AC1/AC3/AC4): `get_execution_packet` on the fixture's structured `### Step 1 — …` plan returns a `step-packet/2` limited to that step's files with its tests, commands and stop condition; a plan with an unresolved vague phrase produces the advisory validation findings; a changed path outside the declared set is reported as `STEP_PATH_FORBIDDEN` or `STEP_PATH_UNDECLARED`; a stale ticket-document version is reported as `STEP_TICKET_DOCUMENTS_STALE`.
  - **GB-18** (`seeded`, FRD-034 AC5, amendment tests A/B/C/D and the mechanical half of F): **A** — three reads of an unchanged head leave `review_round` unchanged; **B** — a merge-gate evaluation with green required checks and only dispositioned minor/note findings passes; **C** — an open blocker at the current head blocks; **D** — a thread dispositioned `obsolete-after-change` does not block; **F(mechanical)** — with the budget exhausted the store refuses the move with `REMEDIATION_BUDGET_EXHAUSTED:` and an `operator:` reason authorises it, so no numeric-counter extension is required. Each check names its amendment letter and cites `FRD-034 § Amendment — review budget and root-cause classes` (falling back to HZN-008 `context.md` § "Review budget and root-cause rule" if that section is absent). No FRD prose is copied.
- Preserved behaviour: no change to `backwardMoveEffects` behaviour or to any attestation schema.
- Forbidden: copying the FRD-034 Amendment text into this repository; asserting amendment tests E or G (agent judgement, parked); editing `review-attestation.ts`.
- Negative cases: GB-13 must fail if an unattested backward move succeeds; GB-18 C must fail if an open blocker does not block; GB-18 D must record `unavailable` — not PASS — when `obsolete-after-change` is absent.
- Tests: the runner itself.
- Commands: `node packages/mcp-server/src/golden-board.mjs --only GB-13,GB-17,GB-18`
- Expected output: `3/3 scenarios passed`, exit 0.
- Done when: the two review classes are covered and GB-18 reports A, B, C, D and F(mechanical) individually.
- Deviation stop: if `obsolete-after-change` is absent, record `unavailable`, report, and stop rather than asserting the pre-amendment behaviour as correct.

### Step 8 — Reconciliation scenarios, product tier and simulated tier

- Preconditions: Step 7 done. **CORE-133 merged**; rebase onto its exact merge commit and re-read `packages/core/src/reconciliation.ts` and `packages/mcp-server/src/reconciliation.ts` before writing assertions.
- Files: `packages/mcp-server/src/golden-board.mjs`
- Change: add GB-14, GB-15, GB-16, class `reconciliation-of-invalid-stages` (GB-15 also `expired-lease-recovery-with-dirty-work`).
  - **GB-14** (`repo`, mode `live`, FRD-028 AC1): `reconcile_ticket` dry-run on a stale Review ticket and on a stale Verifying ticket returns current evidence and findings and **writes nothing** — `digest(root)` identical before and after, including `activity.jsonl`; with no GitHub context the result is `EVIDENCE_INCONCLUSIVE` and no recommendation is invented; `BOARD_WORKTREE_PROTECTED` is returned for the ticket whose recorded workspace is the `.worktrees/kanmer` stand-in, and every recommendation observed is a member of the six-value `ReconciliationAction` union.
  - **GB-15** (`repo`, mode `live`, FRD-028 AC2/AC4/AC5 + FRD-030 AC3): a ticket whose recorded worktree directory has been deleted yields `WORKSPACE_MISSING` and recommends `RECOVER_EXPIRED_CLAIM`; a ticket with an expired claim and no recorded workspace yields `CLAIM_WITHOUT_RECORDED_WORKSPACE` and the same recommendation; `apply_reconciliation` on the current revision transfers controller/lease ownership while branch, worktree and taken-time evidence and any surviving work are preserved and nothing is deleted; applying against a stale revision is refused with `REVISION_CONFLICT`; a foreign-repository and a branch-mismatch case remain refused with `RECOVERY_REFUSED:`.
  - **GB-16** (`seeded`, mode `simulated`, FRD-028 AC3): using an injected `ReconciliationRun` and `CommonDirResolver` (the `reconciliation.test.mjs:47,88-111` shape), drive the provider-derived routes that have no offline source — a merged PR on a Review ticket (`MERGED_REVIEW` ⇒ `MOVE_TO_VERIFYING`), a PASS proof left in Verifying (`PASS_PROOF_STILL_VERIFYING` ⇒ `MOVE_TO_DONE`), a proof bound to the wrong SHA (`PROOF_MERGE_SHA_MISMATCH`, no recommendation), and implementation/plan verification failures (`VERIFICATION_FAILED_IMPLEMENTATION|PLAN` ⇒ `ROUTE_VERIFICATION_FAILURE`). Every check records `mode: "simulated"` and prints the injected evidence in the transcript; none is reported as a provider pass.
- Preserved behaviour: no scenario deletes a workspace, and GB-14's inertness assertion is a whole-board digest, not a spot check.
- Forbidden: any `gh` invocation; any network git operation; asserting a finding code absent from `packages/core/src/reconciliation.ts`; recording a simulated result as `live`.
- Negative cases: GB-14 must fail if the digest changes; GB-15 must fail if a workspace is deleted or if branch/worktree/taken evidence changes; GB-16 must fail if a simulated check is recorded as `live`.
- Tests: the runner itself; the existing unit cover in `packages/core/src/reconciliation.test.ts` and `packages/mcp-server/src/reconciliation.test.mjs` is cited, not duplicated.
- Commands: `node packages/mcp-server/src/golden-board.mjs --only GB-14,GB-15,GB-16`
- Expected output: `3/3 scenarios passed`, exit 0; GB-16's lines carry `SIMULATED`.
- Done when: the reconciliation class is covered in both tiers, and `coverageGaps` is empty for the first time.
- Deviation stop: if the missing-worktree case does not recommend `RECOVER_EXPIRED_CLAIM`, stop and report — CORE-133 is not actually merged into this branch.

### Step 9 — Promotion/rollback rehearsal contract and the v0.4.0 golden transcript

- Preconditions: Step 8 done; `coverageGaps` empty except `stable-controlled-candidate-promotion-rollback`.
- Files: `scripts/golden-promotion.mjs`, `scripts/golden-promotion.test.mjs`, `packages/mcp-server/src/golden-board.mjs`
- Change:
  - In `scripts/golden-promotion.mjs`, export `PROMOTION_STEPS` — the ordered contract recovered from CORE-136 `plan/plan.md` step 9 and `proof/proof.md`, each entry `{id, title, required, evidence}`: `backup` (live board archive path + sha256 + board commit + a retained prior-stable installer), `release-verify` (`verify-release-assets --remote-coherent`, `check-updater-package`, the tag `release-verify` run), `packaged-boot` (`KANMER_SMOKE` boot against a copied board), `copied-board-smoke` (`KANMER_ROOT=<copy> npm run smoke:headless`), `install-candidate` (installer over the prior stable; a refusal while the GUI runs is expected evidence, not a failure), `migrate-reconcile` (identity/format/`project.json` observed on the copy), `workflow-acceptance` (the copied-board tool sequence: `get_status`, `list_projects`, `create_item`, lease acquire/renew/stale-renew/release, unattested `review→implementing` refused, `operator:` reason authorising it, `reconcile_ticket` dry-run writing nothing, `release_channel` acquire+complete), `rollback` (reinstall the prior stable, prove the live board unchanged, reinstall the candidate), `cut-over` (live `get_status.server.version` is the candidate with the same fingerprint), `post-cut-over` (`verify:agents-block`). Export `RECORDED_TRANSCRIPTS` with `"0.4.0"` = the 16 typed attempts transcribed from CORE-136 `proof/proof.md`, with a comment citing proof version `2b12c27d1cd31641`. Export **pure** `evaluatePromotion({steps, attempts})` → `{result: "PASS"|"FAIL"|"INCOMPLETE", problems:[{step, severity, detail, fix}]}` — no fs, no network, no `process.exit`: PASS when every `required` step has at least one terminal PASS attempt and the `rollback` step passed; FAIL when a required step's terminal attempt failed; INCOMPLETE when a required step has no attempt at all. Retained non-terminal FAIL attempts (the two prepare refusals, the installer's exit-2 refusal with the GUI running) never turn a record FAIL. Add the `isMain` operator shell: strict flags `--candidate <version> --stable <version> --board-backup <zip> --board-copy <dir> --stable-installer <exe> --candidate-installer <exe> --launcher <cmd> --out <path> [--dry-run]`, appending typed attempts, driving the copied-board sequence through the harness's `call()`, writing the transcript and setting `process.exitCode` to 0/1/2. No repo-local default for any environment path; `--dry-run` records every step as `skipped` and still evaluates the contract shape.
  - In `scripts/golden-promotion.test.mjs`, assert: `evaluatePromotion` returns PASS on `RECORDED_TRANSCRIPTS["0.4.0"]`; removing the `backup` attempt returns INCOMPLETE; marking the `rollback` attempt FAIL returns FAIL; the two retained prepare FAILs and the installer exit-2 refusal do not change the PASS; every `PROMOTION_STEPS` id is referenced by at least one attempt in the recorded transcript (so the contract cannot drift from its own fixture); `evaluatePromotion` performs no I/O (call it with a frozen input and assert no throw and no file created).
  - In `golden-board.mjs`, add **GB-19** (mode `contract`, class `stable-controlled-candidate-promotion-rollback`, FRD-035 AC3/AC4): import `PROMOTION_STEPS`, `RECORDED_TRANSCRIPTS` and `evaluatePromotion`, assert PASS on the recorded v0.4.0 transcript, assert the contract names a backup step and a rollback step as `required`, and record the transcript's step ids in the golden transcript so AC1's "exact command evidence" is retained in one place.
- Preserved behaviour: `evaluatePromotion` stays pure; nothing in the operator shell mutates Git, GitHub or the live board.
- Forbidden: copying the CORE-136 proof narrative into `/docs/`; hard-coding any operator machine path as a default; any Git or GitHub mutation; automating the live cut-over decision.
- Negative cases: the three mutations above must change the verdict as stated; a missing `--candidate` must exit 2 with usage.
- Tests: `scripts/golden-promotion.test.mjs`, auto-discovered by `scripts/test-scripts.mjs`.
- Commands: `npm run test:scripts` and `node scripts/golden-promotion.mjs --dry-run --candidate 0.4.1 --stable 0.4.0 --out %TEMP%\promo.json`
- Expected output: the script tests pass including the new file; the dry run prints every step as `skipped`, evaluates the contract shape and exits 0.
- Done when: `coverageGaps` is empty, GB-19 passes, and the v0.4.0 transcript is recorded as the first passing instance.
- Deviation stop: if the recorded transcript cannot be made to evaluate PASS without weakening `evaluatePromotion`, stop and report — the contract must describe what actually happened, not the reverse.

### Step 10 — Wire the rails and documentation, verify, hand off

- Preconditions: Steps 1–9 done; `node packages/mcp-server/src/golden-board.mjs` exits 0 with all twenty scenarios passing.
- Files: `package.json`, `scripts/verify.mjs`, `AGENTS.md`
- Change: add `"golden": "node packages/mcp-server/src/golden-board.mjs"` and `"golden:promotion": "node scripts/golden-promotion.mjs"` to `package.json` scripts; append `"npm run golden"` to `VERIFY_STEPS` after `"npm run smoke:discovery"` with a one-line comment naming FRD-035 AC1/AC5 and `AGENTS.md:502`; add two §6 command rows and one §10 checklist line to `AGENTS.md` (run `npm run golden` when lease, reconciliation, review-budget, release-channel or delivery contracts change). Record the measured `elapsedMs` from a clean rail run in the post-implementation report.
- Preserved behaviour: `package-lock.json` unchanged; `plugins/kanmer/mcp/kanmer-mcp.cjs` bytes unchanged; the 41-tool count unchanged; `verify:agents-block` unaffected because §6/§10 sit outside the managed block.
- Forbidden: a new workflow file; editing `.github/**`; editing `scripts/release.mjs`; adding a dependency.
- Negative cases: `npm run plugin:check` must still be exit 0 with no bundle diff; `git diff --check` must be clean.
- Tests: the full rail.
- Commands: `npm run verify`; `npm run build && npm run plugin:build && npm run plugin:check`; `KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs node packages/mcp-server/src/smoke.mjs`; `KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs npm run smoke:protocol`; `KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs npm run golden`; `git diff --check`
- Expected output: `npm run verify` exits 0 with `npm run golden` printing `20/20 scenarios passed`; `plugin:check` exits 0; both smokes and `golden` pass against the committed bundle; `git diff --check` silent.
- Done when: the rail is green from a normal checkout (not a linked worktree), the transcript from the rail run is retained in the post-implementation report, and one bounded PR with the footer `Kanmer: CORE-119` is open.
- Deviation stop: if `npm run golden` exceeds `KANMER_GOLDEN_BUDGET_MS` on a clean Windows run, apply exactly one mechanism fix — reduce server spawns by regrouping scenarios onto fewer fixtures — and re-measure. Do not raise the budget to make a slow run green, and do not remove a scenario.

## Acceptance checks

Per FRD-035 acceptance criterion:

- **AC1 — every scenario class executes, with exact evidence and a terminal result.** `coverageGaps(SCENARIOS, FRD_035_CLASSES)` is empty and a gap is a startup refusal (exit 2), so a missing class cannot be a silent pass. `npm run golden` prints one terminal `PASS`/`FAIL`/`SIMULATED`/`UNAVAILABLE` line per scenario, `20/20 scenarios passed`, and writes a transcript carrying every tool call with its code and duration plus the FRD-035 measurement counters (verified outcomes, corrections, plan deviations, review cycles, stuck stages, recovered leases, incorrect-project attempts, duplicate work, tool-call cost). Exit code 0.
- **AC2 — a candidate cannot silently become the live board authority.** GB-00 proves `assertDisposable` refuses the repository root, `.worktrees/kanmer` and a tmpdir-substring path; that the child env carries no `KANMER_ROOT`; that `--root` is rejected outright; and that `get_status.projectRoot` equals the `mkdtemp` fixture with `rootSource: "flag"`. No golden scenario, and no rehearsal step, writes to the live board — `git -C .worktrees/kanmer status --porcelain` is empty after a full rail run.
- **AC3 — promotion verifies backup, installation, migration/reconciliation and the complete workflow acceptance sequence before marking stable.** `PROMOTION_STEPS` names `backup`, `install-candidate`, `migrate-reconcile` and `workflow-acceptance` as `required`, and `evaluatePromotion` returns INCOMPLETE — never PASS — when any required step has no attempt. `scripts/golden-promotion.test.mjs` asserts that removing the `backup` attempt turns PASS into INCOMPLETE, and that every `PROMOTION_STEPS` id is referenced by the recorded transcript.
- **AC4 — a deliberate failed-promotion fixture restores the previous stable release and board backup, then records the failed candidate and rollback result.** The contract requires a `rollback` step and a retained prior-stable installer; `golden-promotion.test.mjs` asserts that marking the `rollback` attempt FAIL yields FAIL, and that the retained non-terminal failures (the two prepare refusals, the installer's exit-2 refusal with the GUI running) are preserved in the record without changing the verdict — immutable failed-attempt evidence is not discarded. GB-19 asserts the recorded v0.4.0 transcript, whose rollback rehearsal the CORE-136 proof itself calls "FRD-035 AC4 in miniature", evaluates PASS.
- **AC5 — required CI and Kanmer gates are green for the candidate promotion record.** `npm run golden` is a `VERIFY_STEPS` entry, so `.github/workflows/pr.yml` `verify`, the main-push run, `.github/workflows/release.yml` `release-verify` and `npm run release --ticket` all execute it with no further wiring — the single-array rule at `AGENTS.md:502`. Evidence: a green hosted `verify` at the PR head, a green `kanmer-gate`, and one fresh exact-head independent review.

Edge cases:

- An unsupported capability is `simulated` or `unavailable`, never a fabricated provider pass: GB-16 records `mode: "simulated"` with the injected evidence printed; a missing `git` makes the `repo` fixture report `unavailable`; a missing `obsolete-after-change` makes GB-18 D `unavailable`. Any `unavailable` in the rail is exit 1.
- A superseded immutable release attempt remains readable and names its successor: GB-12.

Repository-hygiene checks:

- `npm run verify` exit 0 from a normal checkout.
- `npm run build && npm run plugin:build && npm run plugin:check` exit 0 with no bundle diff and 41 tools.
- Both smokes **and** `npm run golden` pass with `KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs`.
- `npm run typecheck` unchanged; `package-lock.json` unchanged; `git diff --check` silent.
- No file under `packages/core/src`, `packages/mcp-server/src/*.ts`, `plugins/`, `docs/`, `apps/`, `mcpb/` or `.github/` appears in the diff.

## Commands

Focused, in dependency order:

```
npm run build
node packages/mcp-server/src/golden-board.mjs --only GB-00
node packages/mcp-server/src/golden-board.mjs --out %TEMP%\golden.json
npm run test:scripts
node scripts/golden-promotion.mjs --dry-run --candidate 0.4.1 --stable 0.4.0 --out %TEMP%\promo.json
```

Full rail, from the main checkout (not a linked worktree — `plugin:check` refuses there):

```
npm run verify
npm run build && npm run plugin:build && npm run plugin:check
KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs node packages/mcp-server/src/smoke.mjs
KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs npm run smoke:protocol
KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs npm run golden
git diff --check
git -C .worktrees/kanmer status --porcelain
```

Post-merge / environment (owned by the controller and by CORE-137, not by this ticket's implementation):

```
node scripts/golden-promotion.mjs --candidate 0.4.1 --stable 0.4.0 \
  --board-backup <zip> --board-copy <dir> \
  --stable-installer <exe> --candidate-installer <exe> \
  --launcher %LOCALAPPDATA%\Kanmer\bin\kanmer-mcp.cmd --out <transcript>
```

## Failure and deviation rules

- **Stop and report** on: a failing check that is not a test bug; an unknown API or file; scope expansion beyond the eight Expected files; any dependency addition; a conflict with FRD-035, ADR-0021 or a sibling FRD; any command that would write to `.worktrees/kanmer`, the live board, Git or GitHub.
- **Missing dependency.** If `RECOVER_EXPIRED_CLAIM` is not recommended for a missing worktree, CORE-133 is not merged into this branch: stop, report, and do not assert the pre-CORE-133 behaviour as correct. If `obsolete-after-change` is absent from `DISPOSITIONS`, SKILL-039 is not merged: record GB-18 D `unavailable`, report, and do not weaken the assertion.
- **Never fabricate a pass.** A capability with no offline source is `simulated` (with the injected evidence recorded) or `unavailable`. `unavailable` in the rail is exit 1. There is no `skip`.
- **Budget.** An overrun gets exactly one mechanism fix (fewer server spawns by regrouping scenarios onto fewer fixtures) and a re-measure. Never raise `KANMER_GOLDEN_BUDGET_MS` to make a slow run green; never delete a scenario to fit.
- **Root-cause classes.** If two review findings arise from one mechanism — most likely the harness's `call()`/code-classification layer or the fixture materializers — record one class and choose exactly one remedy (replace the approach, revise this plan, narrow the contract with a stated threat model, or defer the class to one follow-up). Never one patch per scenario.
- **Review budget.** One consolidated independent review, one remediation batch, one delta review limited to the prior findings, the changed lines, their direct callers and the relevant tests. A further blocker or major after the delta review means one controlled replan or an explicit blocked outcome.
- **Windows flake.** Discharge a Windows timing or teardown failure with evidence, not assertion: re-run the same job at the same SHA with no code change, confirm the failing test is untouched by the diff, and give a mechanism argument for why this diff cannot reach it. Retain every attempt in the proof.
- **Deviations are not silent redesigns.** A change to the roster, the wiring decision or the fixture set is recorded in `checklist` progress notes and, if it changes the contract, in this plan.

## Stop condition

Stop at Review with one clean exact-head PR whose footer is `Kanmer: CORE-119`, the post-implementation report written (including the measured `elapsedMs` and the retained golden transcript from the rail run), and the board pushed. Independent review, merge, exact-merge verification and closeout remain controller phases. Do not run the live promotion rehearsal, do not install or roll back any release, and do not start CORE-137.
