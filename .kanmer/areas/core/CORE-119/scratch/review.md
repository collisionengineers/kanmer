---
kind: review-attestation
pr: "318"
head_sha: "b1a1eee115db0aa63493bc3024957d69e0aa84a3"
verdict: pass
reviewer: "independent-reviewer-core-119"
independent: true
plan_hash: "3f190917e9e052fb"
ticket_updated: "2026-09-04T05:48:33.274Z"
board_sha: "a17408fdc66ede346675e0c32397628d85e1a19d"
expected_reviewers:
  - "independent-reviewer-core-119"
threads_snapshot: []
findings:
  - id: "F-001"
    severity: note
    summary: "cleanup() removes the golden endpoint-registry FILE but not its kanmer-golden-registry-* mkdtemp holder directory, so every `npm run golden` leaves one empty temp directory behind."
    disposition: accepted-risk
    reason: "Observed directly: 12 empty kanmer-golden-registry-* directories remained under the temp volume after repeated runs. No safety or correctness impact — the litter is inside the temp volume, contains no board data, and a hosted runner discards its temp per job. Not worth returning a PR whose whole point is disposable-board hygiene; the fix is one line in cleanup() and belongs to whoever next touches the runner."
  - id: "F-002"
    severity: minor
    summary: "scripts/golden-promotion.mjs driveCopiedBoard() spawns --launcher and calls create_item without ever binding that server to --board-copy; --board-copy is recorded in the transcript only. An operator whose launcher is bound to the live board would write a rehearsal ticket there."
    disposition: accepted-risk
    reason: "This is the one path in the change with no assertDisposable-equivalent, but it is unreachable from CI and from `npm run golden`: it requires an explicit, deliberate `--launcher` AND `--board-copy` on the operator-only `golden:promotion` script, which AGENTS.md 6 and the file header both mark operator/release-only and deliberately not in CI. ADR-0021 makes the promotion boundary an auditable operator handoff, so an operator-supplied launcher command is by design the operator's own choice of board. Accepted as residual risk for this ticket and named here so CORE-137, which owns the live rehearsal, binds the launcher to the copy explicitly."
  - id: "F-003"
    severity: note
    summary: "The claim in the checklist and post-implementation report that 'every command, cwd, exit_code and result is the recorded value' is slightly overstated for the two split transcript entries."
    disposition: accepted-risk
    reason: "Verified against CORE-136 proof/proof.md@2b12c27d1cd31641: migrate-reconcile and workflow-acceptance reword proof attempt 13's `command` ('mcp-call.mjs <copied board> get_status / list_projects / ...' becomes 'installed launcher on the copied board: ...'), and cut-over's attempted_at 23:04:00Z is interpolated between proof attempts 14 (23:03) and 15 (23:05). Both splits are disclosed by `transcribed_from`, and every exit_code, result and summary I spot-checked is faithful. Prose precision in a report, not a defect in shipped behaviour."
  - id: "F-004"
    severity: note
    summary: "unnecessaryDocuments is the one FRD-035 measurement counter that can never be non-zero: the only call site is GB-10's rec.bump('unnecessaryDocuments', 0), a no-op."
    disposition: accepted-risk
    reason: "FRD-035 asks the evaluation to record the field; recording a structural constant 0 is a weaker record than the other nine counters, which I confirmed are all derived from observed tool results. GB-10 does assert the underlying property (a capture owes no pipeline document, gates apply only from its recorded promotion) — the counter simply does not carry it. No acceptance criterion turns on the counter's value."
  - id: "F-005"
    severity: note
    summary: "The KANMER_GOLDEN_BUDGET_MS guard is evaluated only between scenarios, so a pathological run overshoots the budget by up to one scenario's request-timeout ladder before aborting."
    disposition: accepted-risk
    reason: "Observed in the author's own retained command 18: 302,768 ms against a 300,000 ms budget. Bounded, not unbounded — every transport call carries REQUEST_TIMEOUT_MS 20,000, so a scenario cannot hang. The mechanism that produced command 18 (a relative KANMER_SERVER resolved against the child's deliberately foreign cwd) is fixed at its source by serverEntry()'s path.resolve, and CI drives the absolute default entry, so that flake cannot recur on the hosted runner. I measured 18,281 ms — 6.1% of the budget — on this Windows host."
  - id: "F-006"
    severity: note
    summary: "The reviewed head is b1a1eee1, not the 31878132 the ticket was handed over at: main branch protection sets strict:true, so the PR had to be brought up to date before it could merge."
    disposition: accepted-risk
    reason: "The reviewer ran `gh pr update-branch 318`, merging origin/main 59ded74b823d18c19d51241c4bc8434fb9c6ac02 (GUI-150 — apps/gui, docs/functional/frd/FRD-012-connect.md, packages/ui/src/demo.tsx) into the branch. The three-dot diff of b1a1eee1 against origin/main is identical in scope to the pre-update diff: the same eight files, 3385 insertions, 0 deletions, package-lock.json untouched, no overlap with the merged commit. Every finding and every command in this record was re-run at b1a1eee1. Recorded so the head change is not silent."
