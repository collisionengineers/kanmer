---
kind: review-attestation
pr: "328"
head_sha: "ce4587afd94b9c673e8b2ef96fb517662e174f1d"
verdict: pass
reviewer: "independent-reviewer-subagent"
independent: true
plan_hash: "97dbda4a9709e55c"
ticket_updated: "2026-09-05T04:21:49.616Z"
board_sha: "6f37b2928d14f2daab6396e09f4aab4d7dfb7e6b"
expected_reviewers:
  - "independent-reviewer-subagent"
threads_snapshot: []
findings:
  - id: F-001
    severity: note
    summary: "kanmer-gate is red at ce4587af with the single finding NO_REVIEW_RECORD; the other eight gate checks pass and SYNC_REQUIRED reports 'unrecorded'. Fixed by this attestation, which is the missing record. The gate reads the remote board and does not re-trigger on a board push, so it must be re-run after this board commit is pushed."
    disposition: fixed
  - id: F-002
    severity: minor
    summary: "Sibling PR #327 (CORE-144) edits the same else-branch of packages/mcp-server/scripts/run-http-tests.mjs. Proven by git merge-tree and a real test merge: once #327 lands, PR #328 CONFLICTS in that file and cannot be auto-merged or updated with gh pr update-branch. Mechanical merge-ordering artefact, not a defect in this diff."
    disposition: accepted-risk
    reason: "The conflict is one hunk with an unambiguous resolution recorded in the body (keep #327's COMMANDS.default loop, prepend #328's existsSync-guarded npm run build:core). Resolving it moves the head, which under this skill already requires a fresh delta attestation on the resolved head, so the risk is carried by the merge-time obligation rather than left unmanaged. AGENTS.md merges cleanly (#327 does not touch it)."
  - id: F-003
    severity: note
    summary: "After #327, COMMANDS.default is documented as the pure-data description of the default mode that scripts/verify-steps.test.mjs statically expands; this PR's conditional core build lives in the execution path and so will not appear in that data. COMMANDS.default therefore under-describes the default mode — the same guard-fidelity class as CORE-140 F-001 that CORE-144 exists to close."
    disposition: accepted-risk
    reason: "No reachable consequence: VERIFY_STEPS reaches run-http-tests.mjs only via test:http:built (--assume-built), whose COMMANDS.assumeBuilt is empty, so the build-once count is unaffected either way. Moving the build into COMMANDS.default as data would make it unconditional and would build core twice on the warm npm test path — strictly worse. Exposure is only that a future rail step using the non-assume-built mode would under-count core builds."
  - id: F-004
    severity: note
    summary: "The cold-checkout behaviour has no automated regression guard. The only proof is a manual fresh clone + npm ci + test:http run; nothing in scripts/verify-steps.test.mjs, test:scripts or the rail would fail if the existsSync branch were deleted."
    disposition: accepted-risk
    reason: "A genuine cold-clone probe costs a full clone plus npm ci and cannot sit in the rail at reasonable cost. The reviewer reproduced the proof independently and additionally ran the negative control (removing packages/core/dist makes the mcp-server build fail in esbuild), so the fix is demonstrably load-bearing at this head."
  - id: F-005
    severity: note
    summary: "The probe tests only packages/core/dist/index.js. @kanmer/core also exports ./browser -> dist/browser.js, so a partial or stale core dist containing index.js but not browser.js would not be rebuilt."
    disposition: accepted-risk
    reason: "Not reachable in practice: core's build is a single tsup run that emits both entries (plus check-browser.mjs), so a dist with index.js and no browser.js implies a build the operator already saw fail. The mcp-server test path resolves only the root export. Widening the probe would add cost with no observed failure mode."
  - id: F-006
    severity: note
    summary: "PR #328 is BEHIND main: base is 9945b1f2 (CORE-138, #324) while the branch was cut at e474f317. mergeStateStatus is BEHIND, mergeable MERGEABLE."
    disposition: accepted-risk
    reason: "git merge-tree of ce4587af against 9945b1f2 resolves with no conflict (CORE-138 touched AGENTS.md in a different section). Bringing the branch up to date moves the head and requires a delta re-bind of this attestation; that is a merge-time obligation for the merger, recorded below."
  - id: F-007
    severity: note
    summary: "The new execFileSync uses shell: true with an args array, which Node 24 flags as DEP0190 (args are concatenated, not escaped). The warning was observed in the fresh-clone run."
    disposition: accepted-risk
    reason: "Identical to the adjacent pre-existing call this PR did not touch, and both arg lists are hard-coded literals with no interpolated input, so no injection surface exists. Changing the pattern is a separate hygiene change across the file, out of this ticket's scope."
