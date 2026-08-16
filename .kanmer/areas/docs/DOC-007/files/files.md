# Files — what this change touches

## Files that change

| Path | What changes | Risk |
|---|---|---|
| `docs/manual/*.md` (≈17 **new** files) | The bulk of the work: one hand-written chapter per §4 entry — install, connect, first ticket, stages, profiles, gates, documents, reference/scratch, proof, groups, backlog, dispatch, board sync, sync/activity, settings, updates, glossary. | **Low mechanically, high in effort.** No code depends on their content, only on their existence. The real risk is factual: the product's stages, profiles and doc types must be stated correctly (README states all three wrongly — see research §3). |
| `docs/manual/getting-started.md` | Rewrite/trim: it currently carries a compressed version of what become chapters 5, 6 and 13, so it stops being an overview once those exist. | Low. Must stay chapter 1 — `manual.test.ts:9` asserts `MANUAL_CHAPTERS[0].id === "getting-started"`. |
| `docs/manual/troubleshooting.md` | Two sections graduate out (the move-refused section → gates chapter; the attachment section → reference chapter); new entries added. | Low, but `manual.test.ts:10` pins it at index **1**, and the proposed TOC puts it at 19. **The order assertion has to be relaxed or re-pinned deliberately.** |
| `scripts/build-manual.mjs` | Delete `FROM_FRD` (`:28-38`), its loop (`:62-72`) and `leadProse()` (`:40-47`); extend the pass-1 list to every hand-written chapter in reading order; replace the `if (!body)` guard at `:66` with a real content check. | **Medium — the crux of the ticket.** The new guard must reject a heading-only body: strip headings and the `*Full specification*` footer shape, require a prose floor well above 82 chars, and reject any `FRD-`/`ADR-`/`PRD-` token or `docs/…` path in a title or body. Keep `--check` and the committed-artifact contract intact. |
| `apps/gui/src/renderer/src/manual/chapters.generated.ts` | **Regenerated, never hand-edited.** Grows from ~12 to ~20 chapters and from a few KB to tens of KB. | Low but noisy: a large committed generated diff. Forgetting to regenerate is caught only by `check:manual`, which nothing currently runs (see ripples). |
| `apps/gui/src/renderer/src/manual/manual.test.ts` | Add the assertions the ticket names — no `FRD-`/`ADR-`/`PRD-` token, no `docs/` path, a real prose floor (the current floor is 80 chars at `:17`, which every stub clears at 82). Revisit the index pins at `:9-10` and the hand-copied deep-link id list at `:66-74`. | **Medium.** This file is edited by GUI-074 too. The deep-link test's id list must be reconciled with the new chapter ids or it fails the moment a chapter is renamed. |
| `docs/functional/frd/FRD-024-in-app-manual.md` | Amend **R3** — the manual is hand-written; only the shortcuts chapter is generated. The Overview's "generated from the durable FRDs / the documentation system documenting the product it governs" is the premise being withdrawn and must go too. R2's chapter list should be replaced with the §4 list. | **Medium — shared with GUI-074**, which needs to withdraw **R4** in the same file for the same release. Coordinate or expect a conflict. |
| `package.json` (scripts) | Wire `check:manual` into whatever gate actually runs (see ripples). | Low. |

## Files that do NOT change (but will be read)

| Path | Why it is not touched |
|---|---|
| `apps/gui/src/renderer/src/components/Manual.tsx` | The viewer is content-agnostic — rail, search filter, markdown render. Nothing about it assumes 12 chapters. Only touched if the answer to the navigation question is "add grouping" (the `ManualChapter` interface has `id`/`title`/`body` only). |
| `apps/gui/src/shared/shortcuts.ts` | The shortcuts chapter stays generated from it. |
| `apps/gui/src/main/index.ts` | Help → Manual menu item is unaffected. |
| `apps/gui/src/renderer/src/lib/markdown.ts` | Chapters render through the existing pipeline. Worth a look only if a new chapter uses markdown the renderer does not support. |

## Ripple effects

- **`check:manual` is not run by anything.** Grepping `check:manual` across the
  repo finds only its own definition at `package.json:29`. Not `release.mjs`,
  not `npm test`, not any verify script. A stale `chapters.generated.ts` will
  therefore ship silently. This ticket adds ~17 chapters to a committed
  artifact, which makes that gap materially worse — wiring it into the release
  or verification path is in scope, not a nicety.
