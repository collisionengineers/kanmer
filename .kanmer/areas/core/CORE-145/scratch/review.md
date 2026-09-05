---
kind: review-attestation
pr: "328"
head_sha: "3ebb71232c4505aea4019a49655be8c1144d68b4"
verdict: pass
reviewer: "independent-reviewer-subagent"
independent: true
plan_hash: "97dbda4a9709e55c"
ticket_updated: "2026-09-05T13:26:20.387Z"
board_sha: "3e00f81384de417c8c401eef0906bc25cf73a9c3"
expected_reviewers:
  - "independent-reviewer-subagent"
threads_snapshot: []
findings:
  - id: F-001
    severity: note
    summary: "Round 1: kanmer-gate red at ce4587af with the sole finding NO_REVIEW_RECORD. Fixed by the round-1 attestation."
    disposition: fixed
  - id: F-002
    severity: minor
    summary: "Round 1: sibling PR #327 (CORE-144) edits the same else-branch of packages/mcp-server/scripts/run-http-tests.mjs, so once #327 landed, #328 conflicted there and could not be auto-merged or updated with gh pr update-branch."
    disposition: fixed
    reason: "superseded by 3ebb71232c4505aea4019a49655be8c1144d68b4"
  - id: F-003
    severity: note
    summary: "Round 1: after #327, COMMANDS.default would under-describe the default mode because the conditional core build lives in the execution path rather than the exported data."
    disposition: fixed
    reason: "superseded by 3ebb71232c4505aea4019a49655be8c1144d68b4 — the resolution keeps the imperative placement and documents in-file exactly why (COMMANDS.default is read as an unconditional command list by verify-steps.test.mjs's at-most-once assertion, so a conditional build declared there would lie to that guard). The gap is now stated at the call site instead of being silent."
  - id: F-004
    severity: note
    summary: "The cold-checkout behaviour has no automated regression guard. The only proof is a manual fresh clone + npm ci + test:http run; nothing in scripts/verify-steps.test.mjs, test:scripts or the rail would fail if the existsSync branch were deleted."
    disposition: accepted-risk
    reason: "A genuine cold-clone probe costs a full clone plus npm ci and cannot sit in the rail at reasonable cost. The reviewer reproduced the proof independently at both heads and ran a negative control at round 1 (removing packages/core/dist makes the mcp-server build fail in esbuild), so the fix is demonstrably load-bearing."
  - id: F-005
    severity: note
    summary: "The probe tests only packages/core/dist/index.js. @kanmer/core also exports ./browser -> dist/browser.js, so a partial or stale core dist containing index.js but not browser.js would not be rebuilt."
    disposition: accepted-risk
    reason: "Not reachable in practice: core's build is a single tsup run that emits both entries (plus check-browser.mjs), so a dist with index.js and no browser.js implies a build the operator already saw fail. The mcp-server test path resolves only the root export."
  - id: F-006
    severity: note
    summary: "Round 1: PR #328 was BEHIND main at 9945b1f2."
    disposition: fixed
    reason: "superseded by 3ebb71232c4505aea4019a49655be8c1144d68b4, which merges origin/main at de5bace9 into the branch."
  - id: F-007
    severity: note
    summary: "The core build call uses shell: true with an args array, which Node 24 flags as DEP0190 (args are concatenated, not escaped). Observed again in the round-2 fresh-clone run."
    disposition: accepted-risk
    reason: "At this head the call goes through CORE-144's own runNpmCommand helper, which owns that shell: true pattern for every command in the file; both arg lists are hard-coded literals with no interpolated input, so no injection surface exists. Changing the pattern is a file-wide hygiene change owned by CORE-144's code, out of this ticket's scope."
  - id: F-008
    severity: note
    summary: "kanmer-gate is red at 3ebb7123 with the single finding STALE_REVIEW (attested head ce4587af != PR head 3ebb7123); NO_REVIEW_RECORD and the other eight checks pass, including SYNC_REQUIRED. Fixed by this round-2 attestation, which rebinds the record to 3ebb7123. The gate reads the remote board and does not re-trigger on a board push, so it must be re-run after this board commit is pushed."
    disposition: fixed
