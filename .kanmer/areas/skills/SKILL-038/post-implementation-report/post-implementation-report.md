# Post-implementation report — SKILL-038

## Outcome

PR #304 is based on exact green main
`add0da7fc17968796f43b3035065de400a4db2d4` and represented by one truthful
final commit, `d10e79d1ac506e2e3b81a219a7c6749e670d45d9`.

The controller contract now:

- applies ordinary exclusions, including live foreign claims, before external
  blocker closure and dependency-graph construction;
- parses the requested target before dependency feasibility. For a target that
  reaches the board's final stage, safe acyclic in-roster dependencies remain
  queued in serial order. For a shallower target, the blocker may reach that
  target, while its dependents and their transitive downstream set receive
  explicit terminal blocked dispositions naming the blocker, requested target,
  and board final stage;
- excludes external blockers with their ids named, detects every cyclic SCC and
  self-loop, blocks every cycle member and transitive downstream dependent, and
  lets unrelated safe lanes finish before run-wide blocking;
- persists `transient_retry_limit: 2` and a per-ticket `Transient` count in
  schema 3, with an exact exhausted-budget refusal and a frozen exhausted
  schedule;
- permits exactly two logical fresh-independent-verifier attempts in that one
  budget: an evidence bootstrap from authoritative `FAIL | INCONCLUSIVE` with
  `failure_class: inconclusive`, then a later authoritative exact-SHA
  `transient` classification. A FAIL bootstrap retains its non-zero attempt;
  both require the explicit same-job/same-SHA request, untouched failing path,
  and concrete environmental mechanism hypothesis, with no controller
  self-classification or same-worker retry;
- reserves the durable counter once per logical verifier attempt. The single
  confirmed pre-mutation transport launch retry reuses the reservation without
  increment, decrement, or reset; unknown launch status dispatches no
  replacement;
- reconciles every schema-1/schema-2 worker and requires proven quiescence
  before closing the preserved old record under its own schema and linking a
  distinct schema-3 successor. Active or uncertain legacy state leaves the
  ledger and pointer byte-identical and creates no successor.

Root `AGENTS.md` carries the same dependency, retry, and schema-transition
contract. The validator and mutation suite independently pin the guarded
clauses.

## Exact diff

Exactly six declared files differ from `origin/main`:

- `AGENTS.md`
- `plugins/kanmer/skills/kanmer-auto/SKILL.md`
- `plugins/kanmer/skills/kanmer-auto/assets/current-run-template.md`
- `plugins/kanmer/skills/kanmer-auto/assets/run-state-template.md`
- `scripts/verify-skill-prose.mjs`
- `scripts/verify-skill-prose.test.mjs`

There is no `packages/**`, dependency, manifest, or workflow change. CORE-128
ownership is absent. Every SKILL-038 teardown uses
`removeTreeWithRetrySync`; there is no bare `rmSync(` call.

The mandatory-stop section remains exactly 1,877 UTF-8 bytes with SHA-256
`03796a0e22ae67a371b1ddb58bbccdf4f08b3d5d9442eb47f59a27c6e9e19b38`.

## Verification and retained attempts

Focused evidence at exact final head
`d10e79d1ac506e2e3b81a219a7c6749e670d45d9`:

- `node scripts/verify-skill-prose.mjs`: PASS.
- `node --test scripts/verify-skill-prose.test.mjs`: PASS, 41/41.
- `npm run test:scripts`: PASS, 149/149.
- `npm run verify:skills`: PASS.
- `git diff --check origin/main...HEAD`: PASS.

Retained earlier rails preserve their original dispositions:

1. `22c3cfa`: one host-latency FAIL, one externally interrupted
   INCONCLUSIVE, and one complete PASS.
2. `f5a3837`: INCONCLUSIVE after review found a changed-contract mutation
   gap.
3. `339be5c`: complete PASS.
4. `0eece7d6`: first standalone-checkout rail INCONCLUSIVE because that clone
   inherited a filesystem origin and only the release-notes URL test failed;
   changing only clone remote metadata made the focused test pass 1/1 and a
   second complete rail PASS at the unchanged source SHA.
5. Final head `d10e79d1ac506e2e3b81a219a7c6749e670d45d9`: one complete clean
   Windows `npm run verify` rail PASS from a detached standalone clone whose
   origin was set to the canonical GitHub URL before the run. It passed core
   562/562, GUI 524/524, MCP HTTP 144/144, scripts 149/149, MCP smoke 338/338,
   protocol 50/50, discovery 13/13, AGENTS 31/31, typecheck, documentation,
   headless smoke, MCPB, skills, and plugin synchronization (40 tools,
   byte-identical bundle, 12 skill frontmatters).

The source worktree is clean.

## Consolidated review remediation

F-001 through F-012 remain fixed. Exact-head F-013 and F-014 were accepted as
one bounded retry-state remediation: canonical FAIL/inconclusive proof can now
enter evidence bootstrap without rewriting the red attempt, and the one
confirmed pre-mutation launch retry no longer double-charges a logical verifier
attempt. The independent reviewer inspected the local delta and found no
additional blocker or major; its wording correction about shallow-target
blockers is incorporated above.

Pushing this final head, exact-head automated-review settlement, the formal
independent PASS attestation, public thread dispositions, merge, and exact-merge
verification remain review/verification work and are not claimed here.