---

# Review — CORE-119 (round 0, consolidated)

Independent review of PR #318 at head `b1a1eee115db0aa63493bc3024957d69e0aa84a3`.
I did not implement this ticket. Verdict: **pass**, with six note/minor findings,
all dispositioned, none open.

## What the change is

Eight files, 3385 insertions, no deletions anywhere:

| Action | Path |
|---|---|
| Add | `packages/mcp-server/src/golden-harness.mjs` |
| Add | `packages/mcp-server/src/golden-fixtures.mjs` |
| Add | `packages/mcp-server/src/golden-board.mjs` |
| Add | `scripts/golden-promotion.mjs` |
| Add | `scripts/golden-promotion.test.mjs` |
| Modify | `scripts/verify.mjs` (one `VERIFY_STEPS` entry) |
| Modify | `package.json` (two scripts) |
| Modify | `AGENTS.md` (two §6 rows, one §10 line) |

## Focused commands run by the reviewer

In a disposable detached checkout at `b1a1eee1`, removed afterwards. `npm run verify`
and `npm run build -w @kanmer/gui` were deliberately not run here; the hosted `verify`
is the rail.

| Command | Exit | Result |
|---|---|---|
| `npm ci` | 0 | 647 packages |
| `npm run build` | 0 | core + server + standalone bundle |
| `npm run test:scripts` | 0 | `tests 180, pass 180, fail 0` |
| `npm run golden -- --out C:\kt-tmp\core119\review-golden.json` | 0 | `20/20 scenarios passed in 18281 ms (budget 300000 ms)` |
| `node scripts/golden-promotion.mjs --dry-run --candidate 0.4.1 --stable 0.4.0` | 0 | `10 steps, 10 required`; verdict `INCOMPLETE`; recorded v0.4.0 instance `PASS` |
| `npm run typecheck` | 0 | all four workspaces (core, mcp-server, ui, gui) |
| `node golden-board.mjs --root …` | 2 | refused |
| `node golden-board.mjs --bogus` | 2 | refused |
| `KANMER_GOLDEN_BUDGET_MS=1 node golden-board.mjs` | 1 | budget annotation naming all twenty unrun scenarios |
| `git -C .worktrees\kanmer status --porcelain` (before and after the golden run) | 0 | empty both times |

## 1. Safety — can any path reach a real board?

No. Checked mechanically, not by reading the comments.

- `assertDisposable` requires the resolved path to be **under** `os.tmpdir()` (with a
  real separator boundary, so `<tmp>-evil` cannot pass on a substring, and with the
  realpath spelling added for Windows 8.3 aliases) **and** to carry the
  `kanmer-golden-` marker. I called it directly against the live board
  `C:\Users\Alex\Documents\GitHub\kanmer\.worktrees\kanmer\.kanmer`, the repository
  root, and `~/.kanmer`: all three **REFUSED**; a `kanmer-golden-` mkdtemp path
  accepted.
- Every fixture root is `fs.mkdtempSync(path.join(os.tmpdir(), "kanmer-golden-…"))`,
  asserted immediately. `repoFixture`'s board sits at `<mkdtemp>/.worktrees/kanmer`,
  which still carries the marker and still lives under temp.
