---
kind: review-attestation
pr: "327"
head_sha: "194c61a80530e812465c76b5afb3c1449b1b0526"
verdict: pass
reviewer: "independent-reviewer-subagent"
independent: true
plan_hash: "17e8861ac33c87d8"
ticket_updated: "2026-09-05T04:11:11.798Z"
board_sha: "0f048907f20ac4b602a4e157573ae187238ca101"
expected_reviewers:
  - "independent-reviewer-subagent"
threads_snapshot: []
findings:
  - id: F-001
    severity: note
    summary: "CORE-140 F-001 (resolver blind to the two runner scripts) is closed: both runners export COMMANDS as pure data, resolve_ expands the two known leaves through it, and the reviewer's own on-disk mutation (dropping --assume-built from the real package.json test:built) now fails the new per-workspace assertion, where CORE-140's review proved it stayed green."
    disposition: fixed
  - id: F-002
    severity: note
    summary: "CORE-140 F-002 (untracked-directory blind spot in computeDirtyDigest) is closed: -uall is passed to git status --porcelain=v1 -z. Reviewer probe confirms git collapses an untracked dir to a single '?? d/' entry without -uall and lists '?? d/a.txt', '?? d/b.txt' with it; the new temp-repo regression test reproduces the original probe and passes."
    disposition: fixed
  - id: F-004
    severity: note
    summary: "CORE-140 F-004 (rename/copy -z paired path mis-parsed) is closed. Reviewer probe confirms the exact -z shape 'R  new.txt' NUL 'old.txt': the paired path carries no status prefix, and the new i += 1 on an R/C status consumes it. Only R and C can appear in a porcelain status pair, so the skip cannot fire on a non-rename entry."
    disposition: fixed
  - id: F-003
    severity: minor
    summary: "The resolver's runner expansion is keyed by literal leaf text in RUNNER_COMMANDS ('scripts/run-tests.mjs', 'scripts/run-http-tests.mjs'). Renaming either script, changing the package.json leaf text, or adding a third runner silently returns the resolver to the pre-CORE-144 blind state: an unmatched leaf records zero invocations, and both build-count assertions then pass vacuously. The keys are also filename-only, so a root-level file sharing a workspace runner's basename would alias."
    disposition: accepted-risk
    reason: "The failure mode is the pre-existing resolver behaviour for any unrecognised leaf, is documented as residual risk in the post-implementation report, and closing it (asserting every RUNNER_COMMANDS key is actually referenced by some resolved script body) is a new assertion the ticket's 'out of scope' section excludes. The risk is bounded: it requires a rename of a rail runner, which is itself a change to the files this guard covers."
  - id: F-005
    severity: note
    summary: "run-http-tests.mjs's default (non---assume-built) branch changed from `npm run build` with cwd=packageRoot to `npm run build -w @kanmer/mcp-server` with cwd=repoRoot, driven through runNpmCommand's naive command.split(' ').slice(1). That branch is the public `npm run test:http` path and is not exercised by the rail (the rail uses test:http:built, whose COMMANDS.assumeBuilt list is empty), so CI's green verify does not cover it."
    disposition: accepted-risk
    reason: "Reviewer ran `npm run build -w @kanmer/mcp-server` from the repo root in the worktree: exit 0, identical tsup + tsup --config tsup.standalone.config.ts outputs, and the subsequent build-stamp --assert server standalone passed against that build. The naive split is safe for the only two literals it can receive (no quoting, no shell metacharacters) and would break loudly, not silently, if a quoted argument were ever added."
  - id: F-006
    severity: note
    summary: "The main() entry-point guard (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) is load-bearing in a dangerous direction: if it ever failed to match, `npm test` / `npm run test:built` would exit 0 having run nothing. Reviewer probed it on this Windows host with a faithful copy: relative invocation, absolute backslash path, all-lowercase drive-letter path, invocation from a different cwd, and via npm all run main(); import does not. Both sides derive from the same argv[1] string, so drive-letter and separator casing cannot diverge."
    disposition: accepted-risk
    reason: "Empirically correct on Windows across five invocation shapes and identical to the pre-existing idiom already used by scripts/test-scripts.mjs, so it is not a new pattern. The one residual case is a path reached through a symlink (ESM realpaths the main module, argv[1] is not realpathed); no rail path is symlinked, and the green Windows verify run at 8ba0cc86 exercises the real guard end to end."
  - id: F-007
    severity: note
    summary: "kanmer-gate was red at the previously attested head 8ba0cc86 (run 33943879137, job 101247559337) with exactly one finding, NO_REVIEW_RECORD. After the board carrying the first attestation reached the remote it was re-run and passed (job 101248787234): NO_REVIEW_RECORD pass, STALE_REVIEW pass, SYNC_REQUIRED 'current' (attested board 21cd0f6b on fetched tip 6f37b292), strict true. It must be re-run once more at 194c61a8 against this record's board_sha."
    disposition: fixed
  - id: F-008
    severity: minor
    summary: "PR #328 (CORE-145, head ce4587af) edits the same two hunks of packages/mcp-server/scripts/run-http-tests.mjs from the same base blob 89632ef9 — the header comment block and, decisively, the very `execFileSync(\"npm\", [\"run\", \"build\"], { cwd: packageRoot ... })` line this PR deletes. Whichever merges second will conflict there and must re-apply CORE-145's cold-checkout core-build guard inside this PR's COMMANDS.default loop by hand."
    disposition: accepted-risk
    reason: "A merge-order coordination cost, not a defect in either PR. The correct resolution is stated: keep CORE-145's existsSync-guarded `npm run build:core` as imperative code in the else branch and NOT as a COMMANDS.default entry — build:core expands to `npm run build -w @kanmer/core`, so declaring a conditional build as unconditional data would misstate the graph the new at-most-once assertion reads. No other file overlaps (#328's only other file is AGENTS.md)."
  - id: F-009
    severity: minor
    summary: "The BEHIND condition recorded at 8ba0cc86 has been resolved by `gh pr update-branch`: head is now the merge commit 194c61a8, which brings in main's e474f317 (MCP-057) and 9945b1f2 (CORE-138). mergeStateStatus is now BLOCKED (checks pending), mergeable MERGEABLE."
    disposition: fixed
  - id: F-010
    severity: minor
    summary: "At the moment of this re-bind, `verify` and `kanmer-gate` at 194c61a8 (run 33968076419, jobs 101311615310 and 101311615182) were both queued/pending; `regate` skipping. The rail's own green evidence is from the previous head 8ba0cc86 (run 33943879137, job 101248787900, 8m1s)."
    disposition: accepted-risk
    reason: "The merge is proven content-inert for this PR's scope (see the delta-proof section: all four CORE-144 blobs are byte-identical at 8ba0cc86 and 194c61a8), so the substantive review transfers. It is nonetheless a merge-time obligation, not a reviewer conclusion: the merger must require verify and kanmer-gate green at 194c61a8 before merging. Pending checks are recorded here as evidence, never presented as a green required gate."
