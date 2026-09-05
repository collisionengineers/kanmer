---
kind: review-attestation
pr: "322"
head_sha: "d15796d02c54ddc58affb73716b2229e02a81131"
verdict: pass
reviewer: "independent-reviewer-subagent"
independent: true
plan_hash: "2e5378469583cdaf"
ticket_updated: "2026-09-05T02:41:24.782Z"
board_sha: "ed2ea9eac50ce7aebe16a33de2ce20099646a4ba"
expected_reviewers:
  - "independent-reviewer-subagent"
threads_snapshot: []
findings:
  - id: F-001
    severity: minor
    summary: "scripts/verify-steps.test.mjs cannot resolve through the two new runner scripts, so the build-once guard is blind to run-tests.mjs / run-http-tests.mjs and the test:built assertion is vacuous."
    disposition: deferred-to-ticket
    ticket: CORE-144
  - id: F-002
    severity: minor
    summary: "computeDirtyDigest skips untracked directories (git collapses them to a single '?? dir/' entry), so a file added inside an already-untracked directory leaves the dirty digest unchanged and --assert passes on a changed tree."
    disposition: deferred-to-ticket
    ticket: CORE-144
  - id: F-003
    severity: note
    summary: "Fresh clone + npm ci + npm run test:http -w @kanmer/mcp-server fails because packages/mcp-server's build never builds @kanmer/core. Pre-existing on main at c088be13; not a CORE-140 regression."
    disposition: deferred-to-ticket
    ticket: CORE-145
  - id: F-004
    severity: note
    summary: "computeDirtyDigest mis-parses the second NUL-separated 'from' path of a porcelain -z rename entry as a status+path pair; benign because the resulting bogus path never exists and is skipped, and the rename is still covered by the raw porcelain text in the digest."
    disposition: accepted-risk
    reason: "Benign by construction — the mis-parsed segment can only produce a non-existent path, which the existsSync guard drops; the rename itself still changes the porcelain text that is hashed, so no rename can pass unnoticed. Fixing it would add parser state for no behavioural gain."
  - id: F-005
    severity: note
    summary: "run-http-tests.mjs --assume-built asserts only the 'server' output, not 'core', so a stale packages/core/dist would not be refused for that step."
    disposition: accepted-risk
    reason: "The ticket's declared technical seam specifies assertBuilt(['server']) for this step, and inside the rail core is produced by the same single root build in the immediately preceding step, so a divergent core dist is not reachable without also failing the HEAD / dirty-digest / lockHash checks."
  - id: F-006
    severity: note
    summary: "kanmer-gate was red on the earlier head 8ce4dc6a with the single finding NO_REVIEW_RECORD; every other gate check passed. Fixed by this attestation, which is the missing record, now rebound to head d15796d0. The gate must be re-run because it re-reads the remote board and does not re-trigger on a board push."
    disposition: fixed
  - id: F-007
    severity: note
    summary: "The merge of main into the branch (d15796d0) carries no CORE-140 content change: nine of the ten CORE-140 files are byte-identical to 8ce4dc6a and AGENTS.md merged both sides cleanly, so the review conclusions on 8ce4dc6a transfer unchanged to d15796d0."
    disposition: fixed
---

# Independent review — CORE-140, PR #322

Head `d15796d02c54ddc58affb73716b2229e02a81131`, branch
`CORE-140-rail-build-once`, base `main`. This head is `gh pr update-branch`'s
merge of `main` into the branch; the substantive review below was performed on
`8ce4dc6ab8329a5b57947c7e79c728d1ca2cbd6b` and carried forward after proving
the merge changed nothing in CORE-140's scope (next section). Reviewer did not
write this code and did not push to the branch, merge, or run the full
`npm run verify`.

## Rebind to d15796d0 — proof the delta is only the merge of main

