# Post-implementation report — CORE-144

Branch `CORE-144-guard-fidelity`, worktree `.worktrees/CORE-144`, base `main`
at `37b83b14` (DOC-026, the latest `main` at the time this branch was cut).
Head commit `8ba0cc86`.

## What changed

- `scripts/run-tests.mjs` — exported `COMMANDS = { default, assumeBuilt }` as
  pure data; `main()` loops over the selected list. Guarded `main()` behind
  the standard entry-point check (`fileURLToPath(import.meta.url) ===
  resolve(process.argv[1])`) — needed because `scripts/verify-steps.test.mjs`
  now imports `COMMANDS` from this module, and without the guard that import
  would have run the entire `npm test` chain as a side effect. Caught this
  during the first scoped test run.
- `packages/mcp-server/scripts/run-http-tests.mjs` — exported `COMMANDS =
  { default: ["npm run build -w @kanmer/mcp-server"], assumeBuilt: [] }`; the
  default (non-assume-built) branch now runs that exact command from the repo
  root via a small `runNpmCommand` helper instead of a bare `npm run build`
  invoked with `cwd: packageRoot` — same effective build, now expressible as
  data the static resolver can read. Added the same import-safety guard around
  `main()`.
- `scripts/verify-steps.test.mjs` — imports both `COMMANDS` exports; `resolve_`
  now recognises the literal leaves `node scripts/run-tests.mjs[
  --assume-built]` and `node scripts/run-http-tests.mjs[ --assume-built]` and
  expands them via the matching `COMMANDS[mode]` list instead of stopping.
  Added: (1) a "every workspace's own build script is reached at most once"
  assertion — needed because the regression the CORE-140 review proved
  (dropping `--assume-built` from `test:built`) reintroduces a *second*
  `@kanmer/mcp-server` workspace build, which the pre-existing root-only
  count cannot see; (2) a mutation regression test that reverts a synthetic
  copy of `test:built`'s script body to `"node scripts/run-tests.mjs"` and
  asserts the resolver now reports two `@kanmer/mcp-server` builds; (3) a
  temp-repo regression test reproducing the F-002 probe exactly
  (`probe-dir/a.txt`, stamp, `probe-dir/b.txt`, expect refusal).
- `scripts/build-stamp.mjs` `computeDirtyDigest` — added `-uall` to `git
  status --porcelain=v1 -z` so untracked directories are listed file-by-file
  (fixes F-002); fixed the F-004 rename/copy parsing by consuming the paired
  NUL-separated "from" path instead of treating it as an independent
  status+path entry.

No change to `VERIFY_STEPS`, to the public `npm test` / `npm run mcpb:check`
commands, or to which assertions run in the real rail — all in scope per the
ticket's "out of scope" section.

## Deviation from the ticket's "suggested remedy"

The ticket suggested asserting the runner scripts' `--assume-built` contract
directly (regex/text checks on their bodies) rather than extending the
resolver. Implemented instead: export each runner's command list as pure data
and teach the resolver to expand those two specific known leaves through it.
This keeps the "one static graph, one root build" proof structurally intact
(same style of test as F-001's own headline assertion) while still closing
the exact gap described, and lets the mutation test demonstrate detection
directly on the real `VERIFY_STEPS` graph rather than as a separate assertion
about script text. Both remedies are within the ticket's declared "one class,
one fix" scope; this is the one implemented.

## Commands run (in `.worktrees/CORE-144`)

| Command | Result |
|---|---|
| `npm ci` | exit 0 |
| `node --test scripts/verify-steps.test.mjs` (before the import-safety guard fix) | failed — importing `COMMANDS` from `run-tests.mjs` ran the real `npm test` chain, which failed in `@kanmer/gui`'s vitest suite because `packages/core/dist` did not exist yet. Root-caused to the missing entry-point guard, fixed, not a pre-existing repo issue. |
| `npm run build` | exit 0 |
| `node --test scripts/verify-steps.test.mjs` | exit 0 — 12/12 pass (4 new/changed: the two CORE-144 assertions plus 2 pre-existing rewritten by import) |
| `npm run test:scripts` | exit 0 — 196/196 pass |
| `node scripts/build-stamp.mjs --write` | exit 0, `dirty=true` (repo has other untracked files outside this ticket's scope — expected in this shared checkout) |
| `node scripts/build-stamp.mjs --assert server standalone` | exit 0 |
| `git status --porcelain=v1` (excluding `dist/`) | only the 4 intended files modified |

Did not run `npm run verify` (scoped checks only, per policy). CI runs the
full rail on the PR.

## Residual risk

The resolver's runner-script expansion is keyed by literal leaf text (`node
scripts/run-tests.mjs[ --assume-built]` / `node
scripts/run-http-tests.mjs[ --assume-built]`); a rename of either script
without updating both the `RUNNER_COMMANDS` map key and the `package.json`
leaf would silently fall back to "opaque leaf, no invocations recorded" rather
than erroring loudly. This mirrors the pre-existing resolver's behaviour for
any unrecognised leaf and was accepted as consistent with the existing
design rather than introducing new failure-mode handling out of scope for
this ticket.
