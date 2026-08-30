# Post-implementation report — SKILL-038

## Outcome

PR #304 is rebased onto exact green main
`add0da7fc17968796f43b3035065de400a4db2d4` and represented by one truthful
final commit, `22c3cfa239e87893cc6fc639d27746273e614754`.

The controller contract now:

- distinguishes a board-wide `blocked` flag from a blocker inside the frozen
  roster;
- applies ordinary exclusions, including live foreign claims, before the
  external-blocker fixed point and dependency graph;
- keeps safe acyclic in-roster dependents queued behind their blockers;
- excludes externally blocked dependents with the blocker ids named;
- detects every cyclic SCC and self-loop, records complete members and an
  ordered witness path, and dispatches none;
- propagates a terminal blocked disposition through every transitive
  downstream dependent, naming the originating cycle;
- keeps unrelated safe lanes running and moves the run to `blocked` only after
  every safe lane is terminal;
- bounds transient verification re-runs with `transient_retry_limit: 2`,
  persisted with a per-ticket `Transient` counter;
- uses run schema 3 for that counter and budget;
- reconciles every schema-1/schema-2 lane, worker, claim, workspace, Git/PR/CI
  fact, and result before any terminal transition;
- preserves an active or uncertain legacy ledger and pointer byte-for-byte,
  creates no successor, and requires exact evidence handoff;
- only after every legacy worker is proven inactive, preserves and terminally
  closes the old record under its own schema and links one distinct schema-3
  successor with a fresh run id and roster;
- refuses an absent or unknown schema and malformed schema-3 new-run fields.

Root `AGENTS.md` carries the same ordered blocker, cycle-propagation,
independent-lane, retry, and quiescent-schema-transition conventions.

## Exact diff

Exactly six declared files differ from `origin/main`:

- `AGENTS.md`
- `plugins/kanmer/skills/kanmer-auto/SKILL.md`
- `plugins/kanmer/skills/kanmer-auto/assets/current-run-template.md`
- `plugins/kanmer/skills/kanmer-auto/assets/run-state-template.md`
- `scripts/verify-skill-prose.mjs`
- `scripts/verify-skill-prose.test.mjs`

There is no `packages/**`, dependency, manifest, or workflow change. CORE-128
ownership is absent from both the net diff and branch history: no pre-existing
main teardown is changed. Every fixture teardown introduced or retained by
SKILL-038 uses `removeTreeWithRetrySync`; the file contains zero bare
`rmSync(` calls.

The mandatory-stop section remains exactly 1,877 UTF-8 bytes with SHA-256
`03796a0e22ae67a371b1ddb58bbccdf4f08b3d5d9442eb47f59a27c6e9e19b38`.
The eleven numbered sections remain `## 1.` through `## 11.`.

## Tests and retained attempts

Focused evidence at the exact committed tree:

- `npm run build:core`: PASS.
- `node scripts/verify-skill-prose.mjs`: PASS.
- `node --test scripts/verify-skill-prose.test.mjs`: PASS, 39/39.
- `git diff --check`: PASS.

Retained final-head rail attempts:

1. `npm run verify` on 2026-08-28: FAIL. Core passed 562/562; GUI passed
   522/524. The two failures were unchanged portable-launcher tests hitting
   Vitest's fixed five-second ceiling at 5.74s and 5.38s while the real-Git
   GUI file took 992s. No source changed.
2. Same-SHA focused launcher contract: PASS, 12/12; the two prior failures
   completed in 2.38s each. This established the host-latency mechanism.
3. A subsequent same-SHA full rail was externally interrupted during core
   tests and is retained as INCONCLUSIVE.
4. Clean Windows `npm run verify` on 2026-08-30: PASS at exact
   `22c3cfa239e87893cc6fc639d27746273e614754`.

The successful complete rail included core 562/562, GUI 524/524, MCP HTTP
144/144, script 147/147, MCP smoke 338/338, protocol 50/50, discovery 13/13,
agents-block 31/31, MCPB and headless smoke, typecheck, documentation, and
plugin synchronization (40 tools, byte-identical bundle, 12 skill
frontmatters). It was one uninterrupted rail and the worktree remained clean.

## Consolidated review remediation

All eight current findings are addressed in this one bounded batch:

- F-001: legacy successor creation now requires complete reconciliation and
  proven quiescence;
- F-002: ordinary/live-claim exclusions precede external closure and graph
  construction;
- F-003: cycle blocking propagates through all downstream dependents;
- F-004: independent safe lanes finish before run-wide blocking;
- F-005: dependency cycles/self-loops terminate explicitly;
- F-006: schema 3 and the preserved successor path version the retry contract;
- F-007: CORE-128 remediation is absent;
- F-008: canonical AGENTS conventions are present and mutation-pinned.

Hosted exact-head checks, automated-review settlement, the independent delta
review, public thread dispositions, merge, and exact-merge verification remain
review/verification work and are not claimed here.