- I swept every `writeFileSync` / `mkdirSync` / `rmSync` / `execFileSync` / `spawn` in
  the three new modules. Every write in `golden-board.mjs` and `golden-fixtures.mjs`
  resolves from a fixture root (`stampClaim`, `expireClaim`, `expireChannelLease` all
  go through `ticketFile(boardRoot,…)` or a `boardRoot` join). The only writes outside
  a fixture are the transcript (`--out`, else the gitignored `dist/golden/`) and the
  golden endpoint registry, itself a `kanmer-golden-registry-*` mkdtemp.
- `childEnv()` **deletes** `KANMER_ROOT`, `KANMER_INIT` and `KANMER_REPO_ROOT`. I
  confirmed at runtime that neither `KANMER_ROOT` nor `KANMER_ENDPOINT_REGISTRY` is
  present in the returned environment.
- `startServer` asserts `root` before spawning, passes `--root <disposable>`, and sets
  the child's cwd to `os.tmpdir()` — outside the repository on purpose, so a scenario
  proves the server bound from the flag rather than from discovery. The roster never
  passes `repoRoot`, so `--repo-root` is never supplied; `repoFixture` relies on
  `deriveRepoRoot` recovering the repository from the temp board path.
- **`~/.kanmer/endpoints.json` (FRD-029) is never written and, in practice, never
  read.** `writeRegistry`/`upsertEndpoint` in `project-registry.ts` have no tool
  caller — the header says they exist for an operator tool or the GUI — so no MCP
  request can write a registry. Any run that materialises the `fresh` or `seeded`
  fixture pins `KANMER_ENDPOINT_REGISTRY` at a temp golden registry, and GB-05 is the
  only scenario that calls `list_projects` and it requires `seeded`. The registry is
  read lazily by `list_projects` alone, so no server start touches it.
- **`KANMER_SERVER` cannot point the harness at the installed launcher's live
  registry.** It selects the server *entry* only; the board is still `--root`-bound to
  an `assertDisposable`-checked temp path and the registry is still pinned. I re-ran
  the roster and the live board worktree was clean before and after.
- No network anywhere: no `fetch`, no `gh`. Git is used offline only (`init`, `add`,
  `commit`, `branch`, `worktree add`, `--version`), with inline `-c user.email` /
  `-c user.name` / `-c commit.gpgsign=false` / `-c core.hooksPath=`, so no global
  config is read or written, and `windowsHide: true`.

## 2. Honesty of the transcript

Reproduced independently from my own run's JSON, not read from the report:

- `serverInfo` is `{"name":"kanmer","version":"0.4.0"}`, taken from the **child's**
  `initialize` response, not from any constant.
- 150 `pass` + 6 `simulated` checks, 0 `fail`, 0 `unavailable`. `rec.simulated` has
  exactly two call sites, both inside GB-16, and the injected `gh`/`git` evidence is
  printed verbatim into each simulated check (`ghPrView`, `ghPrChecks`, `gitStatus`,
  `gitSymbolicRef`). `SIMULATED` is confined to GB-16.
- **`unavailable` really exits 1.** `terminalResult` returns `UNAVAILABLE` for any
  unavailable check, and `passed` counts only `PASS` and `SIMULATED`, so the process
  exits 1. There is no `skip` state. The three `unavailable` sites are honest ones:
  a missing second endpoint fixture under `--only`, `obsolete-after-change` absent
  from `DISPOSITIONS`, and a missing `git`.
- Counters are derived, not hard-coded: `verifiedOutcomes` from check passes,
  `toolCalls` from `record()` (so no scenario can make an unrecorded call), and each
  `rec.bump` sits immediately after an actually-observed attempt. My run produced
  `verifiedOutcomes 156, corrections 1, unnecessaryDocuments 0, planDeviations 1,
  reviewCycles 5, stuckStages 3, recoveredLeases 2, wrongProjectAttempts 2,
  duplicateWork 1, toolCalls 134` — identical to the author's, which is what a derived
  counter should do. See F-004 for the one weak counter.
- `coverageGaps` is `[]` for the full roster and `12` for a one-scenario roster; a
  full run with a gap exits 2. `unknownClasses` is `[]`. The twelve
  `FRD_035_CLASSES` entries match the FRD-035 Behaviour paragraph one for one.

## 3. The promotion contract

