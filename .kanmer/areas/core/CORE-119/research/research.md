# Research — CORE-119: golden-board evaluations and stable→candidate promotion/rollback proof

## Question

What harness, fixtures and evidence already exist in this repository, and what must be built, so that FRD-035's scenario roster (AC1–AC5) executes reproducibly on Windows and in CI without ever touching the live board — and so that the v0.4.0 promotion transcript becomes the first recorded passing instance of a reusable promotion/rollback rehearsal contract that CORE-137 can re-run for 0.4.1?

## Findings

### The governing spec is small and closed

- `docs/functional/frd/FRD-035-golden-board-and-candidate-promotion-safety.md` has exactly five acceptance criteria and one Behaviour paragraph naming twelve scenario classes: weak controller clearing prepared work; disjoint and competing controllers; expired lease recovery with dirty work; batch execution; capture exclusion/promotion; main-only and candidate-based delivery; independent exact-head review; remediation/delta review and controlled replan; reconciliation of invalid stages; superseded release attempts; multi-project isolation; stable-controlled candidate promotion/rollback.
  - Its two edge cases are load-bearing licences: an unsupported capability is recorded `unavailable` or `simulated` and **never fabricated as a provider pass**; and a superseded immutable release attempt stays readable and names its successor.
  - Behaviour also names "supported-provider **or simulated** provider-adapter evaluations" — the licence for driving a scenario through an injected evidence runner rather than a live provider.
- `docs/architecture/adr/ADR-0021-stable-control-plane-for-candidate-work.md` fixes the consequence that constrains this ticket most: *"Candidate test harnesses must use explicit disposable/copied board locations."* The runner may only ever use a `mkdtemp` board root.
- `docs/product/prd/PRD-002-…md:57-58` is requirement 8; `:66-67` is the success metric ("recorded command evidence").
- The per-scenario contract text lives in the sibling FRDs, not in FRD-035:
  - FRD-028 AC1–AC5 — dry-run inertness, apply only on a still-current revision, stage routing, dirty-workspace preservation, board-worktree protection.
  - FRD-029 AC1–AC5 — `project_id` survives a copy, identity on every response, `REVISION_CONFLICT`, two named endpoints, no request-supplied path.
  - FRD-030 AC1–AC5 — competing controller refused, `LEASE_EXPIRED`/`REVISION_CONFLICT` on stale renew, dead-lease recovery incl. branch-with-missing-worktree, three-member frozen batch, unrelated ticket cannot join.
  - FRD-031 AC1–AC5 — main-only target, dev→frozen-candidate→main, new candidate identity on a changed SHA, `RELEASE_CHANNEL_HELD`, hotfix backport.
  - FRD-032 AC1–AC4 — capture with no document debt, roster/readiness exclusion, recorded promotion disposition, gates only from promotion onward.
  - FRD-033 AC1–AC4 — no unattended execution without current evidence, plan validation, bounded packet, forbidden-file/stale-doc/deviation detection.
  - FRD-034 AC1–AC5 — frozen roster, reviewer≠implementer bound to the exact head, delta review in the same ticket/PR, exact merged-SHA verification routing, budgets that stop repeated unchanged audits.

### There is no golden harness today, and "golden" already means one specific thing here

- `grep -ri golden` over the tracked tree returns only docs plus `scripts/verify-release-assets.mjs:198` and `scripts/verify-release-assets.test.mjs:151-154`. That pair is the repository's established idiom: a **pure** decision function (`verifyAssets({expected, assets})` — "No fetch, no fs, no process.exit — everything here is decided from its two arguments, which is what makes the golden fixtures possible") driven by captured real API responses in a `const GOLDEN = {…}` map inside the `node:test` file (real `assets[]` for 0.3.0/0.3.1/0.3.2).
- `MASTERPLAN.md:43` and `:346` list "golden-board eval harness (quarry)" as a **non-goal**. MASTERPLAN is the superseded v0.3 planning document; PRD-002 requirement 8 and FRD-035 govern this horizon. Recorded as a residual doc inconsistency, not edited here (`open-questions` → Parked).

### The reusable harness pieces — and the one that is not reusable

