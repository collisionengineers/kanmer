# Post-implementation report — SKILL-038

## Outcome

PR #304 is based on exact green main
`add0da7fc17968796f43b3035065de400a4db2d4` and represented by one truthful
final commit, `6aeaef23fffaf8820e18bf61ee8d70a9c1246cbc`.

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
- provides exactly two fresh-verifier authorization paths under one durable\n  budget. Evidence bootstrap may admit at most one evidence-establishing logical\n  attempt per ticket/run; the classified-transient path may admit another fresh\n  independent attempt whenever durable room remains. Raising the numeric limit\n  adds classified-path capacity, never a third path. FAIL bootstrap retains its\n  non-zero attempt, and both paths preserve the same-job/SHA, untouched-path,\n  mechanism-hypothesis, independence, and no-self-classification constraints;\n- reserves the durable counter once per logical verifier attempt. The single
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

Retained F-015 evidence at the prior exact head
`1d319fd86e9f5ab74684fe6d9d46538b01a0ad20`:

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
5. Prior head `d10e79d1ac506e2e3b81a219a7c6749e670d45d9`: one complete clean
   Windows `npm run verify` rail PASS from a detached standalone clone whose
   origin was set to the canonical GitHub URL before the run. It passed core
   562/562, GUI 524/524, MCP HTTP 144/144, scripts 149/149, MCP smoke 338/338,
   protocol 50/50, discovery 13/13, AGENTS 31/31, typecheck, documentation,
   headless smoke, MCPB, skills, and plugin synchronization (40 tools,
   byte-identical bundle, 12 skill frontmatters).

The source worktree is clean.

## Consolidated review remediation

F-001 through F-012 remain fixed. Exact-head F-013, F-014 and F-015 were accepted as
one bounded retry-state remediation: canonical FAIL/inconclusive proof can now
enter evidence bootstrap without rewriting the red attempt, and the one
confirmed pre-mutation launch retry no longer double-charges a logical verifier
attempt. The independent reviewer inspected the local delta and found no
additional blocker or major; its wording correction about shallow-target
blockers is incorporated above.

The exact final head is pushed. Exact-head automated-review settlement, the
formal independent PASS attestation, public thread dispositions, merge, and
exact-merge verification remain review/verification work and are not claimed here.


## Final F-015 exact-head evidence

F-015 corrected a literal two-attempt cap that contradicted the configurable
`transient_retry_limit`. The final contract has exactly two authorization
paths: one evidence-bootstrap admission per ticket/run, and classified-transient
admissions while durable budget remains. Every admitted logical attempt reserves
one count; raising the limit adds classified-path capacity and no third path.

At exact immutable head `1d319fd86e9f5ab74684fe6d9d46538b01a0ad20`:

- `node scripts/verify-skill-prose.mjs`: PASS.
- `node --test scripts/verify-skill-prose.test.mjs`: PASS, 41/41.
- `npm run test:scripts`: PASS, 149/149.
- `npm run verify:skills`: PASS.
- `git diff --check`: PASS.
- Complete clean Windows `npm run verify`: PASS from detached standalone clone
  `C:\\Users\\Alex\\Documents\\GitHub\\kanmer-verify-skill038-1d319fd8`
  with canonical GitHub origin configured before the run. It passed core
  562/562, GUI 524/524, MCP HTTP 144/144, scripts 149/149, MCP smoke 338/338,
  protocol 50/50, discovery 13/13, AGENTS 31/31, typecheck, docs, headless,
  MCPB, skills, and plugin synchronization.

## Final controller-state remediation and exact-head evidence

F-016 through F-021 were fixed together without expanding the six-file diff.
The final controller contract now:

- evaluates ordinary exclusions before target satisfaction, then determines
  target-reached members before any dependency pruning;
- preserves target-reached members and their outgoing live blocker evidence;
- defers expired-claim transfer until a surviving member's first assignment;
- snapshots and revalidates dependency safety before every assignment and after
  every result, while keeping roster membership immutable;
- propagates a terminal non-clearing blocker failure to every transitive
  unsatisfied dependent without stopping unrelated safe lanes; and
- durably prepares one deterministic legacy successor, preserves the exact
  legacy roster and dispositions by default, rolls interrupted transitions
  forward idempotently, and refuses malformed or conflicting intent.

At exact immutable commit
`5d13609c39b27b99df5f586a0bb300cdf1c591cc`:

- `node scripts/verify-skill-prose.mjs`: PASS.
- `node --test scripts/verify-skill-prose.test.mjs`: PASS, 44/44.
- `npm run test:scripts`: PASS, 152/152.
- `npm run verify:skills`: PASS.
- `git diff --check`: PASS.
- Mandatory stop predicates: 1,877 bytes, SHA-256
  `03796a0e22ae67a371b1ddb58bbccdf4f08b3d5d9442eb47f59a27c6e9e19b38`.
- Complete clean Windows `npm run verify`: PASS from detached standalone
  checkout
  `C:\\Users\\Alex\\Documents\\GitHub\\kanmer-verify-skill038-5d13609c`,
  with canonical GitHub origin configured before the run. It passed core
  562/562, GUI 524/524, MCP HTTP 144/144, scripts 152/152, MCP smoke 338/338,
  protocol 50/50, discovery 13/13, AGENTS 31/31, typecheck, documentation,
  headless smoke, MCPB, skills, and byte-identical plugin synchronization.

