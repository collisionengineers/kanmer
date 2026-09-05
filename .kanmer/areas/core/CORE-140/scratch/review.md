---
kind: review-attestation
pr: "322"
head_sha: "8ce4dc6ab8329a5b57947c7e79c728d1ca2cbd6b"
verdict: pass
reviewer: "independent-reviewer-subagent"
independent: true
plan_hash: "2e5378469583cdaf"
ticket_updated: "2026-09-05T02:41:24.782Z"
board_sha: "fa76fbb6a46528180e64fdfcbc168bfe7572d517"
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
    summary: "The required kanmer-gate check is red on this head with the single finding NO_REVIEW_RECORD; every other gate check passed."
    disposition: obsolete-after-change
    reason: "superseded by fa76fbb6a46528180e64fdfcbc168bfe7572d517 — the gate failed only because this attestation did not yet exist on the remote board when it ran; that board commit is now pushed. The gate must be re-run before merge (it does not re-run on a board push)."
---

# Independent review — CORE-140, PR #322

Head `8ce4dc6ab8329a5b57947c7e79c728d1ca2cbd6b`, branch `CORE-140-rail-build-once`,
base `main` at `c088be1391a1198c914fc3ef247103fd52c277c5`. Reviewer did not write
this code and did not push to the branch, merge, or run the full `npm run verify`.

## What changed

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
| `pr.yml` Node 24 in both jobs; `release.yml` untouched | `verify` (line 52) and `kanmer-gate` (line 70) are both `node-version: 24`. The third job, `regate`, runs on ubuntu with no `setup-node`. `release.yml` is not in the diff. Root `engines` unchanged at `>=20`. | met |
| Every existing assertion preserved | The 21-entry `node --test` file list was compared programmatically against `c088be13`'s inlined list: identical set **and** identical order. The `npm test` chain is byte-equivalent in content and order. No test file was added to or removed from any suite except the new `scripts/verify-steps.test.mjs`, which `scripts/test-scripts.mjs` auto-discovers. | met |
| No new dependencies | `package-lock.json` is not in the diff; no `dependencies`/`devDependencies` changed; every new script uses node builtins only. | met |
| AGENTS.md §6 updated (conduct rule 24) | Three rows (`npm test`, `npm run verify`, `npm run mcpb:check`) describe the stamp and the internal `:built` variants. | met |
| Before/after wall time recorded as an observation | Post-implementation report records it as a local observation and explicitly defers the real Windows-runner comparison to CI, as the acceptance wording requires. | met |

## Reviewer-run scoped checks (in `.worktrees/CORE-140`, nothing heavier)

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

| Job | Run | Result |
|---|---|---|
| `verify` (windows-latest, Node 24) | 33939788978 / job 101234848374 | pass, 8m19s — the first full-rail exercise of the new `:built` wiring, end to end |
| `kanmer-gate` (windows-latest, Node 24) | 33939788978 / job 101234848432 | fail, 51s — sole finding `NO_REVIEW_RECORD`; `NO_TICKET`, `OPEN_QUESTIONS`, `WRONG_STAGE`, `DEPENDENCY_BLOCKED`, `WRONG_TARGET`, `COMMITS_UNREACHABLE` all passed. See F-006. |
| `regate` | 33939788978 / job 101234849203 | skipped (not a PR-event job) |

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
- **F-006 (note, obsolete after the board push).** The gate's failure is the
  designed pre-review state, not a code defect.

No finding is `open`. No blocker or major finding was raised.

## Residual risk

The build-once property is now enforced at runtime by two `assertBuilt` call
sites but guarded statically only at the `package.json` layer (F-001), and the
dirty digest has one untracked-directory blind spot (F-002). Both are carried
by CORE-144. The `release.mjs` dirty-stamp refusal has not been exercised end
to end by anyone; it was reviewed at diff level and is redundant with an
existing earlier refusal, so the residual exposure is that a second, weaker
control is unproven rather than that a control is missing.

## Merge preconditions for the merger (Alex)

This attestation is a `pass`, but merge authority is not the reviewer's and two
mechanical preconditions remain:

1. `kanmer-gate` is currently red on this head and **does not re-run on a board
   push**. Re-run the `kanmer-gate` job (or push an empty re-trigger) now that
   board `fa76fbb6a46528180e64fdfcbc168bfe7572d517` — which carries this
   attestation — is on the remote, and require it green.
2. Re-check that the board branch tip is still pushed immediately before
   `gh pr merge`.

There are no blocking changes for the implementing lane.
