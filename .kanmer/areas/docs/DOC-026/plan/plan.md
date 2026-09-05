## Objective

Retire the stale root `CLOSEOUT_PLAN.md`, add a short hand-written "Operating
index and historical documents" subsection to `AGENTS.md` (outside the managed
block) naming the heavy-verifier pointer and the historical-document map, and
fold in DOC-028's two review findings (F-001, F-002).

## Starting state

- `main` @ `bd36854967b0fa0b68489a4f3db592a59d451696` (DOC-028 merged; managed
  block already names `delivery.integrationBranch`, the heavy-verifier
  sentence, and "read what the current step needs").
- `CLOSEOUT_PLAN.md` at repo root, last touched by CORE-106 (2026-08-25), fully
  stale; grep confirms no source, workflow, skill, `AGENTS.md`, `CLAUDE.md` or
  `README.md` file references it.
- `groups/HZN-008/closeout.md` exists on the board (written 2026-09-05) as the
  successor record.
- `AGENTS.md` line 230: `kanmer-verify/    # Verifying stage: validate on
  merged main, write proof.md → Done` — stale phrasing (DOC-028 review F-002).
- `AGENTS.md` line 235: `kanmer-import/    # GitHub issues → tickets, ...` —
  phantom row; `plugins/kanmer/skills/` has exactly 12 directories, no
  `kanmer-import`.
- DOC-028 review F-001: the managed block's "the named verifier recorded in
  the repo's operating index" resolves to nothing defined in this repo. This
  ticket's new AGENTS.md subsection is what that phrase now points at.
- Local unpushed branch `local-closeout-plan-docs` (3 commits) carries a
  281-line `CLOSEOUT_PLAN.md` rewrite (discarded — the ticket's Decision
  retires the file, doesn't rewrite it) and 14 AGENTS.md lines. Diffed against
  `main`: both AGENTS.md hunks (the `KANMER_BOARD_BRANCH`/branch-rename
  paragraph and the local-MCP-convention paragraph) are already present
  byte-for-byte in the current managed block — superseded by later work
  (CORE-139/DOC-028). Nothing from that branch needs porting.

## Governing docs

No PRD/FRD/ADR governs this chore; it retires a stale root file and fixes
prose pointers per the ticket's own recorded Decision (2026-09-02) and Plan
(2026-09-05). No new ADR needed.

## Required changes

1. `git rm CLOSEOUT_PLAN.md` — no tombstone.
2. In `AGENTS.md`, outside the managed block, add a new subsection titled
   **"Operating index and historical documents"**, placed right after the
   "# AGENTS.md — Contributor & AI-agent guide to Kanmer" intro paragraph and
   before "## 0. The operating rule". Content (kept under ~15 lines):
   - Named heavy verifier: Alex (the repository owner) is the named heavy
     verification owner for this host; full `npm run verify` rails, packaging
     and installer builds serialize behind that role; implementers run scoped
     checks and let CI own the rail. (This is what the managed block's
     "operating index" phrase points at — DOC-028 review F-001.)
   - `CLOSEOUT_PLAN.md` — retired 2026-09-05 (DOC-026); superseded by
     `apps/gui/release-notes.md` and the HZN-008 group closeout on the board
     (`.kanmer/groups/HZN-008/closeout.md` on the board branch).
   - `MASTERPLAN.md` — historical programme plan (2026-08-20), kept, not
     current operating authority.
   - `goal.md` — historical owner brief, kept.
3. Fix the `kanmer-verify/` skills-tree comment (AGENTS.md, currently line
   230) from "validate on merged main" to "validate at the exact merge SHA on
   the configured integration branch" (DOC-028 review F-002).
4. Delete the `kanmer-import/` row from the same skills tree (§2) — phantom,
   12 skills ship, not 13.
5. Grep AGENTS.md for any other "merged main" / "on merged `main`" phrasing
   outside the managed block; the only other hit is line 503, describing the
   `npm run release -- <version> --publish` command's actual precondition
   ("from clean merged `main`") — that's accurate for the hard-coded release
   command (not the configurable integration-branch language DOC-028 fixed in
   the managed block), so leave it as is unless a closer read shows it should
   read `origin/main` consistency; do not touch the managed block itself.
6. Confirm the local branch `local-closeout-plan-docs` has nothing left to
   port (already checked above), then `git branch -D local-closeout-plan-docs`.

## Expected files

- `CLOSEOUT_PLAN.md` (deleted)
- `AGENTS.md`

## Do not modify

- Anything between `<!-- kanmer:instructions:start -->` and
  `<!-- kanmer:instructions:end -->` in `AGENTS.md`.
- `scripts/agents-block-body.mjs`, `plugins/kanmer/**`, any skill, workflow,
  or package source.

## Constraints

- No tombstone file for `CLOSEOUT_PLAN.md`.
- Keep the new subsection under ~15 lines.
- Do not touch the managed block.

## Ordered steps

### Step 1 — Delete CLOSEOUT_PLAN.md
Files: `CLOSEOUT_PLAN.md`
`git rm CLOSEOUT_PLAN.md`.

### Step 2 — Add the Operating index and historical documents subsection
Files: `AGENTS.md`
Insert the new subsection after the intro paragraph, before `## 0. The
operating rule`, per Required changes item 2.

### Step 3 — Fix stale skills-tree phrasing and drop the phantom row
Files: `AGENTS.md`
Reword the `kanmer-verify/` comment; delete the `kanmer-import/` line.

### Step 4 — Mine and retire the local branch
No files changed in this repo tree; confirms nothing to port, then
`git branch -D local-closeout-plan-docs`.

## Acceptance checks

- `CLOSEOUT_PLAN.md` no longer exists at repo root.
- `AGENTS.md` has the new subsection outside the managed block, under ~15
  lines, naming Alex as heavy verifier and mapping `CLOSEOUT_PLAN.md`,
  `MASTERPLAN.md`, `goal.md`.
- `kanmer-verify/` comment no longer says "validate on merged main"; says
  "validate at the exact merge SHA on the configured integration branch".
- No `kanmer-import/` row remains.
- Managed block is byte-identical to pre-change (untouched).
- `local-closeout-plan-docs` branch no longer exists locally.

## Commands

```
npm run verify:docs
npm run check:manual
node scripts/verify-agents-block.mjs
npm run verify:skills
npm run test:scripts
```

## Failure and deviation rules

If `check:manual`/`verify:docs` wants a regenerated manual chapter, regenerate
with the existing manual-build script rather than hand-editing generated
output. Any other failure is reported verbatim, not silently patched around.

## Stop condition

Stop after the PR is open, the post-implementation report is written, and the
ticket has moved `implementing` → `review`. Do not merge, review, or start
another ticket.
