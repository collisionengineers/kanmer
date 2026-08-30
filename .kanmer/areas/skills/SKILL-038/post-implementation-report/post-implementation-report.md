# Post-implementation report — SKILL-038

## Outcome

PR #304 is based on exact green main
`add0da7fc17968796f43b3035065de400a4db2d4` and represented by one truthful
final commit, `339be5c802197bdd3e96c7dcbda591c02f9fe972`.

The controller contract now:

- applies ordinary exclusions, including live foreign claims, before the
  external-blocker fixed point and internal dependency graph;
- keeps safe acyclic in-roster dependents queued behind their blockers and
  excludes external blockers with their ids named;
- detects every cyclic SCC and self-loop, records complete members and an
  ordered witness, blocks every member and transitive downstream dependent,
  and lets unrelated safe lanes finish before run-wide blocking;
- persists `transient_retry_limit: 2` and a per-ticket `Transient` count in
  schema 3, with an exact exhausted-budget refusal;
- permits only one automatic verification retry route: a fresh independent
  verifier after `kanmer-verify` classifies the prior exact-SHA proof
  `transient`, while the persisted counter has room; direct, same-worker,
  unclassified, and non-transient retries remain forbidden;
- reconciles every schema-1/schema-2 worker and requires proven quiescence
  before closing the preserved old record under its own schema and linking a
  distinct schema-3 successor; active or uncertain legacy state leaves the
  ledger and pointer byte-identical and creates no successor.

Root `AGENTS.md` carries the same dependency, retry, and schema-transition
contract. The validator and mutation suite pin each clause independently.

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

Focused evidence at exact final head `339be5c802197bdd3e96c7dcbda591c02f9fe972`:

- `npm run build:core`: PASS.
- `node scripts/verify-skill-prose.mjs`: PASS.
- `node --test scripts/verify-skill-prose.test.mjs`: PASS, 40/40.
- `git diff --check`: PASS.

Retained rails:

1. Head `22c3cfa`: FAIL with core 562/562 and two unchanged fixed-five-second
   GUI launcher timeouts; same-SHA focused launcher contract then passed 12/12,
   establishing host latency without a source change.
2. Head `22c3cfa`: INCONCLUSIVE after external interruption.
3. Head `22c3cfa`: PASS in one complete clean Windows rail on 2026-08-30.
4. Head `f5a3837`: INCONCLUSIVE by deliberate stop after the independent delta
   reviewer found that the new AGENTS retry invariant lacked mutation coverage.
5. Final head `339be5c802197bdd3e96c7dcbda591c02f9fe972`: PASS in one uninterrupted
   `npm run verify` Windows rail on 2026-08-30.

The final rail passed core 562/562, GUI 524/524, MCP HTTP 144/144, script
148/148, MCP smoke 338/338, protocol 50/50, discovery 13/13, agents-block
31/31, typecheck, documentation, MCPB and headless smoke, and plugin
synchronization (40 tools, byte-identical bundle, 12 skills). The worktree
remained clean.

## Consolidated review remediation

F-001 through F-008 remain fixed as previously recorded. Exact-head automated
finding F-009 is also fixed: section 9 now explicitly reconciles the sole
bounded proof-classified verification rerun with the general no-command-retry
rule, and both the skill and canonical AGENTS forms have independent negative
fixtures. Hosted exact-head checks, automated-review settlement, the formal
independent PASS attestation, public thread dispositions, merge, and exact-merge
verification remain review/verification work and are not claimed here.