---

# Independent review — CORE-144, PR #327 (delta re-bind to `194c61a8`)

Head `194c61a80530e812465c76b5afb3c1449b1b0526`, branch
`CORE-144-guard-fidelity`, base `main`, worktree `.worktrees/CORE-144`. This
head is `gh pr update-branch`'s merge of `main` (`9945b1f2`) into the branch;
the substantive review below was performed on
`8ba0cc861b97a294a2e5f5137c6dc6a09d8bd88f` and is carried forward after
proving the merge changed nothing in CORE-144's scope. Reviewer did not write
this code, did not push to the branch, did not merge, and did not run the full
`npm run verify`.

## Re-bind proof: the delta is only the merge of main

- `git log --oneline 8ba0cc86..194c61a8` is exactly three commits — the merge
  commit `194c61a8` plus the two `main` commits it brought in: `e474f317`
  (MCP-057) and `9945b1f2` (CORE-138).
- `git diff 9945b1f2...194c61a8 --stat` is **exactly** CORE-144's four files at
  +197/−30: `packages/mcp-server/scripts/run-http-tests.mjs`,
  `scripts/build-stamp.mjs`, `scripts/run-tests.mjs`,
  `scripts/verify-steps.test.mjs`. Nothing else is contributed by this branch.
- **Blob-level check, the decisive one:** all four files hash identically at
  `8ba0cc86` and `194c61a8` — `cd6a77a9`, `aaecf72f`, `d7466f48`, `fa0b03e8`
  respectively. Nothing was resolved, reformatted or dropped, so every scoped
  check and mutation probe recorded below still describes the bytes now on the
  PR head.