`git log --oneline 8ce4dc6a..d15796d0` is exactly three commits: the merge
commit `d15796d0` plus the two `main` commits it brought in — `32aa54fc`
(GUI-152, Focus Board) and `bd368549` (DOC-028, managed-block routing).

- `git diff 8ce4dc6a...d15796d0 --stat` — 23 files, all of them GUI-152's
  `apps/gui/**` + `docs/functional/frd/FRD-036-focus-board.md` and DOC-028's
  `scripts/agents-block-body.mjs`, `plugins/kanmer/scripts/agents-block-body.mjs`,
  `plugins/kanmer/skills/kanmer-setup/SKILL.md`,
  `scripts/agents-block-routing.test.mjs`, `scripts/verify-agents-block.mjs`,
  `AGENTS.md`. No CORE-140 file appears except `AGENTS.md`, which both sides
  touched.
- `git diff 32aa54fc...d15796d0 --stat` — still exactly CORE-140's ten files at
  **+598/-11**, byte-for-byte the same shape as the diff reviewed at 8ce4dc6a.
- **Blob-level check, the decisive one:** nine of CORE-140's ten files hash
  identically at `8ce4dc6a` and `d15796d0` — `.github/workflows/pr.yml`,
  `package.json`, `packages/mcp-server/package.json`,
  `packages/mcp-server/scripts/run-http-tests.mjs`, `scripts/build-stamp.mjs`,
  `scripts/release.mjs`, `scripts/run-tests.mjs`,
  `scripts/verify-steps.test.mjs`, `scripts/verify.mjs`. Nothing was resolved,
  reformatted or dropped in any of them, so every scoped check and mutation
  probe recorded below still describes the bytes now on the PR head.
- `AGENTS.md` is the only shared file, and it merged cleanly in both
  directions. `git diff 8ce4dc6a d15796d0 -- AGENTS.md` is textually identical
  to `git diff c088be13 32aa54fc -- AGENTS.md` (same hunk, same lines, 5
  insertions / 3 deletions), i.e. DOC-028's change applied verbatim on top of
  CORE-140's. And `git diff 32aa54fc d15796d0 -- AGENTS.md` reproduces
  CORE-140's own delta exactly (3 insertions / 3 deletions). Both sides
  survive: the merged file contains DOC-028's new "Resolve the request before
  starting a workflow" routing bullet **and** all three CORE-140 §6 rows
  (three `CORE-140` markers, `verify-stamp.json` ×3, `test:built`,
  `mcpb:check:built`). The two edits are in disjoint sections — main's near the
  operating bullets at the top, CORE-140's in the §6 command table — so no
  conflict arose.
- `.github/workflows/pr.yml` at `d15796d0` still has `node-version: 24` at
  lines 52 and 70, i.e. both Node jobs; main never touched that file.
- No conflict markers exist anywhere in the merge tree.

Verdict is therefore unchanged from the 8ce4dc6a review, and every finding is
carried forward with its original disposition.

## What changed (CORE-140's own scope)

Ten files, +598/-11, no dependency and no `package-lock.json` change.

- `scripts/build-stamp.mjs` (new) — `writeStamp` / `readStamp` / `assertBuilt`,
  CLI `--write` and `--assert <id...>`, stamp at gitignored
  `dist/verify-stamp.json`. Records `stampVersion`, `head`, `dirty`,
  `dirtyDigest`, `lockHash`, `node`/`nodeMajor`, `platform` and a sha256 +
  byte count per output for the logical ids `core`, `server`, `standalone`.
- `scripts/run-tests.mjs` and `packages/mcp-server/scripts/run-http-tests.mjs`
  (new) — own the root `npm test` chain and the `test:http` `node --test` file
  list; `--assume-built` swaps the build for `assertBuilt`.
- `scripts/verify-steps.test.mjs` (new) — the static build-once proof plus
  build-stamp refusal/pass unit tests in a disposable temp git repo.
