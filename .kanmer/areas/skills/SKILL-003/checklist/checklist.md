# Checklist

- [x] PRD/FRD/ADR decision table in the skill, word-identical to `docs/README.md`
- [x] granularity test with its provenance
- [x] PRD path corrected and verified to exist
- [x] FRD path corrected and verified
- [x] ADR path corrected, four digits, verified
- [x] paths match `repoDocKindOf`'s globs
- [x] bare `impact` fixed in kanmer-docs
- [x] bare `impact` fixed in kanmer-tickets
- [x] widened residue grep returns zero
- [x] `verify:agents-block` still passes

## Progress notes

- 2026-08-21 — Existing merged implementation PR #19 commit `aacd09ff86f58cfe910b9e2182b37b03a3bd604f` is reachable from main. Audit found the decision table present but its granularity/provenance and cross-cutting wording had drifted from the canonical `docs/README.md`; synchronized that bounded copy in `d7e107b9f27a64851935310e8768fbc2c249fb75`.
- 2026-08-21 — Table + granularity block now compares identical to README; widened `\\bimpact\\b|kanmer-import` residue grep returns 0 across skills; `npm run verify:skills` passed all checks; `npm run verify:agents-block` passed 31/31; root `npm run plugin:check` passed.
- 2026-08-21 — PRD/FRD/ADR paths and configurable `repoDocs` guidance were already present and remain unchanged. No SKILL-004/005/007 or GUI-017 scope entered the diff.

# Closeout checklist

Append to the ticket's checklist.md when closeout starts
(`set_ticket_doc doc: "checklist", append: true`) so the human watches
cleanup progress live.

---

## Closeout — SKILL-003

- [x] PR merge verified (`gh pr view --json state,mergedAt`)
- [x] proof.md finalised (PR URL + merge date appended)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body (PR link, follow-ups)
- [x] cd out of worktree; `git worktree remove .worktrees/skill-003`
- [x] `git branch -D skill-003-decision-table` (squash-merged PR)
- [x] `git fetch --prune origin` + `git worktree prune`
- [x] `take_ticket action: "release"`