---

# Independent review — CORE-145, PR #328

Head `ce4587afd94b9c673e8b2ef96fb517662e174f1d`, branch
`CORE-145-mcp-server-build-core`, base `main`, worktree `.worktrees/CORE-145`.
Reviewer did not write this code, did not push to the branch, did not merge,
and did not run the full `npm run verify`.

## What changed

Two files, +17/-1, no dependency and no `package-lock.json` change.

- `packages/mcp-server/scripts/run-http-tests.mjs` — a new
  `coreDistIndex` constant plus, inside the non-`--assume-built` branch only,
  an `existsSync` guard that runs `npm run build:core` at the repo root before
  the existing workspace `npm run build`, and an explanatory comment block.
  The `--assume-built` branch (`assertBuilt(["server"])`) is byte-identical to
  its previous form.
- `AGENTS.md` §6, `npm test` row — one sentence added: the cold-checkout path
  also builds `@kanmer/core` first when `packages/core/dist/index.js` is
  missing.

`packages/mcp-server/package.json`'s `build` is untouched, which is the point:
the ticket's alternative remedy would have made the root `npm run build`
(`npm run build -w @kanmer/core && npm run build -w @kanmer/mcp-server`) build
core twice.

## Acceptance checks

| Contract item | Evidence | Result |
|---|---|---|
| Non-assume-built path builds core at the repo root only when `packages/core/dist/index.js` is missing | The guard is exactly `if (!existsSync(coreDistIndex))` around one `execFileSync("npm", ["run", "build:core"], { cwd: repoRoot })`, followed unchanged by the workspace build. `build:core` at the root is `npm run build -w @kanmer/core`. | met |
| `--assume-built` path unchanged | The `if (assumeBuilt)` arm is untouched in the diff; the dynamic `build-stamp.mjs` import and `assertBuilt(["server"])` are the same bytes. | met |
| Root `npm run build` still builds core exactly once | `package.json` is not in the diff at all, so the root chain is unchanged by construction. `node --test scripts/verify-steps.test.mjs` re-run by the reviewer: 9/9 pass, including "the root workspace build script is reached exactly once across the whole rail". | met |
| Workspace build count across the rail is unchanged | Reviewer re-derived the graph. `VERIFY_STEPS` reaches this script only through `npm run test:built` → `run-tests.mjs --assume-built` → `npm run test:http:built -w @kanmer/mcp-server` → `run-http-tests.mjs --assume-built`, i.e. the branch this PR does not touch. Rail workspace builds remain exactly: `@kanmer/core` ×1 and `@kanmer/mcp-server` ×1 (root `npm run build`) plus `@kanmer/gui` ×1 (`npm run build -w @kanmer/gui`). The new code adds zero. | met |
| Non-rail public paths behave correctly | Cold `npm test` / `npm run test:http -w @kanmer/mcp-server`: core ×1, mcp-server ×1. Warm: core ×0, mcp-server ×1 — the pre-existing behaviour. | met |
| AGENTS.md §6 truthful (conduct rule 24) | The `npm test` row's new clause states the exact condition the code tests (`packages/core/dist/index.js` missing). §6 has no `test:http` row, so no other row is made stale. `npm run verify:agents-block` 35/35 pass. | met |
| No new dependencies | The PR touches two files; `package.json` and `package-lock.json` are not among them. The change uses only `node:fs`'s `existsSync`. | met |
| Fresh-clone proof credible | Independently re-run by the reviewer — see below. | met |

## Reviewer-run evidence

Fresh-clone proof, re-run from scratch by the reviewer with `TMP` outside the
repository (`C:\kanmer-tmp-145`):

```
git clone <.worktrees/CORE-145> C:/kanmer-tmp-145/kanmer-fresh-145-review
npm ci                       # packages/core/dist absent afterwards (ls fails)
npm run test:http -w @kanmer/mcp-server
```

Result: exit 0, **245 pass / 1 skipped**, and `packages/core/dist/` contains
`index.js`, `index.js.map`, `index.d.ts`, `browser.js`, `browser.js.map`,
`browser.d.ts` afterwards — i.e. the new path created it. This matches the
post-implementation report exactly.

Negative control, in the same fresh clone: `rm -rf packages/core/dist
packages/mcp-server/dist && npm run build -w @kanmer/mcp-server` fails in
esbuild inside `tsup`, confirming the fix is load-bearing rather than
incidental.