- `git diff --name-only 8ba0cc86 194c61a8` is exactly main's 20 files
  (MCP-057's `packages/core/**` receipts/reconciliation work and CORE-138's
  `.github/workflows/pr.yml`, `check-pr.mjs`, `pr-workflow.test.mjs`, skills
  and `AGENTS.md`). **No file appears on both sides**, so there was nothing to
  conflict and no shared file to re-verify.
- No conflict markers exist anywhere under `scripts/` or
  `packages/mcp-server/scripts/` at the merged head.

Verdict is therefore unchanged from the `8ba0cc86` review, and every finding
is carried forward with its disposition; F-007 and F-009 are updated to their
now-fixed state and F-010 is new (pending checks at this head — the written
reason a new finding may appear in a later round).

## Scope reviewed

Four files, no `package.json` and no `package-lock.json` change, no new
dependency, node builtins only:

- `scripts/run-tests.mjs` — `COMMANDS = { default, assumeBuilt }` exported as
  frozen data; `main()` loops the selected list; `main()` guarded behind an
  entry-point check.
- `packages/mcp-server/scripts/run-http-tests.mjs` — same shape;
  `COMMANDS.default = ["npm run build -w @kanmer/mcp-server"]`,
  `COMMANDS.assumeBuilt = []`; same entry-point guard.
- `scripts/verify-steps.test.mjs` — imports both `COMMANDS`; `resolve_` gains a
  runner-leaf branch; two new tests plus one new build-stamp regression test.
- `scripts/build-stamp.mjs` — `computeDirtyDigest` gains `-uall` and consumes
  the paired rename/copy path.

`VERIFY_STEPS`, its ordering, and the public `npm test` / `npm run mcpb:check`
command surfaces are untouched, as the ticket's "out of scope" section
requires. `scripts/test-scripts.mjs` discovers by `readdirSync` +
`.test.mjs` suffix and is unchanged; `npm run test:scripts` still collects the
whole suite (196 tests, up from 189 at CORE-140, +3 of them from this PR).

## Acceptance checks

| Contract item | Evidence | Result |
|---|---|---|
| The static guard sees through the two runner scripts | `resolve_` matches `^node (scripts/run-tests\|scripts/run-http-tests)\.mjs( --assume-built)?$` and recurses into `COMMANDS[mode]`. Nested commands carry explicit `-w` or are root scripts, so propagating `currentWorkspace` is correct. | met |
| The new assertion is real, not vacuous | **Mutation test run on disk, not synthetically:** reviewer edited the real `package.json` `test:built` to `"node scripts/run-tests.mjs"` (flag dropped) and re-ran `node --test scripts/verify-steps.test.mjs` — `every workspace's own build script is reached at most once across the rail` **failed** (11 pass / 1 fail). This is exactly the regression CORE-140's review proved stayed green. `package.json` restored; `git status` clean afterwards. | met |
| `computeDirtyDigest` uses `-uall` and its effect is real | Temp-repo probe: without `-uall` the segments are `["R  new.txt","old.txt","?? d/"]`; with `-uall` they are `["R  new.txt","old.txt","?? d/a.txt","?? d/b.txt"]`. The in-repo regression test (`probe-dir/a.txt` → stamp → `probe-dir/b.txt` → expect refusal) passes. | met |
| Rename/copy `-z` parsing | The same probe pins the shape: `R  new.txt` NUL `old.txt` — new path first, paired path with no status prefix. `status.includes("R"\|"C")` then `i += 1` consumes it; `R`/`C` occur in porcelain status codes only for rename/copy, and the surviving hashed path (`new.txt`) is the one that exists. | met |
| No behaviour change to public commands or the rail | `run-tests.mjs`'s two lists reproduce the previous inline chain command-for-command and in order (only `test:http` vs `test:http:built` differs by mode, as before). `run-http-tests.mjs`'s file list and `--assume-built` branch are untouched. Rail steps and their order are unchanged. Only the default-branch invocation form changed — see F-005, verified equivalent by direct execution. | met |
| No new dependencies | Diff is four files; no manifest or lockfile change; every addition uses node builtins. | met |
| Entry-point guard works on Windows | Five-shape probe (relative, absolute backslash, lowercase drive, other cwd, via npm) all run `main()`; import does not. Both sides of the comparison derive from the same `argv[1]` string, so casing cannot diverge. See F-006. | met |

