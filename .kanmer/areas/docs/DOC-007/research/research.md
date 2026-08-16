# Research — Rewrite the in-app manual as a real user guide

## The question

The manual's chapters are internal specification text shown to end users. What is
the content pipeline that produces them, what exactly is wrong with the content
today, and what should a Kanmer user guide's table of contents actually be?

## 1. The content pipeline, precisely

The manual is **compiled in at build time**, not fetched and not read from disk at
runtime. There are three content sources feeding one generator feeding one
committed TypeScript module:

```
docs/manual/getting-started.md          ─┐
docs/manual/troubleshooting.md           │
                                         ├─► scripts/build-manual.mjs
docs/functional/frd/*.md  (9 curated)    │      (node, no deps)
apps/gui/src/shared/shortcuts.ts        ─┘             │
                                                       ▼
        apps/gui/src/renderer/src/manual/chapters.generated.ts   (COMMITTED)
                                                       │
                                                       ▼
        Manual.tsx  →  MANUAL_CHAPTERS  →  renderMarkdown()  →  modal
```

**Source:** `scripts/build-manual.mjs`, `apps/gui/src/renderer/src/components/Manual.tsx:2`.

Why it is shaped this way is documented in the script's own header
(`build-manual.mjs:2-14`) and is a real constraint, not an accident:

> The renderer CSP is `default-src 'self'`, so nothing can be fetched at runtime
> — and the packaged app does not ship `/docs/` at all.

So the generated file is committed deliberately, and `npm run check:manual`
(`build-manual.mjs --check`) regenerates and diffs to catch a stale artifact.

The generator assembles chapters in exactly three passes:

| Pass | Chapters | Source | `build-manual.mjs` |
|---|---|---|---|
| 1 | `getting-started`, `troubleshooting` | hand-written markdown in `docs/manual/` | `:52-59` |
| 2 | `profiles`, `stages`, `documents`, `groups`, `proof`, `references`, `backlog`, `dispatch`, `board-sync` | **lead prose of a curated FRD**, plus an appended `*Full specification: docs/…*` footer | `:28-38`, `:62-72` |
| 3 | `shortcuts` | parsed out of the `SHORTCUTS` binding table | `:74-92` |

**This decides the shape of the whole ticket:** the pipeline is already
file-based and already supports hand-written chapters. Pass 1 is the correct
mechanism and it works. Authoring the manual is therefore *adding files to
`docs/manual/` and moving entries from the pass-2 list into the pass-1 list* —
not building new machinery. The only code change strictly required is deleting
`FROM_FRD` and its loop, plus fixing the guard.

### The precise root cause of the stubs

The ticket says the H1 strip "left a non-empty string". The mechanism is sharper
than that and worth writing down, because the same shape of bug will recur if
the guard is rewritten carelessly:

```js
const lead = (cut === -1 ? body : body.slice(0, cut)).trim();   // :44 — trims
return lead.replace(/^#\s+.*\n+/, "").trim();                   // :46 — needs \n+
```

`leadProse()` trims the lead **first**, then strips the document's own H1 with a
regex that requires one or more newlines after it. Every curated FRD goes
straight from `# FRD-002 — Requirement profiles` to `## Overview`, so the lead
*is* the H1 line, and `trim()` has already removed the newline the regex needs.
The replace matches nothing, the H1 survives into the chapter body, `body` is
truthy, and the `if (!body) throw` guard at `:66` never fires. The guard is not
merely testing the wrong thing — it is testing a value the preceding line
guarantees is non-empty.

**Confirmed against source:** heads of FRD-001/002/003/004/006/007/010/011 all
match `# FRD-… \n\n## Overview`.

## 2. What is actually wrong with the content

### 2a. Eight chapters are stubs

Verbatim, from `chapters.generated.ts:26-29` — this is the entire body a user
sees under **Requirement profiles**:

```
# FRD-002 — Requirement profiles

*Full specification: `docs/functional/frd/FRD-002-requirement-profiles.md`.*
```

Rendered, the chapter is a title, the same title again as an H1, and a pointer
to a file that does not exist on the user's machine. Eight chapters are this:
`profiles`, `stages`, `documents`, `groups`, `proof`, `references`, `backlog`,
`dispatch`.

### 2b. `board-sync` is worse than a stub, and the ticket undercounts it

The ticket's table puts `board-sync` in the healthy bucket at 1761 characters.
Length is the wrong measure. Read what those 1761 characters are
(`chapters.generated.ts:68`) — FRD-020's requirement list, shipped verbatim to
end users:

> - R1. The board root is `<repo>/.worktrees/kanmer`, checked out on a
>   configurable branch (default `kanmer-board`, global setting); the source
>   checkout remains the project tab. **MCP calls receive the board root; agent
>   execution and project config use the source root.**
> …
> - R5. **Branch rename** should migrate all known projects safely … **Not
>   built** (see the gap note below); the end state is specified here so the
>   eventual implementation has a target.
>
> **Acceptance (as-built):** the Phase 9 verification list — real-repo tests for
> orphan creation, migration byte-preservation, conflict pause, and
> cross-machine recovery.
>
> Related: docs/plans/kanmer-v2/phase-9 · kanmerGit.ts · FRD-018 …

This is the most damaging chapter in the manual, not the least. A stub is
obviously empty; this one is long enough to look like documentation while it
tells a user about requirement ids, an internal source file name
(`kanmerGit.ts`), a plans folder that does not ship, an acceptance-criteria
list, and a feature that is **not built**. It also directly contradicts the
hand-written `troubleshooting` chapter, which tells users to rename the board
branch from Settings → Git — a thing R5 says does not exist.

**So the honest count is nine bad chapters, not eight.** Only three chapters
(`getting-started`, `troubleshooting`, `shortcuts`) are fit to ship.

### 2c. The category error

