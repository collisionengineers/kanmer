# Checklist — CORE-119

*One independently tickable box per ordered plan step, then the acceptance checks the post-implementation report summarises. Labels beginning `Step N` are the named authority for `get_execution_packet id: CORE-119, step: N`.*

- [x] Step 1 — Add `packages/mcp-server/src/golden-harness.mjs`: `disposableBoard`, `assertDisposable`, `childEnv` (deletes `KANMER_ROOT`, pins `KANMER_ENDPOINT_REGISTRY`, honours `KANMER_SERVER`/`KANMER_NODE`), `startServer`, `initialize`, `call` (payload from `content[0].text`, code from `structuredContent.error.code`), `digest`, `Recorder` with the FRD-035 counters, `removeTreeWithRetry` teardown. Module imports with no side effects; `assertDisposable` refuses the repo root, `.worktrees/kanmer` and a tmpdir-substring path.
- [x] Step 2 — Add `packages/mcp-server/src/golden-fixtures.mjs`: `freshFixture`, `seededFixture({legacy})`, `repoFixture` under `kanmer-golden-*`; offline `git init` with inline `-c user.email`/`-c user.name` and `windowsHide: true`; one kept worktree, one deleted-on-disk worktree, one `.worktrees/kanmer` stand-in; `git` reported `unavailable` rather than thrown; no copy from any real board or backup.
- [x] Step 3 — Add `packages/mcp-server/src/golden-board.mjs`: exported `FRD_035_CLASSES`, `SCENARIOS`, `coverageGaps`; strict flag parsing that rejects `--root`; startup refusal (exit 2) on any coverage gap; one server process per fixture; `KANMER_GOLDEN_BUDGET_MS` guard (default 300 000) checked between scenarios; transcript JSON via `--out`; `::error title=kanmer/golden [ID]::` annotations; exit 0/1/2 via `process.exitCode`. GB-00 (disposable-board guard) passes.
- [x] Step 4 — Add GB-01…GB-05 (identity allocated once, legacy board read and allocated on first write with pre-existing ticket bytes unchanged, `WRONG_PROJECT` refused with the board digest unchanged, `REVISION_CONFLICT` on a stale write, two named endpoints with a structurally refused cross-project mutation and no request-supplied path). `--only GB-00..GB-05` reports 6/6.
- [x] Step 5 — Add GB-06…GB-09 (lease acquire/renew/stale-renew `REVISION_CONFLICT`/superseded-lease `LEASE_EXPIRED`/release; `WORKSPACE_OCCUPIED:` prefix with `LEASE_CONFLICT` code and a refused non-owner renew, never `force`; expired lease with a dirty worktree reported `DIRTY_WORKSPACE_PRESERVED` and the dirty file still byte-identical; three-member frozen batch with an unrelated ticket refused and the workspace held until every member is terminal). `--only GB-06..GB-09` reports 4/4.
- [x] Step 6 — Add GB-10…GB-12 (capture with no document debt, excluded from a roster read before **and** after its creation, promotion recording its disposition and applying gates only from then on; main-only vs dev→frozen-candidate→main targets with a changed integration SHA yielding a new candidate identity and the frozen one unmutated; `release_channel` acquire, `RELEASE_CHANNEL_HELD` for a second owner, `complete` clearing the lease, a superseded attempt still readable and naming its successor, an expired-but-unreleased channel still refusing a second acquire). `--only GB-10..GB-12` reports 3/3.
- [x] Step 7 — Add GB-13, GB-17, GB-18 (all four `REVIEW_RETURN_NEEDS_ATTESTATION:` reasons; a `needs-changes` attestation at the exact head authorising the return with `review_round` 1 and branch/worktree/PR unchanged; `operator:` reason path; `REMEDIATION_BUDGET_EXHAUSTED:`; `get_execution_packet` bounded packet plus `STEP_PATH_FORBIDDEN`/`STEP_PATH_UNDECLARED`/`STEP_TICKET_DOCUMENTS_STALE`; amendment tests A, B, C, D and the mechanical half of F, each named by letter and citing `FRD-034 § Amendment` with no FRD prose copied). GB-18 D records `unavailable` — not PASS — if `obsolete-after-change` is absent. `--only GB-13,GB-17,GB-18` reports 3/3.
- [x] Step 8 — Rebase onto CORE-133's exact merge, re-read both reconciliation modules, then add GB-14, GB-15, GB-16 (dry-run inertness proved by an identical whole-board digest including `activity.jsonl`, `EVIDENCE_INCONCLUSIVE` with no provider, `BOARD_WORKTREE_PROTECTED`, every recommendation inside the six-value union; missing worktree and unrecorded workspace both recommending `RECOVER_EXPIRED_CLAIM` with `apply_reconciliation` transferring ownership while branch/worktree/taken evidence and surviving work are preserved and a stale revision refused with `REVISION_CONFLICT`; `RECOVERY_REFUSED:` still refusing foreign-repository and branch-mismatch; the simulated tier driving `MERGED_REVIEW`, `PASS_PROOF_STILL_VERIFYING`, `PROOF_MERGE_SHA_MISMATCH` and `VERIFICATION_FAILED_IMPLEMENTATION|PLAN` through an injected `ReconciliationRun`, each recorded `mode: "simulated"` with its injected evidence printed). `--only GB-14,GB-15,GB-16` reports 3/3 with GB-16 marked `SIMULATED`.
- [x] Step 9 — Add `scripts/golden-promotion.mjs` (`PROMOTION_STEPS` recovered from CORE-136 plan step 9 and proof; `RECORDED_TRANSCRIPTS["0.4.0"]` transcribed from proof version `2b12c27d1cd31641`; pure `evaluatePromotion` with no fs/network/exit; strict-flag operator shell with no repo-local default for any environment path and a `--dry-run` mode), `scripts/golden-promotion.test.mjs` (PASS on the recorded transcript; INCOMPLETE when the `backup` attempt is removed; FAIL when the `rollback` attempt fails; retained prepare refusals and the installer exit-2 refusal do not change the verdict; every `PROMOTION_STEPS` id referenced by the fixture; no I/O), and GB-19 in the runner. `coverageGaps` is empty; `npm run test:scripts` green; the dry run exits 0.
- [x] Step 10 — Add the `golden` and `golden:promotion` scripts to `package.json`, append `"npm run golden"` to `VERIFY_STEPS` after `smoke:discovery` with its reason comment, and add two §6 rows plus one §10 line to `AGENTS.md`. `package-lock.json` untouched; §6/§10 sit outside the `agents-block` managed block.
- [x] Acceptance — AC1: `coverageGaps` empty, a gap is a startup exit 2, `npm run golden` prints `20/20 scenarios passed` and writes a transcript carrying every tool call and the FRD-035 measurement counters.
- [x] Acceptance — AC2: GB-00 green, `--root` rejected, no `KANMER_ROOT` in any child env, and `git -C .worktrees/kanmer status --porcelain` empty after a full rail run.
- [x] Acceptance — AC3: `PROMOTION_STEPS` marks `backup`, `install-candidate`, `migrate-reconcile` and `workflow-acceptance` required, and a missing required attempt yields INCOMPLETE rather than PASS (asserted in `golden-promotion.test.mjs`).
- [x] Acceptance — AC4: a failed `rollback` yields FAIL while retained non-terminal failures are preserved without changing the verdict; GB-19 evaluates the recorded v0.4.0 transcript PASS.
- [ ] Acceptance — AC5: `npm run golden` is a `VERIFY_STEPS` entry, so hosted `verify` at the exact PR head covers it; `kanmer-gate` green; one fresh exact-head independent review.
- [x] Acceptance — edge cases: GB-16 recorded `simulated` with its injected evidence, a missing `git` or missing `obsolete-after-change` recorded `unavailable` and exit 1, and GB-12 proving a superseded attempt stays readable and names its successor.
- [x] Verification — `npm run verify` exit 0 from the main checkout (not a linked worktree); `npm run build && npm run plugin:build && npm run plugin:check` exit 0 with no bundle diff and 41 tools; `node packages/mcp-server/src/smoke.mjs`, `npm run smoke:protocol` **and** `npm run golden` all green with `KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs`; `npm run typecheck` unchanged; `git diff --check` silent; the diff touches only the eight Expected files.
  - Controller rail: exit 0 in the recorded worktree with its own node_modules (see the post-implementation report, "Controller rail").