- `packages/mcp-server/src/smoke-protocol.mjs` (309 lines) is **the** transport model: a self-contained raw newline-delimited JSON-RPC client in ~70 lines, deliberately without the SDK. Exact surface:
  - `function startServer(sandbox)` (`:50`) → `{ send, notify, parseErrors, stderr: () => stderrBuf, stop: () => {…} }`, with `send = (method, params) => Promise<jsonrpcMessage>` (`:88`) and `notify` (`:103`);
  - `REQUEST_TIMEOUT_MS = 20_000` (`:36`), each `send` rejecting with `timed out waiting for ${method}`;
  - `function check(name, cond, detail = "")` (`:39`), `freshSandbox()` (`:121`), `textOf(result)` (`:126`), `async initialize(server, proto, clientName)` (`:130`);
  - unparseable stdout lines accumulate in `parseErrors` and are asserted empty (`:252-256`); stderr is buffered and dumped only on failure (`:259`).
- `packages/mcp-server/src/smoke-headless.mjs` (38 lines) is the cleanest whole-harness template: `KANMER_SERVER` default at `:11`, `mkdtempSync` host with a nested `board` dir (`:12-13`), `cwd: host` on the transport (`:22`), a one-line `check` (`:17`), and `process.exitCode = 1` rather than `process.exit` (`:38`).
- `packages/mcp-server/src/smoke-discovery.mjs:26` **deletes `runnerEnv.KANMER_ROOT`** so ambient env cannot short-circuit discovery. This is a safety requirement for the golden runner, not a nicety: an inherited `KANMER_ROOT` pointing at the live board would violate ADR-0021 directly.
- `packages/mcp-server/src/smoke.mjs` is **4132 lines with zero exports** and runs its whole suite as top-level module side effects (`mkdtempSync` at `:17`, `client.connect` at `:66`, `process.exit(failed.length ? 1 : 0)` at `:4132`). Importing it executes the suite and kills the process. Its useful content is a handful of ~3-line idioms that must be **copied**:
  - `textOf(res)` (`:22`), `treeSnapshot(root, rel = "")` (`:27`, sha256 tree snapshot proving a refused write was inert), `check(name, cond, detail = "")` (`:60`);
  - the `KANMER_NODE` + `ELECTRON_RUN_AS_NODE=1` runner switch (`:39-42`);
  - `runnerEnv.KANMER_ENDPOINT_REGISTRY = registryFile` fixed at spawn time (`:46-48`) plus a second sandbox `sandboxB` (`:49`) — exactly the two-project isolation fixture FRD-029 AC4 needs;
  - the board-copy fixtures at `:692-721` (`kanmer-smoke-copy-`, `fs.cpSync` of `.kanmer`) and the legacy fixture at `:725-775` (copy, then delete `project.json` to force `identity: unassigned`);
  - `const mk = async (title, profile, extra = {})` (`:1733`), `moveTo` (`:1742`), `writeDoc` (`:1743`), `codesOf(validation)` (`:3511`).
  - **Implication: imitate, do not extract.** Refactoring a 4132-line authoritative rail file during a release window is a large diff with no acceptance value.