## Reviewer-run scoped checks (in `.worktrees/CORE-144` at `8ba0cc86`; every file they exercised is byte-identical at `194c61a8`)

| Command | Result |
|---|---|
| `node --test scripts/verify-steps.test.mjs` | 12/12 pass |
| `node --test scripts/verify-steps.test.mjs` with the real `test:built` mutated | 11 pass / 1 fail — the new per-workspace assertion catches it |
| `npm run test:scripts` | 196/196 pass, 13 suites |
| `npm run build` | exit 0 |
| `node scripts/build-stamp.mjs --write` | exit 0, `head 8ba0cc861b97`, `dirty=false` |
| `node scripts/build-stamp.mjs --assert server standalone` | exit 0 |
| `npm run build -w @kanmer/mcp-server` (F-005 equivalence) | exit 0 |
| Temp-repo git probe (`-uall`, rename `-z` shape) | as tabled above |
| Entry-point guard probe, five invocation shapes | guard correct in all five |
| `git status --porcelain=v1` after every probe | clean |

`npm ci` was not needed (the worktree's `node_modules` was already installed
at this head). The full `npm run verify` was not run, per policy — CI runs it.

## CI

| Head | Job | Run / job | Result |
|---|---|---|---|
| `8ba0cc86` | `verify` (windows, Node 24) | 33943879137 / 101248787900 | **success**, 8m1s |
| `8ba0cc86` | `kanmer-gate` | 33943879137 / 101247559337, re-run 101248787234 | fail (`NO_REVIEW_RECORD` only), then **pass** after the first attestation reached the remote board — `STALE_REVIEW` pass, `SYNC_REQUIRED` current (`21cd0f6b` on tip `6f37b292`), `strict: true` |
| `8ba0cc86` | `regate` | 33943879137 | skipped (not a PR-event job) |
| `194c61a8` | `verify`, `kanmer-gate` | 33968076419 / 101311615310, 101311615182 | **pending at attestation time** — see F-010; both must be green before merge |
| earlier | — | 33943872470 | both jobs cancelled by the workflow's concurrency group — not evidence |

## Threads

`reviewThreads` is empty at `194c61a8` and there are no PR reviews or issue
comments on this head, so `threads_snapshot` is an empty list truthfully. No
bot threads exist, and none would be a gate in any case.

## Residual risk

The guard is now faithful for the two runners it knows by name, but knows them
by literal text with no assertion that those names are still referenced
(F-003) — the same class of blindness this ticket exists to close, one level
up. The public `npm run test:http` build path changed form and is proven only
by the reviewer's direct execution, not by the rail (F-005). The entry-point
guard's failure mode is a silent zero-test pass rather than an error (F-006).
None of the three is reachable without a further change to these same files.
Finally, the rail has been proven green at `8ba0cc86` but not yet at
`194c61a8`; the argument that it transfers rests on the blob-identity proof
above, not on a completed run at the new head (F-010).

## Merge preconditions for the merger (Alex)

1. Require `verify` **and** `kanmer-gate` green at `194c61a8` (run
   33968076419 or a later one). Pending is not green.
2. `kanmer-gate` must run after the board branch carrying this record is on
   the remote — it reads the remote board tip and does not re-trigger on a
   board push. This record's `board_sha` is `0f048907…`.
3. Re-check `git -C <board worktree> rev-parse kanmer-board` equals
   `git -C <repo root> rev-parse origin/kanmer-board` immediately before
   `gh pr merge`.
4. Sequence #327 and #328 deliberately and resolve the known
   `run-http-tests.mjs` conflict as described in F-008.

No finding is `open`; no blocker or major finding was raised. There are no
blocking changes for the implementing lane.