- [x] Stop at the approved boundary: one bounded PR footed `Kanmer: CORE-119`, post-implementation report written with the measured `elapsedMs` and the retained rail transcript, board pushed. Do not merge, do not run the live promotion rehearsal, do not install or roll back any release, do not start CORE-137.

## Progress notes

Append with `set_ticket_doc(doc: "checklist", append: true)`.

### 2026-09-04 — implementation (branch `CORE-119-golden-board-evaluations`, worktree `.worktrees/core-119`, base `c973f94a`)

Steps 1–10 implemented. `node packages/mcp-server/src/golden-board.mjs` reports
**20/20 scenarios passed in 16,306 ms** against a 300,000 ms budget, exit 0,
`coverageGaps` empty; the same roster is **20/20 in 18,204 ms** with
`KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs`. `npm run test:scripts` is
180/180 including the 11 new `golden-promotion.test.mjs` cases. The promotion
dry run exits 0. `git diff --check` is silent and
`git -C .worktrees/kanmer status --porcelain` is empty after every run.

Recorded deviations, none of them a silent redesign:

- **GB-17 runs on the `repo` fixture, not `seeded`.** `execution-packet.ts:871`
  refuses a constrained step packet without "a proven recorded branch and
  worktree", and the `seeded` board has no Git checkout at all, so the plan's
  fixture choice could not produce a `step-packet/2`. The `repo` fixture gained
  a third clean worktree (`.worktrees/step` on `feature/step`) so the packet is
  not compiled against the deliberately dirty one GB-08 asserts on.