The source worktree and verification checkout were clean at the exact head.


## Final F-017/F-019/F-022/F-023 correction and evidence

The fresh independent exact-head review of `5d13609c39b27b99df5f586a0bb300cdf1c591cc`
found four remaining controller-contract defects. They were corrected together
without expanding the six-file diff:

- target satisfaction now requires live evidence that the linked PR is open
  against the recorded delivery target at its current exact head; unavailable
  provider evidence leaves the member waiting rather than terminally satisfied;
- expired-claim recovery records evidence only in the run ledger before calling
  the atomic transfer, and ticket scratch is written only after the transfer's
  locked re-check succeeds; `CLAIM_LIVE` leaves the ticket unchanged;
- `target-reached` is an explicit terminal schema-3 disposition in both
  exhaustive vocabularies; and
- legacy schema-1/2 handoff resolves every missing successor field from a
  durable audited source. Legacy fields are copied where present, schema-1
  group identity derives its scope selector, live delivery policy and project
  identity are checked, bounded operator values fill genuinely absent authority
  and retry fields, and transient counts are reconstructed or fail closed at
  the exhausted chosen limit. Missing or conflicting field resolution makes
  the intent malformed. The old record remains under its own schema and may
  receive only an event valid under that schema; it is never restamped as
  schema 3.

At exact immutable head
`a7acf99b5ae669ddee0d7782f188fac5ebc959d0`:

- `node scripts/verify-skill-prose.mjs`: PASS.
- mutation suite: PASS, 45/45.
- `npm run test:scripts`: PASS, 153/153.
- `npm run verify:skills`: PASS.
- `git diff --check`: PASS.
- Mandatory stop predicates: 1,877 UTF-8 bytes, SHA-256
  `03796a0e22ae67a371b1ddb58bbccdf4f08b3d5d9442eb47f59a27c6e9e19b38`.
- One complete clean Windows `npm run verify` rail: PASS from detached
  standalone checkout
  `C:\\Users\\Alex\\Documents\\GitHub\\kanmer-verify-skill038-a7acf99b`
  with the canonical GitHub origin. It passed core 562/562, GUI 524/524, MCP
  HTTP 144/144, scripts 153/153, MCP smoke 338/338, protocol 50/50, discovery
  13/13, AGENTS 31/31, typecheck, documentation, headless smoke, MCPB, skills,
  and byte-identical plugin synchronization. The checkout and source worktree
  were clean at that SHA.

---

## Final exact-head amendment — F-024 through F-026

Automated and independent review of prior head
`a7acf99b5ae669ddee0d7782f188fac5ebc959d0` identified one remaining
terminal-state root cause: target satisfaction was terminal in the run ledger
but later dependency pruning and final reporting still treated it as provisional.

At exact head `6130dd123460f06926347e0264628848960e51d2`:

- dependency pruning operates only on nonterminal members that still need
  advancement. A `target-reached` member is never replaced by an external,
  cyclic, downstream, or shallow-target disposition, while its outgoing board
  edge remains available when evaluating another unsatisfied member;
- immediately before terminal run status and the final report, the controller
  re-gathers each target-reached member's item revision, gates, target-specific
  delivery state, Git/PR/check evidence, and exact proof. Valid evidence is
  refreshed. Missing, stale, unavailable, or contradictory evidence preserves
  the old and current facts and becomes an explicit terminal
  `target evidence stale:` blocked disposition, without reopening or
  dispatching the member;
- root `AGENTS.md`, the canonical validator, and isolated mutation fixtures
  bind both invariants and the required recorded PR, target, head SHA, and
  observation time.

Focused proof passed with 47/47 mutation tests and 155/155 script tests,
`verify:skills`, and `git diff --check`. One clean complete Windows
`npm run verify` rail passed at the exact detached SHA, including core
562/562, GUI 524/524, MCP HTTP 144/144, MCP smoke 338/338, protocol 50/50,
discovery 13/13, AGENTS 31/31, typecheck, documentation, headless smoke, MCPB,
skills, and byte-identical plugin synchronization. The source worktree and
verification checkout were tracked-clean at that SHA.

---

## Exact-head cycle-boundary amendment — F-027

The automated review at `6130dd123460f06926347e0264628848960e51d2` found that the cycle graph still admitted
an incoming edge whose dependent was terminal `target-reached`. An apparent
`A -> B -> A` could therefore still classify A as a cycle member and replace
the terminal evidence, despite the broader needs-advancement rule.

At exact head `6aeaef23fffaf8820e18bf61ee8d70a9c1246cbc`, graph construction filters each live edge by its
dependent. Only a nonterminal member in the needs-advancement set may receive
an edge. A terminal target-reached member may remain a blocker source, but it
cannot receive an incoming dependency edge, enter a cyclic component, or
receive a downstream cycle disposition. Cycle-affected closure likewise
contains only nonterminal needs-advancement dependents. The skill gives the
explicit target-reached A / unsatisfied B negative case, root `AGENTS.md`
mirrors it, and isolated skill plus AGENTS mutations independently guard it.

Focused validator, 47/47 mutation tests, 155/155 script tests,
`verify:skills`, `git diff --check`, zero-bare-`rmSync`, six-file scope,
and the unchanged mandatory-section hash all passed. One complete clean Windows
`npm run verify` rail also passed at the exact detached SHA with canonical
GitHub origin; both the source and verification checkout were tracked-clean.
