# Post-implementation report — DOC-026

## Summary

Retired the stale root `CLOSEOUT_PLAN.md` and added a short, hand-written
"Operating index and historical documents" subsection to `AGENTS.md` (outside
the managed block), placed right after the intro paragraph and before
"## 0. The operating rule". Folded in both of DOC-028's review findings
(F-001, F-002) as instructed. Mined the local branch `local-closeout-plan-docs`
and confirmed nothing from it needed porting, then deleted it.

## Base

`main` @ `bd36854967b0fa0b68489a4f3db592a59d451696` (DOC-028, PR #321, merged).

## Files changed

- `CLOSEOUT_PLAN.md` — deleted, no tombstone.
- `AGENTS.md` — two changes, both outside `<!-- kanmer:instructions:start -->`
  / `<!-- kanmer:instructions:end -->`:
  1. New `## 0.1 Operating index and historical documents` subsection (14
     lines): names Alex as the named heavy verification owner (what the
     managed block's "the named verifier recorded in the repo's operating
     index" phrase now resolves to — DOC-028 review F-001), and maps
     `CLOSEOUT_PLAN.md` (retired, superseded by `apps/gui/release-notes.md`
     + `.kanmer/groups/HZN-008/closeout.md`), `MASTERPLAN.md` (historical,
     kept), and `goal.md` (historical, kept).
  2. §2 skills tree: reworded the `kanmer-verify/` comment from "validate on
     merged main" to "validate at the exact merge SHA on the configured
     integration branch" (DOC-028 review F-002), and deleted the phantom
     `kanmer-import/` row — that skill does not exist on disk
     (`plugins/kanmer/skills/` has 12 directories).

The managed block itself is byte-identical before and after (confirmed by
`node scripts/verify-agents-block.mjs`, which diffs the current body against
the canonical `BLOCK_BODY`).

## Grep confirmations

- No source, workflow, skill, `AGENTS.md`, `CLAUDE.md` or `README.md` file
  references `CLOSEOUT_PLAN.md` before deletion (confirmed on `main` and
  again in the worktree before removing the file).
- No other "merged main" / "on merged `main`" phrasing remains outside the
  managed block, except line ~503/518 in §6 (`npm run release -- <version>
  --publish`'s documented precondition "from clean merged `main`") — that
  describes the actual hard-coded behaviour of that release-publication
  command (it always targets `main`, unlike the configurable
  `delivery.integrationBranch` the managed block now names), so it was left
  unchanged per the plan.

## Mined-branch outcome

`git log main..local-closeout-plan-docs` showed 3 commits
(`20b13e00`, `6ace0e6c`, `652f1baf`). `git diff main...local-closeout-plan-docs`
touched only `CLOSEOUT_PLAN.md` (a 281-line rewrite, discarded — the ticket's
2026-09-02 Decision is to retire the file, not rewrite it) and `AGENTS.md`
(14 lines across two paragraphs: the `KANMER_BOARD_BRANCH`/branch-rename
paragraph, and the local-MCP-convention paragraph). Both AGENTS.md hunks are
already present byte-for-byte in the current managed block on `main`
(superseded by CORE-139/DOC-028 work), so **nothing from the branch needed
porting**. The branch was deleted: `git branch -D local-closeout-plan-docs`.

## Commands and exit codes

```
npm run verify:docs        # exit 0 — PASS, manual up to date (22 chapters)
npm run check:manual       # exit 0 — manual up to date (22 chapters)
node scripts/verify-agents-block.mjs   # exit 0 — 35/35 checks passed
npm run verify:skills      # exit 0 — ALL CHECKS PASSED
npm run build:core         # exit 0 — required once in the fresh worktree before test:scripts could resolve packages/core/dist
npm run test:scripts       # exit 0 — 184/184 tests pass, 0 fail
```

No source, script, package, app, workflow, or skill file besides `AGENTS.md`
and the deleted `CLOSEOUT_PLAN.md` was touched.

## Deviations

- `npm run test:scripts` initially failed in the fresh worktree with
  `ERR_MODULE_NOT_FOUND` for `packages/core/dist/index.js` — a stale/missing
  build artifact in the new worktree checkout, unrelated to this ticket's
  doc-only diff. Ran `npm run build:core` once (no source edits) and the
  suite then passed 184/184. Not part of the plan's ordered steps; recorded
  here as a required environment step, not a scope change.
- Everything else matched the plan exactly; no scope changes.

## Risks / follow-ups

None identified. This is a doc-only chore; the managed block itself is
untouched and its two review findings from DOC-028 are now resolved by this
ticket's new subsection and comment fix.