- **The fixture plan pins its evidence versions.** Step compilation refuses a
  plan whose `## Starting state` does not name the current `research`/`files`
  content versions — correctly, since a packet must not be minted from
  superseded evidence — so `seedBoard` writes those two documents first and
  embeds their exact versions in the plan it then writes.
- **A full run with a coverage gap is exit 2, so Step 3's stated
  `1/1 scenarios passed` for an *unnarrowed* run was not reachable.** The
  fail-closed rule is the acceptance criterion (AC1), so it wins: an unnarrowed
  run refuses on any gap, and `--only` marks a deliberate narrowed diagnostic
  that skips the check. Step 3 was therefore run as
  `--only GB-00 --out …` (1/1, exit 0) *and* bare (exit 2, naming the uncovered
  classes). The plan says "eleven" uncovered classes at that point; it is
  **twelve**, because GB-00 is the ADR-0021 guard and declares no FRD-035
  scenario class.
- **The v0.4.0 fixture holds 18 typed attempts, not 16.** Two of CORE-136's
  recorded commands evidence two contract steps each (`migrate-reconcile` +
  `workflow-acceptance`, and `rollback` + `cut-over`), and AC3 names
  `migrate-reconcile` as required, so each is transcribed once per step with
  `transcribed_from` naming the proof attempt it came from. Nothing is
  paraphrased: every `command`, `cwd`, `exit_code` and `result` is the recorded
  value.
- **`GB-15`'s foreign-repository case needed a real second repository.** A bare
  directory outside the checkout is `unavailable`, not `foreign-repository`, so
  the `repo` fixture now contains its own `foreign-repo` `git init`.
- **`stampClaim` writes claim frontmatter directly for two GB-14/GB-15 cases.**
  `take_ticket` refuses the board worktree outright (`worktree-guard.ts`), and a
  foreign repository is not reachable through it either, so the only honest way
  to materialise the states reconciliation exists to classify is the additive
  passthrough frontmatter a different writer would have left behind.

Dependencies confirmed present at the base commit, not assumed: GB-15 observes
`RECOVER_EXPIRED_CLAIM` for a deleted worktree (CORE-133 merged) and GB-18 test
D passes rather than recording `unavailable` (SKILL-039 merged —
`obsolete-after-change` is in `DISPOSITIONS`).

Still owed to the controller (deliberately outside this worktree): the full
`npm run verify` rail from the main checkout, `npm run plugin:build` /
`npm run plugin:check`, the branch push, the PR footed `Kanmer: CORE-119`, and
the independent exact-head review. AC5, the Verification box and the stop
condition stay unticked until those land.