FRD-024 R3 *mandates* the derivation: "chapters are markdown bundled with the
app, generated at build time **from the FRD set** plus hand-written
getting-started/troubleshooting". The overview goes further — "the documentation
system documenting the product it governs". That premise is what has to change;
no amount of FRD prose makes an FRD a manual chapter, because an FRD's job is to
be normative for an implementer (requirement ids, acceptance criteria, "not
built" gap notes) and a manual's job is to be useful to someone who cannot see
the repo. The generator's own comment at `:22-27` already makes this argument
and stops one step short of the conclusion.

## 3. What README.md gives us, and what it must not

`README.md` (18 KB) is the closest existing correct user-facing prose. It is a
mixed document and the split is clean:

**Reusable, close to as-is (rewrite person/voice, drop repo paths):**

| README section | Feeds manual chapter |
|---|---|
| Opening two paragraphs + the ASCII diagram (`:1-12`) | What Kanmer is |
| "Install — the easy way (Windows installer)" (`:91-104`) | Install and first run |
| "Connect an agent with one click" (`:102`) and "Install as a plugin" (`:158-201`), incl. the **use either the plugin or a manual registration** warning | Connect an agent |
| "Updates" (`:106-114`) — 30s/6h checks, Restart now vs Later, **an update closes agent MCP sessions**, rollback | Updates |
| "Shared board worktree" (`:136-147`) | Sharing a board over Git |
| The feature bullets (`:149-157`) — Board, Editor, Standup, Activity, Archived, Search/filter, Settings, inline quick-add | The board · The ticket editor · Staying in sync |
| The skills table (`:184-197`) | Working with agents — *concepts only, skill ids are agent-facing* |

**Must NOT be reused:** "Layout" (`:14-21`), "Develop / run from source"
(`:116-134`), "Connect an agent manually (MCP)" TOML/CLI snippets (`:203-230`),
"Verify end-to-end" (`:232-265`), "Release (maintainers)" (`:267-283`). These are
contributor content; a user who installed the `.exe` has no repo.

**README is also stale, and copying it would import bugs.** Three concrete
contradictions with the shipped product, all of which the manual must get right
independently:

1. `README.md:78` lists the stages as `Todo → Planning → Implementing → Review →
   Verifying → Done`. The product's stages are **Backlog → Preparing →
   Implementing → Review → Verifying → Done** (`get_doc_gates`, FRD-007).
2. `README.md:82-83` and `:155` say stages and priorities are editable in
   Settings. FRD-007 makes stages fixed and non-customizable; FRD-008 removes
   priority. Areas remain editable.
3. `README.md:39-43` names the documents `research.md / impact.md / plan.md /
   checklist.md / proof.md`. The real model is **folders**, seven types:
   `research`, `files`, `plan`, `checklist`, `open-questions`,
   `post-implementation-report`, `proof` (`get_doc_gates`, FRD-003 T1). "Impact"
   was renamed to "files".

`AGENTS.md` (52 KB) is explicitly "Contributor & AI-agent guide" and is
**structurally unusable** for the manual: sections 2 (repo layout), 3 (tech
stack), 5 (the three surfaces), 6 (commands), 7 (conventions), 8 (gotchas), 9
(recipes), 10 (verification checklist). Its only value here is as a fact-check
source for §4 (data model) — read it to get facts right, quote nothing.

## 4. The proposed table of contents

This is the main output of this research. It is derived from what a user of an
agent-driven kanban actually has to do, in the order they hit it — not from the
FRD set. Every chapter is hand-written into `docs/manual/` except where noted.

**Part 1 — Start here**

| # | Chapter | Answers | Sources to draw on |
|---|---|---|---|
| 1 | **What Kanmer is** | Your board is markdown files in your repo; you and your agents read and write the same files; no server, no account, works offline. The two-surface diagram. | README `:1-12`; current `getting-started` ¶1 |
| 2 | **Install and open a project** | Run the installer; Open project folder…; what `.kanmer/` is and when it appears (a read-only agent session never creates it); recents and session restore. | README `:91-104`, `:134`; FRD-022 |
| 3 | **Connect an agent** | Settings → Connect; the five hosts (Claude Code, codex, opencode, Grok CLI, Antigravity); what "connected" means; **restart the agent afterwards**; the copy-paste fallback; plugin **or** manual registration, never both. | FRD-012; README `:102`, `:158-201` |
| 4 | **Your first ticket, end to end** | One worked example: create a ticket, pick a profile, let an agent research and plan it, watch it move, read the proof. The chapter that makes the next five make sense. | new |

**Part 2 — How work moves**

| # | Chapter | Answers | Sources |
|---|---|---|---|
| 5 | **The six stages** | Backlog · Preparing · Implementing · Review · Verifying · Done — what each means, who typically owns it, why they are fixed and identical on every board. Why "merged but unconfirmed" earns its own column. | FRD-007; stage `meaning` strings from `get_doc_gates` are already user-grade prose |
| 6 | **Profiles: what a ticket owes** | A profile is how much evidence a ticket owes. `feature` / `fix` / `chore` / `spike` in a table of what each requires at which boundary; `fix` is the default; how to choose and how to change one; the cost of over-filing. | FRD-002; the live profile map from `get_doc_gates` |
| 7 | **"Why can't I move this?"** | The two refusals, verbatim as the user sees them: a missing document, and crossing more than one gated boundary at once. How to unblock each. *Highest-traffic chapter in the manual — a user reads it while stuck.* | FRD-002 G1; current `troubleshooting` §2 moves here |

**Part 3 — What a ticket holds**

| # | Chapter | Answers | Sources |
|---|---|---|---|
| 8 | **Ticket documents** | The seven types and what each is *for*, in one table; documents are folders so a ticket can hold several of a type; the document tabs in the editor; version-checked saves and the conflict banner. | FRD-003, FRD-014; README `:150` |
| 9 | **Reference files and scratch** | `reference/` is what you hand the work (a mockup, a log, a schema); `scratch/` is the agent's notepad; **neither can ever satisfy a gate**, and why that is deliberate. | FRD-004; current `troubleshooting` §3 |
| 10 | **Proof** | Proof is evidence gathered after the merge, on main. The three types — visual, test output, command log — and what each wants. Why the last gate is the one that cannot be waived. | FRD-006 |

**Part 4 — Organising a board**

| # | Chapter | Answers | Sources |
|---|---|---|---|
| 11 | **Areas, epics and horizons** | Areas colour and cluster cards and give tickets their id prefix; an **epic** is "these ship together", a **horizon** is "this is what matters now"; group context that applies to every ticket in it. | FRD-001; README `:81-83`, `:149` |
| 12 | **The Backlog list** | Backlog is a sortable, filterable table rather than a column, because a 200-ticket queue is something you triage; the board renders Preparing → Done. Bulk actions. | FRD-011 |

**Part 5 — Working with agents**

| # | Chapter | Answers | Sources |
|---|---|---|---|
| 13 | **Dispatching agents** | Dispatch aims a background agent at **one deliverable**, not a whole ticket; the task menu (research, deep research, map files, plan + checklist, execute, verify + proof) and the done-condition of each; the Dispatches drawer; why each ticket gets its own worktree. | FRD-010, FRD-016 |
| 14 | **Sharing a board over Git** | The board lives on its own branch in `.worktrees/kanmer` so board edits never make a pull request noisy; turning on automatic sync; what happens on a conflict (it pauses and keeps your work — Retry); picking the board up on a second machine; non-Git folders. **Written from scratch — do not carry over one word of the current chapter.** | FRD-020 R1-R4 *as behaviour*; README `:136-147` |
| 15 | **Staying in sync** | The board live-reloads when an agent changes it; the activity feed and who-did-what; desktop toasts while you are away; your own edits never echo back. | FRD-017, FRD-018; README `:152` |

**Part 6 — Reference**

| # | Chapter | Answers | Sources |
|---|---|---|---|
| 16 | **Settings, tab by tab** | A short tour: Board, Profiles, Appearance, Git, Connect. | Settings.tsx tab list |
| 17 | **Keyboard shortcuts** | *Generated, keep as-is* — from the binding table, so it cannot drift. | `shortcuts.ts` |
| 18 | **Keeping Kanmer up to date** | It updates itself; Restart now vs Later; **an update drops live agent MCP sessions and the agent reconnects**; unsigned installer / SmartScreen on first install only; going back a version. | FRD-021; README `:106-114` |
| 19 | **Troubleshooting** | Keep the existing chapter, minus the two sections that graduate to chapters 7 and 9; add: agent cannot see the board, sync paused, empty board, wrong project. | current `troubleshooting` |
| 20 | **Glossary** | ticket · stage · profile · gate · area · group · document · proof · reference · dispatch · board branch · MCP. One line each, so any chapter can use a word without defining it. | new |

Notes on the list:

- **20 chapters against 12 today.** `Manual.tsx:78-89` renders the rail as one
  flat list of buttons with no grouping — the six-part structure above has no
  representation in the `ManualChapter` interface (`id`, `title`, `body` only).
  Either accept a flat 20-item rail or add an optional part/group field. That is
  a real UI decision, recorded in open-questions.
- Chapters 7, 9 and 14 are the ones where the current manual is actively
  misleading rather than merely absent; if the ticket is ever cut short, those
  three plus 5, 6, 8 and 10 are the irreducible core.
- Chapter ids should be stable, user-meaningful slugs (`gates`, `documents`,
  `proof`), because they are the deep-link surface — see the GUI-074 note.

## 5. GUI-074 — the manual is still reachable, but there is a real conflict elsewhere

**Verdict on reachability: no conflict.** Removing the Settings `?` leaves two
independent doors, both verified in source:

- **F1** — handled in the renderer's own keydown at `App.tsx:916-918`, entirely
  independent of Settings.
- **Help → Manual** — `main/index.ts:322-325` sends `{ type: "manual" }` over the
  menu channel, handled at `App.tsx:560`. It also carries `accelerator: "F1"`.

(There is no command-palette entry for the manual; `CommandPalette.tsx` has no
match for "manual". So it is exactly two doors, not three.)

**But three genuine couplings between the two tickets exist, and one is a
document conflict:**

1. **FRD-024 R4 mandates the thing GUI-074 removes.** R4: *"Contextual entry
   points: a '?' affordance on Settings tabs and on gate-block messages
   deep-links to the relevant chapter."* Both tickets reference
   `docs/functional/frd/FRD-024-in-app-manual.md`, and both need to amend it —
   DOC-007 to kill the FRD-derivation in R3, GUI-074 to withdraw R4. Neither
   ticket body mentions the other's edit. **Same file, same release, two
   uncoordinated amendments.**
2. **Settings.tsx's justification for `SETTINGS_HELP` is false in two ways.**
   The comment at `Settings.tsx:202-204` claims *"the target ids are asserted to
   exist by manual.test.ts"*. GUI-074 suspected this; it is worse than
   suspected. `manual.test.ts:66-74` asserts a **hand-copied** id list
   (`profiles`, `stages`, `documents`, `proof`, `shortcuts`, `troubleshooting`)
   and never imports `SETTINGS_HELP`. Two of `SETTINGS_HELP`'s five actual
   targets — `board-sync` and `dispatch` — are **not** in that list and are not
   asserted at all. So the guard is a duplicate that has already drifted.
3. **Merge order changes the outcome.** DOC-007 will re-id chapters (chapter 7
   `gates`, chapter 16 `settings`, chapter 20 `glossary` are all new ids, and
   `references` becomes reference-and-scratch). If DOC-007 lands first,
   `SETTINGS_HELP` can point at ids that no longer exist and the `?` opens the
   manual at nothing — the exact failure its own comment warns about. If
   GUI-074 lands first, DOC-007 is free. Both tickets edit `manual.test.ts`.

None of this is mine to resolve — it is two tickets in one release disagreeing
about a governing document. Raised in open-questions.

## 6. Implication: this ticket should be split

The work is two different jobs with different skills, different review criteria
and a clean seam between them. Recommended split:

- **DOC-007 (this ticket, becomes the code half — `chore`-sized):** delete
  `FROM_FRD` and its loop from `build-manual.mjs`; replace the emptiness guard
  with one that cannot be satisfied by a heading (minimum prose length after
  stripping headings and the `*Full specification*` footer, plus no
  `FRD-`/`ADR-`/`PRD-` token and no `docs/` path in any title or body); assert
  the same in `manual.test.ts`; wire `check:manual` into a script that is
  actually run (today nothing calls it — see files); amend FRD-024 R3.
- **DOC-007b (new — the authoring, `feature`-sized):** write the ~17 hand-written
  chapters of §4 into `docs/manual/` and register them in the pass-1 list.

They must be sequenced, not parallel: the code half's new guard would fail the
build the moment `FROM_FRD` goes away with no replacement prose, so either the
code half ships with the chapters, or it ships with the FRD-derived chapters
deleted outright and a temporarily shorter manual. **That sequencing choice is
itself an open question.** A third split (chapter grouping in the rail) is only
warranted if the answer to the 20-chapter navigation question is "add grouping".

I have not created DOC-007b — splitting a ticket is not research's call to make
unilaterally; it is proposed in open-questions with the seam already drawn.