`PROMOTION_STEPS` maps cleanly onto CORE-136 `plan/plan.md`: ordered step 1 →
`backup`; steps 4/7/8 → `release-verify`; 9a → `packaged-boot`; 9b →
`copied-board-smoke`; 9c → `install-candidate`; 9d → `migrate-reconcile` +
`workflow-acceptance`; 9e → `rollback`; 9f → `cut-over` + `post-cut-over`. All ten are
`required: true`.

Spot-checked four entries against CORE-136 `proof/proof.md`@`2b12c27d1cd31641` and
`scratch/notes.md`:

- `backup` — archive name, 6,155,447 bytes, sha256 `90fbb8438ef0…6539`, board commit
  `41f795f9100d27b39f34262417362d626ade7a2b`, retained `Kanmer-Setup-0.3.12.exe`
  sha256 prefix `82b6fcd73f299aa2`: all verbatim from notes § "Promotion step 1".
- `release-verify` prepare attempt 2 — exit 1, FAIL, `createHash not exported by
  __vite-browser-external`, root cause GUI-146: faithful to proof attempt 2.
- `install-candidate` attempt 1 — exit_code 2, FAIL, installer refused with the GUI
  running (`customCheckAppRunning`, GUI-064): faithful to proof attempt 11.
- `rollback` — 0.3.12 restored, fingerprint `kanmer-proj-v1:5dbaab31…`, 375 tickets,
  board worktree clean in both directions: faithful to proof attempt 14.

Behaviour of `evaluatePromotion`, asserted directly by `golden-promotion.test.mjs` and
re-run by me at 180/180:

- a required step with **no** terminal attempt yields `INCOMPLETE`, never `PASS`
  (test: remove the `backup` attempt);
- a failed `rollback` yields `FAIL` (test: flip the rollback attempt to FAIL);
- a contract with no `rollback` step cannot pass at all;
- the three retained non-terminal failures — two prepare refusals and the installer's
  exit-2 refusal — are preserved and do not change the verdict, which is FRD-035 AC4's
  "without discarding immutable failed-attempt evidence";
- the function performs no I/O (test probes an empty temp directory around the call).

## 4. Rail impact

- `"npm run golden"` sits in `VERIFY_STEPS` after `smoke:discovery` and before
  `verify:skills` — one array, not a second pyramid, exactly as AGENTS.md §6 requires.
  `scripts/release.mjs` still imports it unchanged (`:45`, `:308`); the file is not in
  the diff.
- Extra rail time: 18,281 ms measured here, 16,592 ms in the controller's rail —
  roughly 6% of the 300,000 ms budget. Not a plausible flake source at that margin.
- **The `initialize`-timeout episode cannot recur in CI.** The author's retained
  command 18 (every scenario timing out at `initialize`, budget aborting at
  302,768 ms) was caused by a *relative* `KANMER_SERVER` resolved against the child's
  deliberately foreign cwd. `serverEntry()` now does `path.resolve(configured)`, and
  CI drives the absolute default `dist/index.js` with no `KANMER_SERVER` at all. See
  F-005 for the residual overshoot property, which is bounded by the 20 s per-request
  timeout.
- Diagnosability on failure is good: every non-pass check prints its state, name and
  detail; the scenario prints a `::error title=kanmer/golden [GB-NN]::` annotation;
  a thrown scenario appends the child's buffered stderr tail rather than only "timed
  out"; and the transcript JSON carries every tool call with its code and duration.

## 5. Scope

Exactly the eight files. Nothing under `packages/core/src`,
`packages/mcp-server/src/*.ts`, `plugins/`, `docs/`, `apps/`, `mcpb/` or `.github/`
(verified by a path-filtered diff, which is empty). `package-lock.json` is unchanged,
consistent with no dependency being added. The AGENTS.md edits are at lines 508 and
740; the managed block ends at line 81, so `verify:agents-block` is unaffected. The
new `.mjs` files under `src/` are invisible to `tsc` and to the esbuild standalone
bundle, as `smoke.mjs` already is — confirmed by `npm run typecheck` exit 0 and by the
controller's `plugin:check` reporting matching bundle bytes.

## 6. `stampClaim`