- `scripts/verify.mjs` — `VERIFY_STEPS` gains `node scripts/build-stamp.mjs
  --write` after `npm run build`; `npm test` → `npm run test:built`;
  `npm run mcpb:check` → `npm run mcpb:check:built`; the `KANMER_ROOT`
  comparison follows.
- `scripts/release.mjs` — imports `readStamp`, refuses after the
  `VERIFY_STEPS` loop when the stamp reports `dirty: true`.
- `package.json` / `packages/mcp-server/package.json` — `:built` variants added;
  public `test`, `test:http`, `mcpb:build`, `mcpb:check` keep self-building
  behaviour.
- `.github/workflows/pr.yml` — Node 24 in both Node jobs.
- `AGENTS.md` §6 — three command rows updated.

## Acceptance checks against the ticket contract

| Contract item | Evidence | Result |
|---|---|---|
| Exactly one root `npm run build` per rail catalogue | `VERIFY_STEPS` contains one `npm run build`; every other entry resolves to `node …` leaves or `:built` variants that assert. Reviewer re-derived the graph: no rail step other than the root build reaches `build -w @kanmer/core` or `build -w @kanmer/mcp-server` (`smoke:headless`, `smoke:protocol`, `smoke:discovery`, `golden`, `plugin:check`, `verify:docs` are all plain `node` entries; `smoke:doctor`/`smoke:http`/`smoke:remote`, which do rebuild the server, are not in the rail). | met |
| Stamp refusal semantics, no silent rebuild | `assertBuilt` refuses on absent stamp, `stampVersion` mismatch, HEAD change, clean/dirty flip, dirty-digest change, lockfile-hash change, Node-major change, unknown id, missing output, output-hash mismatch. `fail()` only prints and throws — it never invokes a build. Seven refusal/pass cases are unit-tested. | met |
| Public commands unchanged for a fresh checkout | `npm test` → `run-tests.mjs` runs the identical five-command chain in the identical order; `test:http` → `run-http-tests.mjs` runs `npm run build` then the same file list; `mcpb:build` / `mcpb:check` untouched. | met |
| `release.mjs` still imports and runs `VERIFY_STEPS`, and refuses a dirty stamp | Diff confirms the `for (const step of VERIFY_STEPS) run(step)` loop is unchanged and the new `readStamp()?.dirty` refusal sits immediately after it, before the `dryRun` branch, so it applies to both prepare and publish modes. It is redundant in practice (release.mjs already refuses a dirty tree before verification), which is why it is defence in depth rather than the primary control — reviewed at diff level as the report requested, since it is not exercised end to end. | met |
| `KANMER_ROOT` temp-board env reaches the test step | `verify.mjs` keys on the exact string `"npm run test:built"`, which is the literal entry in `VERIFY_STEPS`; `run-tests.mjs`'s `execSync` and `run-http-tests.mjs`'s `spawnSync` both inherit `process.env`, so the override survives the two extra process hops. | met |
| `pr.yml` Node 24 in both jobs; `release.yml` untouched | `verify` (line 52) and `kanmer-gate` (line 70) are both `node-version: 24`, re-confirmed on the merged head. The third job, `regate`, runs on ubuntu with no `setup-node`. `release.yml` is not in the diff. Root `engines` unchanged at `>=20`. | met |
| Every existing assertion preserved | The 21-entry `node --test` file list was compared programmatically against `c088be13`'s inlined list: identical set **and** identical order. The `npm test` chain is byte-equivalent in content and order. No test file was added to or removed from any suite except the new `scripts/verify-steps.test.mjs`, which `scripts/test-scripts.mjs` auto-discovers. | met |
| No new dependencies | `package-lock.json` is not in the diff; no `dependencies`/`devDependencies` changed; every new script uses node builtins only. | met |
| AGENTS.md §6 updated (conduct rule 24) | Three rows (`npm test`, `npm run verify`, `npm run mcpb:check`) describe the stamp and the internal `:built` variants, and all three survive the merge with main. | met |
| Before/after wall time recorded as an observation | Post-implementation report records it as a local observation and explicitly defers the real Windows-runner comparison to CI, as the acceptance wording requires. | met |

