# Post-implementation report — CORE-119

Golden-board evaluations and the stable→candidate promotion/rollback proof.

- Branch `CORE-119-golden-board-evaluations`, worktree `.worktrees/core-119`,
  base `c973f94a` (contains CORE-133 and SKILL-039, the plan's two named
  dependencies; both are asserted rather than assumed — see "Dependencies").
- Commits: `646891e1` (harness, fixtures, roster, promotion contract, wiring)
  and `31878132` (the five defects the first live runs found, each fixed at its
  mechanism).
- `npm run verify`, `plugin:build`/`plugin:check`, the push, the PR and the
  independent review are deliberately **not** done here and are listed under
  "Owed to the controller".

## Files changed

| Action | Path | Why |
|---|---|---|
| Add | `packages/mcp-server/src/golden-harness.mjs` | The disposable-board guard that makes ADR-0021 mechanical (`assertDisposable` refuses anything that is not a fresh `kanmer-golden-` mkdtemp path; `childEnv` **deletes** `KANMER_ROOT`), a raw JSON-RPC transport copied from `smoke-protocol.mjs:50-119`, `call()` reading `content[0].text` for successes and `structuredContent.error.code` for refusals, the whole-board `digest` oracle from `reconciliation.test.mjs:122`, per-file digests, the FRD-035 measurement counters and `removeTreeWithRetry` teardown. `.mjs` under `src/`, so invisible to `tsc` and to the standalone bundle. |
| Add | `packages/mcp-server/src/golden-fixtures.mjs` | `freshFixture`, `seededFixture({legacy})` and `repoFixture`, all generated (never copied from any real board, backup or credential), all under `kanmer-golden-*`. Git offline only, `-c user.email`/`-c user.name` inline, `windowsHide: true`; a missing `git` is **reported** `unavailable`, never thrown. Also `expireClaim` and `ticketFile`. |
| Add | `packages/mcp-server/src/golden-board.mjs` | `FRD_035_CLASSES` (12), `SCENARIOS` GB-00…GB-19, `coverageGaps`/`unknownClasses`, strict flags that reject `--root` outright, the startup coverage refusal, the fail-closed `KANMER_GOLDEN_BUDGET_MS`, one server process per fixture board, the transcript JSON, `::error title=kanmer/golden [ID]::` annotations and the 0/1/2 exit convention via `process.exitCode`. |
| Add | `scripts/golden-promotion.mjs` | `PROMOTION_STEPS` (ten ordered steps recovered from CORE-136 `plan/plan.md` step 9 and `proof/proof.md`), `RECORDED_TRANSCRIPTS["0.4.0"]` transcribed from proof version `2b12c27d1cd31641`, the **pure** `evaluatePromotion` (no fs, no network, no `process.exit`), and a strict-flag operator shell with no repo-local default for any environment path. The harness import is dynamic so the pure half stays dependency-free at import time. |
| Add | `scripts/golden-promotion.test.mjs` | `node:test` cover for the pure half, auto-discovered by `scripts/test-scripts.mjs`, so it needs no wiring at all. |
| Modify | `scripts/verify.mjs` | One appended `VERIFY_STEPS` entry, `"npm run golden"` after `"npm run smoke:discovery"`, with the reason comment naming FRD-035 AC1/AC5 and the "extend `VERIFY_STEPS`, never a third verification pyramid" rule. |
| Modify | `package.json` | `golden` and `golden:promotion` scripts. No dependency change, so `package-lock.json` is untouched. |
| Modify | `AGENTS.md` | Two §6 command rows and one §10 checklist line (9b). Outside the `agents-block.mjs` managed block, so `verify:agents-block` is unaffected. |

No file under `packages/core/src`, `packages/mcp-server/src/*.ts`, `plugins/`,
`docs/`, `apps/`, `mcpb/` or `.github/` is in the diff, and `package-lock.json`
is unchanged.

## Result

`node packages/mcp-server/src/golden-board.mjs`:

```
20/20 scenarios passed in 16306 ms (budget 300000 ms)
```

- **Measured `elapsedMs`: 16,306** against a 300,000 ms budget (5.4 % of it), on
  a Windows host with no concurrent rail. The same roster measures 18,204 ms
  against the committed plugin bundle.
