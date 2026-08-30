# Post-implementation report — SKILL-038

## Outcome

PR #304 is based on exact green main
`add0da7fc17968796f43b3035065de400a4db2d4` and represented by one truthful
final commit, `0eece7d6eaa1272696095e84eee7e43397702729`.

The controller contract now:

- applies ordinary exclusions, including live foreign claims, before external
  blocker closure and dependency-graph construction;
- resolves dependency feasibility against the requested terminal target before
  retaining a dependent: a blocker that cannot reach the board's final stage
  gives itself and every downstream dependent an explicit blocked disposition,
  while a closeout/Done target and already-Done blockers retain valid acyclic
  ordering;
- keeps safe acyclic in-roster dependents queued behind their blockers, excludes
  external blockers with their ids named, detects every cyclic SCC and
  self-loop, blocks every cycle member and transitive downstream dependent, and
  lets unrelated safe lanes finish before run-wide blocking;
- persists `transient_retry_limit: 2` and a per-ticket `Transient` count in
  schema 3, with an exact exhausted-budget refusal and a frozen exhausted
  schedule;
- permits exactly two fresh independent-verifier entries into that single
  persisted budget: an evidence-bootstrap request whose authoritative result is
  `INCONCLUSIVE`/`inconclusive`, and a later authoritative exact-SHA
  `transient` classification. The bootstrap must name the same failing job and
  SHA, keep the failing path untouched, state a concrete environmental
  mechanism hypothesis, and request fresh evidence. The controller cannot
  self-classify and the same worker cannot retry;
- reconciles every schema-1/schema-2 worker and requires proven quiescence
  before closing the preserved old record under its own schema and linking a
  distinct schema-3 successor. Active or uncertain legacy state leaves the
  ledger and pointer byte-identical and creates no successor.

Root `AGENTS.md` carries the same dependency, retry, and schema-transition
contract. The validator and mutation suite pin the independently guarded
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
The eleven numbered sections remain unchanged.

## Verification and retained attempts

Focused evidence at exact final head
`0eece7d6eaa1272696095e84eee7e43397702729`:

- `node scripts/verify-skill-prose.mjs`: PASS.
- `node --test scripts/verify-skill-prose.test.mjs`: PASS, 41/41.
- `npm run verify:skills`: PASS.
- `git diff --check origin/main...HEAD`: PASS.

Retained rails:

1. Head `22c3cfa`: FAIL with core 562/562 and two unchanged fixed-five-second
   GUI launcher timeouts; same-SHA focused launcher contract then passed 12/12,
   establishing host latency without a source change.
2. Head `22c3cfa`: INCONCLUSIVE after external interruption.
3. Head `22c3cfa`: PASS in one complete clean Windows rail on 2026-08-30.
4. Head `f5a3837`: INCONCLUSIVE by deliberate stop after independent review
   found a changed-contract test gap.
5. Head `339be5c`: PASS in one complete Windows rail.
6. Final head `0eece7d6eaa1272696095e84eee7e43397702729`, standalone clean
   checkout: INCONCLUSIVE. Core 562/562, GUI 524/524, MCP HTTP 144/144 and all
   preceding work passed; scripts were 148/149 because the clone inherited a
   filesystem `origin`, so the release-notes test generated a local-path PR
   link. This was a verification-checkout metadata defect, not a source failure.
7. The verification clone's `origin` alone was set to
   `https://github.com/collisionengineers/kanmer.git`; the focused
   release-notes test passed 1/1.
8. The second complete `npm run verify` rail at the same exact final SHA then
   passed uninterrupted: core 562/562, GUI 524/524, MCP HTTP 144/144, scripts
   149/149, MCP smoke 338/338, protocol 50/50, discovery 13/13, AGENTS 31/31,
   typecheck, documentation, headless smoke, MCPB, skills, and plugin
   synchronization (40 tools, byte-identical bundle, 12 skill frontmatters).

The source worktree is clean.

## Consolidated review remediation

F-001 through F-009 remain fixed. F-010 through F-012 are fixed together at the
final head: the retry path has authoritative result and failure-class evidence
on both permissible entries, dependency retention is target-aware and
terminally propagates impossible targets, and each new AGENTS clause has a
negative mutation. Independent pre-audit found no blocker or major finding
after that remediation.

Hosted exact-head checks, automated-review settlement, the formal independent
PASS attestation, public thread dispositions, merge, and exact-merge
verification remain review/verification work and are not claimed here.