## Reviewer-run scoped checks (in `.worktrees/CORE-140` at 8ce4dc6a, nothing heavier)

Every file these exercised is byte-identical at `d15796d0`, so the results
stand unchanged on the current head.

| Command | Result |
|---|---|
| `node --test scripts/verify-steps.test.mjs scripts/pr-workflow.test.mjs` | 10/10 pass |
| `npm run build && node scripts/build-stamp.mjs --write` | exit 0, `dirty=false` (confirms `.worktrees/` and `dist/` ignores hold inside a linked worktree) |
| `node scripts/build-stamp.mjs --assert server standalone` | exit 0 |
| `npm run test:scripts` | 189/189 pass |
| Dirty-digest determinism: `--write` twice over the same dirty tree | identical `dirtyDigest` — deterministic |
| New top-level untracked file, then `--assert` | exit 1, "dirty digest mismatch" — correct |
| Mutation probe A: drop `--assume-built` from root `test:built`, run `verify-steps.test.mjs` | **still green** → F-001 |
| Mutation probe B: revert `mcpb:check:built` to `mcpb:check` in `VERIFY_STEPS`, run `verify-steps.test.mjs` | fails as intended → guard has partial power |
| Untracked-directory probe: add a second file inside an existing untracked dir, then `--assert` | exit 0 — should have refused → F-002 |
| `check-pr.mjs --board <board worktree>` with `KANMER_GATE_STRICT=true`, against the previous attestation | `ok: true`, all nine gate checks pass (validator accepts the record's shape, `board_sha` included) |

The worktree was restored to a clean `git status` after every probe.

## Windows specifics checked

`toRelative` splits on the absolute root and normalises backslashes to forward
slashes, so stamped `path` values are stable and comparable on Windows; both
`writeStamp` and `assertBuilt` derive them the same way, so no separator
mismatch is reachable. `git status --porcelain=v1 -z` emits NUL-separated,
unquoted, LF-free records, so CRLF and `core.quotePath` cannot perturb the
digest; the temp-repo fixture additionally pins `core.autocrlf=false` so a
machine's global setting cannot corrupt the dirty/clean assertions. All paths
are built with `node:path` `join`. Verified empirically on this Windows host.

## CI

| Head | Job | Run / job id | Result |
|---|---|---|---|
| `8ce4dc6a` | `verify` (windows-latest, Node 24) | 33939788978 / 101240671912 | **success** — the full-rail exercise of the new `:built` wiring, end to end. (An earlier attempt of the same job, 101234848374, also passed in 8m19s.) |
| `8ce4dc6a` | `kanmer-gate` | 33939788978 / 101234848432, re-run 101240671380 | fail (`NO_REVIEW_RECORD` only), then cancelled by the update-branch push. See F-006. |
| `d15796d0` | `verify` | 33941835173 / 101240848093 | **cancelled at queue time** (0 steps, cancelled 03:26:04 by `pr.yml`'s `cancel-in-progress` concurrency group) — *not* a code failure, but also not evidence. Must be re-run. |
| `d15796d0` | `kanmer-gate` | 33941835173 / 101240847226 | in progress at attestation time; it re-reads the remote board and will need re-running after this attestation is pushed. |
| both | `regate` | — | skipped (not a PR-event job) |

The rail was proven green at `8ce4dc6a`, and the merge changed no CORE-140
file, but `verify` has not yet completed at `d15796d0` itself. That is a
merge-time obligation for the merger, recorded below.

## Findings and dispositions

- **F-001 (minor, deferred to CORE-144).** `scripts/verify-steps.test.mjs`'s
  resolver only expands `npm run <script>[ -w <ws>]`. CORE-140 moved both
  nested-build call sites out of `package.json` and into `run-tests.mjs` /
  `run-http-tests.mjs`, which the resolver treats as terminal leaves. The
  headline acceptance test therefore proves build-once only for the
  `package.json` layer, and its companion assertion ("`test:built` … never
  re-invoke the root build script") is vacuous. Probe A demonstrates a real
  duplicate-build regression that the suite does not catch. This is a
  regression-detection gap, not a defect in today's behaviour: the rail is
  correct as shipped, because `test:http:built` and `mcpb:build:built` assert
  and cannot build. Not blocking; the correct remedy touches the same two
  files a follow-up will already open.
- **F-002 (minor, deferred to CORE-144).** Same class of guard-fidelity gap:
  `computeDirtyDigest` skips untracked *directories*, which git collapses to a
  single entry, so mutations inside one are invisible to the digest. One-line
  remedy (`-uall`). Not reachable in the rail's real use — CI builds from a
  clean checkout, and the `dirty` flag itself still flips on the directory's
  first appearance.
- **F-003 (note, deferred to CORE-145).** The fresh-clone `test:http` failure
  the implementer reported is real and correctly attributed:
  `packages/mcp-server`'s `build` is `tsup && tsup --config
  tsup.standalone.config.ts` and never builds `@kanmer/core`, so nothing on a
  cold `npm ci` produces `packages/core/dist`. Reviewer confirmed the mechanism
  from the script itself. Unchanged by this PR on both sides of the diff, so it
  is not a CORE-140 regression and does not affect the "public commands
  unchanged" contract — the public path is exactly as broken, and exactly as
  working, as it was on `main`.
- **F-004, F-005 (notes, accepted risk).** Reasons in the frontmatter.
- **F-006 (note, fixed).** The `kanmer-gate` failure at `8ce4dc6a` was
  `NO_REVIEW_RECORD` alone — the gate reads the remote board and no review
  attestation existed there when it ran. This attestation is that record, now
  rebound to `d15796d0`, so the finding is fixed by the document you are
  reading rather than by a change to the reviewed tree (no repo commit
  supersedes it, which is why the disposition is `fixed`). The gate re-reads
  the remote board and does not re-trigger on a board push, so it must be
  re-run before merge — a merge-time action, not an open code finding.
- **F-007 (note, fixed).** The head moved from `8ce4dc6a` to `d15796d0` while
  this review was open. Rather than assume the merge was inert, the delta was
  proved inert file by file (section 2 above); this record is rebound to the
  new head on that evidence.

No finding is `open`. No blocker or major finding was raised.

## Residual risk

The build-once property is now enforced at runtime by two `assertBuilt` call
sites but guarded statically only at the `package.json` layer (F-001), and the
dirty digest has one untracked-directory blind spot (F-002). Both are carried
by CORE-144. The `release.mjs` dirty-stamp refusal has not been exercised end
to end by anyone; it was reviewed at diff level and is redundant with an
existing earlier refusal, so the residual exposure is that a second, weaker
control is unproven rather than that a control is missing. Finally, the full
rail has been proven green at `8ce4dc6a` but not yet at `d15796d0`; the
argument that it transfers rests on the byte-identity proof above, not on a
run at the new head.

## Merge preconditions for the merger (Alex)

This attestation is a `pass`, but merge authority is not the reviewer's and
three mechanical preconditions remain:

1. Re-run `verify` at `d15796d0`. The current run's `verify` job was cancelled
   at queue time by the workflow's own concurrency group, so there is no
   completed rail evidence at this head. Re-running the *old* run at
   `8ce4dc6a` does not produce it.
2. Re-run `kanmer-gate` at `d15796d0` after the board commit carrying this
   attestation is on the remote, and require it green — it does not re-trigger
   on a board push.
3. Re-check that the board branch tip is still pushed immediately before
   `gh pr merge`.

There are no blocking changes for the implementing lane.
