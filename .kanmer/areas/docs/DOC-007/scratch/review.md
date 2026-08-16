# Review — DOC-007 / PR #49

**I am both author and reviewer of this change. This is a self-review and should
not be read as an independent one.** Where I could substitute a mechanical check
for my own judgement, I did — the guard rules were each executed rather than
reasoned about, and the chapters were rendered through the app's real markdown
pipeline rather than eyeballed.

## Changes

24 files. In my own words, not the report's:

- **`docs/manual/` — 16 new files, 2 rewritten.** The substance. Each is prose
  addressed to somebody who has never seen this repository.
- **`scripts/build-manual.mjs`** — the two-pass FRD derivation collapses to one
  authored list plus the shortcuts generator. `leadProse()` is gone. Where there
  was one unfireable emptiness check there are now six rules, plus a duplicate-id
  refusal that previously lived only in the test.
- **`manual.test.ts`** — the index-1 pin becomes an existence check; the floor
  goes 80 → 1500 (400 for the generated table); the exact id list is asserted;
  four new content assertions mirror the build guard so a hand-edit of the
  generated file is caught as well as a bad source file.
- **`chapters.generated.ts`** — regenerated artifact. 12 → 19 chapters.
- **`FRD-024`** — Overview premise withdrawn, R2 relisted, R3 rewritten with new
  R3a/R3b, one acceptance criterion added. R4 not touched.
- **`package.json`, `scripts/release.mjs`** — one line each.

## Comments

**1. (blocking → fixed in PR) The rebase initially clobbered three other
tickets' work.** Resolving the GUI-070 conflict with `git add -A` staged the
whole worktree at my old base, silently reverting MCP-009, MCP-012 and GUI-066:
`verify-release-assets.mjs` and its 557-line suite deleted, `release.mjs`
reverted by 148 lines, `identity.ts` deleted, `test:scripts` dropped from
`package.json`, FRD-021 truncated, and AGENTS.md drifted to the stale v2 block.

Caught by diffing every changed file against `origin/main` rather than trusting
the rebase. Fixed by resetting to `origin/main` and reapplying only my own
files. **The final diff is 24 files, all mine, with zero deletions** — verified
with `git diff --diff-filter=D`, which returns empty. This is the single most
dangerous thing that happened in this ticket and it would have been invisible in
a PR review that read only the manual chapters.

**2. (blocking → fixed in PR) The `backlog` chapter documented a deleted
feature.** GUI-070 merged mid-ticket and withdrew the Backlog view. The chapter
was written, then removed; `stages` and `groups` were corrected. See the
disposition note below — this is a scope change and is reported as one.

**3. (non-blocking → filed) `friendlyGateError` is dead code.** It early-returns
on a sentinel phrase that exists nowhere in the repo, so users see
`set_ticket_doc` in a gate refusal banner. Out of scope here. The `gates`
chapter documents what users actually see rather than papering over it, which I
think is the right call for a manual but is not a substitute for the fix.

**4. (non-blocking → filed) README is stale in three user-visible ways** and now
disagrees with a correct manual. Parked by the operator; filing at closeout.

**5. (non-blocking → won't do) The rail is 19 flat entries.** `ManualChapter` has
no part field and adding one is viewer work that `files` put out of scope. The
search box shows the matching line, which is the real navigation at this size.
Revisit only if the in-app read says otherwise.

**6. (non-blocking → won't do) `MANUAL_CHAPTER_IDS` is exported and unused.**
Leaving it: GUI-081 will deep-link again and will want it.

## What I actually checked

- **Report against diff** — the report's file table matches `git diff --name-only`
  exactly, including the two one-line script edits. The 19-not-20 scope change is
  disclosed in the report, the PR body and the commit message, not buried.
- **Governing docs** — FRD-024 is the only ref. The plan said Modify with
  operator authorization (the ticket body directs the R3 amendment); the diff
  modifies Overview, R2, R3 and the acceptance criteria, and leaves R4 alone.
  Confirmed R4 in the merged file still carries GUI-074's amendment and the
  GUI-081 pointer, unedited. No new ADR was needed and none was written.
- **The guard, executed not reasoned about** — all six rules fired with the
  intended message. The *original stub verbatim* (`# FRD-006 — Typed proof` plus
  the pointer line) is now rejected. Separately confirmed the negative case: a
  chapter using `.kanmer/` and `.worktrees/kanmer` paths still **passes**, which
  was the specific trap in the ticket.
- **Rendering** — every chapter parsed through the app's own `renderMarkdown`:
  tables produce `<table>`, the gate quotes produce `<blockquote>`, and **no
  chapter emits an `<h1>`**, so nothing duplicates the title the viewer draws.
  No accidental `[[…]]` wikilinks anywhere.
- **Cross-references** — every "See **Chapter Title**" resolves to a real chapter
  title. Nothing points at the deleted backlog chapter.
- **Factual accuracy** — chapters were written from shipped source. Where the
  FRDs and the code disagreed I checked the code myself rather than taking a
  research agent's word: the board-branch-rename question had two agents
  disagreeing, and I read `kanmerGit.ts` directly to settle it.
- **Rail** — `npm test` green end to end (check:manual 19 chapters → core 193 →
  GUI 236 → scripts), `npm run typecheck` green on all workspaces.
- **A pre-existing flake, not mine** — `kanmerGit.test.ts` intermittently times
  out on this machine (git operations take 3-9s under parallel load). Confirmed
  by running it on a clean `origin/main` worktree, where it also fails. Not
  caused by this change and not fixed by it.

## Verdict

**Pass.** The ticket's four stated verification criteria are met and measurable:
the shortest authored chapter is 2462 characters against 82; no title or body
carries a spec token or a `docs/…` path, asserted in both the build and the
test; `check:manual` passes and is now actually reached; and the chapters answer
their own titles for a reader without the repo.

Merging under the operator's standing delegation.