- **The generated artifact grows by roughly an order of magnitude** and is
  bundled into the renderer. Not a performance concern at this size (search is a
  linear filter over chapter bodies, `Manual.tsx:38-48`), but it is a large
  committed diff on every content edit; reviewers should read `docs/manual/`,
  not the generated file.
- **The rail is a flat list.** `Manual.tsx:78-89` renders one button per chapter
  with no grouping and no scroll affordance beyond the container. 20 flat
  entries is a different UI from 12. Decision recorded in open-questions.
- **`SETTINGS_HELP` (`Settings.tsx:52-59`) maps five Settings tabs to chapter
  ids.** If any of `stages`, `profiles`, `getting-started`, `board-sync`,
  `dispatch` is renamed or split by the new TOC, those deep links silently open
  the manual at nothing (`Manual.tsx:50` falls back to chapter 0 for an unknown
  id — so it opens at the wrong chapter rather than erroring). GUI-074 may
  delete this map first; merge order decides whether this ripple exists at all.
- **`manual.test.ts` is a shared edit surface with GUI-074.** Both tickets
  change it in the same release.
- **README.md is now the second-best user documentation and disagrees with the
  manual.** Not in scope here, and deliberately so — but once the manual is
  right, README's stage list (`:78`), its "stages and priorities are editable"
  claims (`:82-83`, `:155`) and its `impact.md` document naming (`:39-43`) are
  wrong in a document users still read first on GitHub. **Worth its own ticket;
  not folded in.**
- **No packaging change.** The manual is compiled into the renderer bundle, so
  nothing in electron-builder config, `files` globs or `resources/` is affected.
- **No MCP / core change.** Nothing in `packages/` is touched.

## Context files — read these before writing a line

| Path | What it tells you |
|---|---|
| `scripts/build-manual.mjs:2-14` | Why the manual is compiled in and committed: renderer CSP is `default-src 'self'` and the packaged app ships no `/docs/`. Do not propose loading markdown at runtime. |
| `scripts/build-manual.mjs:40-47` | The exact bug — `trim()` then an H1 regex requiring `\n+`. Read it before rewriting the guard, or the replacement will have the same shape of hole. |
| `apps/gui/src/renderer/src/manual/chapters.generated.ts:68` | The `board-sync` chapter. The single best example of what "FRD stubs" really costs: 1761 characters of R1-R5, an internal source filename, and a feature marked **not built**. Do not preserve any of it. |
| `docs/functional/frd/FRD-007-fixed-six-stage-board.md` | Authoritative stage names and per-stage meaning. README's stage list is stale — trust this. |
| `docs/functional/frd/FRD-002-requirement-profiles.md` + a live `get_doc_gates` call | Authoritative profile → boundary → document mapping for the profiles chapter. `get_doc_gates` with no id returns the shipped defaults directly, including each stage's `meaning` string, which is already user-grade prose. |
| `docs/functional/frd/FRD-003-ticket-documents.md` (T1) | The seven document types and that they are **folders**. README calls one of them `impact.md`; it is `files`. |
| `README.md:91-114`, `:136-147`, `:158-201` | The prose worth adapting: install, updates, board worktree, plugin/connect. Everything else in README is contributor content. |
| `AGENTS.md` | **Fact-check source only.** It is the contributor guide; nothing in it is written for an end user and no sentence should survive a copy-paste. |
| `apps/gui/src/renderer/src/components/Settings.tsx:52-59, 202-213` | `SETTINGS_HELP` and the `?` button GUI-074 removes — the chapter ids that are load-bearing outside the manual. |
| `apps/gui/src/renderer/src/manual/manual.test.ts:66-74` | The hand-copied deep-link id list. It is not derived from `SETTINGS_HELP` and has already drifted from it. |

## Deliberately out of scope

- **Fixing README.md's staleness.** Real, found here, and a separate ticket.
- **The manual viewer's UI** (rail grouping, per-chapter anchors, a table of
  contents page) — unless the navigation open question is answered "add
  grouping", in which case it is a third split.
- **Restoring or redesigning contextual `?` deep links** — that is GUI-074's
  territory in this release, and FRD-024 R4's fate belongs to it.
- **Localisation, printing, exporting the manual.**
- **Changing what the FRDs themselves say**, beyond FRD-024's R2/R3 and its
  Overview premise.