| Scoped check (in `.worktrees/CORE-145`) | Result |
|---|---|
| `node --test scripts/verify-steps.test.mjs` | 9/9 pass |
| `npm run test:scripts` | 193/193 pass |
| `npm run verify:docs` | PASS (manual up to date, 22 chapters) |
| `npm run verify:agents-block` | 35/35 pass |
| `git status --porcelain=v1` (excluding `dist/`) | clean |

## The #327 (CORE-144) merge interaction

Both PRs edit the same `else` branch of
`packages/mcp-server/scripts/run-http-tests.mjs`. #327 **deletes** the line
`execFileSync("npm", ["run", "build"], { cwd: packageRoot, ... })` and
replaces it with a loop over an exported `COMMANDS.default` data array; #328
**inserts** its `existsSync` guard immediately above that same line and keeps
it as context.

Proven mechanically, not predicted:

- `git merge-tree --write-tree --messages 8ba0cc86 ce4587af` (their merge base
  is `37b83b14`) exits 1 with
  `CONFLICT (content): Merge conflict in packages/mcp-server/scripts/run-http-tests.mjs`.
- A real test merge in a scratch clone reproduces it: exactly one conflicted
  hunk, `<<<<<<< HEAD` = #327's `for (const command of COMMANDS.default)`
  loop, `>>>>>>>` = #328's guard plus the old `execFileSync`. Everything else
  — including both PRs' new comment blocks at the top of the file — merges
  cleanly, and #327 does not touch `AGENTS.md`.

So: **#328's fresh-clone behaviour survives #327, but not automatically.**
Once #327 merges first, `gh pr update-branch` on #328 will fail and a hand
resolution is required. The correct resolution keeps both sides:

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

`runNpmCommand` (introduced by #327) already runs from `repoRoot`, so
`npm run build:core` keeps its current semantics exactly.

Does the core-missing check need to live inside the `COMMANDS.default` data
rather than the runner's execution path? **No — the execution path is the
right home** (F-003). #327's resolver expands a runner leaf by mode:
`node scripts/run-http-tests.mjs --assume-built` expands `COMMANDS.assumeBuilt`
(empty), and only a bare `node scripts/run-http-tests.mjs` would expand
`COMMANDS.default`. `VERIFY_STEPS` only ever reaches the `--assume-built`
form, so the build-once assertion is unaffected wherever the core build sits.
Putting it in `COMMANDS.default` would additionally make it unconditional
data, rebuilding core on every warm `npm test` — reintroducing the duplicate
build this ticket's plan deliberately avoided. The residual is documentation
fidelity only, recorded as F-003.

## CI

| Job | Run / job id | Result |
|---|---|---|
| `verify` (windows-latest) | 33944346397 attempt 2 / 101248882977 | **success**, 9m13s, at `ce4587af` |
| `kanmer-gate` | 33944346397 attempt 2 / 101248882394 | **fail** — sole finding `NO_REVIEW_RECORD`; the other eight checks (`NO_TICKET`, `OPEN_QUESTIONS`, `WRONG_STAGE`, `DEPENDENCY_BLOCKED`, `WRONG_TARGET`, `COMMITS_UNREACHABLE`, `SYNC_REQUIRED`) pass, `STALE_REVIEW` skipped, `strict: true`, board read `6f37b292`. See F-001. |
| `regate` | 33944346397 attempt 2 / 101248883261 | skipped (not a PR-event job) |

No reviews, no PR comments and no review threads exist on this head, so
`threads_snapshot` is empty as a truthful value.

## Findings, dispositions, residual risk

No finding is `open`; no blocker or major finding was raised. F-001 is fixed
by this record. F-002 and F-006 are merge-ordering facts with proven
resolutions. F-003, F-004, F-005 and F-007 are accepted notes with the reasons
in the frontmatter.

Residual risk: the cold-checkout path is proved by hand and guarded by nothing
automated (F-004), and after #327 the runner's exported command data will no
longer fully describe its own default mode (F-003). Neither is reachable from
the rail.

## Merge preconditions for the merger

This is a `pass`; merge authority is not the reviewer's. Three mechanical
preconditions remain:

1. Land #327 first (as planned), then resolve the one-hunk conflict in
   `run-http-tests.mjs` as written above, and update the branch past
   `9945b1f2`. That moves the head, so this attestation must be replaced by a
   delta review bound to the resolved head before merge.
2. Re-run `kanmer-gate` after the board commit carrying this attestation is on
   the remote, and require it green — it re-reads the remote board and does
   not re-trigger on a board push.
3. Re-check that `kanmer-board`'s local tip equals `origin/kanmer-board`
   immediately before `gh pr merge`.