- Transcript: `C:\kt-tmp\core119\golden-final.json` (default output is
  `dist/golden/golden-<stamp>.json`, which is gitignored). It carries every tool
  call with its code and duration, every check with its terminal state, and the
  FRD-035 measurement counters:
  `verifiedOutcomes 156, corrections 1, unnecessaryDocuments 0,
  planDeviations 1, reviewCycles 5, stuckStages 3, recoveredLeases 2,
  wrongProjectAttempts 2, duplicateWork 1, toolCalls 134, elapsedMs 16306`.
- `serverInfo`: `{"name":"kanmer","version":"0.4.0"}`.
- `coverageGaps(SCENARIOS, FRD_035_CLASSES)` is `[]`; with only GB-00 selected
  it is the full twelve, and an unnarrowed run with a gap exits 2.
- GB-16 is the only `SIMULATED` scenario; nothing is `unavailable`.

## Commands

All in `C:\Users\Alex\Documents\GitHub\kanmer\.worktrees\core-119` unless noted,
with `TMP`/`TEMP` pointed at `C:\kt-tmp\core119` (AGENTS.md/gotcha: a rail that
writes into the home folder hangs on this host).

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `npm ci --no-audit --no-fund` | 0 | 647 packages |
| 2 | `npm run build` | 0 | core + server + standalone bundle |
| 3 | `node -e "import('./packages/mcp-server/src/golden-harness.mjs').then(m=>console.log(Object.keys(m)))"` | 0 | 18 exports printed, no board created, no side effects |
| 4 | `node -e "…seededFixture({})…"` | 0 | `kanmer-golden-seeded-*` + census meta printed, directory gone afterwards |
| 5 | `node -e "…repoFixture()…"` | 0 | `git: "available"`, all five worktree/branch fixtures, teardown clean |
| 6 | `node packages/mcp-server/src/golden-board.mjs --only GB-00 --out …\golden.json` | 0 | `1/1 scenarios passed` |
| 7 | `node packages/mcp-server/src/golden-board.mjs --bogus` | 2 | usage printed |
| 8 | `node packages/mcp-server/src/golden-board.mjs --only GB-00 --only GB-01` | 2 | duplicate-flag refusal |
| 9 | `… --only GB-00,GB-01,GB-02,GB-03,GB-04,GB-05` | 0 | `6/6 scenarios passed` in 4,717 ms |
| 10 | `… --only GB-06,GB-07,GB-08,GB-09` | 0 | `4/4 scenarios passed` in 3,659 ms |
| 11 | `… --only GB-10,GB-11,GB-12` | **1** | first attempt: GB-11 `update_item delivery_state: released` refused `DELIVERY_EVIDENCE_MISSING` (retained; the fix supplied the release evidence the store requires) |
| 12 | `… --only GB-10,GB-11,GB-12` | 0 | `3/3 scenarios passed` in 6,480 ms |
| 13 | `… --only GB-13,GB-17,GB-18` | **1** | first attempt: GB-17's plan pinned no evidence versions, so step compilation refused it (retained) |
| 14 | `… --only GB-17` | **1** | second attempt: packet compiled, but the assertions read a `step-packet/2` shape that does not exist (retained) |
| 15 | `… --only GB-13,GB-17,GB-18` | 0 | `3/3 scenarios passed` in 12,606 ms |
| 16 | `… --only GB-14,GB-15,GB-16` | 0 | `3/3 scenarios passed` in 5,185 ms, GB-16 lines carry `SIMULATED` |
| 17 | `node packages/mcp-server/src/golden-board.mjs --out …\golden-full.json` | 0 | `20/20 scenarios passed` in 22,421 ms |
| 18 | `KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs node …/golden-board.mjs` | **1** | first attempt: every scenario timed out at `initialize` and the budget guard aborted the run after 302,768 ms naming the five scenarios not run (retained; the cause was an unresolved relative `KANMER_SERVER` against the child's deliberate foreign cwd) |
| 19 | `KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs node …/golden-board.mjs` | 0 | `20/20 scenarios passed` in 18,204 ms against the committed bundle |
| 20 | `npm run test:scripts` | 0 | `tests 180, pass 180, fail 0` (11 of them new) |
| 21 | `node scripts/golden-promotion.mjs --dry-run --candidate 0.4.1 --stable 0.4.0 --out …\promo.json` | 0 | every step `SKIPPED`; contract shape `10 steps, 10 required`; verdict `INCOMPLETE` (nothing ran) while the recorded v0.4.0 instance still evaluates `PASS` |
| 22 | `node packages/mcp-server/src/golden-board.mjs --out …\golden-final.json` | 0 | `20/20 scenarios passed` in **16,306 ms** — the measurement above |
| 23 | `git diff --check` | 0 | silent |
| 24 | `git -C .worktrees/kanmer status --porcelain` (cwd: repo root) | 0 | empty after every golden run — no scenario touched the live board |

## Acceptance mapping (FRD-035)

- **AC1 — every scenario class executes, with exact evidence and a terminal
  result.** Twelve classes, twenty scenarios, `coverageGaps` empty and a gap is
  a startup exit 2 (proved: the same call over a one-scenario roster returns all
  twelve). One terminal `PASS`/`FAIL`/`SIMULATED`/`UNAVAILABLE` line per
  scenario, `20/20 scenarios passed`, and a transcript carrying every tool call
  with its code and duration plus the measurement counters.
- **AC2 — a candidate cannot silently become the live board authority.** GB-00
  proves `assertDisposable` refuses the repository root, `.worktrees/kanmer`, a
  temp-substring sibling and a temp path without the marker; that the child env
  carries no `KANMER_ROOT`; that `--root` is rejected outright; and that
  `get_status.projectRoot` equals the mkdtemp fixture with `rootSource: "flag"`.
  Command 24 confirms the live board is untouched.
- **AC3 — promotion verifies backup, installation, migration/reconciliation and
  the complete workflow acceptance sequence before marking stable.**
  `PROMOTION_STEPS` marks all four required, and `evaluatePromotion` returns
  `INCOMPLETE` — never `PASS` — when a required step has no terminal attempt.
  `golden-promotion.test.mjs` asserts removing the `backup` attempt turns PASS
  into INCOMPLETE and that every step id is referenced by the fixture.
- **AC4 — a deliberate failed-promotion fixture restores the previous stable and
  records the failed candidate and rollback result.** The contract requires a
  `rollback` step and a retained prior-stable installer; the test asserts a
  failed `rollback` yields `FAIL`, that a contract with no rollback step cannot
  pass, and that the three retained non-terminal failures (two prepare refusals
  and the installer's exit-2 refusal with the GUI running) are preserved without
  changing the verdict. GB-19 asserts the recorded v0.4.0 transcript — whose
  rollback rehearsal the CORE-136 proof itself calls "FRD-035 AC4 in miniature" —
  evaluates `PASS`.
- **AC5 — required CI and Kanmer gates green for the promotion record.** Wired,
  not yet demonstrated: `npm run golden` is a `VERIFY_STEPS` entry, so
  `pr.yml verify`, the main-push run, `release.yml release-verify` and
  `npm run release --ticket` all execute it with no further wiring. The green
  hosted `verify` at the PR head, the green `kanmer-gate` and the fresh
  exact-head independent review are owed to the controller.
- **Edge cases.** GB-16 records `mode: "simulated"` with the injected evidence
  printed in the transcript and never as a provider pass; a missing `git` makes
  the `repo` fixture report `unavailable` (diagnostic path, not exercised here
  because git is present); GB-18 D would record `unavailable` rather than PASS
  if `obsolete-after-change` were absent. Any `unavailable` in the rail is exit
  1. GB-12 proves a superseded attempt stays readable and names its successor.

## Dependencies, confirmed rather than assumed

- **CORE-133.** GB-15 asserts that a ticket whose recorded worktree directory
  was deleted yields `WORKSPACE_MISSING` **and** recommends
  `RECOVER_EXPIRED_CLAIM`; it passes, so CORE-133's recoverable-workspace
  predicate is in this branch. The plan's deviation stop for its absence was not
  triggered.
- **SKILL-039.** GB-18 test D passes rather than recording `unavailable`, so
  `obsolete-after-change` is in `DISPOSITIONS` and the amendment landed.

## Deviations

Each is recorded in the checklist progress notes as well.

1. **GB-17 runs on the `repo` fixture, not `seeded`.** A constrained step packet
   requires a proven recorded branch and worktree
   (`execution-packet.ts:871`), and the `seeded` board has no Git checkout, so
   the plan's fixture could not produce a `step-packet/2`. The `repo` fixture
   gained a third clean worktree (`.worktrees/step` on `feature/step`) so the
   packet is not compiled against the deliberately dirty one GB-08 asserts on.
2. **The fixture plan pins its evidence versions.** Step compilation refuses a
   plan whose `## Starting state` does not name the current `research`/`files`
   content versions. That is the product behaving correctly, so `seedBoard`
   writes those documents first and embeds their exact versions.
3. **Step 3's stated unnarrowed `1/1 scenarios passed` was not reachable
   alongside the fail-closed coverage rule.** AC1 is the authority, so an
   unnarrowed run with a gap exits 2 and `--only` marks a deliberate narrowed
   diagnostic that skips the check. Step 3 was run both ways. The plan says
   "eleven" uncovered classes at that point; it is **twelve**, because GB-00 is
   the ADR-0021 guard and declares no FRD-035 scenario class.
4. **The v0.4.0 fixture holds 18 typed attempts, not the plan's 16.** Two of
   CORE-136's recorded commands evidence two contract steps each
   (`migrate-reconcile` + `workflow-acceptance`, `rollback` + `cut-over`), and
   AC3 names `migrate-reconcile` as required, so each is transcribed once per
   step with `transcribed_from` naming the proof attempt it came from. Every
   `command`, `cwd`, `exit_code` and `result` is the recorded value.
5. **GB-15's foreign-repository case needed a real second repository.** A bare
   directory outside the checkout classifies as `unavailable`, not
   `foreign-repository`, so the `repo` fixture contains its own `foreign-repo`
   `git init`.
6. **`stampClaim` writes claim frontmatter directly for two GB-14/GB-15 cases.**
   `take_ticket` refuses the board worktree outright (`worktree-guard.ts`) and a
   foreign repository is not reachable through it either, so the only honest way
   to materialise the states reconciliation exists to classify is the additive
   passthrough frontmatter a different writer would have left behind. It never
   edits a production file.

No deviation stop from the plan's Failure-and-deviation rules was triggered: no
dependency was missing, no scope grew beyond the eight Expected files, no
dependency was added, and nothing wrote to `.worktrees/kanmer`, the live board,
Git or GitHub.

## Risks and follow-ups

- **Rail duration.** `npm run verify` gains ~16–25 s on an unloaded Windows host.
  The runner's own fail-closed budget makes an overrun a deterministic failure
  rather than a slow green; command 18 is the recorded proof that the guard
  fires and names the scenarios it did not run.
- **The harness is a single point of failure for nineteen scenarios.** A bug in
  `call()` or the fixture materializers reads as many failures at once. That is
  the anti-churn root-cause class to apply if a review finds several failures
  with one mechanism: one class, one remedy.
- **`dist/golden/` is the default transcript location** and is already
  gitignored; the rail run writes there and commits nothing.
- Anti-churn amendment tests **E** and **G** remain parked with SKILL-039: they
  are agent-judgement properties with no server-observable contract. GB-18
  covers A, B, C, D and the mechanical half of F, each named by letter.

## For `kanmer-verify`

At the exact merge SHA, in a disposable detached worktree:

1. `npm run verify` — exit 0, with `npm run golden` printing
   `20/20 scenarios passed` and its own elapsed time inside the budget.
2. `npm run build && npm run plugin:build && npm run plugin:check` — exit 0, no
   bundle diff, 41 tools (nothing under `packages/core/src` or
   `packages/mcp-server/src/*.ts` changed, so the committed bundle's bytes must
   be identical).
3. `KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs node packages/mcp-server/src/smoke.mjs`,
   `… npm run smoke:protocol` and `… npm run golden` — all green.
4. `npm run typecheck` — unchanged; `.mjs` files in these locations are in no
   `tsconfig` include.
5. `git diff --check` silent; `package-lock.json` unchanged;
   `git -C .worktrees/kanmer status --porcelain` empty after the rail.
6. The diff touches only the eight Expected files.

## Owed to the controller

- `npm run verify` from the **main checkout** (not a linked worktree) with
  `TMP`/`TEMP` outside the home folder.
- `npm run build && npm run plugin:build && npm run plugin:check` from the main
  checkout — `plugin:check` refuses inside a worktree by design.
- Push `CORE-119-golden-board-evaluations` and open one PR titled
  `Build golden-board evaluations and stable-to-candidate promotion rollback proof (CORE-119)`
  whose body carries the standalone footer `Kanmer: CORE-119`.
- Record the PR in this ticket's `prs[]`, then the independent exact-head review.
- Do **not** run the live promotion rehearsal, install or roll back any release,
  or start CORE-137: those are ADR-0021 operator actions and CORE-137's scope.
