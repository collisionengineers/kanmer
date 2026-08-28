# Post-implementation report — SKILL-038

## Outcome

PR #304 is rebased onto exact green main
`add0da7fc17968796f43b3035065de400a4db2d4` and represented by one truthful
commit, `8010881c4e48ffabe97aba674361980f8ab3b279`.

The controller contract now:

- distinguishes a board-wide `blocked` flag from a blocker inside the frozen
  roster;
- keeps acyclic in-roster dependents queued behind their blockers;
- excludes externally blocked dependents with the blocker ids named;
- detects cycles and self-loops before retention, records the ordered cycle and
  complete member set, marks every member and the run `blocked`, and dispatches
  none of those members;
- bounds transient verification re-runs with
  `transient_retry_limit: 2`, persisted with a per-ticket `Transient`
  counter;
- uses run schema 3 for that counter and budget;
- never resumes, restamps, supplements, or rewrites an active schema-1/schema-2
  record as schema 3: the complete old ledger is preserved and terminally
  closed under its own schema, then a distinct schema-3 successor with a new id
  and freshly frozen roster is created;
- refuses an absent or unknown schema and refuses creation of a malformed
  schema-3 run.

Root `AGENTS.md` now carries the same internal/external blocker, cycle, retry,
and schema-transition conventions.

## Exact diff

Exactly six declared files differ from `origin/main`:

- `AGENTS.md`
- `plugins/kanmer/skills/kanmer-auto/SKILL.md`
- `plugins/kanmer/skills/kanmer-auto/assets/current-run-template.md`
- `plugins/kanmer/skills/kanmer-auto/assets/run-state-template.md`
- `scripts/verify-skill-prose.mjs`
- `scripts/verify-skill-prose.test.mjs`

There is no `packages/**` change and no dependency change. CORE-128 ownership
has been removed from both the net diff and branch history: no pre-existing
main teardown is changed. All ten fixture teardowns introduced or retained by
SKILL-038 (the original five plus five review-remediation fixtures) use
`removeTreeWithRetrySync`; the file contains zero bare `rmSync(` calls.

The mandatory-stop section remains exactly 1,877 UTF-8 bytes with SHA-256
`03796a0e22ae67a371b1ddb58bbccdf4f08b3d5d9442eb47f59a27c6e9e19b38`.
The eleven numbered sections remain `## 1.` through `## 11.`.

## Tests and evidence

Focused evidence at the exact committed tree:

- `npm run build:core`: PASS.
- `npm run verify:skills`: PASS; 41/41 section-19 assertions.
- `node --test scripts/verify-skill-prose.test.mjs`: PASS; 37/37.
- `git diff --check`: PASS.
- Full Windows `npm run verify`: PASS at
  `8010881c4e48ffabe97aba674361980f8ab3b279`.

The full rail included core 562/562, GUI 524/524, MCP HTTP 144/144, script
145/145, MCP smoke 338/338, protocol 50/50, discovery 13/13,
agents-block 31/31, MCPB consistency, headless smoke, typecheck, documentation,
and plugin synchronization (40 tools, byte-identical bundle, 12 skill
frontmatters). It was one uninterrupted rail; no same-SHA rerun was needed.

## Review remediation

The final tree addresses all four current threads in one batch:

- dependency cycles terminate explicitly;
- run schema is versioned and old records use a preserved terminal-successor
  path;
- CORE-128 remediation is absent;
- canonical AGENTS conventions are present and mutation-pinned.

Hosted exact-head checks, automated-review settlement, the fresh independent
review, public thread dispositions, merge, and exact-merge verification remain
review/verification work and are not claimed here.
