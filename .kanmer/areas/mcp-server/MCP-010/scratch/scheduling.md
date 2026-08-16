## Scheduler decisions — 2026-08-16, HZN-003 auto run

Questions 2-5 are technical/planner-level and are settled here so the planner does
not re-open them. **Question 1 is operator-only and has been escalated; it is NOT
answered below and the plan must not assume an answer to it.**

**Q2 — does the ancestor walk pass through a `.git` file?**
**Accepted: the hard boundary is a `.git` DIRECTORY only; a `.git` FILE is
traversed.** Research verified on disk that `.worktrees/kanmer/.git` is a 66-byte
`gitdir:` file — that is what every git *linked* worktree looks like. Since
`kanmer-execute` puts every implementing agent inside `.worktrees/<id>`, a
"stop wherever `.git` exists" walk would halt at `<repo>/.worktrees/<ticket-id>`,
never reach `<repo>`, and never find `<repo>/.worktrees/kanmer/.kanmer`. That is
the dominant real case, so the rule as originally worded would have broken exactly
the layout this ticket exists to support.

**This corrects the approved plan.** The plan document says the walk "stops at a
filesystem root or a `.git` boundary" without distinguishing file from directory.
That wording is wrong and is superseded by this note. Say so explicitly in the ADR
— a silently corrected premise is how the same mistake returns.

Also accepted: **probe each level BEFORE applying the boundary**, because the repo
root holds both `.git` and `.worktrees/`. Boundary-then-probe would skip it.

**Q3 — which package owns the resolver?**
**Accepted: `packages/core/src/discover.ts`,** exported from the core barrel, with
`packages/core/src/discover.test.ts` beside it. `packages/mcp-server/src/root.ts`
stays as thin composition. Reason: `packages/mcp-server` has no test runner at all
— no `test` script, no vitest dependency, no test files — and `FRD-022:48-49`
records that absence as a *deliberate* decision. Putting the tests there would
require overturning an approved doc as a side effect of a bug fix, which is not
this ticket's mandate. Core already has vitest, and `discover` is the exact inverse
of `deriveRepoRoot`, which already lives in core's `paths.ts`. It belongs there on
design grounds, not only on testing grounds.

**Q4 — tie-break when several `.worktrees/*/.kanmer` exist?**
**Accepted: exact leaf `kanmer` wins; otherwise lexicographic; all candidates named
in the provenance.** `.worktrees/kanmer` is a convention rather than an invariant
(`kanmerGit.ts:119-122` adopts a board worktree checked out at any path), so the
tie-break must be deterministic and must not silently pick. Naming every candidate
in `tried` is what makes a wrong pick diagnosable.

**Q5 — provenance field name and vocabulary?**
**Accepted: `{ root, how, tried }` with
`how ∈ flag | env | cwd | cwd-worktree | ancestor | ancestor-worktree`,
surfaced in `get_status` as `rootSource`.**
MCP-012 is the consumer of this field and sits directly behind MCP-010 in the same
lane (see MCP-012's scheduling note). MCP-010 defines the vocabulary; MCP-012
reports it. MCP-012 does not get to rename it.

**Injection:** the resolver needs an injected `readdirSync` as well as `existsSync`
— `existsSync` cannot enumerate, and the `.worktrees/*` step is a glob. Keep it
pure over both, matching `io.ts`.

**Resolution must move inside `main()`.** `index.ts:33-35` resolves at module
scope, so a throw there never reaches `main().catch` at :1104 and the host shows
only "server failed to start" — which is the same invisibility this ticket exists
to end. This holds whichever way question 1 is answered.

**Discovery returns the BOARD root, not the repo root**, or `deriveRepoRoot` and
governing-doc `refs` stop resolving.

**Lane A order: MCP-010 → MCP-012 → CORE-023 → MCP-007 → MCP-009.**
MCP-011 is researched only after MCP-010 lands.
