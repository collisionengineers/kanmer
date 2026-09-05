---
kind: review-attestation
pr: "327"
head_sha: "8ba0cc861b97a294a2e5f5137c6dc6a09d8bd88f"
verdict: pass
reviewer: "independent-reviewer-subagent"
independent: true
plan_hash: "17e8861ac33c87d8"
ticket_updated: "2026-09-05T04:11:11.798Z"
board_sha: "21cd0f6b6ae5f0ac61a608c80e01101234857bcc"
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
    reason: "Empirically correct on Windows across five invocation shapes and identical to the pre-existing idiom already used by scripts/test-scripts.mjs, so it is not a new pattern. The one residual case is a path reached through a symlink (ESM realpaths the main module, argv[1] is not realpathed); no rail path is symlinked, and CI's green Windows verify run exercises the real guard end to end."
  - id: F-007
    severity: note
    summary: "kanmer-gate was red at this head (run 33943879137, job 101247559337) with exactly one finding, NO_REVIEW_RECORD; the other eight checks passed and SYNC_REQUIRED reported 'unrecorded' because no attestation existed. Fixed by this record. The gate reads the remote board and does not re-trigger on a board push, so it must be re-run after the board carrying this attestation is pushed."
    disposition: fixed
  - id: F-008
    severity: minor
    summary: "PR #328 (CORE-145, head ce4587af) edits the same two hunks of packages/mcp-server/scripts/run-http-tests.mjs from the same base blob 89632ef9 — the header comment block and, decisively, the very `execFileSync(\"npm\", [\"run\", \"build\"], { cwd: packageRoot ... })` line this PR deletes. Whichever merges second will conflict there and must re-apply CORE-145's cold-checkout core-build guard inside this PR's COMMANDS.default loop by hand."
    disposition: accepted-risk
    reason: "A merge-order coordination cost, not a defect in either PR. The correct resolution is stated: keep CORE-145's existsSync-guarded `npm run build:core` as imperative code in the else branch and NOT as a COMMANDS.default entry — build:core expands to `npm run build -w @kanmer/core`, so declaring a conditional build as unconditional data would misstate the graph the new at-most-once assertion reads. No other file overlaps (#328's only other file is AGENTS.md)."
  - id: F-009
    severity: minor
    summary: "The PR is BEHIND main: base 37b83b14, and origin/main has since gained e474f317 (MCP-057) and 9945b1f2 (CORE-138). mergeStateStatus is BEHIND with mergeable MERGEABLE."
    disposition: accepted-risk
    reason: "Mechanical and non-conflicting: git diff --name-only 37b83b14 origin/main shares no file with this PR's four, so `gh pr update-branch` will produce a content-inert merge. It is nonetheless a merge-time obligation — after update-branch the head moves and this attestation must be replaced by a delta re-bind, with verify and kanmer-gate re-run at the new head."
---

# Independent review — CORE-144, PR #327

Head `8ba0cc861b97a294a2e5f5137c6dc6a09d8bd88f`, branch
`CORE-144-guard-fidelity`, base `main`, worktree `.worktrees/CORE-144`.
Reviewer did not write this code, did not push to the branch, did not merge,
and did not run the full `npm run verify`.

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

## Reviewer-run scoped checks (in `.worktrees/CORE-144` at `8ba0cc86`)

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
at this head). The full `npm run verify` was not run, per policy — CI ran it.

## CI

| Job | Run / job | Result |
|---|---|---|
| `verify` (windows, Node 24) | 33943879137 / 101247559781 | **success**, 8m1s, at `8ba0cc86` |
| `kanmer-gate` | 33943879137 / 101247559337 | **fail** — `NO_REVIEW_RECORD` only; eight other checks pass; `boardSha` read as `b42b9855`. See F-007 |
| `regate` | 33943879137 / 101247579557 | skipped (not a PR-event job) |
| earlier attempt | 33943872470 | both jobs cancelled by the workflow's concurrency group — not evidence |

## Threads

`reviewThreads` is empty and there are no PR reviews or issue comments on this
head, so `threads_snapshot` is an empty list truthfully. No bot threads exist,
and none would be a gate in any case.

## Residual risk

The guard is now faithful for the two runners it knows by name, but knows them
by literal text with no assertion that those names are still referenced
(F-003) — the same class of blindness this ticket exists to close, one level
up. The public `npm run test:http` build path changed form and is proven only
by the reviewer's direct execution, not by the rail (F-005). The entry-point
guard's failure mode is a silent zero-test pass rather than an error (F-006).
None of the three is reachable without a further change to these same files.

## Merge preconditions for the merger (Alex)

1. `gh pr update-branch` — the PR is BEHIND (F-009). The head will move; this
   attestation must then be replaced by a delta re-bind at the new head.
2. Re-run `verify` and `kanmer-gate` at the new head, after the board branch
   carrying this record is on the remote. The gate does not re-trigger on a
   board push.
3. Sequence #327 and #328 deliberately and resolve the known conflict in
   `run-http-tests.mjs` as described in F-008.

No finding is `open`; no blocker or major finding was raised. There are no
blocking changes for the implementing lane.
