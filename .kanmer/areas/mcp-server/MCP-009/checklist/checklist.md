# Checklist — MCP-009

*The checklist. Not the plan — every line is **independently tickable**; the
reasoning lives in the plan.*

Docs only. No file outside `docs/` may appear in the diff.

- [x] Amend `research`: supersede Finding 4c with the adjudication verdict, fix the Antigravity column of Finding 5's table, and correct §"What this implies"
- [x] Amend `research`: record the workspace-binding gate and its three non-gates (trust, git root, project existence) so MCP-015 inherits the evidence
- [x] Amend `research`: record the `call_mcp_tool` / `list_resources` / `read_resource` triad as a general false-negative hazard, and note the marketplace-root and `.mcp.json` findings are owned by MCP-013 and GUI-079
- [x] Replace ADR-0009 ¶19 with the amended clause: absence-of-evidence rule, check-the-binary method, verify-the-mechanism worked example, corrected three-host convergence note with the Antigravity binding caveat
- [x] Add the binding caveat to ADR-0009 ¶9 (Context) and the inert-until-MCP-015 clause to Consequences
- [x] Correct FRD-012 R2's install matrix against the measured evidence, naming MCP-013/014/015 for each gap
- [x] Restate FRD-012 AC2 with the workspace-binding precondition and MCP-015 as owner
- [x] Replace FRD-012 R5 with a pointer to the amended ADR-0009 clause and extend the `Related:` line
- [x] Confirm FRD-012 is absent from `FROM_FRD` in `scripts/build-manual.mjs` (no `chapters.generated.ts` regeneration)
- [x] Verification run: `npm test`, `npm run typecheck`, `npm run check:manual`, plus `git diff --stat` proving docs-only, plus the negative grep for the retired wrong lesson (this box produces proof.md)

## Progress notes

**Verified the binding claim firsthand rather than inheriting it.** The
adjudication asserts Kanmer establishes no `agy` workspace binding. Re-ran it in
this worktree before shipping it into an ADR:
`grep -rn -- "--new-project\|--add-dir\|--project" apps/ packages/` returns
nothing, and the only `agy` string in either tree is a stale comment at
`providers.ts:451`. Confirmed.

**Applied the ticket's own rule to the research's own table.** Finding 5's
Antigravity column originally read "no" for all four skill directories. Those
negatives came from the same unbound probe the adjudication overturned, so only
`.agents/skills/` — the one re-run under a binding — is now a "yes"; the other
three are marked *unestablished*, not "no". Recording them as "no" would have
been exactly the absence-of-evidence error this ticket exists to retire.

**FRD-012 on `origin/main` was ahead of the main checkout.** GUI-080 had landed
R2a, an amended R4 and AC5 since the ticket's `files` document was written. Read
and edited the worktree copy, so those additions are preserved intact; the
`files` doc's line references were stale but its analysis held.

**`providers.ts` line numbers in `research` have drifted** (the `agy -p` comment
is at :451, research cites :386). Not corrected in the research — the code is
out of scope and the citations are still findable by content. Flagged for
MCP-013/014/015 so they search by string, not by line.

**Rail note — pre-existing flaky test, not caused by this change.**
`apps/gui/src/main/kanmerGit.test.ts` fails non-deterministically on Windows
with `EPERM` in its `afterEach` `rmSync` of a temp git worktree. Run 1: 2
failures (`ensureBoardWorktree reconciliation`). Run 2: 1 failure, a *different*
test (`renameBoardBranch > keeps the history…`). In isolation all 7 tests in the
file pass. The file is not in this ticket's diff (`git diff --stat origin/main`
shows only the two docs). `@kanmer/core` passed 193/193 on both runs. Surfaced
for the operator; no ticket filed, since filing is outside this ticket's
docs-only scope.

**Fresh-worktree gotcha for the rail.** `npm run typecheck` fails out of the box
in a new worktree with `TS2305` on `@kanmer/core` exports — `packages/core/dist`
does not exist until `npm run build` runs. Not a regression; `npm run setup`
chains them for this reason. Build first, then typecheck.