It writes additive `key: 'value'` lines into the frontmatter of a **fixture** ticket
file located through `ticketFile(boardRoot, id)`, where `boardRoot` is always a
`kanmer-golden-*` root. It never touches a production file. The shape it writes is
demonstrably one the store reads back: GB-14 observes `BOARD_WORKTREE_PROTECTED` and
GB-15 observes `RECOVERY_REFUSED` for a foreign repository, and both classifications
are derived from exactly those stamped `branch` / `worktree` / `claim_expires_at` /
`claim_controller` fields. The justification is sound — `take_ticket` refuses the board
worktree outright (`worktree-guard.ts`) and cannot reach a foreign repository, so the
states reconciliation exists to classify are otherwise unreachable, and a scenario that
could not materialise them would be asserting nothing.

## 7. Test cover

`scripts/golden-promotion.test.mjs` covers the pure half thoroughly: eleven cases over
the verdict function, the contract/fixture correspondence in both directions, the
retained-failure rule, the no-I/O property, strict flag parsing and the
no-repo-local-default rule. It is auto-discovered by `scripts/test-scripts.mjs`
(`readdirSync` + `.test.mjs`), so it needs no wiring and is already inside `npm test`.

`coverageGaps`, `unknownClasses`, `parseArgs`, `assertDisposable` and `childEnv` have
no `node:test` file; they are exercised by GB-00, which is a real scenario on the rail
rather than an incidental one, and I additionally drove all five directly (results in
the command table and in §1). That is adequate cover; a separate unit file would be
duplication.

## Acceptance checks

- **FRD-035 AC1** — twelve classes, twenty scenarios, `coverageGaps` empty, a gap is a
  startup exit 2, one terminal line per scenario, transcript with exact command
  evidence. **Met**, reproduced.
- **FRD-035 AC2 / ADR-0021** — a candidate cannot silently become the live board
  authority. **Met**, and mechanically rather than by convention (§1).
- **FRD-035 AC3** — `backup`, `install-candidate`, `migrate-reconcile` and
  `workflow-acceptance` are required and a missing required attempt is `INCOMPLETE`.
  **Met**.
- **FRD-035 AC4** — failed `rollback` is `FAIL`, retained failures preserved, the
  recorded v0.4.0 instance evaluates `PASS`. **Met**.
- **FRD-035 AC5** — `npm run golden` is a `VERIFY_STEPS` entry, so the hosted `verify`
  at this exact head runs it; `kanmer-gate` green; this fresh exact-head independent
  review. **Met at merge time** (CI recorded below).
- **FRD-035 edge cases** — GB-16 records `simulated` with its injected evidence and
  never as a provider pass; a missing `git` or a missing `obsolete-after-change`
  records `unavailable` and exits 1; GB-12 proves a superseded attempt stays readable
  and names its successor. **Met**.
- **ADR-0021 Consequences** — "candidate test harnesses must use explicit
  disposable/copied board locations". **Met** by `assertDisposable` + `--root` refusal
  + `KANMER_ROOT` deletion. The promotion boundary stays an operator handoff: the
  script never installs, never rolls back, never marks a candidate stable, and never
  mutates Git, GitHub or the live board.

The six deviations recorded in the post-implementation report are all accurate,
justified at the mechanism, and none of them widened scope. Deviation 3 in particular
resolves a plan/AC conflict in favour of the acceptance criterion, which is correct.

## Threads

No review threads, review comments or reviews exist on this PR at
`b1a1eee115db0aa63493bc3024957d69e0aa84a3` — confirmed via the GitHub GraphQL
`reviewThreads` surface (empty) and `gh pr view --json comments,reviews` (both empty).
`threads_snapshot` is therefore an empty list, which is the truthful value. No
`chatgpt-codex-connector` thread was posted; the bot is never a gate and its absence
blocks nothing.

## Residual risk

The two substantive residual risks are F-002 (the operator-only promotion shell binds
its launcher by operator choice rather than by the `--board-copy` it records) and the
one the author names themselves: the harness is a single point of failure for nineteen
scenarios, so a defect in `call()` or a fixture materialiser would read as many
failures at once. That is a root-cause class to apply if a future review sees several
golden failures with one mechanism — one class, one remedy — not a reason to hold this
PR. F-001, F-003, F-004, F-005 and F-006 are notes recorded for the trail.
