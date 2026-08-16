# Proof — DOC-007

*The proof. Not the report — this is evidence from merged `main`, not a
description of what was built.*

**Merge commit:** `19244f62d05ddf64ff7aa52ea4cf34342798013f` — PR #49, squashed,
merged 2026-08-16T23:24:57Z.
**Verified in:** a clean detached worktree checked out at that commit, not in
the branch worktree.

---

## 1. The ticket's four criteria, measured

> *Every chapter body is substantive prose; the shortest is well past the current
> 82 characters.*

```
chapters: 19
   2867  getting-started What Kanmer is
   2462  install         Install and open a project
   2842  connect         Connect an agent
   3293  first-ticket    Your first ticket, end to end
   3609  stages          The six stages
   3970  profiles        Profiles: what a ticket owes
   3814  gates           Why can't I move this?
   3787  documents       Ticket documents
   2651  references      Reference files and scratch
   2969  proof           Proof
   3315  groups          Areas, epics and horizons
   4222  dispatch        Dispatching agents
   3560  board-sync      Sharing a board over Git
   3010  sync            Staying in sync
   3225  settings        Settings, tab by tab
    574  shortcuts       Keyboard shortcuts
   2668  updates         Keeping Kanmer up to date
   4284  troubleshooting Troubleshooting
   2819  glossary        Glossary

shortest AUTHORED chapter: 2462 chars   (the stubs were 82)
shortest of all (generated shortcuts table): 574
```

**PASS — 30× the old floor.** The 574-character chapter is the generated
shortcuts table, which is a table by design and is checked row-for-row against
`SHORTCUTS` in both directions.

> *No chapter title or body contains `FRD-`, `ADR-`, `PRD-`, or a `docs/…` repo
> path — asserted in `manual.test.ts`, so it cannot regress.*

```
no spec token, no docs/ path, no requirement line, no body H1 — across all 19
```

**PASS**, and the assertion is stronger than the ticket asked: a requirement
line (`R1.`, `AC2.`) and a body-level `# ` heading are refused too. Enforced in
**both** the build and the test, so neither a bad source file nor a hand-edit of
the generated artifact gets through.

> *`npm run check:manual` passes and the committed artifact is current.*

```
$ npm run build:manual
manual: wrote 19 chapters -> …/chapters.generated.ts
$ git diff --exit-code --stat apps/gui/src/renderer/src/manual/chapters.generated.ts
PASS — git diff --exit-code clean: the committed artifact matches a fresh build

$ npm run check:manual
manual: up to date (19 chapters)
```

**PASS.**

> *Read the manual in the packaged app: each chapter answers its own title for
> someone who has never seen the repo.*

**Partially mechanised, and I am saying which half.** Every chapter was rendered
through the app's own `renderMarkdown` (the real pipeline `Manual.tsx` uses):
tables produce `<table>`, the quoted gate refusals produce `<blockquote>`, **no
chapter emits an `<h1>`** so nothing duplicates the title the viewer draws, and
no chapter contains an accidental `[[…]]` wikilink. Every "See **Chapter
Title**" cross-reference resolves to a real chapter title.

The judgement half — *does this chapter answer its title for a stranger* — is
mine as author, and I am also the reviewer, so it is not independently
confirmed. Recorded honestly rather than claimed.

---

## 2. `check:manual` is now reached

Before this change **nothing invoked it**. Evidence that it now runs, from the
head of the `npm test` output on merged main:

```
> npm run check:manual && npm run test -w @kanmer/core && npm run test -w @kanmer/gui && npm run test:scripts
> kanmer@0.3.2 check:manual
manual: up to date (19 chapters)
```

It is the **first** step, so a stale artifact fails the suite before any test
runs. It is also a named step in the release verification gate in
`scripts/release.mjs`.

---

## 3. The guard — every rule executed on merged main

The guard this replaces could never fire. Each replacement rule was run, not
reasoned about. Rule 1 is the **original bug reproduced verbatim**:

```
[1] the ORIGINAL stub, verbatim:
  Chapter "stages" (docs/manual/stages.md) has a top-level "# " heading. The chapter's
  title comes from build-manual.mjs and the viewer renders it, so an H1 in the body is
  either a duplicate title or a stub standing in for a chapter. Start at "## ", or with prose.

[2] headings + table, no prose:
  Chapter "stages" (docs/manual/stages.md) has 0 characters of prose, below the 400 floor.
  Headings, tables and code do not count — a chapter has to answer its own title for
  someone who has never seen this repo.

[3] spec token:
  Chapter "stages": body names FRD-… — the manual is for users, who do not have our
  specification documents. Say what the app does instead.

[4] requirement line:
  Chapter "stages": body contains a requirement line ("- R1.…"). Requirement and
  acceptance-criterion lists are written for an implementer. Describe the behaviour a
  user sees instead.

[5] docs/ path:
  Chapter "stages": body points at "docs/f…" — /docs/ is not shipped in the packaged app,
  so that path is a dead end for a reader. (Paths under .kanmer/ or .worktrees/ are fine
  — those are on the user's disk.)

[6] missing file:
  Missing chapter "stages": docs/manual/stages.md does not exist

[7] MUST PASS — .kanmer/ and .worktrees/ paths:
  ACCEPTED — correct, the rule is scoped to docs/ only
```

**[7] is the one worth dwelling on.** The ticket warned that a naive "no repo
paths" rule would wrongly fail the legitimate `.kanmer/` paths already in
getting-started. Tested explicitly: a chapter naming both `.kanmer` and
`.worktrees/kanmer` is accepted. The rule is scoped to `docs/`.

A first pass at [3]–[5] and [7] used fixtures under 400 characters, so the prose
floor fired instead of the rule under test and [7] looked like a false
rejection. Re-run with adequate prose, each rule fires for its own reason and
[7] passes. Recorded because the first result was misleading and a proof that
hides its own false starts is worth less.

Tree restored clean afterwards — `git diff --exit-code` quiet, 0 modified files.

---

## 4. Rail on merged main

| Check | Result |
|---|---|
| `npm run check:manual` | **PASS** — up to date (19 chapters) |
| `npm run test -w @kanmer/core` | **PASS** — 193/193, 9 files |
| `npm run test -w @kanmer/gui` | **PASS** — 236/236, 21 files |
| `apps/gui` → `manual.test.ts` alone | **PASS** — 11/11 |
| `npm run test:scripts` | **PASS** |
| `npm run typecheck` | **PASS** — all workspaces (core, mcp-server, ui, gui) |
| `npm run build:manual` + `git diff --exit-code` | **PASS** — artifact current |

### One pre-existing flake, disclosed

`apps/gui/src/main/kanmerGit.test.ts` intermittently times out on this machine —
its git operations take 3–9s under parallel load against a 5s timeout. Observed
on merged main: run 1 failed 3 tests, **run 2 passed all 236**.

**It is not caused by this change and this change does not touch it.** Confirmed
by checking out a clean worktree at `origin/main` *before* the merge and running
the same file there, where it also failed. The 236/236 row above is a genuine
pass, not a retry until green — the same suite passes reliably when not
contending with a parallel run.

---

## 5. What this fixes, in one line

A user opening **Help → Manual → Proof** used to see the words
`# FRD-006 — Typed proof` and a pointer to a file not on their computer. They
now see 2969 characters explaining that proof is evidence rather than
description, what the three kinds want, and why the last gate is the strict one.