- `packages/mcp-server/src/check-pr.mjs` is the best model for *reporting*: a strict `parseArgs` that rejects unknown/duplicate flags, one JSON line of structured result to stdout, `::error title=kanmer/gate [CODE]::message` GitHub annotations per finding, `process.exitCode = result.ok ? 0 : 1`, and importable parsers for its own test.
- `scripts/verify-release-assets.mjs` is the best model for *structure and exit codes*: pure comparator + injectable I/O + an `isMain` guard (`:610-611`), severity-classified `problems[]` with `formatProblems` (`:368`), and **exit 0 = pass / 1 = broken / 2 = could not run** (`:633`, `:683`, `verificationFailureExitCode` `:508`), documented in `AGENTS.md:502-503`.
- `scripts/check-updater-package.mjs` contributes one habit worth copying: every `fail(what, fix)` (`:25-27`) carries a `fix:` line, and the summary states the check count ("updater package OK (8 checks)").
- `packages/core/src/io.ts:687` `removeTreeWithRetry(target)` / `:700` `removeTreeWithRetrySync` — the canonical Windows teardown, documented at `:660-686`: `RM_TREE_MAX_RETRIES = 10`, `RM_TREE_RETRY_MS = 100` (~1 s of patience) because a delete-pending file keeps its directory entry (`ENOTEMPTY`) and a directory that was a spawned process's cwd fails `EBUSY`. Every existing smoke uses raw `fs.rmSync` instead — an existing inconsistency and a plausible source of intermittent teardown noise. The golden runner uses `removeTreeWithRetry`.
- `packages/mcp-server/src/reconciliation.test.mjs:114-120` `fixtureStore(t, prefix)` and `:122` `directoryDigest(root)` — a recursive sorted sha256 of a whole board, i.e. an existing "did anything change" oracle for dry-run inertness. Local to that file, so copy it.
- `packages/mcp-server/src/integration/remote-public-fixture.ts:20-39` `createRemotePublicFixture(): Promise<RemotePublicFixture>` is the **only** exported typed fixture factory in the repo (mkdtemp + env + host + token + `close()`). It is the right shape for the golden fixture factory.
- There is **no** shared board-test utility: no `createTempBoard`, no `seedBoard`, no board `fixtures/` directory. Every suite inlines `mkdtemp` + `new KanmerStore(root)` + `await store.init()` (`packages/core/src/store.test.ts:34-42`). The importable building blocks are `KanmerStore` (`store.ts:661`, `init()` `:725` creating `.kanmer/{data,areas}`, `version.json` `{format:3}` and the default `board.yml`), `setActor` (`:667`), `resolvePaths` (`paths.ts:47-72`), and `defaultBoardConfig`/`writeBoard` (`board.ts:399`).
- Temp prefixes already in use — `kanmer-test-`, `kanmer-release-`, `kanmer-smoke-`, `kanmer-smoke-b-`, `kanmer-smoke-copy-`, `kanmer-smoke-legacy-`, `kanmer-proto-`, `kanmer-headless-`, `kanmer-http-test-`, `kanmer-mcp-028-`, `kanmer-verify-board-`, `kanmer-reconciliation-other-`. The golden runner uses a new `kanmer-golden-` prefix.
- `scripts/test-scripts.mjs` enumerates **direct** `scripts/*.test.mjs` children (non-recursive `readdirSync` in `testFilesIn`) and runs them under `node --test`. It is already inside `npm test` (root `package.json:15`), which is already `VERIFY_STEPS[2]`. A new `scripts/golden-promotion.test.mjs` therefore needs **no wiring at all**. Its header also records the rule: never pass a glob to a runner on Windows — enumerate.
- `scripts/auto-run-state.test.mjs:7` imports `KanmerStore` and `removeTreeWithRetry` from `../packages/core/dist/index.js` and drives a real `mkdtemp` board from a `node:test` file — precedent that script-level tests may exercise the real store.

### The rails, and what it costs to join them

- `scripts/verify.mjs:12-30` exports a frozen 13-element `VERIFY_STEPS`: `npm run build`; `npm run build -w @kanmer/gui`; `npm test`; `npm run typecheck`; `npm run verify:docs`; `node packages/mcp-server/src/smoke.mjs`; `npm run smoke:headless`; `npm run mcpb:check`; `npm run smoke:protocol`; `npm run smoke:discovery`; `npm run verify:skills`; `npm run verify:agents-block`; `npm run plugin:check`.
- `run()` at `:32-35` is `execSync(command, { cwd: root, env, stdio: "inherit" })` — **fail-fast**, no aggregation, no per-step timing, no `--continue`. The dual-mode guard at `:39` lets `release.mjs` import the array without running it.
- One array, two consumers: `scripts/release.mjs:45` imports it and `:308` runs every step in the prepare phase. `.github/workflows/pr.yml:42` runs `npm ci && npm run verify` on `windows-latest` for every PR **and** every push to `main`; `.github/workflows/release.yml:75` runs the same rail on a `v*` tag, then `dist:check` (`:78`) and `verify-release-assets` (`:87`). There is no `verify.yml`, no separate integration tier in CI, and nothing runs outside `npm run verify`.
- `AGENTS.md:502` states the rule that decides the wiring question outright: *"Extend `VERIFY_STEPS`, never a third verification pyramid."*
- `scripts/verify.mjs:45-53` is the existing disposable-board precedent: `mkdtempSync(join(tmpdir(), "kanmer-verify-board-"))` + `.kanmer/version.json` = `{"format":3}`, injected as `KANMER_ROOT` for the `npm test` step only and removed in a `finally`.
- There is no stated duration budget anywhere in `verify.mjs`.

