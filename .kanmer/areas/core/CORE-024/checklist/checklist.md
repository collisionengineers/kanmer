# Checklist — CORE-024

## Core question read

- [ ] Add one public read-only open-question count method on `KanmerStore`.
- [ ] Locate through existing validated ticket resolution; call no initialization/mutation.
- [ ] Delegate to the one `countCheckboxes(...,{stopAtParked:true})` implementation.
- [ ] Return checked/total/open and document missing/legacy behavior.
- [ ] Test absent, zero-box, checked, unchecked, parked, nested/multi-file, and no-write cases.

## Merge-gate evaluator

- [ ] Add/export `merge-gate.ts` with extensible PR input/result/finding types.
- [ ] Define phase-1 codes exactly `NO_TICKET` and `OPEN_QUESTIONS`, both error-level.
- [ ] Compute `ok` from error findings and retain future warning support.
- [ ] Parse whole-line CRLF/LF body footers bottom-up and normalize IDs uppercase.
- [ ] Collapse identical repeated footers and reject distinct footer IDs as ambiguous.
- [ ] Give explicit footer priority; invalid explicit footer must not fall back to branch.
- [ ] Apply exact alphanumeric branch-prefix regex only when footer is absent.
- [ ] Require resolved item to exist and be type ticket.
- [ ] Count questions regardless of stage/profile and emit exact counts/details.
- [ ] Keep evaluator free of stdout, exits, environment, GitHub, initialization, and writes.
- [ ] Test all footer/branch/missing/non-ticket/ambiguity/casing/prefix cases.
- [ ] Test open questions fail, parked/checked/absent pass, and warning-only `ok` semantics.
- [ ] Snapshot/compare board bytes/activity around evaluator tests.

## CLI

- [ ] Add import-safe `packages/mcp-server/src/check-pr.mjs`.
- [ ] Parse only required `--board` and `--event` flags; reject unknown/missing/duplicate values.
- [ ] Require valid `pull_request.number/head.sha/head.ref`; map null body to empty string.
- [ ] Construct read-only store at the supplied board path; never create/init.
- [ ] Emit exactly one compact evaluated verdict JSON line on stdout.
- [ ] Escape GitHub workflow-command data and emit one error annotation per error finding on stderr.
- [ ] Exit 0 for evaluated pass, 1 for evaluated gate failure, and 2 for infrastructure/could-not-run.
- [ ] Keep infrastructure diagnostic distinct from normal gate result and omit unsafe stack/path data.
- [ ] Prove board/event failures exit 2 and ordinary red gates exit 1.

## GitHub workflow

- [ ] Rebase on CORE-032 and preserve workflow trigger, permissions, Bash default, and `verify` job.
- [ ] Add exactly one independent Windows job ID/display name `kanmer-gate`.
- [ ] Use checkout v4, setup-node v4 Node 20, `npm ci`, and `npm run build:core`.
- [ ] Fetch `origin/kanmer-board` and add it at quoted `$RUNNER_TEMP/kanmer-board`.
- [ ] Assert board temp path cannot alias `$GITHUB_WORKSPACE`.
- [ ] Run CLI with quoted board path and `$GITHUB_EVENT_PATH`.
- [ ] Do not add `needs`, draft skip, write permissions, cache, retry, matrix, artifact, push trigger, or fake stub.
- [ ] Preserve exit status if any cleanup step is added.

## Real proof and scope

- [ ] Update AGENTS.md only for the real local check/read-only-board/exit convention if applicable.
- [ ] Observe `kanmer-gate` on a real PR before adding it to protection.
- [ ] Record exact displayed check name, run ID, PR head, stdout JSON, annotations, and exits.
- [ ] Prove no-link `NO_TICKET` red.
- [ ] Prove explicit footer resolves and has priority.
- [ ] Prove branch-prefix fallback resolves without footer.
- [ ] Prove unparked question `OPEN_QUESTIONS` red.
- [ ] Prove parked-only questions pass.
- [ ] Prove board fetch/path/event failure exits 2 and fails closed.
- [ ] Prove a compliant current-head PR is green.
- [ ] Follow CORE-033’s observed-once authorized procedure before requiring the check.
- [ ] Confirm direct `kanmer-board` pushes create no PR workflow run.
- [ ] Run focused core tests, typecheck, build, CLI fixtures, full `npm run verify`, and `git diff --check`.
- [ ] Confirm no MCP tool/plugin/reference, GUI, dependency/lock, profile/gate, phase-2, auto-merge, or GitHub write behavior changed.
- [ ] Write implementation report naming `kanmer-gate → check-pr.mjs → evaluateMergeGate/KanmerStore` as the production caller chain.
- [ ] Open PR with `Kanmer: CORE-024` and stop at independent review; do not merge or begin CORE-025.

## Progress notes

Append test fixture IDs/counts, before/after board hashes, CLI JSON/exit examples, workflow/check/run/head evidence, protection staging, and every failed attempt.