---

# Independent review — CORE-145, PR #328 (round 2, delta)

Head `3ebb71232c4505aea4019a49655be8c1144d68b4`, branch
`CORE-145-mcp-server-build-core`, base `main` at
`de5bace9245f7ad1f84f885eaa1cbcd55099607e`. This head is a merge commit with
parents `ce4587af` (the round-1 reviewed head) and `de5bace9` (`main`
including CORE-144 / PR #327). Round 1 attested `ce4587af`; this record
replaces it and is the authoritative review.

Reviewer did not write this code, did not resolve the conflict, did not push
to the branch, did not merge, and did not run the full `npm run verify`.

## Delta scope

The delta is exactly the merge of `origin/main` plus the one-hunk conflict
resolution in `packages/mcp-server/scripts/run-http-tests.mjs` that round 1's
F-002 predicted and prescribed. The review below is limited to that
resolution, its direct contracts, and the tests that cover them; the round-1
conclusions on the unchanged CORE-145 substance carry forward.

## The conflict resolution — confirmed correct

`git diff de5bace9...3ebb7123 --numstat` is exactly two files and nothing
else:

```
1	1	AGENTS.md
21	0	packages/mcp-server/scripts/run-http-tests.mjs
```

i.e. the merge introduced no change of its own beyond CORE-145's own content,
and no CORE-144 or `main` file was altered, reverted or partially resolved.
`git grep` for conflict markers across `packages/`, `scripts/` and `AGENTS.md`
at `3ebb7123` returns nothing.

The resolved `else` branch is exactly the form round 1 prescribed —
imperative and conditional, **before** the loop, and **not** in the data:

```js
  } else {
    if (!existsSync(coreDistIndex)) {
      runNpmCommand("npm run build:core");
    }
    for (const command of COMMANDS.default) {
      runNpmCommand(command);
    }
  }
```

CORE-144's contributions are intact at this head:

- `export const COMMANDS = Object.freeze({ default: Object.freeze(["npm run
  build -w @kanmer/mcp-server"]), assumeBuilt: Object.freeze([]) });` —
  unchanged, both modes, still frozen, still exported.
- `runNpmCommand` — unchanged, still runs from `repoRoot`, so
  `npm run build:core` keeps the round-1 semantics exactly.
- The entry-point guard `if (process.argv[1] && fileURLToPath(import.meta.url)
  === resolve(process.argv[1])) { main().catch(...) }` — unchanged, so
  `verify-steps.test.mjs` importing `COMMANDS` still cannot run the chain.
- The `--assume-built` arm (`assertBuilt(["server"])`) — unchanged.

The resolution also adds an in-file comment stating why the core-dist guard is
deliberately outside `COMMANDS.default`: that array is read by
`verify-steps.test.mjs`'s "every workspace's build script reached at most
once" assertion as an *unconditional* command list, so declaring a conditional
build there would misrepresent the guard's own data source. Reviewer verified
that claim against the merged test at lines 134–161: the assertion counts
`script === "build"` invocations per workspace across the expanded
`VERIFY_STEPS` graph and requires exactly 1 each. This is a better-stated
version of round-1 F-003, which is therefore dispositioned `fixed` rather than
carried as residual risk.

## Delta acceptance checks

| Contract item | Evidence | Result |
|---|---|---|
| Guard stays imperative in the `else` branch, before the `COMMANDS.default` loop, not in the data | File read at `3ebb7123`, quoted above; `COMMANDS.default` still holds exactly one entry, `"npm run build -w @kanmer/mcp-server"` | met |
| CORE-144's `COMMANDS` exports and entry-point guard intact | The two-file numstat proves every other region of the file is byte-identical to `de5bace9`; both were also read directly | met |
| `git diff de5bace9...3ebb7123 --stat` is only CORE-145's two files | `AGENTS.md` +1/-1, `run-http-tests.mjs` +21/-0 | met |
| Build-once invariant still holds with CORE-144's stronger assertions | `node --test scripts/verify-steps.test.mjs` → **12/12 pass**, including "the root workspace build script is reached exactly once across the whole rail", "every workspace's build script is reached at most once across the rail", and the mutation probe "dropping --assume-built from test:built reintroduces a detectable duplicate mcp-server build" | met |
| Rail never reaches the new code | `VERIFY_STEPS` reaches this script only through `npm run test:built` → `run-tests.mjs --assume-built` → `test:http:built` → `run-http-tests.mjs --assume-built`, whose `COMMANDS.assumeBuilt` is empty and whose arm this PR does not touch | met |
| AGENTS.md §6 row unchanged from round 1 and still truthful | The `npm test` row delta against `de5bace9` is the same single sentence reviewed in round 1; `npm run verify:agents-block` 35/35 | met |
| No new dependencies | Delta touches two files; `package.json` / `package-lock.json` are not among them | met |
| Fresh-clone behaviour survives the merge | Re-run at this head — see below | met |

## Reviewer-run evidence at 3ebb7123

Fresh-clone proof, re-run from scratch with `TMP` outside the repository
(`C:\kanmer-tmp-145b`, since deleted):

```
git clone <.worktrees/CORE-145> C:/kanmer-tmp-145b/fresh   # at 3ebb7123
npm ci                       # packages/core/dist absent before AND after (ls fails twice)
npm run test:http -w @kanmer/mcp-server
```

Result: **exit 0, 249 tests, 248 pass / 1 skipped**, and `packages/core/dist/`
exists afterwards — the new path created it. This matches the
post-implementation report's post-merge row exactly.

| Scoped check (in `.worktrees/CORE-145` at `3ebb7123`) | Result |
|---|---|
| `node --test scripts/verify-steps.test.mjs` | **12/12 pass** |
| `npm run test:scripts` | **196/196 pass** |
| `npm run verify:docs` | PASS (manual up to date, 22 chapters) |
| `npm run verify:agents-block` | 35/35 pass |
| `git status --porcelain=v1` (excluding `dist/`) | clean |

## CI at 3ebb7123 (run 33968896784, attempt 1)

| Job | Job id | Result |
|---|---|---|
| `verify` (windows-latest) | 101313779385 | **success**, 7m55s |
| `kanmer-gate` | 101313779548 | **fail** — sole finding `STALE_REVIEW` (attested head `ce4587af` vs PR head `3ebb7123`); `NO_REVIEW_RECORD`, `NO_TICKET`, `OPEN_QUESTIONS`, `WRONG_STAGE`, `DEPENDENCY_BLOCKED`, `WRONG_TARGET`, `COMMITS_UNREACHABLE` and `SYNC_REQUIRED` all pass, `strict: true`. See F-008 — fixed by this record. |
| `regate` | 101313779948 | skipped (not a PR-event job) |

`mergeStateStatus` is `BLOCKED` (the red gate), `mergeable` is `MERGEABLE`.
No reviews, no PR comments and no review threads exist on this head, so
`threads_snapshot` is empty as a truthful value.

## Findings and residual risk

No finding is `open`; no blocker or major finding was raised in either round.
F-001, F-002, F-003, F-006 and F-008 are `fixed` — F-002, F-003 and F-006 by
the merge commit `3ebb7123` itself. F-004, F-005 and F-007 remain accepted
notes with their reasons in the frontmatter.

Residual risk is now only F-004 (the cold-checkout path is proved by hand at
both heads and guarded by nothing automated) and the two benign notes F-005
and F-007. None is reachable from the rail.

## Merge preconditions for the merger

This is a `pass`; merge authority is not the reviewer's. Remaining:

1. Re-run `kanmer-gate` after the board commit carrying this attestation is on
   the remote, and require it green — it re-reads the remote board and does
   not re-trigger on a board push.
2. Re-check that `kanmer-board`'s local tip equals `origin/kanmer-board`
   immediately before `gh pr merge`.

`verify` is already green at this exact head.