### The refusal codes a golden board must actually produce

- `packages/mcp-server/src/errors.ts:1-13` — the closed `KanmerErrorCode` union: `WRONG_PROJECT`, `REVISION_CONFLICT`, `GATE_BLOCKED`, `LEASE_EXPIRED`, `LEASE_CONFLICT`, `RECONCILIATION_INCONCLUSIVE`, `RECONCILIATION_DRIFT`, `RELEASE_CHANNEL_HELD`.
- `errors.ts:47-60` `classifiedCode()` is the mapping a golden assertion must respect rather than guess: `Conflict:` ⇒ `REVISION_CONFLICT`; `RELEASE_POLICY_DRIFT:` ⇒ `REVISION_CONFLICT`; `RELEASE_INPUT_INVALID:` ⇒ `RECONCILIATION_INCONCLUSIVE`; `LEASE_EXPIRED:` ⇒ `LEASE_EXPIRED`; the 8 `RELEASE_CONFLICT_PREFIXES` (`:27-36`) and the 18 `LEASE_CONFLICT_PREFIXES` (`:38`, incl. `WORKSPACE_OCCUPIED:`, `CLAIM_LIVE:`, `RECOVERY_REFUSED:`, `LEASE_ID_REQUIRED:`, `LEASE_REVISION_REQUIRED:`, the `BATCH_*` family) ⇒ `LEASE_CONFLICT`; core's movement-refusal wording ⇒ `GATE_BLOCKED` by regex (`:58`).
  - **Therefore `WORKSPACE_OCCUPIED` is a message prefix, not a code.** An assertion expecting a `WORKSPACE_OCCUPIED` code would assert something that never appears. Same for `REVIEW_RETURN_NEEDS_ATTESTATION` and `REMEDIATION_BUDGET_EXHAUSTED`, which are unclassified and surface as `Error: <prefix>: …` text.
- `errors.ts:74-87` `failCoded(error, project?)` returns `{content:[{type:"text",text}], isError:true, structuredContent:{error:{code,message}, project}}`. So for **refusals** the code is in `structuredContent.error.code` and the smokes already assert it there; for **successes** the payload is in `content[0].text`.
- `packages/core/src/store.ts` producers:
  - `:2050-2063` `REVIEW_RETURN_NEEDS_ATTESTATION:` with four distinguishable reasons (no `scratch/review.md`; not a valid attestation; verdict not `needs-changes`; the attestation names a PR not in the ticket's `prs`), bypassed only by a `reason` beginning `"operator:"`;
  - `:2067` `REMEDIATION_BUDGET_EXHAUSTED:`;
  - `:2347` and `:2390` `WORKSPACE_OCCUPIED:` (taken-ticket collision, and pending-batch-manifest WAL reservation); `force` does not bypass either;
  - the renew family at `:3857-3913`: `BATCH_RUN_REQUIRED:`, `BATCH_OWNER_MISMATCH:`, `LEASE_ID_REQUIRED:` (`:3868`, `:3871`), `LEASE_EXPIRED:` (`:3880-3884`), `LEASE_REVISION_REQUIRED:` (`:3887`), **`Conflict: … lease revision changed since you read it` (`:3892-3895`)** — that is the stale-renew `REVISION_CONFLICT` — `CLAIM_NOT_OWNED:` (`:3898`), `LEASE_EXTENSION_*` (`:3908`, `:3913`);
  - `LEASE_LIVE:` `:3268`; `CLAIM_LIVE:` `:3531`, `:3770`; `RECOVERY_REFUSED:` `:3538` (board worktree), `:3543` (foreign repository), `:3549` (branch mismatch);
  - release: `RELEASE_POLICY_DRIFT:` `:4014`, `LEASE_EXPIRED:` `:4037`/`:4051`, `CLAIM_NOT_OWNED:` `:4057`, `RELEASE_ATTEMPT_TERMINAL:` `:4075`/`:4365`, `RELEASE_CANDIDATE_IMMUTABLE:` `:4094`, `RELEASE_CHANNEL_HELD:` `:4176` (and `:4158` documents that it fires whether the holding lease is live **or** expired — expiry alone does not free a channel), `CLAIM_LIVE:` `:4359`.
- `packages/mcp-server/src/index.ts:315` throws `WRONG_PROJECT` **before** actor attribution, lazy initialization and any store call (guard documented `:307`, ordering note `:2084`).
- `packages/core/src/reconciliation.ts` — 22 finding codes in classifier order: `BOARD_WORKTREE_PROTECTED` (74, error), `RELEASE_EVIDENCE_PRESERVED` (78), `EVIDENCE_INCONCLUSIVE` (88), `DIRTY_WORKSPACE_PRESERVED` (98), `WORKSPACE_MISSING` (101), `CLAIM_WITHOUT_RECORDED_WORKSPACE` (104), `CLAIM_EXPIRED` (107), `REQUIRED_CHECKS_NOT_GREEN` (110), `RECORDED_COMMIT_UNREACHABLE` (116 and 160, error), `MERGED_REVIEW` (119), `CLOSED_UNMERGED_REVIEW` (123), `REVIEW_WITHOUT_PR_OR_WORKER` (127), `VERIFYING_WITHOUT_MERGE_SHA` (156, error), `PROOF_MERGE_SHA_MISMATCH` (167, error), `PASS_PROOF_STILL_VERIFYING` (170), `VERIFICATION_FAILED_IMPLEMENTATION` (181), `VERIFICATION_FAILED_PLAN` (184), `VERIFICATION_TRANSIENT_RETRY` (187), `VERIFICATION_INCONCLUSIVE` (190), `CLEAN_TERMINAL_CLAIM` (197), `TERMINAL_CLAIM_IDENTITY_UNVERIFIED` (202), `NO_RECONCILIATION_NEEDED` (206). Sole export `reconcileEvidence(input)` (`:63`) is pure and store-free.
- `packages/core/src/types.ts:1153-1159` — closed `ReconciliationAction`: `MOVE_TO_IMPLEMENTING`, `MOVE_TO_VERIFYING`, `MOVE_TO_DONE`, `ROUTE_VERIFICATION_FAILURE`, `RELEASE_CLEAN_TERMINAL_CLAIM`, `RECOVER_EXPIRED_CLAIM`.
- `packages/mcp-server/src/reconciliation.ts` host refusals: `RECONCILIATION_INCONCLUSIVE` (`:614-618` no current recommendation; `:621-625` legacy-layout ticket with `revision === null`), `REVISION_CONFLICT` (`:630-635`), `RECONCILIATION_DRIFT` (`:640-646`).
- `packages/mcp-server/src/release.ts:31` `RELEASE_ACTIONS = ["acquire","renew","record","supersede","complete","fail"]`; `validateReleaseChannelRequest` (`:98`) raises nine distinct `RELEASE_INPUT_INVALID:` refusals plus `RELEASE_SHA_UNAVAILABLE:` (`:199`) and `RELEASE_REASON_REQUIRED:` (`:278`).
- `packages/core/src/release.ts` pure surface for the superseded/candidate assertions: `ReleaseOutcome = "active"|"released"|"failed"|"superseded"` (`:56`), `RELEASE_FROZEN_FIELDS` (`:168`), `isTerminalAttempt` (`:183`), `attemptIdFor`/`parseAttemptId` (`:216`/`:221`), `candidateIdentity` (`:271`), `candidateRefFor` (`:286`), `releaseLeaseExpired` (`:335`), `compareReleaseAttempts` (`:1388`), `classifyReleaseEvidence` (`:1429`, contract documented `:1400-1428`), `ReleaseEvidenceState = "not-applicable"|"superseded"|"contended"|"unavailable"` (`:1398`).

### Reconciliation has two drivable tiers, and only one of them needs a provider

- CORE-136's `proof/proof.md` records the measured product behaviour: `reconcile_ticket` on the copied board returned `EVIDENCE_INCONCLUSIVE` and wrote nothing, "because the copy has no repository or GitHub context".
- `packages/mcp-server/src/reconciliation.ts` exposes the injection seam that changes this: `collectReconciliationEvidence(store, id, run = execFile, options)` (`:321`), `reconcileTicket(store, id, run?, options?)` (`:409`) and `applyReconciliation(store, input, run?, options?)` (`:600`) all accept a `ReconciliationRun` (`:71`) and a `CommonDirResolver` (`:77`). `packages/mcp-server/src/reconciliation.test.mjs:88-111` already builds a fake `git`/`gh` runner and `:47` fakes the common-dir resolver.
- Implication — two tiers, both required, neither duplicating existing unit tests:
  - **Product tier (over MCP stdio, real offline `git init` fixture):** proves the path an operator actually drives — `BOARD_WORKTREE_PROTECTED`, `WORKSPACE_MISSING`, `CLAIM_WITHOUT_RECORDED_WORKSPACE`, `CLAIM_EXPIRED`, `DIRTY_WORKSPACE_PRESERVED`, `EVIDENCE_INCONCLUSIVE` when no provider exists, and dry-run inertness by `directoryDigest` equality.
  - **Simulated-provider tier (library call with an injected `ReconciliationRun`):** the GitHub/CI-derived findings that have no offline source — `MERGED_REVIEW`, `REQUIRED_CHECKS_NOT_GREEN`, `CLOSED_UNMERGED_REVIEW`, `PROOF_MERGE_SHA_MISMATCH`, `PASS_PROOF_STILL_VERIFYING`, `VERIFICATION_FAILED_IMPLEMENTATION|PLAN` — each recorded in the transcript with `mode: "simulated"` and the injected evidence printed. FRD-035 Behaviour ("simulated provider-adapter evaluations") and edge case 1 authorize exactly this and forbid calling it a provider pass.

### The v0.4.0 transcript is already the first golden instance

CORE-136 `proof/proof.md` (version `2b12c27d1cd31641`, `merged_sha` `7e114cd117ef720c20797e2bf9f5cf58643a94e6`, `result: PASS`) carries 16 typed `attempts[]` entries, each with `attempted_at`, `command`, `cwd`, `exit_code`, `result`, `summary`. That is already a machine-shaped transcript. Its steps, in the order CORE-136 `plan/plan.md` step 9 defines them:

1. live-board backup — zip path, sha256 `90fbb8438ef0ea6aad2226837de1b38b9f4dbea597e017bf75c6e14be2ef6539`, board commit `41f795f9`, and a **retained prior-stable installer** `Kanmer-Setup-0.3.12.exe` (`scratch/notes.md` "Promotion step 1");
2. prepare/publish through `scripts/release.mjs` — three attempts, two retained FAILs (dirty tree; GUI build `createHash` not exported by `__vite-browser-external`) then PASS;
3. independent release verification — `verify-release-assets --remote-coherent` exit 0, `check-updater-package` "OK (8 checks)", tag `release-verify` run success;
4. packaged boot smoke — `KANMER_SMOKE=1 KANMER_OPEN=<copy>` on `win-unpacked/Kanmer.exe`, 118,602-byte PNG;
5. copied-board standalone smoke — `KANMER_ROOT=<copy> npm run smoke:headless`, host files untouched;
6. installer refusal with the GUI running — **exit 2, retained** (`customCheckAppRunning` fails closed, GUI-064) — then silent install after `taskkill`, exit 0 in 18 s, `current -> 0.4.0-33768`, launcher `--probe` healthy;
7. copied-board workflow acceptance through the installed launcher — `get_status`, `list_projects`, `create_item`, lease acquire/renew/stale-renew/release, unattested `review→implementing` refused with `REVIEW_RETURN_NEEDS_ATTESTATION`, `operator:` reason authorising it with `review_round` becoming 1, `reconcile_ticket` dry-run `EVIDENCE_INCONCLUSIVE` writing nothing, `release_channel` acquire+complete with the immutable attempt retained;
8. rollback rehearsal 0.4.0 → 0.3.12 → 0.4.0, each direction proving the live board unchanged (same fingerprint `kanmer-proj-v1:5dbaab31…`, 375 tickets, clean worktree);
9. live cut-over + `npm run verify:agents-block` (31/31) + `repo upToDate: true`.

The proof itself calls step 8 "FRD-035 AC4 in miniature". Implication: the rehearsal contract is **recovered from this transcript, not invented**, and the transcript becomes the `GOLDEN` fixture pinning the contract's decision function — the `verify-release-assets.test.mjs` shape.

### The transcript was driven by an out-of-repo ad-hoc client

`C:\Users\Alex\Documents\KanmerBackups\tools\mcp-call.mjs` (32 lines, un-versioned, outside the repository) is what actually drove promotion step 7: a hand-rolled stdio JSON-RPC client that spawns `%LOCALAPPDATA%\Kanmer\bin\kanmer-mcp.cmd` through PowerShell and prints `content[0].text`. Implication: the single most valuable thing CORE-119 ships is that this stops being a side channel — the copied-board acceptance becomes a committed, ordered, exit-coded scenario list that CORE-137 runs instead of retyping tool calls.

### MCP-055 changes `structuredContent` for successes, not for errors

`MCP-055` (preparing, 0.4.1 blocker) will make `structuredContent` carry the whole successful payload (`{...payload, project}`), and its own approach requires `JSON.parse(content[0].text)` to deep-equal `structuredContent` minus `project`. Error results already carry `{error:{code,message}, project}` (`errors.ts:74-87`) and do not change. Implication: the harness reads **`content[0].text` for successes** and **`structuredContent.error.code` for refusals**, which is stable across MCP-055 landing before or after this ticket.

### CORE-133 makes one scenario reachable

CORE-133's plan (`f8170a38e306f706`) Step 2 introduces the recoverable-workspace predicate `clean | dirty + matches-claim`, `missing + unavailable`, `not-recorded + not-applicable`, and removes the unreachable synthetic `missing + matches-claim`. Before that merge a golden assertion that `reconcile_ticket` on a **missing worktree** recommends `RECOVER_EXPIRED_CLAIM` fails; an assertion of the current behaviour would have to be rewritten the day CORE-133 lands. HZN-008's 2026-09-02 order already places CORE-133 before CORE-119, and CORE-137's cut point requires both Done. Implication: implement that scenario as a hard assertion against merged CORE-133 — no capability gate, no skip, no version sniffing.

### SKILL-039 owns the amendment text; tests A–G split cleanly

SKILL-039 (preparing) item 5 adds an "Amendment — review budget and root-cause classes" section to `docs/functional/frd/FRD-034-…md`; item 1 adds `obsolete-after-change` to `DISPOSITIONS` in `packages/core/src/review-attestation.ts` and pins it in `scripts/verify-skill-prose.mjs`. `goal.md:1407-1424` lists tests A–G. Splitting them by what a server can decide:

- **A** (three audits of one unchanged head consume no attempts) — mechanical: `review_round` advances only through `backwardMoveEffects` (`store.ts:2050-2067`), so repeated reads cannot move it.
- **B** (green checks + only dispositioned minors passes) — mechanical through `packages/core/src/merge-gate.ts` on injected PR/attestation evidence.
- **C** (a new major introduced by remediation blocks) — mechanical through the same gate with an open blocker at the current head.
- **D** (an outdated unresolved thread does not block) — mechanical **only after SKILL-039** ships `obsolete-after-change`.
- **F** (budget exhaustion with only minors does not ask the operator) — half mechanical: the store refuses with `REMEDIATION_BUDGET_EXHAUSTED` and an `operator:` reason authorises the move; whether an agent *asks* is skill behaviour.
- **E** (one root-cause class ⇒ one replan/follow-up) and **G** (a genuine product/security decision does ask) are agent-judgement properties with no server-observable contract; `verify-skill-prose.mjs` pins them under SKILL-039.

Implication: the golden roster covers A, B, C, D and the mechanical half of F, naming each by its amendment letter and citing `FRD-034 § Amendment` (falling back to HZN-008 `context.md` § "Review budget and root-cause rule" if SKILL-039 has not merged). It copies no FRD prose. E and G are parked with that reason.

### Windows cost is measured, and it sets the budget

`packages/core/vitest.config.ts:1-30` is the repository's Windows cost analysis:
- CORE-125 put every `updateItem`/`moveItem`/`setDoc`/`appendScratch` behind the board write lock; a contended claim sleeps `DEFAULT_LOCK_RETRY_MS = [10,25,60,150,300,600,1000]` = **2145 ms** before giving up, payable more than once per test;
- the **first** locked write per process resolves Windows process identity via a synchronous `execFileSync("powershell.exe", …)` in `io.ts`: ~776 ms for this process (cached after), ~1103 ms for another pid (never cached) — so a first `updateItem` costs ~998 ms against ~26 ms steady state, **per process**;
- Windows FS work slows **3–5×** when a second verification rail shares the host, "which is the normal condition for this repository"; measured worst case 1.63 s unloaded / **6.2 s under load**.

Implication: the runner must amortise process startup — one server process per fixture board, not per scenario — and its own wall-clock budget must be sized in minutes, not seconds. Also: `execFileSync` calls need `windowsHide: true` (as `smoke.mjs:293-300` and `step-reconciliation.test.mjs:20-32` do) or the rail flashes console windows; and `process.exit()` after any `fetch()` corrupts the exit code on Windows (`verify-release-assets.mjs:649-654`: libuv `!(handle->flags & UV_HANDLE_CLOSING)` → dies with 127), so set `process.exitCode` and let the loop drain.

### Fixture shape is already known and needs no secrets

`.worktrees/kanmer/.kanmer/` is `areas/ data/ groups/ project.json version.json`; `data/` is `activity.jsonl board.yml counters.json`; `board.yml` carries `areas[] idPrefixes profiles{} defaultProfile groupKinds[]` (the `feature` profile's `leave-preparing` is exactly `research files plan checklist`); `project.json` is `{schema, project_id, board_id, created, origin, migratedFrom{format,at}}`. `KanmerStore.init()` generates all of it. A golden fixture is therefore a `store.init()` plus a handful of `create_item`/`set_ticket_doc` calls — not a copy of the 6 MB live backup — and contains no secrets.

## Implications for this ticket

1. **Two artefacts, two tiers, one rail edit.** A hermetic scenario runner (`npm run golden`) that only ever drives `mkdtemp` boards and joins `VERIFY_STEPS`; and an operator/release rehearsal driver (`npm run golden:promotion`) that stays out of CI because a GitHub runner has no prior stable install, no retained installer and no live-board backup. `AGENTS.md:502` ("Extend `VERIFY_STEPS`, never a third verification pyramid") decides the first; one edit then reaches `pr.yml`, main pushes, `release.yml` and `npm run release`. FRD-035 AC5 is satisfied because the promotion record is an ordinary PR whose `verify` now includes `golden`.
2. **Imitate, do not extract.** Copy `startServer` (smoke-protocol), `textOf`/`check`/`treeSnapshot` (smoke.mjs), the `KANMER_SERVER`/`KANMER_NODE` switch, the `KANMER_ENDPOINT_REGISTRY` two-sandbox pattern, and `directoryDigest` into one new ~200-line harness module. Refactoring `smoke.mjs` is a Non-goal.
3. **Delete `KANMER_ROOT` from the child env** and refuse to start if the resolved board root is not a fresh `mkdtemp` path — the mechanical enforcement of ADR-0021's "explicit disposable/copied board locations".
4. **Assert prefixes for messages and codes for codes.** Only the eight `KanmerErrorCode` values appear in `structuredContent.error.code`; `WORKSPACE_OCCUPIED`, `REVIEW_RETURN_NEEDS_ATTESTATION`, `REMEDIATION_BUDGET_EXHAUSTED` and the `BATCH_*` family are message prefixes.
5. **Read `content[0].text` for successes and `structuredContent.error.code` for refusals** — stable across MCP-055.
6. **Reconciliation needs both tiers**: a real offline git fixture for the product path, and an injected `ReconciliationRun` for provider-derived findings recorded `simulated`.
7. **The rehearsal contract is recovered from CORE-136**, and the v0.4.0 transcript is inlined as the `GOLDEN` fixture of its pure decision function, covered by `npm run test:scripts` ⊂ `npm test` ⊂ `VERIFY_STEPS` with zero new wiring.
8. **One server process per fixture board plus a fail-closed wall-clock budget** (`KANMER_GOLDEN_BUDGET_MS`, default 300 000) keeps the rail addition bounded and makes an overrun a deterministic failure with one mechanism fix rather than a judgement call.
9. **CORE-133 must merge first** (already the HZN-008 order); the missing-worktree scenario is a hard assertion.
10. **Nothing in `packages/core/src` or `packages/mcp-server/src/index.ts` changes**, so the committed bundle's bytes and the 41-tool count are unchanged and `npm run plugin:check` stays green.

## Open questions

Recorded and resolved in `open-questions`.
